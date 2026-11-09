const {
  randomInt: secureRandomInt,
  randomUUID,
} = require("node:crypto");
const {
  addQuizPoints,
  completeObstaclePause,
  createGameState,
  getPublicGameState,
  removePlayerFromGame,
  rollDice,
} = require("./gameEngine");
const { QuizQuestionsUnavailableError } = require("./quizService");

const MIN_PLAYERS = 4;
const MAX_PLAYERS = 8;
const CONDITIONS = ["cadeirante", "cego", "surdo", "neuroatipico"];
const SCHOOL_STAGES = ["Fundamental", "Médio", "Superior"];
const QUIZ_DURATION_MS = 30_000;

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

function attachLobbyHandlers(
  io,
  rooms,
  {
    randomInt = secureRandomInt,
    quizService,
    now = Date.now,
    setTimeoutFn = setTimeout,
    clearTimeoutFn = clearTimeout,
    createQuizId = randomUUID,
  } = {},
) {
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
        playerConditions: null,
        quizRound: null,
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
      room.playerConditions = Object.fromEntries(
        room.players.map((playerId, index) => [playerId, playerConditions[index]]),
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

    socket.on("roll_dice", async (payload) => {
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
        await beginQuizRound(roomCode, room, result);
      }

      if (result.gameOver) {
        io.to(roomCode).emit("game_over", {
          winners: [...room.gameState.winners],
          reason: room.gameState.endReason,
        });
      }
    });

    socket.on("submit_quiz_answer", (payload, acknowledge) => {
      const respond = (response) => {
        if (typeof acknowledge === "function") {
          acknowledge(response);
        }
      };
      const roomEntry = [...rooms.entries()].find(([, candidate]) =>
        candidate.players.includes(socket.id),
      );
      const [roomCode, room] = roomEntry || [];
      const round = room?.quizRound;

      if (!round || round.status !== "active" || payload?.quizId !== round.quizId) {
        return respond({ success: false, code: "INVALID_QUIZ" });
      }

      if (!round.participants.includes(socket.id) || round.disconnected.has(socket.id)) {
        return respond({ success: false, code: "NOT_PARTICIPANT" });
      }

      if (!["A", "B", "C", "D"].includes(payload?.alternativa)) {
        return respond({ success: false, code: "INVALID_ANSWER" });
      }

      if (now() >= round.deadlineAt) {
        finishQuizRound(roomCode, room, round, "timeout", true);
        return respond({ success: false, code: "DEADLINE_EXPIRED" });
      }

      if (round.answers.has(socket.id)) {
        return respond({ success: false, code: "ALREADY_ANSWERED" });
      }

      round.answers.set(socket.id, {
        alternativa: payload.alternativa,
        receivedOrder: round.nextAnswerOrder++,
      });
      respond({ success: true });

      if (allConnectedParticipantsAnswered(room, round)) {
        finishQuizRound(roomCode, room, round, "all_answered", true);
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
        if (room.quizRound) {
          room.quizRound.disconnected.add(socket.id);
        }

        if (
          room.gameState &&
          room.gameState.status !== "finished" &&
          room.players.length > 0 &&
          !room.quizRound
        ) {
          removePlayerFromGame(room.gameState, socket.id);
          io.to(roomCode).emit(
            "game_state_updated",
            getPublicGameState(room.gameState),
          );
          if (room.gameState.status === "finished") {
            io.to(roomCode).emit("game_over", {
              winners: [...room.gameState.winners],
              reason: room.gameState.endReason,
            });
          }
        }

        if (room.players.length === 0) {
          clearQuizRound(room.quizRound, clearTimeoutFn);
          room.quizRound = null;
          rooms.delete(roomCode);
          console.log(`Sala ${roomCode} deletada por estar vazia.`);
        } else {
          if (room.hostId === socket.id) {
            room.hostId = room.players[0];
          }
          emitRoomUpdated(io, roomCode, room);
          if (
            room.quizRound?.status === "active" &&
            allConnectedParticipantsAnswered(room, room.quizRound)
          ) {
            finishQuizRound(
              roomCode,
              room,
              room.quizRound,
              "all_answered",
              true,
            );
          }
        }
        break;
      }
    });
  });

  return (roomCode) => {
    const normalizedRoomCode =
      typeof roomCode === "string" ? roomCode.trim().toUpperCase() : "";
    const room = rooms.get(normalizedRoomCode);
    if (
      !room?.gameState ||
      room.quizRound ||
      !completeObstaclePause(room.gameState)
    ) {
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

  function beginQuizRound(roomCode, room, result) {
    const round = {
      quizId: createQuizId(),
      status: "preparing",
      participants: [...room.players],
      participantCount: room.players.length,
      answers: new Map(),
      disconnected: new Set(),
      questions: null,
      deadlineAt: null,
      timer: null,
      nextAnswerOrder: 0,
    };
    room.quizRound = round;

    if (!quizService || typeof quizService.prepareQuestions !== "function") {
      console.error("Quiz service is not configured.");
      return finishQuizRound(
        roomCode,
        room,
        round,
        "quiz_unavailable",
        false,
        "QUIZ_UNAVAILABLE",
      );
    }

    return Promise.resolve()
      .then(() =>
        quizService.prepareQuestions({
          schoolStage: room.schoolStage,
          position: room.gameState.positions[result.playerId],
          participantIds: round.participants,
          playerConditions: room.playerConditions,
        }),
      )
      .then((questions) => {
        if (rooms.get(roomCode) !== room || room.quizRound !== round) {
          return;
        }

        round.questions = questions;
        round.deadlineAt = now() + QUIZ_DURATION_MS;
        round.status = "active";
        round.timer = setTimeoutFn(() => {
          if (room.quizRound === round) {
            finishQuizRound(roomCode, room, round, "timeout", true);
          }
        }, QUIZ_DURATION_MS);

        for (const playerId of round.participants) {
          if (!room.players.includes(playerId)) {
            continue;
          }

          const question = questions.get(playerId);
          io.to(playerId).emit("quiz_question", {
            quizId: round.quizId,
            enunciado: question.enunciado,
            alternativas: {
              A: question.opcao_a,
              B: question.opcao_b,
              C: question.opcao_c,
              D: question.opcao_d,
            },
            deadlineAt: round.deadlineAt,
          });
        }

        if (allConnectedParticipantsAnswered(room, round)) {
          finishQuizRound(roomCode, room, round, "all_answered", true);
        }
      },
      (error) => {
        if (rooms.get(roomCode) !== room || room.quizRound !== round) {
          return;
        }

        if (error instanceof QuizQuestionsUnavailableError) {
          finishQuizRound(
            roomCode,
            room,
            round,
            "questions_unavailable",
            false,
            "QUESTIONS_UNAVAILABLE",
          );
          return;
        }

        console.error("Quiz question lookup failed.");
        finishQuizRound(
          roomCode,
          room,
          round,
          "quiz_unavailable",
          false,
          "QUIZ_UNAVAILABLE",
        );
      },
      );
  }

  function finishQuizRound(
    roomCode,
    room,
    round,
    reason,
    scoreAnswers,
    errorCode = null,
  ) {
    if (room.quizRound !== round || round.status === "finished") {
      return false;
    }

    round.status = "finished";
    clearQuizRound(round, clearTimeoutFn);

    if (errorCode) {
      io.to(roomCode).emit("quiz_error", {
        quizId: round.quizId,
        code: errorCode,
      });
    } else {
      const pointsByPlayer = new Map();
      if (scoreAnswers) {
        const correctAnswers = [...round.answers.entries()]
          .filter(
            ([playerId, answer]) =>
              room.players.includes(playerId) &&
              answer.alternativa ===
                round.questions.get(playerId).resposta_correta,
          )
          .map(([playerId, answer]) => ({ playerId, ...answer }))
          .sort((left, right) => left.receivedOrder - right.receivedOrder);

        correctAnswers.forEach(({ playerId }, index) => {
          const points = round.participantCount - index;
          pointsByPlayer.set(playerId, points);
          addQuizPoints(room.gameState, playerId, points);
        });
      }

      for (const playerId of round.participants) {
        if (!room.players.includes(playerId)) {
          continue;
        }

        const question = round.questions.get(playerId);
        const answer = round.answers.get(playerId);
        const points = pointsByPlayer.get(playerId) || 0;
        io.to(playerId).emit("quiz_result", {
          quizId: round.quizId,
          alternativa: answer?.alternativa ?? null,
          correta: answer?.alternativa === question.resposta_correta,
          pontos: points,
          respostaCorreta: question.resposta_correta,
          ...(question.explicacao !== null
            ? { explicacao: question.explicacao }
            : {}),
        });
      }
    }

    io.to(roomCode).emit("quiz_round_ended", {
      quizId: round.quizId,
      placar: Object.fromEntries(
        round.participants.map((playerId) => [
          playerId,
          room.gameState.quizPoints[playerId] || 0,
        ]),
      ),
      motivo: reason,
    });
    room.quizRound = null;

    for (const playerId of round.disconnected) {
      removePlayerFromGame(room.gameState, playerId);
    }
    if (room.gameState.status === "paused") {
      completeObstaclePause(room.gameState);
    }

    io.to(roomCode).emit(
      "game_state_updated",
      getPublicGameState(room.gameState),
    );
    if (room.gameState.status === "finished") {
      io.to(roomCode).emit("game_over", {
        winners: [...room.gameState.winners],
        reason: room.gameState.endReason,
      });
    }
    return true;
  }
}

const allConnectedParticipantsAnswered = (room, round) =>
  round.participants.every(
    (playerId) =>
      !room.players.includes(playerId) || round.answers.has(playerId),
  );

const clearQuizRound = (round, clearTimeoutFn) => {
  if (round?.timer !== null && round?.timer !== undefined) {
    clearTimeoutFn(round.timer);
    round.timer = null;
  }
};

module.exports = { attachLobbyHandlers, MAX_PLAYERS, MIN_PLAYERS };
