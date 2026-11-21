const ALLOWED_STAGES = new Set(["Fundamental", "Médio", "Superior"]);
const ALLOWED_STATUSES = new Set([
  "rascunho",
  "em_revisao",
  "aprovada",
  "arquivada",
]);

function escapeCsvCell(value) {
  if (value === null || value === undefined) {
    return "";
  }
  let text = value instanceof Date ? value.toISOString() : String(value);
  if (/^[=+\-@\t\r]/.test(text)) {
    text = `'${text}`;
  }
  if (/[",\r\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function toCsv(rows, columns = null) {
  const safeRows = Array.isArray(rows) ? rows : [];
  const headers =
    columns && columns.length > 0
      ? columns
      : safeRows.length > 0
        ? Object.keys(safeRows[0])
        : [];

  if (headers.length === 0) {
    return "";
  }

  const lines = [headers.map(escapeCsvCell).join(",")];
  for (const row of safeRows) {
    lines.push(headers.map((col) => escapeCsvCell(row[col])).join(","));
  }
  return lines.join("\r\n");
}

function createAnalyticsRepository(pool) {
  async function getOverview({ etapaEscolar, turmaCodigo, matrizCodigo } = {}) {
    const conditions = ["pa.motivo_fim <> 'abandoned'"];
    const params = [];

    if (etapaEscolar && ALLOWED_STAGES.has(etapaEscolar)) {
      conditions.push("pa.etapa_escolar = ?");
      params.push(etapaEscolar);
    }
    if (turmaCodigo) {
      conditions.push("t.codigo = ?");
      params.push(String(turmaCodigo).trim().toUpperCase());
    }
    if (matrizCodigo) {
      conditions.push("m.codigo = ?");
      params.push(String(matrizCodigo).trim());
    }

    const where = `WHERE ${conditions.join(" AND ")}`;

    const [matchRows] = await pool.execute(
      `SELECT COUNT(*) AS total_partidas,
              COALESCE(SUM(pa.total_jogadores), 0) AS total_participacoes,
              COALESCE(SUM(pa.total_obstaculos), 0) AS total_obstaculos,
              COALESCE(SUM(pa.total_impulsos), 0) AS total_impulsos,
              ROUND(AVG(pa.duracao_seg), 1) AS duracao_media_seg,
              ROUND(AVG(pa.rodadas_jogadas), 2) AS rodadas_media
       FROM partidas AS pa
       LEFT JOIN turmas AS t ON t.id = pa.turma_id
       LEFT JOIN matrizes_equidade AS m ON m.id = pa.matriz_id
       ${where}`,
      params,
    );

    const [quizRows] = await pool.execute(
      `SELECT COUNT(qres.id) AS total_respostas,
              COALESCE(SUM(qres.correta), 0) AS total_acertos,
              ROUND(AVG(qres.correta), 4) AS taxa_acerto_global,
              ROUND(AVG(qres.tempo_resposta_ms), 1) AS tempo_medio_ms
       FROM quiz_respostas AS qres
       INNER JOIN quiz_rodadas AS qrod ON qrod.id = qres.quiz_rodada_id
       INNER JOIN partidas AS pa ON pa.id = qrod.partida_id
       LEFT JOIN turmas AS t ON t.id = pa.turma_id
       LEFT JOIN matrizes_equidade AS m ON m.id = pa.matriz_id
       ${where}`,
      params,
    );

    const [stageRows] = await pool.execute(
      `SELECT pa.etapa_escolar, COUNT(*) AS quantidade
       FROM partidas AS pa
       LEFT JOIN turmas AS t ON t.id = pa.turma_id
       LEFT JOIN matrizes_equidade AS m ON m.id = pa.matriz_id
       ${where}
       GROUP BY pa.etapa_escolar`,
      params,
    );

    return {
      partidas: matchRows[0] || {},
      quiz: quizRows[0] || {},
      porEtapa: stageRows,
    };
  }

  async function getQuestionsPerformance({
    etapaEscolar,
    nivelEstrutural,
    areaTematica,
    statusRevisao,
  } = {}) {
    const conditions = [];
    const params = [];

    if (etapaEscolar && ALLOWED_STAGES.has(etapaEscolar)) {
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
    if (statusRevisao && ALLOWED_STATUSES.has(statusRevisao)) {
      conditions.push("status_revisao = ?");
      params.push(statusRevisao);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const [rows] = await pool.execute(
      `SELECT pergunta_id, etapa_escolar, nivel_estrutural, area_tematica,
              status_revisao, ativa, enunciado, total_aplicacoes,
              total_respondidas, total_acertos, taxa_acerto_respondidas,
              indice_facilidade_global, taxa_sem_resposta, tempo_medio_ms,
              escolhas_a, escolhas_b, escolhas_c, escolhas_d
       FROM vw_desempenho_perguntas
       ${where}
       ORDER BY etapa_escolar, nivel_estrutural, pergunta_id`,
      params,
    );
    return rows;
  }

  async function getEquityAnalysis({ etapaEscolar, matrizCodigo } = {}) {
    const conditions = [];
    const params = [];

    if (etapaEscolar && ALLOWED_STAGES.has(etapaEscolar)) {
      conditions.push("etapa_escolar = ?");
      params.push(etapaEscolar);
    }
    if (matrizCodigo && String(matrizCodigo).trim()) {
      conditions.push("matriz_codigo = ?");
      params.push(String(matrizCodigo).trim());
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const [porCondicao] = await pool.execute(
      `SELECT etapa_escolar, matriz_codigo, condicao, total_participacoes,
              total_vitorias, taxa_vitoria, posicao_media, media_dado_geral,
              media_pontos_quiz, taxa_acerto_quiz, total_nivel1, total_nivel2,
              total_nivel3
       FROM vw_equidade_por_condicao
       ${where}
       ORDER BY etapa_escolar, matriz_codigo, condicao`,
      params,
    );

    const [matrizEmpirica] = await pool.execute(
      `SELECT etapa_escolar, matriz_codigo, obstaculo_nome, condicao,
              nivel_estrutural, total_observacoes, total_respondidas,
              total_acertos, taxa_acerto_global, taxa_acerto_respondidas,
              taxa_timeout_ou_saida, tempo_medio_ms, media_pontos
       FROM vw_matriz_empirica
       ${where}
       ORDER BY etapa_escolar, matriz_codigo, obstaculo_nome, condicao`,
      params,
    );

    return { porCondicao, matrizEmpirica };
  }

  async function exportAnonymousDataset({
    dataset = "participacoes",
    etapaEscolar,
    turmaCodigo,
    matrizCodigo,
  } = {}) {
    const isResponses = dataset === "respostas";
    const viewName = isResponses
      ? "vw_dataset_anonimo_respostas"
      : "vw_dataset_anonimo_participacoes";

    const conditions = [];
    const params = [];

    if (etapaEscolar && ALLOWED_STAGES.has(etapaEscolar)) {
      conditions.push("etapa_escolar = ?");
      params.push(etapaEscolar);
    }
    if (turmaCodigo && String(turmaCodigo).trim()) {
      conditions.push("turma_codigo = ?");
      params.push(String(turmaCodigo).trim().toUpperCase());
    }
    if (matrizCodigo && String(matrizCodigo).trim()) {
      conditions.push("matriz_codigo = ?");
      params.push(String(matrizCodigo).trim());
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const orderBy = isResponses ? "ORDER BY iniciada_em DESC" : "ORDER BY finalizada_em DESC";

    const [rows] = await pool.execute(
      `SELECT * FROM ${viewName} ${where} ${orderBy} LIMIT 10000`,
      params,
    );
    return rows;
  }

  return {
    getOverview,
    getQuestionsPerformance,
    getEquityAnalysis,
    exportAnonymousDataset,
  };
}

module.exports = {
  createAnalyticsRepository,
  escapeCsvCell,
  toCsv,
};
