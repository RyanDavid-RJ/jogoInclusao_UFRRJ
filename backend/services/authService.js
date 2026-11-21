const crypto = require("node:crypto");

const GOOGLE_JWKS_URL = "https://www.googleapis.com/oauth2/v3/certs";
const GOOGLE_ISSUERS = new Set([
  "https://accounts.google.com",
  "accounts.google.com",
]);
const DEFAULT_TOKEN_TTL_SEC = 7 * 24 * 60 * 60; // 7 days

function base64UrlEncode(input) {
  const buffer = Buffer.isBuffer(input) ? input : Buffer.from(String(input));
  return buffer
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function base64UrlDecode(segment) {
  if (typeof segment !== "string" || segment.length === 0) {
    throw new Error("Invalid base64url segment.");
  }
  const normalized = segment.replace(/-/g, "+").replace(/_/g, "/");
  const padding = normalized.length % 4 === 0 ? "" : "=".repeat(4 - (normalized.length % 4));
  return Buffer.from(normalized + padding, "base64");
}

function parseJwt(token) {
  if (typeof token !== "string") {
    throw new Error("Token must be a string.");
  }
  const parts = token.trim().split(".");
  if (parts.length !== 3 || parts.some((part) => part.length === 0)) {
    throw new Error("Malformed JWT.");
  }
  const [headerPart, payloadPart, signaturePart] = parts;
  const header = JSON.parse(base64UrlDecode(headerPart).toString("utf8"));
  const payload = JSON.parse(base64UrlDecode(payloadPart).toString("utf8"));
  const signature = base64UrlDecode(signaturePart);

  return {
    header,
    payload,
    signature,
    signingInput: `${headerPart}.${payloadPart}`,
  };
}

function parseMaxAgeSeconds(cacheControlHeader) {
  if (typeof cacheControlHeader !== "string") {
    return 3600;
  }
  const match = cacheControlHeader.match(/max-age=(\d+)/i);
  if (!match) {
    return 3600;
  }
  const parsed = Number(match[1]);
  return Number.isFinite(parsed) && parsed > 0 ? Math.min(parsed, 86_400) : 3600;
}

class AuthError extends Error {
  constructor(code, message, statusCode = 401) {
    super(message);
    this.name = "AuthError";
    this.code = code;
    this.statusCode = statusCode;
  }
}

function createAuthService({
  jwtSecret = "",
  googleClientIds = [],
  tokenTtlSec = DEFAULT_TOKEN_TTL_SEC,
  now = Date.now,
  fetchFn = globalThis.fetch,
  verifyGoogleTokenOverride = null,
} = {}) {
  const normalizedSecret = typeof jwtSecret === "string" ? jwtSecret.trim() : "";
  const allowedAudiences = new Set(
    (Array.isArray(googleClientIds)
      ? googleClientIds
      : String(googleClientIds || "").split(","))
      .map((id) => id.trim())
      .filter(Boolean),
  );

  let jwksCache = {
    keysByKid: new Map(),
    expiresAt: 0,
  };

  const isJwtConfigured = () => normalizedSecret.length >= 16;
  const isGoogleConfigured = () =>
    Boolean(verifyGoogleTokenOverride) ||
    (isJwtConfigured() && allowedAudiences.size > 0);
  const getPrimaryGoogleClientId = () => {
    if (!isGoogleConfigured()) {
      return null;
    }
    const first = allowedAudiences.values().next().value;
    return first || null;
  };

  function signAppToken(user) {
    if (!isJwtConfigured()) {
      throw new AuthError(
        "AUTH_NOT_CONFIGURED",
        "Autenticação não está configurada no servidor.",
        503,
      );
    }

    const issuedAt = Math.floor(now() / 1000);
    const header = { alg: "HS256", typ: "JWT" };
    const payload = {
      sub: user.id,
      uuid: user.uuid,
      role: user.papel_sistema || user.role || "jogador",
      iat: issuedAt,
      exp: issuedAt + tokenTtlSec,
    };

    const headerPart = base64UrlEncode(JSON.stringify(header));
    const payloadPart = base64UrlEncode(JSON.stringify(payload));
    const signingInput = `${headerPart}.${payloadPart}`;
    const signature = crypto
      .createHmac("sha256", normalizedSecret)
      .update(signingInput)
      .digest();

    return `${signingInput}.${base64UrlEncode(signature)}`;
  }

  function verifyAppToken(token) {
    if (!isJwtConfigured()) {
      return null;
    }

    try {
      const { header, payload, signature, signingInput } = parseJwt(token);
      if (header?.alg !== "HS256") {
        return null;
      }

      const expectedSignature = crypto
        .createHmac("sha256", normalizedSecret)
        .update(signingInput)
        .digest();

      if (
        signature.length !== expectedSignature.length ||
        !crypto.timingSafeEqual(signature, expectedSignature)
      ) {
        return null;
      }

      const nowSec = Math.floor(now() / 1000);
      if (typeof payload?.exp !== "number" || payload.exp <= nowSec) {
        return null;
      }

      if (
        !Number.isInteger(payload.sub) ||
        payload.sub <= 0 ||
        typeof payload.uuid !== "string" ||
        !["jogador", "professor", "admin"].includes(payload.role)
      ) {
        return null;
      }

      return {
        userId: payload.sub,
        uuid: payload.uuid,
        role: payload.role,
      };
    } catch {
      return null;
    }
  }

  async function loadGooglePublicKey(kid, { forceRefresh = false } = {}) {
    if (!forceRefresh && jwksCache.expiresAt > now() && jwksCache.keysByKid.has(kid)) {
      return jwksCache.keysByKid.get(kid);
    }

    if (typeof fetchFn !== "function") {
      throw new AuthError(
        "GOOGLE_CERTS_UNAVAILABLE",
        "Não foi possível verificar as credenciais do Google.",
        503,
      );
    }

    const response = await fetchFn(GOOGLE_JWKS_URL);
    if (!response.ok) {
      throw new AuthError(
        "GOOGLE_CERTS_UNAVAILABLE",
        "Não foi possível obter as chaves públicas do Google.",
        503,
      );
    }

    const body = await response.json();
    const keys = Array.isArray(body?.keys) ? body.keys : [];
    const nextMap = new Map();
    for (const jwk of keys) {
      if (typeof jwk?.kid === "string" && jwk.kty === "RSA") {
        nextMap.set(jwk.kid, crypto.createPublicKey({ key: jwk, format: "jwk" }));
      }
    }

    const maxAgeSec = parseMaxAgeSeconds(response.headers?.get?.("cache-control"));
    jwksCache = {
      keysByKid: nextMap,
      expiresAt: now() + maxAgeSec * 1000,
    };

    return jwksCache.keysByKid.get(kid) ?? null;
  }

  async function verifyGoogleIdToken(idToken) {
    if (!isGoogleConfigured()) {
      throw new AuthError(
        "GOOGLE_AUTH_NOT_CONFIGURED",
        "Login com Google não está configurado no servidor.",
        503,
      );
    }

    if (typeof idToken !== "string" || idToken.trim().length === 0) {
      throw new AuthError("INVALID_GOOGLE_TOKEN", "Token do Google ausente.", 400);
    }

    if (typeof verifyGoogleTokenOverride === "function") {
      const result = await verifyGoogleTokenOverride(idToken.trim());
      if (!result || !result.googleSub || !result.email) {
        throw new AuthError(
          "INVALID_GOOGLE_TOKEN",
          "Token do Google inválido.",
          401,
        );
      }
      return result;
    }

    let parsed;
    try {
      parsed = parseJwt(idToken);
    } catch {
      throw new AuthError("INVALID_GOOGLE_TOKEN", "Token do Google malformado.", 401);
    }

    const { header, payload, signature, signingInput } = parsed;
    if (header?.alg !== "RS256" || typeof header?.kid !== "string" || !header.kid) {
      throw new AuthError("INVALID_GOOGLE_TOKEN", "Assinatura do token inválida.", 401);
    }

    let publicKey = await loadGooglePublicKey(header.kid);
    if (!publicKey) {
      publicKey = await loadGooglePublicKey(header.kid, { forceRefresh: true });
    }
    if (!publicKey) {
      throw new AuthError(
        "INVALID_GOOGLE_TOKEN",
        "Chave pública do Google não encontrada.",
        401,
      );
    }

    const validSignature = crypto.verify(
      "RSA-SHA256",
      Buffer.from(signingInput),
      publicKey,
      signature,
    );
    if (!validSignature) {
      throw new AuthError("INVALID_GOOGLE_TOKEN", "Token do Google inválido.", 401);
    }

    const nowSec = Math.floor(now() / 1000);
    if (!GOOGLE_ISSUERS.has(payload?.iss)) {
      throw new AuthError("INVALID_GOOGLE_TOKEN", "Emissor do token inválido.", 401);
    }
    if (!allowedAudiences.has(payload?.aud)) {
      throw new AuthError("INVALID_GOOGLE_TOKEN", "Audiência do token inválida.", 401);
    }
    if (typeof payload?.exp !== "number" || payload.exp <= nowSec) {
      throw new AuthError("EXPIRED_GOOGLE_TOKEN", "Token do Google expirado.", 401);
    }
    if (
      typeof payload?.sub !== "string" ||
      !payload.sub ||
      typeof payload?.email !== "string" ||
      !payload.email ||
      payload.email_verified !== true
    ) {
      throw new AuthError(
        "UNVERIFIED_GOOGLE_EMAIL",
        "A conta Google precisa ter e-mail verificado.",
        401,
      );
    }

    return {
      googleSub: payload.sub,
      email: payload.email.trim().toLowerCase(),
      nome:
        typeof payload.name === "string" && payload.name.trim()
          ? payload.name.trim().slice(0, 120)
          : payload.email.split("@")[0].slice(0, 120),
      fotoUrl:
        typeof payload.picture === "string" && payload.picture.startsWith("https://")
          ? payload.picture.slice(0, 500)
          : null,
    };
  }

  return {
    isJwtConfigured,
    isGoogleConfigured,
    getPrimaryGoogleClientId,
    signAppToken,
    verifyAppToken,
    verifyGoogleIdToken,
  };
}

module.exports = {
  AuthError,
  base64UrlDecode,
  base64UrlEncode,
  createAuthService,
  parseJwt,
};
