require("dotenv").config();

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const pool = require("./config/db");
const { attachLobbyHandlers } = require("./lobby");
const { createQuestionRepository } = require("./repositories/questionRepository");
const { createQuizService } = require("./quizService");

const app = express();
app.use(cors());

app.get("/api/status", async (_req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ ok: true, db: "ok" });
  } catch {
    console.error("Database status check failed.");
    res.status(503).json({ ok: false, db: "error" });
  }
});

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
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
