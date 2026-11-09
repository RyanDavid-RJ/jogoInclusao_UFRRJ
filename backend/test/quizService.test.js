const assert = require("node:assert/strict");
const test = require("node:test");

const {
  QuizQuestionsUnavailableError,
  createQuizService,
  getObstacleForPosition,
  getStructuralLevel,
} = require("../quizService");

const conditions = ["cadeirante", "surdo", "cego", "neuroatipico"];
const expectedLevels = {
  4: [3, 1, 2, 1],
  8: [1, 3, 1, 2],
  12: [1, 1, 2, 3],
  16: [1, 1, 3, 1],
};

const question = {
  enunciado: "Pergunta",
  opcao_a: "A",
  opcao_b: "B",
  opcao_c: "C",
  opcao_d: "D",
  resposta_correta: "A",
  explicacao: "Explicação.",
};

test("derives every role level from the obstacle matrix", () => {
  for (const [position, levels] of Object.entries(expectedLevels)) {
    conditions.forEach((condition, index) => {
      assert.equal(getStructuralLevel(Number(position), condition), levels[index]);
    });
    assert.ok(getObstacleForPosition(Number(position)));
  }

  assert.equal(getObstacleForPosition(5), null);
  assert.equal(getStructuralLevel(20, "cadeirante"), null);
});

test("queries one question per participant using the room stage and derived level", async () => {
  const calls = [];
  const service = createQuizService({
    async findRandomQuestion(filters) {
      calls.push(filters);
      return { ...question };
    },
  });
  const prepared = await service.prepareQuestions({
    schoolStage: "Médio",
    position: 4,
    participantIds: ["p1", "p2", "p3", "p4"],
    playerConditions: {
      p1: "cadeirante",
      p2: "surdo",
      p3: "cego",
      p4: "neuroatipico",
    },
  });

  assert.deepEqual(
    calls.map(({ etapaEscolar, nivelEstrutural }) => [
      etapaEscolar,
      nivelEstrutural,
    ]),
    [
      ["Médio", 3],
      ["Médio", 1],
      ["Médio", 2],
      ["Médio", 1],
    ],
  );
  assert.equal(prepared.size, 4);
});

test("prepares valid questions with a null explanation", async () => {
  const service = createQuizService({
    async findRandomQuestion() {
      return { ...question, explicacao: null };
    },
  });

  const prepared = await service.prepareQuestions({
    schoolStage: "Fundamental",
    position: 4,
    participantIds: ["p1"],
    playerConditions: { p1: "cadeirante" },
  });

  assert.equal(prepared.size, 1);
  assert.equal(prepared.get("p1").explicacao, null);
});

test("rejects a round with a missing or malformed question", async () => {
  let calls = 0;
  const service = createQuizService({
    async findRandomQuestion() {
      calls += 1;
      return calls === 1 ? { ...question } : null;
    },
  });

  await assert.rejects(
    service.prepareQuestions({
      schoolStage: "Fundamental",
      position: 8,
      participantIds: ["p1", "p2"],
      playerConditions: { p1: "cadeirante", p2: "surdo" },
    }),
    QuizQuestionsUnavailableError,
  );
});

test("still rejects a question with a missing required field and null explanation", async () => {
  const service = createQuizService({
    async findRandomQuestion() {
      const { opcao_d, ...invalidQuestion } = question;
      return { ...invalidQuestion, explicacao: null };
    },
  });

  await assert.rejects(
    service.prepareQuestions({
      schoolStage: "Fundamental",
      position: 8,
      participantIds: ["p1"],
      playerConditions: { p1: "cadeirante" },
    }),
    QuizQuestionsUnavailableError,
  );
});

test("propagates repository failures without converting them to missing questions", async () => {
  const databaseFailure = new Error("database details");
  const service = createQuizService({
    async findRandomQuestion() {
      throw databaseFailure;
    },
  });

  await assert.rejects(
    service.prepareQuestions({
      schoolStage: "Superior",
      position: 12,
      participantIds: ["p1"],
      playerConditions: { p1: "cego" },
    }),
    (error) => error === databaseFailure,
  );
});
