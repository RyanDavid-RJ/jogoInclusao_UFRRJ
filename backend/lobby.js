const { randomInt: secureRandomInt } = require("node:crypto");
const {
  completeObstaclePause,
  createGameState,
  getPublicGameState,
  rollDice,
} = require("./gameEngine");

const MIN_PLAYERS = 4;
const MAX_PLAYERS = 8;
const CONDITIONS = ["cadeirante", "cego", "surdo", "neuroatipico"];
const SCHOOL_STAGES = ["Fundamental", "Médio", "Superior"];

const shuffleArray = (array) => {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
};

const emitRoomUpdated = (io, roomCode, room) => {
  io.to(roomCode).emit("room_updated", {
    roomCode,
    playerCount: room.players.length,
    hostId: room.hostId,
    schoolStage: room.schoolStage,
    started: room.started,
  });
};

function attachLobbyHandlers(io, rooms, { randomInt = secureRandomInt } = {}) {
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

  io.on("connection", (socket) => {
    socket.on("create_room", () => {
      const roomCode = generateRoomCode();
      const room = {
        players: [socket.id],
        hostId: socket.id,
        schoolStage: null,
        started: false,
      };
      rooms.set(roomCode, room);
      socket.join(roomCode);

      console.log(`Sala ${roomCode} criada pelo jogador ${socket.id}`);
      socket.emit("room_created", {
        roomCode,
        playerCount: 1,
        hostId: socket.id,
        schoolStage: room.schoolStage,
        started: room.started,
      });
    });

    socket.on("join_room", (payload) => {
      const roomCode =
        typeof payload?.roomCode === "string"
          ? payload.roomCode.trim().toUpperCase()
          : "";
      const room = rooms.get(roomCode);

      if (!room) {
        return socket.emit("room_error", { message: "Sala não encontrada." });
      }

      if (room.started) {
        return socket.emit("room_error", {
          message: "A partida já foi iniciada.",
        });
      }

      if (room.players.length >= MAX_PLAYERS) {
        return socket.emit("room_error", {
          message: `A sala já está cheia (${MAX_PLAYERS}/${MAX_PLAYERS}).`,
        });
      }

      if (room.players.includes(socket.id)) {
        return socket.emit("room_error", {
          message: "Você já está nesta sala.",
        });
      }

      room.players.push(socket.id);
      socket.join(roomCode);

      console.log(`Jogador ${socket.id} entrou na sala ${roomCode}`);
      socket.emit("room_joined", {
        roomCode,
        playerCount: room.players.length,
        hostId: room.hostId,
        schoolStage: room.schoolStage,
        started: room.started,
      });
      emitRoomUpdated(io, roomCode, room);
    });

    socket.on("set_school_stage", (payload) => {
      const roomCode =
        typeof payload?.roomCode === "string"
          ? payload.roomCode.trim().toUpperCase()
          : "";
      const room = rooms.get(roomCode);

      if (!room) {
        return socket.emit("room_error", { message: "Sala não encontrada." });
      }

      if (room.hostId !== socket.id) {
        return socket.emit("room_error", {
          message: "Somente o anfitrião pode escolher a etapa escolar.",
        });
      }

      if (room.started) {
        return socket.emit("room_error", {
          message: "A etapa escolar não pode ser alterada após o início.",
        });
      }

      if (!SCHOOL_STAGES.includes(payload?.schoolStage)) {
        return socket.emit("room_error", {
          message: "Etapa escolar inválida.",
        });
      }

      room.schoolStage = payload.schoolStage;
      emitRoomUpdated(io, roomCode, room);
    });

    socket.on("start_game", (payload) => {
      const roomCode =
        typeof payload?.roomCode === "string"
          ? payload.roomCode.trim().toUpperCase()
          : "";
      const room = rooms.get(roomCode);

      if (!room) {
        return socket.emit("room_error", { message: "Sala não encontrada." });
      }

      if (room.hostId !== socket.id) {
        return socket.emit("room_error", {
          message: "Somente o anfitrião pode iniciar a partida.",
        });
      }

      if (room.started) {
        return socket.emit("room_error", {
          message: "A partida já foi iniciada.",
        });
      }

      if (!SCHOOL_STAGES.includes(room.schoolStage)) {
        return socket.emit("room_error", {
          message: "Escolha uma etapa escolar antes de iniciar a partida.",
        });
      }

      if (room.players.length < MIN_PLAYERS || room.players.length > MAX_PLAYERS) {
        return socket.emit("room_error", {
          message: `A partida só pode começar com ${MIN_PLAYERS} a ${MAX_PLAYERS} jogadores.`,
        });
      }

      room.gameState = createGameState(room.players, randomInt);
      room.started = true;
      emitRoomUpdated(io, roomCode, room);
      const assignedConditions = shuffleArray([...CONDITIONS]);
      const playerConditions = room.players.map((_, index) =>
        index < CONDITIONS.length
          ? assignedConditions[index]
          : CONDITIONS[Math.floor(Math.random() * CONDITIONS.length)],
      );

      room.players.forEach((playerId, index) => {
        io.to(playerId).emit("game_started", {
          condition: playerConditions[index],
        });
      });
      io.to(roomCode).emit(
        "game_state_updated",
        getPublicGameState(room.gameState),
      );
    });

    socket.on("roll_dice", (payload) => {
      const hasRoomCode = Object.prototype.hasOwnProperty.call(
        payload || {},
        "roomCode",
      );
      const requestedRoomCode =
        typeof payload?.roomCode === "string"
          ? payload.roomCode.trim().toUpperCase()
          : "";
      const roomEntry = hasRoomCode
        ? [requestedRoomCode, rooms.get(requestedRoomCode)]
        : [...rooms.entries()].find(([, room]) =>
            room.players.includes(socket.id),
          );
      const [roomCode, room] = roomEntry || [];

      if (!room || !room.players.includes(socket.id)) {
        return socket.emit("room_error", {
          message: "Sala não encontrada ou jogador não pertence à sala.",
        });
      }

      if (!room.started || !room.gameState) {
        return socket.emit("room_error", {
          message: "A partida ainda não foi iniciada.",
        });
      }

      if (room.gameState.status === "finished") {
        return socket.emit("room_error", {
          message: "A partida já foi encerrada.",
        });
      }

      if (room.gameState.status === "paused") {
        return socket.emit("room_error", {
          message: "A partida está pausada em um obstáculo.",
        });
      }

      const currentPlayerId =
        room.gameState.turnOrder[room.gameState.currentTurnIndex];
      if (currentPlayerId !== socket.id) {
        return socket.emit("room_error", {
          message: "Não é o seu turno.",
        });
      }

      const result = rollDice(room.gameState, randomInt);
      io.to(roomCode).emit(
        "game_state_updated",
        getPublicGameState(room.gameState),
      );

      if (result.landedOnObstacle) {
        io.to(roomCode).emit("obstacle_pending", {
          playerId: result.playerId,
          position: room.gameState.positions[result.playerId],
          round: room.gameState.round,
        });
      }

      if (result.gameOver) {
        io.to(roomCode).emit("game_over", {
          winners: [...room.gameState.winners],
          reason: room.gameState.endReason,
        });
      }
    });

    socket.on("disconnect", () => {
      console.log("Jogador desconectado:", socket.id);

      for (const [roomCode, room] of rooms.entries()) {
        const playerIndex = room.players.indexOf(socket.id);
        if (playerIndex === -1) {
          continue;
        }

        room.players.splice(playerIndex, 1);
        if (room.players.length === 0) {
          rooms.delete(roomCode);
          console.log(`Sala ${roomCode} deletada por estar vazia.`);
        } else {
          if (room.hostId === socket.id) {
            room.hostId = room.players[0];
          }
          emitRoomUpdated(io, roomCode, room);
        }
        break;
      }
    });
  });

  return (roomCode) => {
    const normalizedRoomCode =
      typeof roomCode === "string" ? roomCode.trim().toUpperCase() : "";
    const room = rooms.get(normalizedRoomCode);
    if (!room?.gameState || !completeObstaclePause(room.gameState)) {
      return false;
    }

    io.to(normalizedRoomCode).emit(
      "game_state_updated",
      getPublicGameState(room.gameState),
    );
    if (room.gameState.status === "finished") {
      io.to(normalizedRoomCode).emit("game_over", {
        winners: [...room.gameState.winners],
        reason: room.gameState.endReason,
      });
    }
    return true;
  };
}

module.exports = { attachLobbyHandlers, MAX_PLAYERS, MIN_PLAYERS };
