const VALID_STAGES = new Set(["Fundamental", "Médio", "Superior"]);
const CLASS_CODE_REGEX = /^[A-Z0-9_-]{3,16}$/;

function normalizeClassCode(raw) {
  return typeof raw === "string" ? raw.trim().toUpperCase() : "";
}

function createClassRepository(pool) {
  async function findByCodigo(codigo) {
    const normalized = normalizeClassCode(codigo);
    if (!CLASS_CODE_REGEX.test(normalized)) {
      return null;
    }
    const [rows] = await pool.execute(
      `SELECT id, professor_id, codigo, nome, instituicao, etapa_padrao, ativa, criado_em
       FROM turmas
       WHERE codigo = ? AND ativa = 1
       LIMIT 1`,
      [normalized],
    );
    return rows[0] ?? null;
  }

  async function listClasses({ professorId, isAdmin = false } = {}) {
    const sql = isAdmin
      ? `SELECT t.id, t.professor_id, t.codigo, t.nome, t.instituicao,
                t.etapa_padrao, t.ativa, t.criado_em,
                COUNT(p.id) AS total_partidas
         FROM turmas AS t
         LEFT JOIN partidas AS p ON p.turma_id = t.id
         GROUP BY t.id, t.professor_id, t.codigo, t.nome, t.instituicao,
                  t.etapa_padrao, t.ativa, t.criado_em
         ORDER BY t.criado_em DESC`
      : `SELECT t.id, t.professor_id, t.codigo, t.nome, t.instituicao,
                t.etapa_padrao, t.ativa, t.criado_em,
                COUNT(p.id) AS total_partidas
         FROM turmas AS t
         LEFT JOIN partidas AS p ON p.turma_id = t.id
         WHERE t.professor_id = ?
         GROUP BY t.id, t.professor_id, t.codigo, t.nome, t.instituicao,
                  t.etapa_padrao, t.ativa, t.criado_em
         ORDER BY t.criado_em DESC`;

    const [rows] = isAdmin
      ? await pool.query(sql)
      : await pool.execute(sql, [professorId]);
    return rows;
  }

  async function createClass({
    professorId,
    codigo,
    nome,
    instituicao = "UFRRJ",
    etapaPadrao,
  }) {
    const normalizedCode = normalizeClassCode(codigo);
    const trimmedName = typeof nome === "string" ? nome.trim() : "";
    const trimmedInst =
      typeof instituicao === "string" && instituicao.trim()
        ? instituicao.trim().slice(0, 120)
        : "UFRRJ";

    if (!CLASS_CODE_REGEX.test(normalizedCode)) {
      throw new TypeError(
        "O código da turma deve ter 3 a 16 caracteres (letras, números, _ ou -).",
      );
    }
    if (trimmedName.length < 2 || trimmedName.length > 120) {
      throw new TypeError("O nome da turma deve ter entre 2 e 120 caracteres.");
    }
    if (!VALID_STAGES.has(etapaPadrao)) {
      throw new TypeError("Etapa padrão inválida.");
    }

    const [result] = await pool.execute(
      `INSERT INTO turmas (professor_id, codigo, nome, instituicao, etapa_padrao)
       VALUES (?, ?, ?, ?, ?)`,
      [professorId, normalizedCode, trimmedName, trimmedInst, etapaPadrao],
    );

    return {
      id: result.insertId,
      professor_id: professorId,
      codigo: normalizedCode,
      nome: trimmedName,
      instituicao: trimmedInst,
      etapa_padrao: etapaPadrao,
      ativa: 1,
    };
  }

  async function updateClass(
    id,
    { nome, instituicao, etapaPadrao, ativa },
    { professorId, isAdmin = false } = {},
  ) {
    if (!Number.isInteger(id) || id <= 0) {
      throw new TypeError("ID de turma inválido.");
    }

    const updates = [];
    const params = [];

    if (nome !== undefined) {
      const trimmed = typeof nome === "string" ? nome.trim() : "";
      if (trimmed.length < 2 || trimmed.length > 120) {
        throw new TypeError("O nome da turma deve ter entre 2 e 120 caracteres.");
      }
      updates.push("nome = ?");
      params.push(trimmed);
    }

    if (instituicao !== undefined) {
      const trimmed = typeof instituicao === "string" ? instituicao.trim() : "";
      updates.push("instituicao = ?");
      params.push(trimmed ? trimmed.slice(0, 120) : null);
    }

    if (etapaPadrao !== undefined) {
      if (!VALID_STAGES.has(etapaPadrao)) {
        throw new TypeError("Etapa padrão inválida.");
      }
      updates.push("etapa_padrao = ?");
      params.push(etapaPadrao);
    }

    if (ativa !== undefined) {
      if (typeof ativa !== "boolean") {
        throw new TypeError("ativa deve ser booleano.");
      }
      updates.push("ativa = ?");
      params.push(ativa ? 1 : 0);
    }

    if (updates.length === 0) {
      return null;
    }

    let whereClause = "WHERE id = ?";
    params.push(id);
    if (!isAdmin) {
      whereClause += " AND professor_id = ?";
      params.push(professorId);
    }

    const [result] = await pool.execute(
      `UPDATE turmas SET ${updates.join(", ")} ${whereClause}`,
      params,
    );
    return result.affectedRows > 0;
  }

  return {
    findByCodigo,
    listClasses,
    createClass,
    updateClass,
  };
}

module.exports = {
  CLASS_CODE_REGEX,
  createClassRepository,
  normalizeClassCode,
};
