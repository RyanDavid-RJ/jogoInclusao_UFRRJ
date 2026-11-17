require("dotenv").config();

const http = require("http");
const { Server } = require("socket.io");
const pool = require("./config/db");
const { attachLobbyHandlers } = require("./lobby");
const { createQuestionRepository } = require("./repositories/questionRepository");
const { createQuizService } = require("./quizService");
const { createApiApp } = require("./api");

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

let shuttingDown = false;
const app = createApiApp({
  pool,
  questionAdminToken,
  corsOrigin,
  isShuttingDown: () => shuttingDown,
});

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: corsOrigin,
    methods: ["GET", "POST"],
  },
});

const rooms = new Map();
const quizService = createQuizService(createQuestionRepository(pool));
attachLobbyHandlers(io, rooms, { quizService });

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`Servidor a correr na porta ${PORT}`);
});

const closeServer = (signal) => {
  if (shuttingDown) {
    return;
  }
  shuttingDown = true;
  console.log(`Recebido ${signal}; encerrando o servidor.`);

  io.close((ioError) => {
    if (ioError) {
      console.error("Failed to close Socket.IO.", {
        message: ioError.message,
      });
    }

    server.close(async (serverError) => {
      if (serverError) {
        console.error("Failed to close HTTP server.", {
          message: serverError.message,
        });
      }

      try {
        await pool.end();
      } catch (poolError) {
        console.error("Failed to close database pool.", {
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
