const assert = require("node:assert/strict");
const http = require("node:http");
const test = require("node:test");
const { createApiApp } = require("../api");

const question = {
  etapa_escolar: "Fundamental",
  nivel_estrutural: 1,
  enunciado: "Qual alternativa promove inclusão?",
  opcao_a: "A",
  opcao_b: "B",
  opcao_c: "C",
  opcao_d: "D",
  resposta_correta: "B",
};

const request = async (server, path, options = {}) => {
  const { port } = server.address();
  const response = await fetch(`http://127.0.0.1:${port}${path}`, {
    ...options,
    headers: {
      ...(options.body ? { "content-type": "application/json" } : {}),
      ...(options.headers || {}),
    },
  });
  return {
    status: response.status,
    body: await response.json(),
  };
};

const createApiFixture = async (t, { token = "admin-secret" } = {}) => {
  const queries = [];
  const executions = [];
  const pool = {
    async query(sql) {
      queries.push(sql);
      return [[
        {
          id: 1,
          etapa_escolar: "Fundamental",
          nivel_estrutural: 1,
          enunciado: "Pergunta pública",
          opcao_a: "A",
          opcao_b: "B",
          opcao_c: "C",
          opcao_d: "D",
          explicacao: "Explicação",
          tags: ["inclusão"],
        },
      ]];
    },
    async execute(sql, params) {
      executions.push({ sql, params });
      return [{ insertId: 42 }];
    },
  };
  const server = http.createServer(
    createApiApp({
      pool,
      questionAdminToken: token,
      corsOrigin: "*",
    }),
  );
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  return { server, queries, executions };
};

test("GET /api/perguntas omits the correct answer", async (t) => {
  const { server } = await createApiFixture(t);

  const response = await request(server, "/api/perguntas");

  assert.equal(response.status, 200);
  assert.equal(response.body[0].resposta_correta, undefined);
  assert.equal(response.body[0].enunciado, "Pergunta pública");
});

test("POST /api/perguntas rejects a missing admin token", async (t) => {
  const { server, executions } = await createApiFixture(t);

  const response = await request(server, "/api/perguntas", {
    method: "POST",
    body: JSON.stringify(question),
  });

  assert.equal(response.status, 401);
  assert.equal(executions.length, 0);
});

test("POST /api/perguntas rejects an invalid admin token", async (t) => {
  const { server, executions } = await createApiFixture(t);

  const response = await request(server, "/api/perguntas", {
    method: "POST",
    headers: { "x-question-admin-token": "wrong-secret" },
    body: JSON.stringify(question),
  });

  assert.equal(response.status, 401);
  assert.equal(executions.length, 0);
});

test("POST /api/perguntas accepts a valid admin token", async (t) => {
  const { server, executions } = await createApiFixture(t);

  const response = await request(server, "/api/perguntas", {
    method: "POST",
    headers: { "x-question-admin-token": "admin-secret" },
    body: JSON.stringify(question),
  });

  assert.equal(response.status, 201);
  assert.deepEqual(response.body, { id: 42 });
  assert.equal(executions.length, 1);
  assert.equal(executions[0].params[7], "B");
});
