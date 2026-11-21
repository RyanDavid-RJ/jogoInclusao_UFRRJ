const { randomUUID } = require("node:crypto");

const VALID_SYSTEM_ROLES = new Set(["jogador", "professor", "admin"]);
const VALID_AVATAR_IDS = new Set([
  "coelho",
  "gato",
  "urso",
  "raposa",
  "pinguim",
  "coruja",
  "sapo",
  "leao",
]);

function deriveDefaultNickname(nome) {
  const firstWord = String(nome || "Jogador").trim().split(/\s+/)[0] || "Jogador";
  return firstWord.slice(0, 16);
}

function toSafeUser(row) {
  if (!row) {
    return null;
  }
  return {
    id: row.id,
    uuid: row.uuid,
    email: row.email,
    nome: row.nome,
    apelidoPadrao: row.apelido_padrao || deriveDefaultNickname(row.nome),
    avatarPadrao: row.avatar_padrao || "coelho",
    fotoUrl: row.foto_url ?? null,
    role: row.papel_sistema,
    consentimentoPesquisa: Boolean(row.consentimento_pesquisa),
    consentimentoEm: row.consentimento_em ?? null,
    ativo: Boolean(row.ativo),
    ultimoLoginEm: row.ultimo_login_em ?? null,
    criadoEm: row.criado_em ?? null,
  };
}

function createUserRepository(pool, { bootstrapAdminEmails = [] } = {}) {
  const adminEmails = new Set(
    (Array.isArray(bootstrapAdminEmails)
      ? bootstrapAdminEmails
      : String(bootstrapAdminEmails || "").split(","))
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  );

  async function findById(id) {
    if (!Number.isInteger(id) || id <= 0) {
      return null;
    }
    const [rows] = await pool.execute(
      `SELECT id, uuid, email, nome, apelido_padrao, avatar_padrao, foto_url,
              papel_sistema, consentimento_pesquisa, consentimento_em, ativo,
              ultimo_login_em, criado_em
       FROM usuarios
       WHERE id = ?
       LIMIT 1`,
      [id],
    );
    return toSafeUser(rows[0] ?? null);
  }

  async function upsertGoogleUser({ googleSub, email, nome, fotoUrl = null }) {
    const normalizedEmail = String(email || "").trim().toLowerCase();
    const isBootstrapAdmin = adminEmails.has(normalizedEmail);

    const [existingRows] = await pool.execute(
      `SELECT id, uuid, email, nome, apelido_padrao, avatar_padrao, foto_url,
              papel_sistema, consentimento_pesquisa, consentimento_em, ativo,
              ultimo_login_em, criado_em
       FROM usuarios
       WHERE google_sub = ? OR email = ?
       LIMIT 1`,
      [googleSub, normalizedEmail],
    );

    if (existingRows[0]) {
      const existing = existingRows[0];
      const nextRole = isBootstrapAdmin ? "admin" : existing.papel_sistema;
      await pool.execute(
        `UPDATE usuarios
         SET google_sub = ?,
             nome = ?,
             foto_url = ?,
             papel_sistema = ?,
             ultimo_login_em = NOW()
         WHERE id = ?`,
        [googleSub, nome, fotoUrl, nextRole, existing.id],
      );
      return findById(existing.id);
    }

    const userUuid = randomUUID();
    const defaultNick = deriveDefaultNickname(nome);
    const initialRole = isBootstrapAdmin ? "admin" : "jogador";

    const [result] = await pool.execute(
      `INSERT INTO usuarios
        (uuid, google_sub, email, nome, apelido_padrao, avatar_padrao, foto_url,
         papel_sistema, ultimo_login_em)
       VALUES (?, ?, ?, ?, ?, 'coelho', ?, ?, NOW())`,
      [userUuid, googleSub, normalizedEmail, nome, defaultNick, fotoUrl, initialRole],
    );

    return findById(result.insertId);
  }

  async function updatePreferences(
    id,
    { apelidoPadrao, avatarPadrao, consentimentoPesquisa },
  ) {
    const updates = [];
    const params = [];

    if (apelidoPadrao !== undefined) {
      const trimmed = typeof apelidoPadrao === "string" ? apelidoPadrao.trim() : "";
      if (trimmed.length < 2 || trimmed.length > 16) {
        throw new TypeError("O apelido deve ter entre 2 e 16 caracteres.");
      }
      updates.push("apelido_padrao = ?");
      params.push(trimmed);
    }

    if (avatarPadrao !== undefined) {
      const normalized =
        typeof avatarPadrao === "string" ? avatarPadrao.trim().toLowerCase() : "";
      if (!VALID_AVATAR_IDS.has(normalized)) {
        throw new TypeError("Avatar inválido.");
      }
      updates.push("avatar_padrao = ?");
      params.push(normalized);
    }

    if (consentimentoPesquisa !== undefined) {
      if (typeof consentimentoPesquisa !== "boolean") {
        throw new TypeError("consentimentoPesquisa deve ser booleano.");
      }
      updates.push("consentimento_pesquisa = ?");
      params.push(consentimentoPesquisa ? 1 : 0);
      updates.push(
        consentimentoPesquisa ? "consentimento_em = NOW()" : "consentimento_em = NULL",
      );
    }

    if (updates.length === 0) {
      return findById(id);
    }

    params.push(id);
    await pool.execute(
      `UPDATE usuarios SET ${updates.join(", ")} WHERE id = ?`,
      params,
    );
    return findById(id);
  }

  async function listUsers({ limit = 50, offset = 0 } = {}) {
    const safeLimit = Math.max(1, Math.min(200, Math.trunc(Number(limit)) || 50));
    const safeOffset = Math.max(0, Math.min(10000, Math.trunc(Number(offset)) || 0));
    const [rows] = await pool.query(
      `SELECT id, uuid, email, nome, apelido_padrao, avatar_padrao, foto_url,
              papel_sistema, consentimento_pesquisa, consentimento_em, ativo,
              ultimo_login_em, criado_em
       FROM usuarios
       ORDER BY criado_em DESC
       LIMIT ${safeLimit} OFFSET ${safeOffset}`,
    );
    return rows.map(toSafeUser);
  }

  async function updateRole(id, role) {
    if (!Number.isInteger(id) || id <= 0) {
      throw new TypeError("ID de usuário inválido.");
    }
    if (!VALID_SYSTEM_ROLES.has(role)) {
      throw new TypeError("Papel de sistema inválido.");
    }
    const [result] = await pool.execute(
      `UPDATE usuarios SET papel_sistema = ? WHERE id = ?`,
      [role, id],
    );
    if (result.affectedRows === 0) {
      return null;
    }
    return findById(id);
  }

  return {
    findById,
    upsertGoogleUser,
    updatePreferences,
    listUsers,
    updateRole,
  };
}

module.exports = {
  VALID_SYSTEM_ROLES,
  createUserRepository,
  toSafeUser,
};
