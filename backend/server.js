require("dotenv").config();

const http = require("http");
const { Server } = require("socket.io");
const pool = require("./config/db");
const { attachLobbyHandlers } = require("./lobby");
const { createQuestionRepository } = require("./repositories/questionRepository");
const { createUserRepository } = require("./repositories/userRepository");
const { createClassRepository } = require("./repositories/classRepository");
const { createMatchRepository } = require("./repositories/matchRepository");
const { createAnalyticsRepository } = require("./repositories/analyticsRepository");
const { createQuizService } = require("./quizService");
const { createAuthService } = require("./services/authService");
const { createMatchPersistenceService } = require("./services/matchPersistenceService");
const { createLogger } = require("./utils/logger");
const { createApiApp } = require("./api");

const logger = createLogger();

const defaultOrigins =
  process.env.NODE_ENV === "production"
    ? ""
    : "http://localhost:3000,http://localhost:8081,http://localhost:19006";
const configuredOrigins = (process.env.CLIENT_ORIGIN || defaultOrigins)
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
if (
  process.env.NODE_ENV === "production" &&
  (configuredOrigins.length === 0 || configuredOrigins.includes("*"))
) {
  throw new Error(
    "CLIENT_ORIGIN must contain explicit origins when NODE_ENV=production.",
  );
}
const corsOrigin = configuredOrigins.includes("*") ? "*" : configuredOrigins;
const questionAdminToken = process.env.QUESTION_ADMIN_TOKEN?.trim();

const authService = createAuthService({
  jwtSecret: process.env.JWT_SECRET,
  googleClientIds: process.env.GOOGLE_CLIENT_ID,
});

const questionRepository = createQuestionRepository(pool);
const userRepository = createUserRepository(pool, {
  bootstrapAdminEmails: process.env.BOOTSTRAP_ADMIN_EMAIL,
});
const classRepository = createClassRepository(pool);
const matchRepository = createMatchRepository(pool);
const analyticsRepository = createAnalyticsRepository(pool);
const matchPersistenceService = createMatchPersistenceService({
  matchRepository,
  logger,
});

let shuttingDown = false;
const app = createApiApp({
  pool,
  questionAdminToken,
  corsOrigin,
  isShuttingDown: () => shuttingDown,
  authService,
  userRepository,
  questionRepository,
  classRepository,
  matchRepository,
  analyticsRepository,
  logger,
});

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: corsOrigin,
    methods: ["GET", "POST"],
  },
});

io.use(async (socket, next) => {
  const token = socket.handshake?.auth?.token;
  if (typeof token === "string" && token.trim()) {
    const authPayload = authService.verifyAppToken(token.trim());
    if (authPayload) {
      try {
        const user = await userRepository.findById(authPayload.userId);
        if (user && user.ativo) {
          socket.user = {
            userId: user.id,
            uuid: user.uuid,
            role: user.role,
            consentResearch: user.consentimentoPesquisa,
          };
        }
      } catch {
        socket.user = {
          userId: authPayload.userId,
          uuid: authPayload.uuid,
          role: authPayload.role,
          consentResearch: false,
        };
      }
    }
  }
  next();
});

const rooms = new Map();
const quizService = createQuizService(questionRepository);
attachLobbyHandlers(io, rooms, {
  quizService,
  classRepository,
  matchPersistenceService,
  logger,
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  logger.info("system", "server_started", {
    port: PORT,
    googleAuthEnabled: authService.isGoogleConfigured(),
  });
});

const closeServer = (signal) => {
  if (shuttingDown) {
    return;
  }
  shuttingDown = true;
  logger.info("system", "shutdown_initiated", { signal });

  io.close((ioError) => {
    if (ioError) {
      logger.error("system", "socketio_close_failed", {
        message: ioError.message,
      });
    }

    server.close(async (serverError) => {
      if (serverError) {
        logger.error("system", "http_close_failed", {
          message: serverError.message,
        });
      }

      try {
        await pool.end();
      } catch (poolError) {
        logger.error("db", "pool_close_failed", {
          code: poolError?.code,
          message: poolError?.message,
        });
      }

      process.exitCode = ioError || serverError ? 1 : 0;
    });
  });
};

process.once("SIGTERM", () => closeServer("SIGTERM"));
process.once("SIGINT", () => closeServer("SIGINT"));
