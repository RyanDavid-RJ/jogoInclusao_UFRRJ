const crypto = require("node:crypto");

function safeEqualStrings(left, right) {
  if (typeof left !== "string" || typeof right !== "string") {
    return false;
  }
  const leftBuf = Buffer.from(left);
  const rightBuf = Buffer.from(right);
  if (leftBuf.length !== rightBuf.length) {
    return false;
  }
  return crypto.timingSafeEqual(leftBuf, rightBuf);
}

function extractBearerToken(req) {
  const header = req.get?.("authorization") || req.headers?.authorization;
  if (typeof header !== "string") {
    return null;
  }
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : null;
}

function createAuthMiddleware({ authService, questionAdminToken } = {}) {
  const normalizedAdminToken =
    typeof questionAdminToken === "string" ? questionAdminToken.trim() : "";

  const hasValidAdminToken = (req) => {
    if (!normalizedAdminToken) {
      return false;
    }
    const provided = req.get?.("x-question-admin-token");
    return Boolean(provided) && safeEqualStrings(provided, normalizedAdminToken);
  };

  const attachAuth = (req, _res, next) => {
    const token = extractBearerToken(req);
    req.auth = token && authService ? authService.verifyAppToken(token) : null;
    req.isAdminToken = hasValidAdminToken(req);
    next();
  };

  const requireAuth = (req, res, next) => {
    if (!req.auth) {
      return res.status(401).json({ error: "Autenticação obrigatória." });
    }
    return next();
  };

  const requireRole = (...allowedRoles) => (req, res, next) => {
    if (!req.auth) {
      return res.status(401).json({ error: "Autenticação obrigatória." });
    }
    if (!allowedRoles.includes(req.auth.role)) {
      return res.status(403).json({ error: "Permissão insuficiente para esta ação." });
    }
    return next();
  };

  const requireQuestionManager = (req, res, next) => {
    if (req.isAdminToken) {
      return next();
    }
    if (req.auth && ["professor", "admin"].includes(req.auth.role)) {
      return next();
    }
    if (!normalizedAdminToken && !authService?.isJwtConfigured?.()) {
      return res.status(503).json({
        error: "Cadastro de perguntas administrativas não está configurado.",
      });
    }
    if (req.auth) {
      return res.status(403).json({
        error: "Somente professores ou administradores podem gerenciar perguntas.",
      });
    }
    return res.status(401).json({ error: "Credencial administrativa inválida." });
  };

  return {
    attachAuth,
    hasValidAdminToken,
    requireAuth,
    requireRole,
    requireQuestionManager,
  };
}

module.exports = {
  createAuthMiddleware,
  extractBearerToken,
  safeEqualStrings,
};
