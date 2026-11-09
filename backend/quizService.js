const OBSTACLES = {
  4: {
    name: "escada",
    levels: { cadeirante: 3, surdo: 1, cego: 2, neuroatipico: 1 },
  },
  8: {
    name: "alerta_sonoro",
    levels: { cadeirante: 1, surdo: 3, cego: 1, neuroatipico: 2 },
  },
  12: {
    name: "multidao_barulho",
    levels: { cadeirante: 1, surdo: 1, cego: 2, neuroatipico: 3 },
  },
  16: {
    name: "placa_ilegivel",
    levels: { cadeirante: 1, surdo: 1, cego: 3, neuroatipico: 1 },
  },
};

const ANSWERS = new Set(["A", "B", "C", "D"]);

class QuizQuestionsUnavailableError extends Error {
  constructor() {
    super("A question is unavailable for this quiz round.");
    this.name = "QuizQuestionsUnavailableError";
  }
}

const getObstacleForPosition = (position) => OBSTACLES[position] ?? null;

const getStructuralLevel = (position, condition) =>
  getObstacleForPosition(position)?.levels[condition] ?? null;

const isValidQuestion = (question) =>
  question &&
  typeof question.enunciado === "string" &&
  question.enunciado.trim() !== "" &&
  ["opcao_a", "opcao_b", "opcao_c", "opcao_d"].every(
    (field) =>
      typeof question[field] === "string" && question[field].trim() !== "",
  ) &&
  ANSWERS.has(question.resposta_correta) &&
  (question.explicacao === null ||
    (typeof question.explicacao === "string" &&
      question.explicacao.trim() !== ""));

function createQuizService(questionRepository) {
  if (!questionRepository || typeof questionRepository.findRandomQuestion !== "function") {
    throw new TypeError("A question repository is required.");
  }

  async function prepareQuestions({
    schoolStage,
    position,
    participantIds,
    playerConditions,
  }) {
    const obstacle = getObstacleForPosition(position);
    if (!obstacle || !Array.isArray(participantIds) || participantIds.length === 0) {
      throw new QuizQuestionsUnavailableError();
    }

    const questions = await Promise.all(
      participantIds.map(async (playerId) => {
        const nivelEstrutural = getStructuralLevel(
          position,
          playerConditions[playerId],
        );
        if (!nivelEstrutural) {
          throw new QuizQuestionsUnavailableError();
        }

        const question = await questionRepository.findRandomQuestion({
          etapaEscolar: schoolStage,
          nivelEstrutural,
        });
        if (!isValidQuestion(question)) {
          throw new QuizQuestionsUnavailableError();
        }

        return [playerId, question];
      }),
    );

    return new Map(questions);
  }

  return { prepareQuestions };
}

module.exports = {
  QuizQuestionsUnavailableError,
  createQuizService,
  getObstacleForPosition,
  getStructuralLevel,
  isValidQuestion,
};
