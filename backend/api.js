const express = require("express");
const cors = require("cors");

const { createAuthMiddleware } = require("./middleware/authMiddleware");
const {
  DuplicateQuestionError,
  createQuestionRepository,
  validateQuestionPayload,
} = require("./repositories/questionRepository");
const { createUserRepository } = require("./repositories/userRepository");
const { createClassRepository } = require("./repositories/classRepository");
const { createMatchRepository } = require("./repositories/matchRepository");
const {
  createAnalyticsRepository,
  toCsv,
} = require("./repositories/analyticsRepository");
const { AuthError } = require("./services/authService");

const createApiApp = ({
  pool,
  questionAdminToken,
  corsOrigin,
  isShuttingDown = () => false,
  authService = null,
  userRepository = pool ? createUserRepository(pool) : null,
  questionRepository = pool ? createQuestionRepository(pool) : null,
  classRepository = pool ? createClassRepository(pool) : null,
  matchRepository = pool ? createMatchRepository(pool) : null,
  analyticsRepository = pool ? createAnalyticsRepository(pool) : null,
  logger = null,
}) => {
  const app = express();
  const normalizedCorsOrigin = Array.isArray(corsOrigin)
    ? corsOrigin.map((origin) =>
        typeof origin === "string" ? origin.trim().replace(/\/+$/, "") : origin,
      )
    : typeof corsOrigin === "string" && corsOrigin !== "*"
      ? corsOrigin.trim().replace(/\/+$/, "")
      : corsOrigin;
  app.use(
    cors({
      origin: normalizedCorsOrigin,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: [
        "Content-Type",
        "Authorization",
        "X-Question-Admin-Token",
      ],
    }),
  );
  app.use((_req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("Referrer-Policy", "no-referrer");
    next();
  });
  app.use(express.json({ limit: "256kb" }));

  const {
    attachAuth,
    requireAuth,
    requireRole,
    requireQuestionManager,
  } = createAuthMiddleware({ authService, questionAdminToken });

  app.use(attachAuth);

  const logError = (category, event, error) => {
    if (logger) {
      logger.error(category, event, {
        code: error?.code,
        message: error?.message,
      });
    } else {
      console.error(event, {
        code: error?.code,
        message: error?.message,
      });
    }
  };

  /* ---------------------------------------------------------------------- */
  /* Saúde & Operação                                                       */
  /* ---------------------------------------------------------------------- */

  app.get("/api/status", async (_req, res) => {
    if (isShuttingDown()) {
      return res.status(503).json({ ok: false, db: "unavailable" });
    }

    try {
      await pool.query("SELECT 1");
      const googleAuthEnabled = Boolean(authService?.isGoogleConfigured?.());
      const googleClientId = googleAuthEnabled
        ? (authService?.getPrimaryGoogleClientId?.() ?? null)
        : null;
      res.json({
        ok: true,
        db: "ok",
        googleAuthEnabled,
        ...(googleClientId ? { googleClientId } : {}),
      });
    } catch (error) {
      logError("db", "Database status check failed.", error);
      res.status(503).json({ ok: false, db: "error" });
    }
  });

  /* ---------------------------------------------------------------------- */
  /* Autenticação Google OAuth & Perfil Pessoal                             */
  /* ---------------------------------------------------------------------- */

  app.post("/api/auth/google", async (req, res) => {
    if (!authService || !authService.isGoogleConfigured()) {
      return res.status(503).json({
        error: "Login com Google não está configurado neste ambiente.",
      });
    }

    try {
      const googleProfile = await authService.verifyGoogleIdToken(
        req.body?.idToken,
      );
      const user = await userRepository.upsertGoogleUser(googleProfile);
      if (!user || !user.ativo) {
        return res.status(403).json({ error: "Conta desativada." });
      }
      const token = authService.signAppToken(user);
      return res.json({ token, user });
    } catch (error) {
      if (error instanceof AuthError) {
        return res.status(error.statusCode).json({
          error: error.message,
          code: error.code,
        });
      }
      logError("auth", "Google authentication failed.", error);
      return res.status(500).json({
        error: "Não foi possível concluir o login com o Google.",
      });
    }
  });

  app.get("/api/auth/me", requireAuth, async (req, res) => {
    try {
      const user = await userRepository.findById(req.auth.userId);
      if (!user) {
        return res.status(404).json({ error: "Usuário não encontrado." });
      }
      return res.json({ user });
    } catch (error) {
      logError("auth", "Failed to fetch current user.", error);
      return res.status(500).json({ error: "Não foi possível carregar o perfil." });
    }
  });

  app.patch("/api/auth/me", requireAuth, async (req, res) => {
    try {
      const user = await userRepository.updatePreferences(req.auth.userId, {
        apelidoPadrao: req.body?.apelidoPadrao,
        avatarPadrao: req.body?.avatarPadrao,
        consentimentoPesquisa: req.body?.consentimentoPesquisa,
      });
      if (!user) {
        return res.status(404).json({ error: "Usuário não encontrado." });
      }
      return res.json({ user });
    } catch (error) {
      if (error instanceof TypeError) {
        return res.status(400).json({ error: error.message });
      }
      logError("auth", "Failed to update user preferences.", error);
      return res
        .status(500)
        .json({ error: "Não foi possível atualizar suas preferências." });
    }
  });

  app.get("/api/me/partidas", requireAuth, async (req, res) => {
    try {
      const history = await matchRepository.getUserMatchHistory(req.auth.userId, {
        limit: req.query?.limit,
        offset: req.query?.offset,
      });
      return res.json(history);
    } catch (error) {
      if (error?.code === "ER_NO_SUCH_TABLE") {
        return res.json({
          summary: {
            totalPartidas: 0,
            totalVitorias: 0,
            totalDestaquesQuiz: 0,
            totalRespondidos: 0,
            totalCorretos: 0,
            perspectivasVivenciadas: [],
          },
          matches: [],
        });
      }
      logError("match", "Failed to load user match history.", error);
      return res
        .status(500)
        .json({ error: "Não foi possível carregar o histórico de partidas." });
    }
  });

  /* ---------------------------------------------------------------------- */
  /* Banco de Perguntas (Público + Governança Docente)                      */
  /* ---------------------------------------------------------------------- */

  app.get("/api/perguntas", async (req, res) => {
    const canSeeAnswers =
      req.isAdminToken ||
      (req.auth && ["professor", "admin"].includes(req.auth.role));
    const includeAnswer =
      canSeeAnswers && req.query?.includeAnswer === "true";

    const ativaParam =
      req.query?.ativa === "true"
        ? true
        : req.query?.ativa === "false"
          ? false
          : undefined;

    try {
      const rows = await questionRepository.listQuestions({
        etapaEscolar: req.query?.etapa,
        nivelEstrutural: req.query?.nivel,
        areaTematica: req.query?.area,
        statusRevisao: canSeeAnswers ? req.query?.status : undefined,
        ativa: canSeeAnswers ? ativaParam : undefined,
        search: req.query?.q,
        includeAnswer,
      });
      return res.json(rows);
    } catch (error) {
      logError("db", "Failed to fetch questions.", error);
      return res
        .status(500)
        .json({ error: "Não foi possível carregar as perguntas." });
    }
  });

  app.post("/api/perguntas", requireQuestionManager, async (req, res) => {
    const validation = validateQuestionPayload(req.body);
    if (validation.error) {
      return res.status(400).json({ error: validation.error });
    }

    try {
      const created = await questionRepository.createQuestion(validation.data, {
        userId: req.auth?.userId ?? null,
      });
      return res.status(201).json(created);
    } catch (error) {
      if (error instanceof DuplicateQuestionError) {
        return res.status(409).json({ error: error.message, code: error.code });
      }
      logError("db", "Failed to create question.", error);
      return res
        .status(500)
        .json({ error: "Não foi possível criar a pergunta." });
    }
  });

  app.put("/api/perguntas/:id", requireQuestionManager, async (req, res) => {
    const questionId = Number(req.params.id);
    if (!Number.isInteger(questionId) || questionId <= 0) {
      return res.status(400).json({ error: "ID de pergunta inválido." });
    }

    const validation = validateQuestionPayload(req.body);
    if (validation.error) {
      return res.status(400).json({ error: validation.error });
    }

    try {
      const updated = await questionRepository.updateQuestion(
        questionId,
        validation.data,
      );
      if (!updated) {
        return res.status(404).json({ error: "Pergunta não encontrada." });
      }
      return res.json({ id: questionId, updated: true });
    } catch (error) {
      if (error instanceof DuplicateQuestionError) {
        return res.status(409).json({ error: error.message, code: error.code });
      }
      logError("db", "Failed to update question.", error);
      return res
        .status(500)
        .json({ error: "Não foi possível atualizar a pergunta." });
    }
  });

  app.patch(
    "/api/perguntas/:id/status",
    requireQuestionManager,
    async (req, res) => {
      const questionId = Number(req.params.id);
      if (!Number.isInteger(questionId) || questionId <= 0) {
        return res.status(400).json({ error: "ID de pergunta inválido." });
      }

      try {
        const updated = await questionRepository.updateQuestionStatus(
          questionId,
          {
            statusRevisao: req.body?.status_revisao ?? req.body?.statusRevisao,
            ativa: req.body?.ativa,
          },
          { reviewerId: req.auth?.userId ?? null },
        );
        if (!updated) {
          return res.status(404).json({ error: "Pergunta não encontrada." });
        }
        return res.json({ id: questionId, updated: true });
      } catch (error) {
        if (error instanceof TypeError) {
          return res.status(400).json({ error: error.message });
        }
        logError("db", "Failed to update question status.", error);
        return res
          .status(500)
          .json({ error: "Não foi possível atualizar o status da pergunta." });
      }
    },
  );

  /* ---------------------------------------------------------------------- */
  /* Turmas / Sessões Pedagógicas (Professor / Admin)                       */
  /* ---------------------------------------------------------------------- */

  app.get(
    "/api/turmas",
    requireRole("professor", "admin"),
    async (req, res) => {
      try {
        const classes = await classRepository.listClasses({
          professorId: req.auth.userId,
          isAdmin: req.auth.role === "admin",
        });
        return res.json({ turmas: classes });
      } catch (error) {
        logError("db", "Failed to list classes.", error);
        return res
          .status(500)
          .json({ error: "Não foi possível carregar as turmas." });
      }
    },
  );

  app.post(
    "/api/turmas",
    requireRole("professor", "admin"),
    async (req, res) => {
      try {
        const created = await classRepository.createClass({
          professorId: req.auth.userId,
          codigo: req.body?.codigo,
          nome: req.body?.nome,
          instituicao: req.body?.instituicao,
          etapaPadrao: req.body?.etapa_padrao ?? req.body?.etapaPadrao,
        });
        return res.status(201).json({ turma: created });
      } catch (error) {
        if (error instanceof TypeError) {
          return res.status(400).json({ error: error.message });
        }
        if (error?.code === "ER_DUP_ENTRY") {
          return res
            .status(409)
            .json({ error: "Já existe uma turma com este código." });
        }
        logError("db", "Failed to create class.", error);
        return res
          .status(500)
          .json({ error: "Não foi possível criar a turma." });
      }
    },
  );

  app.patch(
    "/api/turmas/:id",
    requireRole("professor", "admin"),
    async (req, res) => {
      const classId = Number(req.params.id);
      if (!Number.isInteger(classId) || classId <= 0) {
        return res.status(400).json({ error: "ID de turma inválido." });
      }

      try {
        const updated = await classRepository.updateClass(
          classId,
          {
            nome: req.body?.nome,
            instituicao: req.body?.instituicao,
            etapaPadrao: req.body?.etapa_padrao ?? req.body?.etapaPadrao,
            ativa: req.body?.ativa,
          },
          {
            professorId: req.auth.userId,
            isAdmin: req.auth.role === "admin",
          },
        );
        if (!updated) {
          return res.status(404).json({ error: "Turma não encontrada." });
        }
        return res.json({ id: classId, updated: true });
      } catch (error) {
        if (error instanceof TypeError) {
          return res.status(400).json({ error: error.message });
        }
        logError("db", "Failed to update class.", error);
        return res
          .status(500)
          .json({ error: "Não foi possível atualizar a turma." });
      }
    },
  );

  /* ---------------------------------------------------------------------- */
  /* Painel de Professores: Analytics e Exportação Anonimizada (ICE-UFRRJ)  */
  /* ---------------------------------------------------------------------- */

  app.get(
    "/api/analytics/overview",
    requireQuestionManager,
    async (req, res) => {
      try {
        const overview = await analyticsRepository.getOverview({
          etapaEscolar: req.query?.etapa,
          turmaCodigo: req.query?.turma,
          matrizCodigo: req.query?.matriz,
        });
        return res.json(overview);
      } catch (error) {
        logError("analytics", "Failed to load analytics overview.", error);
        return res
          .status(500)
          .json({ error: "Não foi possível carregar os indicadores gerais." });
      }
    },
  );

  app.get(
    "/api/analytics/perguntas",
    requireQuestionManager,
    async (req, res) => {
      try {
        const rows = await analyticsRepository.getQuestionsPerformance({
          etapaEscolar: req.query?.etapa,
          nivelEstrutural: req.query?.nivel,
          areaTematica: req.query?.area,
          statusRevisao: req.query?.status,
        });
        return res.json({ perguntas: rows });
      } catch (error) {
        logError("analytics", "Failed to load question performance.", error);
        return res.status(500).json({
          error: "Não foi possível carregar o desempenho das perguntas.",
        });
      }
    },
  );

  app.get(
    "/api/analytics/equidade",
    requireQuestionManager,
    async (req, res) => {
      try {
        const data = await analyticsRepository.getEquityAnalysis({
          etapaEscolar: req.query?.etapa,
          matrizCodigo: req.query?.matriz,
        });
        return res.json(data);
      } catch (error) {
        logError("analytics", "Failed to load equity analytics.", error);
        return res.status(500).json({
          error: "Não foi possível carregar os indicadores de equidade.",
        });
      }
    },
  );

  app.get(
    "/api/analytics/export",
    requireQuestionManager,
    async (req, res) => {
      const dataset =
        req.query?.dataset === "respostas" ? "respostas" : "participacoes";
      const format = req.query?.format === "csv" ? "csv" : "json";

      try {
        const rows = await analyticsRepository.exportAnonymousDataset({
          dataset,
          etapaEscolar: req.query?.etapa,
          turmaCodigo: req.query?.turma,
          matrizCodigo: req.query?.matriz,
        });

        if (format === "csv") {
          const csv = toCsv(rows);
          res.setHeader("Content-Type", "text/csv; charset=utf-8");
          res.setHeader(
            "Content-Disposition",
            `attachment; filename="ludo-equidade-${dataset}.csv"`,
          );
          return res.send(csv);
        }

        return res.json({
          dataset,
          anonimizado: true,
          somenteComConsentimento: true,
          totalRegistros: rows.length,
          registros: rows,
        });
      } catch (error) {
        logError("analytics", "Failed to export anonymous dataset.", error);
        return res
          .status(500)
          .json({ error: "Não foi possível exportar o dataset anonimizado." });
      }
    },
  );

  /* ---------------------------------------------------------------------- */
  /* Administração de Usuários (Admin)                                      */
  /* ---------------------------------------------------------------------- */

  app.get("/api/admin/usuarios", requireRole("admin"), async (req, res) => {
    try {
      const users = await userRepository.listUsers({
        limit: req.query?.limit,
        offset: req.query?.offset,
      });
      return res.json({ usuarios: users });
    } catch (error) {
      logError("admin", "Failed to list users.", error);
      return res
        .status(500)
        .json({ error: "Não foi possível carregar a lista de usuários." });
    }
  });

  app.patch(
    "/api/admin/usuarios/:id/papel",
    requireRole("admin"),
    async (req, res) => {
      const targetUserId = Number(req.params.id);
      if (!Number.isInteger(targetUserId) || targetUserId <= 0) {
        return res.status(400).json({ error: "ID de usuário inválido." });
      }

      try {
        const updated = await userRepository.updateRole(
          targetUserId,
          req.body?.papel_sistema ?? req.body?.role,
        );
        if (!updated) {
          return res.status(404).json({ error: "Usuário não encontrado." });
        }
        return res.json({ user: updated });
      } catch (error) {
        if (error instanceof TypeError) {
          return res.status(400).json({ error: error.message });
        }
        logError("admin", "Failed to update user role.", error);
        return res
          .status(500)
          .json({ error: "Não foi possível atualizar o papel do usuário." });
      }
    },
  );

  return app;
};

module.exports = { createApiApp };
