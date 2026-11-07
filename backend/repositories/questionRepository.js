const ALLOWED_SCHOOL_STAGES = new Set(["Fundamental", "Médio", "Superior"]);

const QUESTION_COLUMNS = [
  "enunciado",
  "opcao_a",
  "opcao_b",
  "opcao_c",
  "opcao_d",
  "resposta_correta",
  "explicacao",
];

function toPublicQuestion(row) {
  return {
    enunciado: row.enunciado,
    opcao_a: row.opcao_a,
    opcao_b: row.opcao_b,
    opcao_c: row.opcao_c,
    opcao_d: row.opcao_d,
  };
}

function createQuestionRepository(pool) {
  async function findRandomQuestion({ etapaEscolar, nivelEstrutural }) {
    if (!ALLOWED_SCHOOL_STAGES.has(etapaEscolar)) {
      throw new TypeError("etapaEscolar must be Fundamental, Médio, or Superior.");
    }

    if (!Number.isInteger(nivelEstrutural) || nivelEstrutural < 1 || nivelEstrutural > 3) {
      throw new TypeError("nivelEstrutural must be an integer from 1 to 3.");
    }

    // ORDER BY RAND() is suitable for the MVP's small question bank, not necessarily a large one.
    const [rows] = await pool.execute(
      `SELECT ${QUESTION_COLUMNS.join(", ")}
       FROM ludo_equidade.perguntas
       WHERE etapa_escolar = ? AND nivel_estrutural = ?
       ORDER BY RAND()
       LIMIT 1`,
      [etapaEscolar, nivelEstrutural],
    );

    return rows[0] ?? null;
  }

  return { findRandomQuestion };
}

module.exports = { createQuestionRepository, toPublicQuestion };
