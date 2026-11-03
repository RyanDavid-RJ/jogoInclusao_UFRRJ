require("dotenv").config();

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const pool = require("./config/db");

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

const generateRoomCode = () => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  do {
    code = "";
    for (let i = 0; i < 4; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
  } while (rooms.has(code));
  return code;
};

// Função auxiliar para baralhar (Fisher-Yates)
const shuffleArray = (array) => {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
};

io.on("connection", (socket) => {
  console.log("Novo jogador conectado! ID:", socket.id);

  socket.on("create_room", () => {
    const roomCode = generateRoomCode();
    rooms.set(roomCode, { players: [socket.id], gameState: null });
    socket.join(roomCode);

    console.log(`Sala ${roomCode} criada pelo jogador ${socket.id}`);
    socket.emit("room_created", { roomCode, playerCount: 1 });
  });

  socket.on("join_room", ({ roomCode }) => {
    const room = rooms.get(roomCode);

    if (!room) {
      return socket.emit("room_error", { message: "Sala não encontrada." });
    }

    if (room.players.length >= 4) {
      return socket.emit("room_error", {
        message: "A sala já está cheia (4/4).",
      });
    }

    if (room.players.includes(socket.id)) {
      return socket.emit("room_error", { message: "Você já está nesta sala." });
    }

    room.players.push(socket.id);
    socket.join(roomCode);

    console.log(`Jogador ${socket.id} entrou na sala ${roomCode}`);
    io.to(roomCode).emit("room_updated", {
      roomCode,
      playerCount: room.players.length,
    });

    // Quando a sala atinge exatamente 4 jogadores
    if (room.players.length === 4) {
      const conditions = ["cadeirante", "cego", "surdo", "neuroatipico"];
      const shuffledConditions = shuffleArray([...conditions]);

      // Mapeia cada socket.id a uma condição sorteada
      room.gameState = {};
      room.players.forEach((playerId, index) => {
        room.gameState[playerId] = shuffledConditions[index];
      });

      console.log(`Sala ${roomCode} pronta! Sorteio:`, room.gameState);

      // Emite o evento com o mapeamento para todos na sala
      io.to(roomCode).emit("game_started", { gameState: room.gameState });
    }
  });

  socket.on("disconnect", () => {
    console.log("Jogador desconectado:", socket.id);

    for (const [roomCode, roomData] of rooms.entries()) {
      const playerIndex = roomData.players.indexOf(socket.id);
      if (playerIndex !== -1) {
        roomData.players.splice(playerIndex, 1);

        if (roomData.players.length === 0) {
          rooms.delete(roomCode);
          console.log(`Sala ${roomCode} deletada por estar vazia.`);
        } else {
          io.to(roomCode).emit("room_updated", {
            roomCode,
            playerCount: roomData.players.length,
          });
        }
        break;
      }
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Servidor a correr na porta ${PORT}`);
});
