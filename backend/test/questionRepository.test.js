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
