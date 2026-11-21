const REDACTED_KEYS = new Set([
  "password",
  "db_password",
  "token",
  "idtoken",
  "jwt",
  "jwt_secret",
  "secret",
  "authorization",
  "x-question-admin-token",
  "ca",
  "db_ca_cert",
  "email",
  "google_sub",
  "googlesub",
]);

function sanitizeMeta(value, depth = 0) {
  if (depth > 3 || value === null || value === undefined) {
    return value;
  }
  if (value instanceof Error) {
    return {
      name: value.name,
      code: value.code,
      message: value.message,
    };
  }
  if (Array.isArray(value)) {
    return value.slice(0, 20).map((item) => sanitizeMeta(item, depth + 1));
  }
  if (typeof value === "object") {
    const clean = {};
    for (const [key, entry] of Object.entries(value)) {
      if (REDACTED_KEYS.has(key.toLowerCase())) {
        clean[key] = "[REDACTED]";
      } else {
        clean[key] = sanitizeMeta(entry, depth + 1);
      }
    }
    return clean;
  }
  return value;
}

function createLogger({
  isProduction = process.env.NODE_ENV === "production",
  stdout = console.log,
  stderr = console.error,
} = {}) {
  const emit = (level, category, event, meta = {}) => {
    const sanitized = sanitizeMeta(meta);
    const writer = level === "error" || level === "warn" ? stderr : stdout;

    if (isProduction) {
      writer(
        JSON.stringify({
          ts: new Date().toISOString(),
          level,
          category,
          event,
          ...(sanitized && Object.keys(sanitized).length > 0
            ? { data: sanitized }
            : {}),
        }),
      );
      return;
    }

    const suffix =
      sanitized && Object.keys(sanitized).length > 0
        ? ` ${JSON.stringify(sanitized)}`
        : "";
    writer(`[${level.toUpperCase()}][${category}] ${event}${suffix}`);
  };

  return {
    info: (category, event, meta) => emit("info", category, event, meta),
    warn: (category, event, meta) => emit("warn", category, event, meta),
    error: (category, event, meta) => emit("error", category, event, meta),
    sanitizeMeta,
  };
}

module.exports = { createLogger, sanitizeMeta };
