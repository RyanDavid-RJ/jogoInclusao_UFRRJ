const OBSTACLES = {
  7: {
    name: "escada",
    levels: { cadeirante: 3, surdo: 1, cego: 2, neuroatipico: 1 },
  },
  14: {
    name: "alerta_sonoro",
    levels: { cadeirante: 1, surdo: 3, cego: 1, neuroatipico: 2 },
  },
  21: {
    name: "multidao_barulho",
    levels: { cadeirante: 1, surdo: 1, cego: 2, neuroatipico: 3 },
  },
  28: {
    name: "placa_ilegivel",
    levels: { cadeirante: 1, surdo: 1, cego: 3, neuroatipico: 1 },
  },
};

const LEGACY_OBSTACLE_ALIASES = {
  4: 7,
  8: 14,
  12: 21,
  16: 28,
};

const ANSWERS = new Set(["A", "B", "C", "D"]);

class QuizQuestionsUnavailableError extends Error {
  constructor() {
    super("A question is unavailable for this quiz round.");
    this.name = "QuizQuestionsUnavailableError";
  }
}

const getObstacleForPosition = (position) =>
  OBSTACLES[LEGACY_OBSTACLE_ALIASES[position] ?? position] ?? null;

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
    usedQuestionIds,
  }) {
    const obstacle = getObstacleForPosition(position);
    if (!obstacle || !Array.isArray(participantIds) || participantIds.length === 0) {
      throw new QuizQuestionsUnavailableError();
    }

    const roundExcludedIds = new Set();
    if (usedQuestionIds) {
      for (const id of usedQuestionIds) {
        if (Number.isSafeInteger(id) && id > 0) {
          roundExcludedIds.add(id);
        }
      }
    }

    const entries = [];
    let hasUnavailableQuestion = false;

    for (const playerId of participantIds) {
      const nivelEstrutural = getStructuralLevel(
        position,
        playerConditions[playerId],
      );
      if (!nivelEstrutural) {
        throw new QuizQuestionsUnavailableError();
      }

      const filters = {
        etapaEscolar: schoolStage,
        nivelEstrutural,
        ...(roundExcludedIds.size > 0
          ? { excludeIds: [...roundExcludedIds] }
          : {}),
      };
      const question = await questionRepository.findRandomQuestion(filters);
      if (!isValidQuestion(question)) {
        hasUnavailableQuestion = true;
        continue;
      }

      if (Number.isSafeInteger(question.id) && question.id > 0) {
        roundExcludedIds.add(question.id);
      }
      entries.push([playerId, question]);
    }

    if (hasUnavailableQuestion) {
      throw new QuizQuestionsUnavailableError();
    }

    return new Map(entries);
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
