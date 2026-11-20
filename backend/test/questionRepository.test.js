const assert = require("node:assert/strict");
const test = require("node:test");

const {
  createQuestionRepository,
  toPublicQuestion,
} = require("../repositories/questionRepository");

test("passes valid filters as execute parameters", async () => {
  let call;
  const pool = {
    async execute(sql, parameters) {
      call = { sql, parameters };
      return [[{ enunciado: "Pergunta" }], []];
    },
  };
  const repository = createQuestionRepository(pool);

  await repository.findRandomQuestion({
    etapaEscolar: "Médio",
    nivelEstrutural: 2,
  });

  assert.deepEqual(call.parameters, ["Médio", 2]);
  assert.match(call.sql, /FROM\s+perguntas/i);
  assert.doesNotMatch(call.sql, /ludo_equidade\./i);
  assert.match(call.sql, /WHERE etapa_escolar = \? AND nivel_estrutural = \?/);
  assert.match(call.sql, /ORDER BY RAND\(\)\s+LIMIT 1/);
  assert.doesNotMatch(call.sql, /SELECT\s+\*/i);
  assert.doesNotMatch(call.sql, /Médio|nivel_estrutural\s*=\s*2/);
});

test("rejects invalid filters without querying the pool", async (t) => {
  let calls = 0;
  const repository = createQuestionRepository({
    async execute() {
      calls += 1;
      return [[], []];
    },
  });
  const invalidFilters = [
    { etapaEscolar: "Básico", nivelEstrutural: 1 },
    { etapaEscolar: "Fundamental", nivelEstrutural: 0 },
    { etapaEscolar: "Superior", nivelEstrutural: 4 },
    { etapaEscolar: "Médio", nivelEstrutural: 1.5 },
  ];

  for (const filters of invalidFilters) {
    await t.test(JSON.stringify(filters), async () => {
      await assert.rejects(repository.findRandomQuestion(filters), TypeError);
      assert.equal(calls, 0);
    });
  }
});

test("returns null when no question matches", async () => {
  const repository = createQuestionRepository({
    async execute() {
      return [[], []];
    },
  });

  assert.equal(
    await repository.findRandomQuestion({
      etapaEscolar: "Superior",
      nivelEstrutural: 3,
    }),
    null,
  );
});

test("projects only the question and alternatives for public use", () => {
  const publicQuestion = toPublicQuestion({
    enunciado: "Pergunta",
    opcao_a: "A",
    opcao_b: "B",
    opcao_c: "C",
    opcao_d: "D",
    resposta_correta: "A",
    explicacao: "Explicação interna",
    tags: ["tag interna"],
    nivel_estrutural: 1,
  });

  assert.deepEqual(publicQuestion, {
    enunciado: "Pergunta",
    opcao_a: "A",
    opcao_b: "B",
    opcao_c: "C",
    opcao_d: "D",
  });
});

test("excludes already-used question IDs when provided and falls back if exhausted", async () => {
  const calls = [];
  const pool = {
    async execute(sql, parameters) {
      calls.push({ sql, parameters });
      if (calls.length === 1) {
        return [[{ id: 7, enunciado: "Inédita" }], []];
      }
      if (calls.length === 2) {
        return [[], []];
      }
      return [[{ id: 1, enunciado: "Fallback" }], []];
    },
  };
  const repository = createQuestionRepository(pool);

  const uniqueResult = await repository.findRandomQuestion({
    etapaEscolar: "Fundamental",
    nivelEstrutural: 1,
    excludeIds: [1, 2, 1],
  });
  assert.equal(uniqueResult.id, 7);
  assert.match(calls[0].sql, /AND id NOT IN \(\?, \?\)/);
  assert.deepEqual(calls[0].parameters, ["Fundamental", 1, 1, 2]);

  const fallbackResult = await repository.findRandomQuestion({
    etapaEscolar: "Fundamental",
    nivelEstrutural: 1,
    excludeIds: new Set([1, 2, 7]),
  });
  assert.equal(fallbackResult.id, 1);
  assert.equal(calls.length, 3);
  assert.doesNotMatch(calls[2].sql, /NOT IN/);
  assert.deepEqual(calls[2].parameters, ["Fundamental", 1]);
});
