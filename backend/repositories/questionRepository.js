const ALLOWED_SCHOOL_STAGES = new Set(["Fundamental", "Médio", "Superior"]);
const ALLOWED_ANSWERS = new Set(["A", "B", "C", "D"]);
const ALLOWED_REVIEW_STATUSES = new Set([
  "rascunho",
  "em_revisao",
  "aprovada",
  "arquivada",
]);

const QUESTION_COLUMNS = [
  "id",
  "enunciado",
  "opcao_a",
  "opcao_b",
  "opcao_c",
  "opcao_d",
  "resposta_correta",
  "explicacao",
];

class DuplicateQuestionError extends Error {
  constructor() {
    super("Já existe uma pergunta idêntica cadastrada para esta etapa e nível.");
    this.name = "DuplicateQuestionError";
    this.code = "DUPLICATE_QUESTION";
  }
}

function toPublicQuestion(row) {
  return {
    enunciado: row.enunciado,
    opcao_a: row.opcao_a,
    opcao_b: row.opcao_b,
    opcao_c: row.opcao_c,
    opcao_d: row.opcao_d,
  };
}

function normalizeExcludeIds(excludeIds) {
  if (!excludeIds) {
    return [];
  }
  const values = Array.isArray(excludeIds)
    ? excludeIds
    : excludeIds instanceof Set
      ? [...excludeIds]
      : [];
  const unique = new Set();
  for (const id of values) {
    if (Number.isSafeInteger(id) && id > 0) {
      unique.add(id);
    }
  }
  return [...unique];
}

function normalizeTags(tags) {
  if (tags === null || tags === undefined) {
    return null;
  }
  if (Array.isArray(tags)) {
    const cleaned = tags
      .map((item) => (typeof item === "string" ? item.trim() : ""))
      .filter(Boolean)
      .slice(0, 12);
    return cleaned.length > 0 ? JSON.stringify(cleaned) : null;
  }
  if (typeof tags === "string" && tags.trim()) {
    const cleaned = tags
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
      .slice(0, 12);
    return cleaned.length > 0 ? JSON.stringify(cleaned) : null;
  }
  return null;
}

function validateQuestionPayload(payload) {
  const etapaEscolar = payload?.etapa_escolar ?? payload?.etapaEscolar;
  const nivelEstrutural = Number(
    payload?.nivel_estrutural ?? payload?.nivelEstrutural,
  );
  const enunciado = payload?.enunciado;
  const opcaoA = payload?.opcao_a ?? payload?.opcaoA;
  const opcaoB = payload?.opcao_b ?? payload?.opcaoB;
  const opcaoC = payload?.opcao_c ?? payload?.opcaoC;
  const opcaoD = payload?.opcao_d ?? payload?.opcaoD;
  const respostaCorreta = payload?.resposta_correta ?? payload?.respostaCorreta;
  const explicacao = payload?.explicacao ?? null;
  const tags = payload?.tags ?? null;
  const areaTematica = payload?.area_tematica ?? payload?.areaTematica;
  const codigoBncc = payload?.codigo_bncc ?? payload?.codigoBncc;
  const statusRevisao = payload?.status_revisao ?? payload?.statusRevisao;

  if (
    !ALLOWED_SCHOOL_STAGES.has(etapaEscolar) ||
    !Number.isInteger(nivelEstrutural) ||
    nivelEstrutural < 1 ||
    nivelEstrutural > 3 ||
    [enunciado, opcaoA, opcaoB, opcaoC, opcaoD].some(
      (value) => typeof value !== "string" || value.trim().length === 0,
    ) ||
    !ALLOWED_ANSWERS.has(respostaCorreta)
  ) {
    return { error: "Dados da pergunta inválidos." };
  }

  if (statusRevisao !== undefined && !ALLOWED_REVIEW_STATUSES.has(statusRevisao)) {
    return { error: "Status de revisão inválido." };
  }

  return {
    data: {
      etapaEscolar,
      nivelEstrutural,
      enunciado: enunciado.trim(),
      opcaoA: opcaoA.trim(),
      opcaoB: opcaoB.trim(),
      opcaoC: opcaoC.trim(),
      opcaoD: opcaoD.trim(),
      respostaCorreta,
      explicacao:
        typeof explicacao === "string" ? explicacao.trim() || null : null,
      tags: Array.isArray(tags) || typeof tags === "string" ? normalizeTags(tags) : tags,
      areaTematica:
        typeof areaTematica === "string" && areaTematica.trim()
          ? areaTematica.trim().slice(0, 80)
          : null,
      codigoBncc:
        typeof codigoBncc === "string" && codigoBncc.trim()
          ? codigoBncc.trim().toUpperCase().slice(0, 32)
          : null,
      statusRevisao: statusRevisao ?? "aprovada",
      hasExtendedFields:
        areaTematica !== undefined ||
        codigoBncc !== undefined ||
        statusRevisao !== undefined,
    },
  };
}

function createQuestionRepository(pool) {
  async function executeWithGovernanceFallback(v2Sql, v2Params, v1Sql, v1Params) {
    try {
      return await pool.execute(v2Sql, v2Params);
    } catch (error) {
      if (error?.code === "ER_BAD_FIELD_ERROR") {
        return pool.execute(v1Sql, v1Params);
      }
      throw error;
    }
  }

  async function findRandomQuestion({
    etapaEscolar,
    nivelEstrutural,
    excludeIds,
  }) {
    if (!ALLOWED_SCHOOL_STAGES.has(etapaEscolar)) {
      throw new TypeError("etapaEscolar must be Fundamental, Médio, or Superior.");
    }

    if (!Number.isInteger(nivelEstrutural) || nivelEstrutural < 1 || nivelEstrutural > 3) {
      throw new TypeError("nivelEstrutural must be an integer from 1 to 3.");
    }

    const excluded = normalizeExcludeIds(excludeIds);
    if (excluded.length > 0) {
      const placeholders = excluded.map(() => "?").join(", ");
      const [filteredRows] = await executeWithGovernanceFallback(
        `SELECT ${QUESTION_COLUMNS.join(", ")}
         FROM perguntas
         WHERE etapa_escolar = ? AND nivel_estrutural = ?
           AND ativa = 1 AND status_revisao = 'aprovada'
           AND id NOT IN (${placeholders})
         ORDER BY RAND()
         LIMIT 1`,
        [etapaEscolar, nivelEstrutural, ...excluded],
        `SELECT ${QUESTION_COLUMNS.join(", ")}
         FROM perguntas
         WHERE etapa_escolar = ? AND nivel_estrutural = ? AND id NOT IN (${placeholders})
         ORDER BY RAND()
         LIMIT 1`,
        [etapaEscolar, nivelEstrutural, ...excluded],
      );
      if (filteredRows[0]) {
        return filteredRows[0];
      }
    }

    // ORDER BY RAND() is suitable for the MVP's small question bank, not necessarily a large one.
    const [rows] = await executeWithGovernanceFallback(
      `SELECT ${QUESTION_COLUMNS.join(", ")}
       FROM perguntas
       WHERE etapa_escolar = ? AND nivel_estrutural = ?
         AND ativa = 1 AND status_revisao = 'aprovada'
       ORDER BY RAND()
       LIMIT 1`,
      [etapaEscolar, nivelEstrutural],
      `SELECT ${QUESTION_COLUMNS.join(", ")}
       FROM perguntas
       WHERE etapa_escolar = ? AND nivel_estrutural = ?
       ORDER BY RAND()
       LIMIT 1`,
      [etapaEscolar, nivelEstrutural],
    );

    return rows[0] ?? null;
  }

  async function listQuestions({
    etapaEscolar,
    nivelEstrutural,
    areaTematica,
    statusRevisao,
    ativa,
    search,
    includeAnswer = false,
  } = {}) {
    const conditions = [];
    const params = [];

    if (etapaEscolar && ALLOWED_SCHOOL_STAGES.has(etapaEscolar)) {
      conditions.push("etapa_escolar = ?");
      params.push(etapaEscolar);
    }
    const levelNum = Number(nivelEstrutural);
    if (Number.isInteger(levelNum) && levelNum >= 1 && levelNum <= 3) {
      conditions.push("nivel_estrutural = ?");
      params.push(levelNum);
    }
    if (areaTematica && String(areaTematica).trim()) {
      conditions.push("area_tematica = ?");
      params.push(String(areaTematica).trim());
    }
    if (statusRevisao && ALLOWED_REVIEW_STATUSES.has(statusRevisao)) {
      conditions.push("status_revisao = ?");
      params.push(statusRevisao);
    }
    if (ativa === true || ativa === false) {
      conditions.push("ativa = ?");
      params.push(ativa ? 1 : 0);
    }
    if (search && String(search).trim()) {
      conditions.push("enunciado LIKE ?");
      params.push(`%${String(search).trim()}%`);
    }

    const basePublicColumns =
      "id, etapa_escolar, nivel_estrutural, enunciado, opcao_a, opcao_b, opcao_c, opcao_d, explicacao, tags";

    if (!includeAnswer && params.length === 0) {
      try {
        const [rows] = await pool.query(
          `SELECT ${basePublicColumns}, area_tematica, codigo_bncc, status_revisao, ativa
           FROM perguntas
           WHERE ativa = 1 AND status_revisao = 'aprovada'
           ORDER BY etapa_escolar, nivel_estrutural, id`,
        );
        return rows;
      } catch (error) {
        if (error?.code === "ER_BAD_FIELD_ERROR") {
          const [rows] = await pool.query(
            `SELECT ${basePublicColumns}
             FROM perguntas`,
          );
          return rows;
        }
        throw error;
      }
    }

    const selectColumns = includeAnswer
      ? `${basePublicColumns}, resposta_correta, area_tematica, codigo_bncc, status_revisao, ativa, criado_por, revisado_por, revisado_em, criado_em, atualizado_em`
      : `${basePublicColumns}, area_tematica, codigo_bncc, status_revisao, ativa`;

    const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    try {
      const [rows] = await pool.execute(
        `SELECT ${selectColumns}
         FROM perguntas
         ${where}
         ORDER BY etapa_escolar, nivel_estrutural, id`,
        params,
      );
      return rows;
    } catch (error) {
      if (error?.code === "ER_BAD_FIELD_ERROR") {
        const fallbackCols = includeAnswer
          ? `${basePublicColumns}, resposta_correta`
          : basePublicColumns;
        const [rows] = await pool.query(`SELECT ${fallbackCols} FROM perguntas`);
        return rows;
      }
      throw error;
    }
  }

  async function createQuestion(data, { userId = null } = {}) {
    const baseParams = [
      data.etapaEscolar,
      data.nivelEstrutural,
      data.enunciado,
      data.opcaoA,
      data.opcaoB,
      data.opcaoC,
      data.opcaoD,
      data.respostaCorreta,
      data.explicacao,
      data.tags,
    ];

    try {
      if (data.hasExtendedFields || userId !== null) {
        const [result] = await executeWithGovernanceFallback(
          `INSERT INTO perguntas
            (etapa_escolar, nivel_estrutural, enunciado, opcao_a, opcao_b,
             opcao_c, opcao_d, resposta_correta, explicacao, tags,
             area_tematica, codigo_bncc, status_revisao, criado_por)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            ...baseParams,
            data.areaTematica,
            data.codigoBncc,
            data.statusRevisao,
            userId,
          ],
          `INSERT INTO perguntas
            (etapa_escolar, nivel_estrutural, enunciado, opcao_a, opcao_b,
             opcao_c, opcao_d, resposta_correta, explicacao, tags)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          baseParams,
        );
        return { id: result.insertId };
      }

      const [result] = await pool.execute(
        `INSERT INTO perguntas
          (etapa_escolar, nivel_estrutural, enunciado, opcao_a, opcao_b,
           opcao_c, opcao_d, resposta_correta, explicacao, tags)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        baseParams,
      );
      return { id: result.insertId };
    } catch (error) {
      if (error?.code === "ER_DUP_ENTRY") {
        throw new DuplicateQuestionError();
      }
      throw error;
    }
  }

  async function updateQuestion(id, data) {
    if (!Number.isInteger(id) || id <= 0) {
      throw new TypeError("ID de pergunta inválido.");
    }
    try {
      const [result] = await executeWithGovernanceFallback(
        `UPDATE perguntas
         SET etapa_escolar = ?,
             nivel_estrutural = ?,
             enunciado = ?,
             opcao_a = ?,
             opcao_b = ?,
             opcao_c = ?,
             opcao_d = ?,
             resposta_correta = ?,
             explicacao = ?,
             tags = ?,
             area_tematica = ?,
             codigo_bncc = ?,
             status_revisao = ?
         WHERE id = ?`,
        [
          data.etapaEscolar,
          data.nivelEstrutural,
          data.enunciado,
          data.opcaoA,
          data.opcaoB,
          data.opcaoC,
          data.opcaoD,
          data.respostaCorreta,
          data.explicacao,
          data.tags,
          data.areaTematica,
          data.codigoBncc,
          data.statusRevisao,
          id,
        ],
        `UPDATE perguntas
         SET etapa_escolar = ?,
             nivel_estrutural = ?,
             enunciado = ?,
             opcao_a = ?,
             opcao_b = ?,
             opcao_c = ?,
             opcao_d = ?,
             resposta_correta = ?,
             explicacao = ?,
             tags = ?
         WHERE id = ?`,
        [
          data.etapaEscolar,
          data.nivelEstrutural,
          data.enunciado,
          data.opcaoA,
          data.opcaoB,
          data.opcaoC,
          data.opcaoD,
          data.respostaCorreta,
          data.explicacao,
          data.tags,
          id,
        ],
      );
      return result.affectedRows > 0;
    } catch (error) {
      if (error?.code === "ER_DUP_ENTRY") {
        throw new DuplicateQuestionError();
      }
      throw error;
    }
  }

  async function updateQuestionStatus(
    id,
    { statusRevisao, ativa },
    { reviewerId = null } = {},
  ) {
    if (!Number.isInteger(id) || id <= 0) {
      throw new TypeError("ID de pergunta inválido.");
    }
    const updates = [];
    const params = [];

    if (statusRevisao !== undefined) {
      if (!ALLOWED_REVIEW_STATUSES.has(statusRevisao)) {
        throw new TypeError("Status de revisão inválido.");
      }
      updates.push("status_revisao = ?");
      params.push(statusRevisao);
      if (statusRevisao === "aprovada" && reviewerId) {
        updates.push("revisado_por = ?", "revisado_em = NOW()");
        params.push(reviewerId);
      }
    }

    if (ativa !== undefined) {
      if (typeof ativa !== "boolean") {
        throw new TypeError("ativa deve ser booleano.");
      }
      updates.push("ativa = ?");
      params.push(ativa ? 1 : 0);
    }

    if (updates.length === 0) {
      return false;
    }

    params.push(id);
    const [result] = await pool.execute(
      `UPDATE perguntas SET ${updates.join(", ")} WHERE id = ?`,
      params,
    );
    return result.affectedRows > 0;
  }

  return {
    findRandomQuestion,
    listQuestions,
    createQuestion,
    updateQuestion,
    updateQuestionStatus,
  };
}

module.exports = {
  ALLOWED_REVIEW_STATUSES,
  ALLOWED_SCHOOL_STAGES,
  DuplicateQuestionError,
  createQuestionRepository,
  toPublicQuestion,
  validateQuestionPayload,
};
