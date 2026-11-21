const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const test = require("node:test");

const {
  AuthError,
  base64UrlEncode,
  createAuthService,
} = require("../services/authService");
const { sanitizeMeta } = require("../utils/logger");

function signRs256Token({ privateKey, kid, payload }) {
  const header = base64UrlEncode(JSON.stringify({ alg: "RS256", typ: "JWT", kid }));
  const body = base64UrlEncode(JSON.stringify(payload));
  const signingInput = `${header}.${body}`;
  const signature = crypto.sign("RSA-SHA256", Buffer.from(signingInput), privateKey);
  return `${signingInput}.${base64UrlEncode(signature)}`;
}

test("signs and verifies app JWT tokens with HS256 and rejects tampered or expired tokens", () => {
  let currentTime = 1_700_000_000_000;
  const auth = createAuthService({
    jwtSecret: "super-secret-jwt-key-with-32-chars",
    tokenTtlSec: 300,
    now: () => currentTime,
  });

  const token = auth.signAppToken({
    id: 7,
    uuid: "11111111-1111-4111-8111-111111111111",
    papel_sistema: "professor",
  });

  assert.deepEqual(auth.verifyAppToken(token), {
    userId: 7,
    uuid: "11111111-1111-4111-8111-111111111111",
    role: "professor",
  });

  // Tampered payload
  const [h, , s] = token.split(".");
  const tamperedPayload = base64UrlEncode(
    JSON.stringify({
      sub: 7,
      uuid: "11111111-1111-4111-8111-111111111111",
      role: "admin",
      iat: Math.floor(currentTime / 1000),
      exp: Math.floor(currentTime / 1000) + 300,
    }),
  );
  assert.equal(auth.verifyAppToken(`${h}.${tamperedPayload}.${s}`), null);

  // Expired token
  currentTime += 301_000;
  assert.equal(auth.verifyAppToken(token), null);
});

test("verifies real RS256 Google ID tokens via JWKS and rejects invalid audience or unverified email", async () => {
  const { publicKey, privateKey } = crypto.generateKeyPairSync("rsa", {
    modulusLength: 2048,
  });
  const jwk = { ...publicKey.export({ format: "jwk" }), kid: "kid-1" };
  let fetchCalls = 0;

  const currentTime = 1_700_000_000_000;
  const nowSec = Math.floor(currentTime / 1000);
  const auth = createAuthService({
    jwtSecret: "super-secret-jwt-key-with-32-chars",
    googleClientIds: ["client-web.apps.googleusercontent.com"],
    now: () => currentTime,
    fetchFn: async () => {
      fetchCalls += 1;
      return {
        ok: true,
        headers: { get: () => "public, max-age=3600" },
        json: async () => ({ keys: [jwk] }),
      };
    },
  });

  const validToken = signRs256Token({
    privateKey,
    kid: "kid-1",
    payload: {
      iss: "https://accounts.google.com",
      aud: "client-web.apps.googleusercontent.com",
      sub: "google-sub-123",
      email: "Gisela@UFRRJ.br",
      email_verified: true,
      name: "Prof. Gisela",
      picture: "https://lh3.googleusercontent.com/avatar.png",
      exp: nowSec + 600,
    },
  });

  const profile = await auth.verifyGoogleIdToken(validToken);
  assert.deepEqual(profile, {
    googleSub: "google-sub-123",
    email: "gisela@ufrrj.br",
    nome: "Prof. Gisela",
    fotoUrl: "https://lh3.googleusercontent.com/avatar.png",
  });
  assert.equal(fetchCalls, 1);

  // Cached JWKS reused on second validation
  await auth.verifyGoogleIdToken(validToken);
  assert.equal(fetchCalls, 1);

  const wrongAudience = signRs256Token({
    privateKey,
    kid: "kid-1",
    payload: {
      iss: "https://accounts.google.com",
      aud: "other-client.apps.googleusercontent.com",
      sub: "google-sub-123",
      email: "a@b.com",
      email_verified: true,
      exp: nowSec + 600,
    },
  });
  await assert.rejects(auth.verifyGoogleIdToken(wrongAudience), AuthError);

  const unverifiedEmail = signRs256Token({
    privateKey,
    kid: "kid-1",
    payload: {
      iss: "https://accounts.google.com",
      aud: "client-web.apps.googleusercontent.com",
      sub: "google-sub-123",
      email: "a@b.com",
      email_verified: false,
      exp: nowSec + 600,
    },
  });
  await assert.rejects(auth.verifyGoogleIdToken(unverifiedEmail), AuthError);
});

test("logger sanitizes sensitive keys and PII recursively", () => {
  const clean = sanitizeMeta({
    roomCode: "ABCD",
    password: "123",
    email: "user@ufrrj.br",
    nested: { authorization: "Bearer xyz", ok: true },
  });
  assert.deepEqual(clean, {
    roomCode: "ABCD",
    password: "[REDACTED]",
    email: "[REDACTED]",
    nested: { authorization: "[REDACTED]", ok: true },
  });
});
