const assert = require("node:assert/strict");
const http = require("node:http");
const test = require("node:test");

const { createApiApp } = require("../api");
const { createAuthService } = require("../services/authService");
const { DuplicateQuestionError } = require("../repositories/questionRepository");

async function httpRequest(server, path, options = {}) {
  const { port } = server.address();
  const response = await fetch(`http://127.0.0.1:${port}${path}`, {
    ...options,
    headers: {
      ...(options.body ? { "content-type": "application/json" } : {}),
      ...(options.headers || {}),
    },
  });
  const contentType = response.headers.get("content-type") || "";
  const body = contentType.includes("application/json")
    ? await response.json()
    : await response.text();
  return { status: response.status, headers: response.headers, body };
}

async function createV2ApiFixture(t) {
  const authService = createAuthService({
    jwtSecret: "test-jwt-secret-with-at-least-32-chars",
    verifyGoogleTokenOverride: async (token) => {
      if (token === "valid-google-token") {
        return {
          googleSub: "sub-prof-1",
          email: "gisela@ufrrj.br",
          nome: "Prof. Gisela",
          fotoUrl: "https://example.com/foto.png",
        };
      }
      return null;
    },
  });

  const users = new Map([
    [
      1,
      {
        id: 1,
        uuid: "11111111-1111-4111-8111-111111111111",
        email: "aluno@ufrrj.br",
        nome: "Aluno Teste",
        apelidoPadrao: "Aluno",
        avatarPadrao: "coelho",
        fotoUrl: null,
        role: "jogador",
        consentimentoPesquisa: false,
        ativo: true,
      },
    ],
    [
      2,
      {
        id: 2,
        uuid: "22222222-2222-4222-8222-222222222222",
        email: "gisela@ufrrj.br",
        nome: "Prof. Gisela",
        apelidoPadrao: "Gisela",
        avatarPadrao: "coruja",
        fotoUrl: "https://example.com/foto.png",
        role: "professor",
        consentimentoPesquisa: true,
        ativo: true,
      },
    ],
    [
      3,
      {
        id: 3,
        uuid: "33333333-3333-4333-8333-333333333333",
        email: "admin@ufrrj.br",
        nome: "Admin UFRRJ",
        apelidoPadrao: "Admin",
        avatarPadrao: "leao",
        fotoUrl: null,
        role: "admin",
        consentimentoPesquisa: true,
        ativo: true,
      },
    ],
  ]);

  const userRepository = {
    async findById(id) {
      return users.get(id) ?? null;
    },
    async upsertGoogleUser() {
      return users.get(2);
    },
    async updatePreferences(id, prefs) {
      const user = users.get(id);
      if (!user) return null;
      const updated = { ...user, ...prefs };
      users.set(id, updated);
      return updated;
    },
    async listUsers() {
      return [...users.values()];
    },
    async updateRole(id, role) {
      const user = users.get(id);
      if (!user) return null;
      user.role = role;
      return user;
    },
  };

  const listCalls = [];
  const questionRepository = {
    async listQuestions(filters) {
      listCalls.push(filters);
      return [
        {
          id: 1,
          etapa_escolar: "Superior",
          nivel_estrutural: 1,
          enunciado: "Quanto é a média de 4 e 8?",
          opcao_a: "5",
          opcao_b: "6",
          opcao_c: "7",
          opcao_d: "8",
          ...(filters.includeAnswer ? { resposta_correta: "B" } : {}),
        },
      ];
    },
    async createQuestion(data) {
      if (data.enunciado === "DUPLICADA") {
        throw new DuplicateQuestionError();
      }
      return { id: 99 };
    },
    async updateQuestion(id) {
      return id === 1;
    },
    async updateQuestionStatus(id) {
      return id === 1;
    },
  };

  const classRepository = {
    async listClasses() {
      return [{ id: 10, codigo: "MAT101", nome: "Cálculo I", total_partidas: 3 }];
    },
    async createClass(input) {
      return { id: 11, ...input, ativa: 1 };
    },
    async updateClass(id) {
      return id === 10;
    },
  };

  const matchRepository = {
    async getUserMatchHistory() {
      return {
        summary: {
          totalPartidas: 2,
          totalVitorias: 1,
          totalDestaquesQuiz: 1,
          totalRespondidos: 4,
          totalCorretos: 3,
          perspectivasVivenciadas: ["cadeirante", "cego"],
        },
        matches: [{ partida_uuid: "m-1", etapa_escolar: "Superior", vencedor: 1 }],
      };
    },
  };

  const analyticsRepository = {
    async getOverview() {
      return { partidas: { total_partidas: 5 }, quiz: { total_respostas: 40 }, porEtapa: [] };
    },
    async getQuestionsPerformance() {
      return [{ pergunta_id: 1, taxa_acerto_respondidas: 0.75, tempo_medio_ms: 8200 }];
    },
    async getEquityAnalysis() {
      return { porCondicao: [{ condicao: "cadeirante", taxa_vitoria: 0.25 }], matrizEmpirica: [] };
    },
    async exportAnonymousDataset() {
      return [
        {
          partida_uuid: "uuid-1",
          participante_anon_id: "anon-1",
          condicao: "cadeirante",
          formula_test: "=CMD()",
        },
      ];
    },
  };

  const pool = {
    async query() {
      return [[{ 1: 1 }]];
    },
  };

  const server = http.createServer(
    createApiApp({
      pool,
      questionAdminToken: "admin-token",
      corsOrigin: "*",
      authService,
      userRepository,
      questionRepository,
      classRepository,
      matchRepository,
      analyticsRepository,
    }),
  );
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));

  return {
    server,
    listCalls,
    playerToken: authService.signAppToken(users.get(1)),
    professorToken: authService.signAppToken(users.get(2)),
    adminToken: authService.signAppToken(users.get(3)),
  };
}

test("POST /api/auth/google issues JWT and GET/PATCH /api/auth/me + /api/me/partidas work", async (t) => {
  const fx = await createV2ApiFixture(t);

  const login = await httpRequest(fx.server, "/api/auth/google", {
    method: "POST",
    body: JSON.stringify({ idToken: "valid-google-token" }),
  });
  assert.equal(login.status, 200);
  assert.ok(login.body.token);
  assert.equal(login.body.user.role, "professor");
  assert.equal(login.headers.get("x-content-type-options"), "nosniff");

  const me = await httpRequest(fx.server, "/api/auth/me", {
    headers: { authorization: `Bearer ${fx.playerToken}` },
  });
  assert.equal(me.status, 200);
  assert.equal(me.body.user.role, "jogador");

  const updated = await httpRequest(fx.server, "/api/auth/me", {
    method: "PATCH",
    headers: { authorization: `Bearer ${fx.playerToken}` },
    body: JSON.stringify({ consentimentoPesquisa: true, apelidoPadrao: "Ryan" }),
  });
  assert.equal(updated.status, 200);
  assert.equal(updated.body.user.consentimentoPesquisa, true);

  const history = await httpRequest(fx.server, "/api/me/partidas", {
    headers: { authorization: `Bearer ${fx.playerToken}` },
  });
  assert.equal(history.status, 200);
  assert.equal(history.body.summary.totalPartidas, 2);
});

test("enforces RBAC on teacher question management, duplicate conflict, classes, analytics export, and admin routes", async (t) => {
  const fx = await createV2ApiFixture(t);

  // Regular player cannot leak answers via ?includeAnswer=true
  const publicList = await httpRequest(
    fx.server,
    "/api/perguntas?includeAnswer=true",
    { headers: { authorization: `Bearer ${fx.playerToken}` } },
  );
  assert.equal(publicList.status, 200);
  assert.equal(publicList.body[0].resposta_correta, undefined);

  // Professor CAN see answers
  const profList = await httpRequest(
    fx.server,
    "/api/perguntas?includeAnswer=true",
    { headers: { authorization: `Bearer ${fx.professorToken}` } },
  );
  assert.equal(profList.status, 200);
  assert.equal(profList.body[0].resposta_correta, "B");

  // Duplicate question returns 409
  const dup = await httpRequest(fx.server, "/api/perguntas", {
    method: "POST",
    headers: { authorization: `Bearer ${fx.professorToken}` },
    body: JSON.stringify({
      etapa_escolar: "Superior",
      nivel_estrutural: 1,
      enunciado: "DUPLICADA",
      opcao_a: "1",
      opcao_b: "2",
      opcao_c: "3",
      opcao_d: "4",
      resposta_correta: "A",
    }),
  });
  assert.equal(dup.status, 409);

  // Classes forbidden for regular player, allowed for professor
  const classForbidden = await httpRequest(fx.server, "/api/turmas", {
    headers: { authorization: `Bearer ${fx.playerToken}` },
  });
  assert.equal(classForbidden.status, 403);

  const classAllowed = await httpRequest(fx.server, "/api/turmas", {
    headers: { authorization: `Bearer ${fx.professorToken}` },
  });
  assert.equal(classAllowed.status, 200);
  assert.equal(classAllowed.body.turmas[0].codigo, "MAT101");

  // CSV Export escapes formulas and returns text/csv
  const csvExport = await httpRequest(
    fx.server,
    "/api/analytics/export?dataset=participacoes&format=csv",
    { headers: { authorization: `Bearer ${fx.professorToken}` } },
  );
  assert.equal(csvExport.status, 200);
  assert.match(csvExport.headers.get("content-type"), /text\/csv/);
  assert.match(csvExport.body, /'=CMD\(\)/);

  // Admin role promotion blocked for professor, allowed for admin
  const promoDenied = await httpRequest(fx.server, "/api/admin/usuarios/1/papel", {
    method: "PATCH",
    headers: { authorization: `Bearer ${fx.professorToken}` },
    body: JSON.stringify({ papel_sistema: "professor" }),
  });
  assert.equal(promoDenied.status, 403);

  const promoOk = await httpRequest(fx.server, "/api/admin/usuarios/1/papel", {
    method: "PATCH",
    headers: { authorization: `Bearer ${fx.adminToken}` },
    body: JSON.stringify({ papel_sistema: "professor" }),
  });
  assert.equal(promoOk.status, 200);
  assert.equal(promoOk.body.user.role, "professor");
});
