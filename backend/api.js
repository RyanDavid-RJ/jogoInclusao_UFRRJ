const express = require("express");
const cors = require("cors");

const createApiApp = ({
  pool,
  questionAdminToken,
  corsOrigin,
  isShuttingDown = () => false,
}) => {
  const app = express();
  app.use(cors({ origin: corsOrigin }));

  const isQuestionAdmin = (req) =>
    Boolean(questionAdminToken) &&
    req.get("x-question-admin-token") === questionAdminToken;

  app.get("/api/status", async (_req, res) => {
    if (isShuttingDown()) {
      return res.status(503).json({ ok: false, db: "unavailable" });
    }

    try {
      await pool.query("SELECT 1");
      res.json({ ok: true, db: "ok" });
    } catch (error) {
      console.error("Database status check failed.", {
        code: error?.code,
        message: error?.message,
      });
      res.status(503).json({ ok: false, db: "error" });
    }
  });

  app.get("/api/perguntas", async (_req, res) => {
    try {
      const [rows] = await pool.query(
        `SELECT id, etapa_escolar, nivel_estrutural, enunciado,
                opcao_a, opcao_b, opcao_c, opcao_d, explicacao, tags
         FROM perguntas`,
      );
      res.json(rows);
    } catch (error) {
      console.error("Failed to fetch questions.", {
        code: error?.code,
        message: error?.message,
      });
      res.status(500).json({ error: "Não foi possível carregar as perguntas." });
    }
  });

  app.post("/api/perguntas", express.json(), async (req, res) => {
    if (!questionAdminToken) {
      return res.status(503).json({
        error: "Cadastro de perguntas administrativas não está configurado.",
      });
    }
    if (!isQuestionAdmin(req)) {
      return res.status(401).json({ error: "Credencial administrativa inválida." });
    }

    const {
      etapa_escolar: etapaEscolar,
      nivel_estrutural: nivelEstrutural,
      enunciado,
      opcao_a: opcaoA,
      opcao_b: opcaoB,
      opcao_c: opcaoC,
      opcao_d: opcaoD,
      resposta_correta: respostaCorreta,
      explicacao = null,
      tags = null,
    } = req.body ?? {};

    if (
      !["Fundamental", "Médio", "Superior"].includes(etapaEscolar) ||
      !Number.isInteger(nivelEstrutural) ||
      nivelEstrutural < 1 ||
      nivelEstrutural > 3 ||
      [enunciado, opcaoA, opcaoB, opcaoC, opcaoD].some(
        (value) => typeof value !== "string" || value.trim().length === 0,
      ) ||
      !["A", "B", "C", "D"].includes(respostaCorreta)
    ) {
      return res.status(400).json({ error: "Dados da pergunta inválidos." });
    }

    try {
      const [result] = await pool.execute(
        `INSERT INTO perguntas
          (etapa_escolar, nivel_estrutural, enunciado, opcao_a, opcao_b,
           opcao_c, opcao_d, resposta_correta, explicacao, tags)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          etapaEscolar,
          nivelEstrutural,
          enunciado.trim(),
          opcaoA.trim(),
          opcaoB.trim(),
          opcaoC.trim(),
          opcaoD.trim(),
          respostaCorreta,
          typeof explicacao === "string" ? explicacao.trim() || null : null,
          tags,
        ],
      );
      res.status(201).json({ id: result.insertId });
    } catch (error) {
      console.error("Failed to create question.", {
        code: error?.code,
        message: error?.message,
      });
      res.status(500).json({ error: "Não foi possível criar a pergunta." });
    }
  });

  return app;
};

module.exports = { createApiApp };
