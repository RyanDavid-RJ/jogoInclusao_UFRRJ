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
const ROOM_IDLE_TIMEOUT_MS = 30 * 60 * 1_000;
const RECONNECT_GRACE_MS = 60 * 1_000;
const RATE_LIMIT_WINDOW_MS = 60 * 1_000;
const RATE_LIMITS = {
  create_room: 5,
  join_room: 30,
  list_rooms: 30,
  resume_room: 10,
  start_game: 10,
  set_school_stage: 20,
  roll_dice: 20,
  submit_quiz_answer: 30,
};
const AVATAR_IDS = [
  "coelho",
  "gato",
  "urso",
  "raposa",
  "pinguim",
  "coruja",
  "sapo",
  "leao",
];
const DEFAULT_AVATAR_ID = AVATAR_IDS[0];

const getSessionToken = (payload) =>
  typeof payload?.sessionToken === "string" &&
  payload.sessionToken.trim().length >= 16 &&
  payload.sessionToken.trim().length <= 128
    ? payload.sessionToken.trim()
    : randomUUID();

const normalizePlayerProfile = (payload, playerIndex) => {
  const hasName = Object.prototype.hasOwnProperty.call(payload || {}, "name");
  const hasAvatar = Object.prototype.hasOwnProperty.call(
    payload || {},
    "avatarId",
  );
  const name =
    typeof payload?.name === "string" ? payload.name.trim() : undefined;
  const avatarId =
    typeof payload?.avatarId === "string"
      ? payload.avatarId.trim().toLowerCase()
      : undefined;

  if (hasName && (!name || name.length > 16)) {
    return { error: "O nome deve ter entre 1 e 16 caracteres." };
  }
  if (hasAvatar && !AVATAR_IDS.includes(avatarId)) {
    return { error: "Avatar inválido." };
  }

  return {
    profile: {
      name: name || `Jogador ${playerIndex + 1}`,
      avatarId: avatarId || DEFAULT_AVATAR_ID,
    },
  };
};

const shuffleArray = (array) => {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
};

const emitRoomUpdated = (io, roomCode, room) => {
  const connectedPlayers = room.players.filter(
    (playerId) => !room.disconnectedPlayers?.has(playerId),
  );
  io.to(roomCode).emit("room_updated", {
    roomCode,
    playerCount: connectedPlayers.length,
    hostId: room.hostId,
    hostProfile: room.playerProfiles[room.hostId],
    isPrivate: room.isPrivate,
    schoolStage: room.schoolStage,
    started: room.started,
    players: connectedPlayers.map((playerId) => ({
      playerId,
      ...room.playerProfiles[playerId],
    })),
  });
};

const getPublicRooms = (rooms) =>
  [...rooms.entries()]
    .filter(([, room]) => !room.isPrivate && !room.started)
    .map(([roomCode, room]) => ({
      roomCode,
      playerCount: room.players.length,
      hostId: room.hostId,
      hostProfile: room.playerProfiles[room.hostId],
      isPrivate: room.isPrivate,
      schoolStage: room.schoolStage,
    }));

const emitLobbyRooms = (io, rooms) => {
  if (typeof io.emit === "function") {
    io.emit("rooms_updated", { rooms: getPublicRooms(rooms) });
  }
};

const emitGameOver = (io, roomCode, room) => {
  io.to(roomCode).emit("game_over", {
    winners: [...room.gameState.winners],
    reason: room.gameState.endReason,
    roles: room.players.map((playerId) => ({
      playerId,
      condition: room.playerConditions[playerId],
    })),
    reveal: room.players.map((playerId) => ({
      playerId,
      ...room.playerProfiles[playerId],
      condition: room.playerConditions[playerId],
      position: room.gameState.positions[playerId],
      quizPoints: room.gameState.quizPoints[playerId] || 0,
    })),
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
  const rateLimitState = new Map();

  const allowEvent = (socket, eventName) => {
    const limit = RATE_LIMITS[eventName];
    if (!limit) {
      return true;
    }

    const currentTime = now();
    const previous = rateLimitState.get(socket.id);
    const state =
      !previous || currentTime - previous.windowStartedAt >= RATE_LIMIT_WINDOW_MS
        ? { windowStartedAt: currentTime, counts: new Map() }
        : previous;
    const count = state.counts.get(eventName) ?? 0;
    if (count >= limit) {
      rateLimitState.set(socket.id, state);
      return false;
    }
    state.counts.set(eventName, count + 1);
    rateLimitState.set(socket.id, state);
    return true;
  };

  const rejectRateLimitedEvent = (socket) =>
    socket.emit("room_error", {
      code: "RATE_LIMITED",
      message: "Muitas tentativas. Aguarde um momento e tente novamente.",
    });

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

  const clearRoomExpiration = (room) => {
    if (room.expirationTimer !== null && room.expirationTimer !== undefined) {
      clearTimeoutFn(room.expirationTimer);
      room.expirationTimer = null;
    }
  };

  const scheduleRoomExpiration = (roomCode, room) => {
    clearRoomExpiration(room);
    room.expirationTimer = setTimeoutFn(() => {
      if (rooms.get(roomCode) !== room || room.started) {
        return;
      }

      for (const playerId of room.players) {
        io.to(playerId).emit("room_closed", { roomCode });
        const playerSocket = io.sockets?.sockets?.get(playerId);
        if (typeof playerSocket?.leave === "function") {
          playerSocket.leave(roomCode);
        }
      }

      clearRoomExpiration(room);
      rooms.delete(roomCode);
      emitLobbyRooms(io, rooms);
    }, ROOM_IDLE_TIMEOUT_MS);

    room.expirationTimer?.unref?.();
  };

  const replacePlayerId = (room, oldPlayerId, newPlayerId) => {
    room.players = room.players.map((playerId) =>
      playerId === oldPlayerId ? newPlayerId : playerId,
    );
    if (room.hostId === oldPlayerId) {
      room.hostId = newPlayerId;
    }
    room.playerProfiles[newPlayerId] = room.playerProfiles[oldPlayerId];
    delete room.playerProfiles[oldPlayerId];
    if (room.playerConditions) {
      room.playerConditions[newPlayerId] = room.playerConditions[oldPlayerId];
      delete room.playerConditions[oldPlayerId];
    }
    for (const [sessionToken, playerId] of Object.entries(room.sessionTokens)) {
      if (playerId === oldPlayerId) {
        room.sessionTokens[sessionToken] = newPlayerId;
      }
    }

    if (room.gameState) {
      room.gameState.turnOrder = room.gameState.turnOrder.map((playerId) =>
        playerId === oldPlayerId ? newPlayerId : playerId,
      );
      room.gameState.positions[newPlayerId] = room.gameState.positions[oldPlayerId];
      room.gameState.quizPoints[newPlayerId] =
        room.gameState.quizPoints[oldPlayerId];
      delete room.gameState.positions[oldPlayerId];
      delete room.gameState.quizPoints[oldPlayerId];
      if (room.gameState.obstaclePending?.playerId === oldPlayerId) {
        room.gameState.obstaclePending.playerId = newPlayerId;
      }
    }

    if (room.quizRound) {
      room.quizRound.participants = room.quizRound.participants.map((playerId) =>
        playerId === oldPlayerId ? newPlayerId : playerId,
      );
      if (room.quizRound.questions?.has(oldPlayerId)) {
        room.quizRound.questions.set(
          newPlayerId,
          room.quizRound.questions.get(oldPlayerId),
        );
        room.quizRound.questions.delete(oldPlayerId);
      }
      if (room.quizRound.answers.has(oldPlayerId)) {
        room.quizRound.answers.set(
          newPlayerId,
          room.quizRound.answers.get(oldPlayerId),
        );
        room.quizRound.answers.delete(oldPlayerId);
      }
      room.quizRound.disconnected.delete(oldPlayerId);
      room.quizRound.reconnectedFrom?.set(oldPlayerId, newPlayerId);
    }
  };

  const emitCurrentQuizQuestion = (io, room, playerId) => {
    const round = room.quizRound;
    if (
      !round ||
      round.status !== "active" ||
      !round.questions ||
      round.answers.has(playerId)
    ) {
      return;
    }
    const question = round.questions.get(playerId);
    if (!question) {
      return;
    }
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
  };

  const schedulePlayerRemoval = (roomCode, room, playerId) => {
    const timer = setTimeoutFn(() => {
      room.disconnectedPlayers.delete(playerId);
      const socket = { id: playerId, leave: () => {} };
      removeSocketFromRoom(socket);
    }, RECONNECT_GRACE_MS);
    room.disconnectedPlayers.set(playerId, timer);
    timer?.unref?.();
  };

  const removeSocketFromRoom = (socket, { notifyLobby = true } = {}) => {
    for (const [roomCode, room] of rooms.entries()) {
      const playerIndex = room.players.indexOf(socket.id);
      if (playerIndex === -1) {
        continue;
      }

      const disconnectTimer = room.disconnectedPlayers?.get(socket.id);
      if (disconnectTimer !== undefined) {
        clearTimeoutFn(disconnectTimer);
        room.disconnectedPlayers.delete(socket.id);
      }
      for (const [sessionToken, playerId] of Object.entries(room.sessionTokens)) {
        if (playerId === socket.id) {
          delete room.sessionTokens[sessionToken];
        }
      }
      room.players.splice(playerIndex, 1);
      delete room.playerProfiles[socket.id];
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
          emitGameOver(io, roomCode, room);
        }
      }

      if (room.players.length === 0) {
        clearQuizRound(room.quizRound, clearTimeoutFn);
        room.quizRound = null;
        clearRoomExpiration(room);
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
      if (notifyLobby) {
        emitLobbyRooms(io, rooms);
      }
      if (typeof socket.leave === "function") {
        socket.leave(roomCode);
      }
      return;
    }
  };

  io.on("connection", (socket) => {
    socket.on("create_room", (payload) => {
      if (!allowEvent(socket, "create_room")) {
        return rejectRateLimitedEvent(socket);
      }
      const profileResult = normalizePlayerProfile(payload, 0);
      if (profileResult.error) {
        return socket.emit("room_error", { message: profileResult.error });
      }
      removeSocketFromRoom(socket);
      const roomCode = generateRoomCode();
      const room = {
        players: [socket.id],
        hostId: socket.id,
        sessionTokens: {
          [getSessionToken(payload)]: socket.id,
        },
        disconnectedPlayers: new Map(),
        isPrivate: payload?.isPrivate === true,
        schoolStage: null,
        started: false,
        playerConditions: null,
        quizRound: null,
        playerProfiles: {
          [socket.id]: profileResult.profile,
        },
      };
      rooms.set(roomCode, room);
      scheduleRoomExpiration(roomCode, room);
      socket.join(roomCode);

      console.log(`Sala ${roomCode} criada pelo jogador ${socket.id}`);
      socket.emit("room_created", {
        roomCode,
        playerCount: 1,
        hostId: socket.id,
        isPrivate: room.isPrivate,
        schoolStage: room.schoolStage,
        started: room.started,
        sessionToken: Object.keys(room.sessionTokens)[0],
        players: [{ playerId: socket.id, ...room.playerProfiles[socket.id] }],
      });
      emitLobbyRooms(io, rooms);
    });

    socket.on("list_rooms", () => {
      if (!allowEvent(socket, "list_rooms")) {
        return rejectRateLimitedEvent(socket);
      }
      socket.emit("rooms_updated", { rooms: getPublicRooms(rooms) });
    });

    socket.on("join_room", (payload) => {
      if (!allowEvent(socket, "join_room")) {
        return rejectRateLimitedEvent(socket);
      }
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

      const profileResult = normalizePlayerProfile(payload, room.players.length);
      if (profileResult.error) {
        return socket.emit("room_error", { message: profileResult.error });
      }

      const sessionToken = getSessionToken(payload);
      if (Object.prototype.hasOwnProperty.call(room.sessionTokens, sessionToken)) {
        return socket.emit("room_error", {
          message: "Essa sessão já está vinculada à sala.",
        });
      }
      room.players.push(socket.id);
      room.playerProfiles[socket.id] = profileResult.profile;
      room.sessionTokens[sessionToken] = socket.id;
      scheduleRoomExpiration(roomCode, room);
      socket.join(roomCode);

      console.log(`Jogador ${socket.id} entrou na sala ${roomCode}`);
      socket.emit("room_joined", {
        roomCode,
        playerCount: room.players.length,
        hostId: room.hostId,
        schoolStage: room.schoolStage,
        started: room.started,
        sessionToken,
      });
      emitRoomUpdated(io, roomCode, room);
      emitLobbyRooms(io, rooms);
    });

    socket.on("resume_room", (payload) => {
      if (!allowEvent(socket, "resume_room")) {
        return rejectRateLimitedEvent(socket);
      }
      const roomCode =
        typeof payload?.roomCode === "string"
          ? payload.roomCode.trim().toUpperCase()
          : "";
      const sessionToken =
        typeof payload?.sessionToken === "string"
          ? payload.sessionToken.trim()
          : "";
      const room = rooms.get(roomCode);
      const oldPlayerId = room?.sessionTokens?.[sessionToken];

      if (!room || !oldPlayerId || !room.players.includes(oldPlayerId)) {
        return socket.emit("room_error", {
          message: "Não foi possível retomar esta sessão.",
        });
      }
      if (room.gameState?.status === "finished") {
        return socket.emit("room_error", {
          message: "A partida já foi encerrada.",
        });
      }
      if (room.players.includes(socket.id)) {
        return socket.emit("room_error", {
          message: "Este jogador já está conectado.",
        });
      }

      const disconnectTimer = room.disconnectedPlayers.get(oldPlayerId);
      if (disconnectTimer !== undefined) {
        clearTimeoutFn(disconnectTimer);
        room.disconnectedPlayers.delete(oldPlayerId);
      }
      replacePlayerId(room, oldPlayerId, socket.id);
      room.sessionTokens[sessionToken] = socket.id;
      socket.join(roomCode);

      socket.emit("room_resumed", {
        roomCode,
        hostId: room.hostId,
        schoolStage: room.schoolStage,
        started: room.started,
        condition: room.playerConditions?.[socket.id] ?? null,
        players: room.players.map((playerId) => ({
          playerId,
          ...room.playerProfiles[playerId],
        })),
      });
      emitRoomUpdated(io, roomCode, room);
      if (room.gameState) {
        socket.emit("game_state_updated", getPublicGameState(room.gameState));
        if (room.gameState.status === "paused" && room.gameState.obstaclePending) {
          socket.emit("obstacle_pending", {
            ...room.gameState.obstaclePending,
            round: room.gameState.round,
          });
        }
      }
      emitCurrentQuizQuestion(io, room, socket.id);
    });

    socket.on("set_school_stage", (payload) => {
      if (!allowEvent(socket, "set_school_stage")) {
        return rejectRateLimitedEvent(socket);
      }
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
      scheduleRoomExpiration(roomCode, room);
      emitRoomUpdated(io, roomCode, room);
    });

    socket.on("leave_room", () => {
      const roomEntry = [...rooms.entries()].find(([, room]) =>
        room.players.includes(socket.id),
      );
      if (!roomEntry) {
        return socket.emit("room_error", {
          message: "Você não está em uma sala.",
        });
      }
      const [roomCode] = roomEntry;
      removeSocketFromRoom(socket);
      socket.emit("room_left", { roomCode });
    });

    socket.on("close_room", (payload) => {
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
          message: "Somente o anfitrião pode fechar a sala.",
        });
      }
      if (room.started) {
        return socket.emit("room_error", {
          message: "A sala não pode ser fechada após o início da partida.",
        });
      }

      clearQuizRound(room.quizRound, clearTimeoutFn);
      clearRoomExpiration(room);
      for (const playerId of room.players) {
        io.to(playerId).emit("room_closed", { roomCode });
        const playerSocket = io.sockets?.sockets?.get(playerId);
        if (typeof playerSocket?.leave === "function") {
          playerSocket.leave(roomCode);
        }
      }
      rooms.delete(roomCode);
      emitLobbyRooms(io, rooms);
    });

    socket.on("start_game", (payload) => {
      if (!allowEvent(socket, "start_game")) {
        return rejectRateLimitedEvent(socket);
      }
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
      clearRoomExpiration(room);
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
      if (!allowEvent(socket, "roll_dice")) {
        return rejectRateLimitedEvent(socket);
      }
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
        emitGameOver(io, roomCode, room);
      }
    });

    socket.on("submit_quiz_answer", (payload, acknowledge) => {
      const respond = (response) => {
        if (typeof acknowledge === "function") {
          acknowledge(response);
        }
      };
      if (!allowEvent(socket, "submit_quiz_answer")) {
        return respond({ success: false, code: "RATE_LIMITED" });
      }
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
      rateLimitState.delete(socket.id);
      const roomEntry = [...rooms.entries()].find(([, room]) =>
        room.players.includes(socket.id),
      );
      const room = roomEntry?.[1];
      if (
        room?.started &&
        room.gameState &&
        room.gameState.status !== "finished"
      ) {
        if (room.quizRound) {
          room.quizRound.disconnected.add(socket.id);
        }
        if (
          !room.quizRound &&
          room.gameState.obstaclePending?.playerId === socket.id
        ) {
          completeObstaclePause(room.gameState);
          io.to(roomEntry[0]).emit(
            "game_state_updated",
            getPublicGameState(room.gameState),
          );
        }
        schedulePlayerRemoval(roomEntry[0], room, socket.id);
        emitRoomUpdated(io, roomEntry[0], room);
        if (room.disconnectedPlayers.size === room.players.length) {
          for (const playerId of [...room.players]) {
            removeSocketFromRoom({ id: playerId, leave: () => {} });
          }
        }
        return;
      }
      removeSocketFromRoom(socket);
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
      emitGameOver(io, normalizedRoomCode, room);
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
      reconnectedFrom: new Map(),
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

        const resolveCurrentPlayerId = (playerId) => {
          let current = playerId;
          while (round.reconnectedFrom.has(current)) {
            current = round.reconnectedFrom.get(current);
          }
          return current;
        };
        const remappedQuestions = new Map();
        for (const [playerId, question] of questions.entries()) {
          remappedQuestions.set(resolveCurrentPlayerId(playerId), question);
        }
        round.questions = remappedQuestions;
        round.deadlineAt = now() + QUIZ_DURATION_MS;
        round.status = "active";
        round.timer = setTimeoutFn(() => {
          if (room.quizRound === round) {
            finishQuizRound(roomCode, room, round, "timeout", true);
          }
        }, QUIZ_DURATION_MS);

        for (const playerId of round.participants) {
          if (!room.players.includes(playerId) || round.disconnected.has(playerId)) {
            continue;
          }

          const question = round.questions.get(playerId);
          if (!question) {
            continue;
          }
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
              !round.disconnected.has(playerId) &&
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
        if (!room.players.includes(playerId) || round.disconnected.has(playerId)) {
          continue;
        }

        const question = round.questions.get(playerId);
        if (!question) {
          continue;
        }
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
      if (room.players.includes(playerId)) {
        removeSocketFromRoom(
          { id: playerId, leave: () => {} },
          { notifyLobby: false },
        );
      }
    }
    if (room.gameState.status === "paused") {
      completeObstaclePause(room.gameState);
    }

    io.to(roomCode).emit(
      "game_state_updated",
      getPublicGameState(room.gameState),
    );
    if (room.gameState.status === "finished") {
      emitGameOver(io, roomCode, room);
    }
    return true;
  }
}

const allConnectedParticipantsAnswered = (room, round) =>
  round.participants.every(
    (playerId) =>
      !room.players.includes(playerId) ||
      round.disconnected.has(playerId) ||
      round.answers.has(playerId),
  );

const clearQuizRound = (round, clearTimeoutFn) => {
  if (round?.timer !== null && round?.timer !== undefined) {
    clearTimeoutFn(round.timer);
    round.timer = null;
  }
};

module.exports = {
  attachLobbyHandlers,
  MAX_PLAYERS,
  MIN_PLAYERS,
  RATE_LIMITS,
  ROOM_IDLE_TIMEOUT_MS,
  RECONNECT_GRACE_MS,
};
