const {
  randomInt: secureRandomInt,
  randomUUID,
} = require("node:crypto");
const {
  ALLOWED_MAX_ROUNDS,
  DEFAULT_MAX_ROUNDS,
  addQuizPoints,
  applyQuizBonusMove,
  completeObstaclePause,
  createGameState,
  finishByAbandonment,
  getPublicGameState,
  recordQuizOutcome,
  removePlayerFromGame,
  rollDice,
} = require("./gameEngine");
const {
  QuizQuestionsUnavailableError,
  getObstacleForPosition,
  getStructuralLevel,
} = require("./quizService");

const MIN_PLAYERS = 4;
const MAX_PLAYERS = 8;
const CONDITIONS = ["cadeirante", "cego", "surdo", "neuroatipico"];
const SCHOOL_STAGES = ["Fundamental", "Médio", "Superior"];
const DEFAULT_QUIZ_DURATION_SEC = 30;
const ALLOWED_QUIZ_DURATIONS_SEC = [30, 45, 60];
const ROOM_IDLE_TIMEOUT_MS = 30 * 60 * 1_000;
const RECONNECT_GRACE_MS = 60 * 1_000;
const RATE_LIMIT_WINDOW_MS = 60 * 1_000;
const RATE_LIMITS = {
  create_room: 5,
  join_room: 30,
  list_rooms: 30,
  resume_room: 10,
  start_game: 10,
  play_again: 10,
  set_school_stage: 20,
  update_room_settings: 20,
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
const DEFAULT_MATRIX_CODE = "v1.0-baseline";

const ALL_CONDITION_PERMUTATIONS = (() => {
  const result = [];
  const permute = (current, remaining) => {
    if (remaining.length === 0) {
      result.push(current);
      return;
    }
    for (let i = 0; i < remaining.length; i++) {
      permute(
        [...current, remaining[i]],
        [...remaining.slice(0, i), ...remaining.slice(i + 1)],
      );
    }
  };
  permute([], CONDITIONS);
  return result;
})();

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

const assignConditionsWithRotation = (playerIds, previousConditions = {}) => {
  const firstFour = playerIds.slice(0, CONDITIONS.length);
  let bestScore = -1;
  let bestPermutations = [];

  for (const perm of ALL_CONDITION_PERMUTATIONS) {
    let changedCount = 0;
    for (let i = 0; i < firstFour.length; i++) {
      const prev = previousConditions[firstFour[i]];
      if (!prev || prev !== perm[i]) {
        changedCount += 1;
      }
    }
    if (changedCount > bestScore) {
      bestScore = changedCount;
      bestPermutations = [perm];
    } else if (changedCount === bestScore) {
      bestPermutations.push(perm);
    }
  }

  const chosenBase =
    bestPermutations[Math.floor(Math.random() * bestPermutations.length)];

  return Object.fromEntries(
    playerIds.map((playerId, index) => {
      if (index < CONDITIONS.length) {
        return [playerId, chosenBase[index]];
      }
      const prev = previousConditions[playerId];
      const candidates = prev
        ? CONDITIONS.filter((item) => item !== prev)
        : CONDITIONS;
      return [
        playerId,
        candidates[Math.floor(Math.random() * candidates.length)],
      ];
    }),
  );
};

const emitRoomUpdated = (io, roomCode, room) => {
  const connectedPlayers = room.players.filter(
    (playerId) => !room.disconnectedPlayers?.has(playerId),
  );
  const reconnectingPlayers = room.players
    .filter((playerId) => room.disconnectedPlayers?.has(playerId))
    .map((playerId) => ({
      playerId,
      ...room.playerProfiles[playerId],
      reconnectDeadlineAt: room.disconnectDeadlines?.get(playerId) ?? null,
    }));
  io.to(roomCode).emit("room_updated", {
    roomCode,
    playerCount: connectedPlayers.length,
    hostId: room.hostId,
    hostProfile: room.playerProfiles[room.hostId],
    isPrivate: room.isPrivate,
    schoolStage: room.schoolStage,
    quizDurationSec: room.quizDurationSec,
    maxRounds: room.maxRounds,
    turmaCodigo: room.turmaCodigo,
    started: room.started,
    players: connectedPlayers.map((playerId) => ({
      playerId,
      ...room.playerProfiles[playerId],
    })),
    reconnectingPlayers,
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
      quizDurationSec: room.quizDurationSec,
      maxRounds: room.maxRounds,
      turmaCodigo: room.turmaCodigo,
    }));

const emitLobbyRooms = (io, rooms) => {
  if (typeof io.emit === "function") {
    io.emit("rooms_updated", { rooms: getPublicRooms(rooms) });
  }
};

function buildMatchSnapshot(roomCode, room, now) {
  const gameState = room.gameState;
  const winnersSet = new Set(gameState.winners || []);
  const highlightsSet = new Set(gameState.quizHighlights || []);
  const initialOrder = gameState.initialTurnOrder || gameState.turnOrder;
  const allParticipantIds = [...new Set([...initialOrder, ...room.players])];

  const participants = allParticipantIds.map((playerId, idx) => {
    const profile =
      room.participantArchive?.[playerId]?.profile ||
      room.playerProfiles[playerId] || { name: `Jogador ${idx + 1}`, avatarId: DEFAULT_AVATAR_ID };
    const meta = room.participantArchive?.[playerId] || {};
    const stats = gameState.stats?.[playerId] || meta.stats || null;
    const position = gameState.positions?.[playerId] ?? meta.position ?? 0;
    const quizPoints = gameState.quizPoints?.[playerId] ?? meta.quizPoints ?? 0;
    const condition =
      room.playerConditions?.[playerId] || meta.condition || CONDITIONS[0];
    const userInfo = room.playerUsers?.[playerId] || meta.user || {};

    return {
      playerId,
      userId: userInfo.userId ?? null,
      anonId: room.playerAnonIds?.[playerId] || meta.anonId || randomUUID(),
      name: profile.name,
      avatarId: profile.avatarId,
      condition,
      turnOrderPosition: idx + 1,
      position,
      quizPoints,
      isWinner: winnersSet.has(playerId),
      isQuizHighlight: highlightsSet.has(playerId),
      stats,
      disconnected: !room.players.includes(playerId),
      consentiuPesquisa: Boolean(userInfo.consentResearch),
    };
  });

  const hostUser = room.playerUsers?.[room.hostId];

  return {
    uuid: room.matchUuid || randomUUID(),
    roomCode,
    turmaId: room.turmaId ?? null,
    matrizCodigo: room.matrizCodigo || DEFAULT_MATRIX_CODE,
    hostUserId: hostUser?.userId ?? null,
    schoolStage: room.schoolStage,
    isPrivate: room.isPrivate,
    quizDurationSec: room.quizDurationSec,
    maxRounds: room.maxRounds,
    roundsPlayed: gameState.round,
    endReason: gameState.endReason || "finish",
    startedAt: room.matchStartedAt || new Date(now()),
    finishedAt: new Date(now()),
    participants,
    turns: gameState.turnHistory || [],
    quizRounds: room.quizHistory || [],
  };
}

function attachLobbyHandlers(
  io,
  rooms,
  {
    randomInt = secureRandomInt,
    quizService,
    classRepository = null,
    matchPersistenceService = null,
    logger = null,
    now = Date.now,
    setTimeoutFn = setTimeout,
    clearTimeoutFn = clearTimeout,
    createQuizId = randomUUID,
  } = {},
) {
  const rateLimitState = new Map();

  const emitGameOver = (roomCode, room) => {
    const quizHighlights = [...(room.gameState.quizHighlights || [])];
    const highlightsSet = new Set(quizHighlights);
    const isAbandoned = room.gameState.endReason === "abandoned";

    const activeReveal = room.players.map((playerId) => {
      const playerStats = room.gameState.stats?.[playerId];
      return {
        playerId,
        ...room.playerProfiles[playerId],
        condition: room.playerConditions[playerId],
        position: room.gameState.positions[playerId],
        quizPoints: room.gameState.quizPoints[playerId] || 0,
        destaqueQuiz: highlightsSet.has(playerId),
        ...(playerStats
          ? {
              stats: {
                ...playerStats,
                quizLevels: { ...playerStats.quizLevels },
              },
            }
          : {}),
      };
    });

    const archivedReveal = isAbandoned
      ? Object.entries(room.participantArchive || {})
          .filter(([playerId]) => !room.players.includes(playerId))
          .map(([playerId, meta]) => ({
            playerId,
            ...(meta.profile || { name: "Jogador", avatarId: DEFAULT_AVATAR_ID }),
            condition: meta.condition,
            position: meta.position ?? 0,
            quizPoints: meta.quizPoints ?? 0,
            destaqueQuiz: false,
            disconnected: true,
            ...(meta.stats
              ? {
                  stats: {
                    ...meta.stats,
                    quizLevels: { ...meta.stats.quizLevels },
                  },
                }
              : {}),
          }))
      : [];

    const allReveal = [...activeReveal, ...archivedReveal];

    io.to(roomCode).emit("game_over", {
      winners: [...room.gameState.winners],
      quizHighlights,
      reason: room.gameState.endReason,
      roles: allReveal.map((item) => ({
        playerId: item.playerId,
        condition: item.condition,
      })),
      reveal: allReveal,
    });

    if (matchPersistenceService && !room.matchPersisted) {
      room.matchPersisted = true;
      const snapshot = buildMatchSnapshot(roomCode, room, now);
      Promise.resolve()
        .then(() => matchPersistenceService.persistMatch(snapshot))
        .catch((error) => {
          logger?.error("match", "unexpected_persist_rejection", {
            roomCode,
            message: error?.message,
          });
        });
    }
  };

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

  const resolveSocketUserMeta = (socket, payload) => {
    const authUser = socket.user || null;
    const explicitConsent =
      typeof payload?.consentResearch === "boolean"
        ? payload.consentResearch
        : undefined;
    return {
      userId: authUser?.userId ?? null,
      uuid: authUser?.uuid ?? null,
      consentResearch:
        explicitConsent !== undefined
          ? explicitConsent
          : Boolean(authUser?.consentResearch),
    };
  };

  const startMatchInRoom = (roomCode, room, { isRematch = false } = {}) => {
    const previousConditions = isRematch ? { ...(room.playerConditions || {}) } : {};

    room.gameState = createGameState(room.players, randomInt, {
      maxRounds: room.maxRounds,
    });
    room.usedQuestionIds = new Set();
    room.quizHistory = [];
    room.participantArchive = {};
    room.matchUuid = randomUUID();
    room.matchStartedAt = new Date(now());
    room.matchPersisted = false;
    clearRoomExpiration(room);
    room.started = true;

    room.playerConditions = assignConditionsWithRotation(
      room.players,
      previousConditions,
    );
    room.previousConditions = { ...room.playerConditions };

    emitRoomUpdated(io, roomCode, room);

    room.players.forEach((playerId) => {
      io.to(playerId).emit("game_started", {
        condition: room.playerConditions[playerId],
      });
    });
    io.to(roomCode).emit(
      "game_state_updated",
      getPublicGameState(room.gameState),
    );
    emitLobbyRooms(io, rooms);
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

    if (room.playerUsers?.[oldPlayerId]) {
      room.playerUsers[newPlayerId] = room.playerUsers[oldPlayerId];
      delete room.playerUsers[oldPlayerId];
    }
    if (room.playerAnonIds?.[oldPlayerId]) {
      room.playerAnonIds[newPlayerId] = room.playerAnonIds[oldPlayerId];
      delete room.playerAnonIds[oldPlayerId];
    }
    if (room.playerConditions) {
      room.playerConditions[newPlayerId] = room.playerConditions[oldPlayerId];
      delete room.playerConditions[oldPlayerId];
    }
    if (room.previousConditions?.[oldPlayerId]) {
      room.previousConditions[newPlayerId] = room.previousConditions[oldPlayerId];
      delete room.previousConditions[oldPlayerId];
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
      if (Array.isArray(room.gameState.initialTurnOrder)) {
        room.gameState.initialTurnOrder = room.gameState.initialTurnOrder.map(
          (playerId) => (playerId === oldPlayerId ? newPlayerId : playerId),
        );
      }
      room.gameState.positions[newPlayerId] = room.gameState.positions[oldPlayerId];
      room.gameState.quizPoints[newPlayerId] =
        room.gameState.quizPoints[oldPlayerId];
      delete room.gameState.positions[oldPlayerId];
      delete room.gameState.quizPoints[oldPlayerId];
      if (room.gameState.stats?.[oldPlayerId]) {
        room.gameState.stats[newPlayerId] = room.gameState.stats[oldPlayerId];
        delete room.gameState.stats[oldPlayerId];
      }
      if (room.gameState.obstaclePending?.playerId === oldPlayerId) {
        room.gameState.obstaclePending.playerId = newPlayerId;
      }
      if (room.gameState.lastEvent?.playerId === oldPlayerId) {
        room.gameState.lastEvent.playerId = newPlayerId;
      }
      if (Array.isArray(room.gameState.turnHistory)) {
        for (const turn of room.gameState.turnHistory) {
          if (turn.playerId === oldPlayerId) {
            turn.playerId = newPlayerId;
          }
        }
      }
    }

    if (Array.isArray(room.quizHistory)) {
      for (const pastRound of room.quizHistory) {
        for (const answer of pastRound.answers || []) {
          if (answer.playerId === oldPlayerId) {
            answer.playerId = newPlayerId;
          }
        }
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

  const emitCurrentQuizQuestion = (ioRef, room, playerId) => {
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
    ioRef.to(playerId).emit("quiz_question", {
      quizId: round.quizId,
      enunciado: question.enunciado,
      alternativas: {
        A: question.opcao_a,
        B: question.opcao_b,
        C: question.opcao_c,
        D: question.opcao_d,
      },
      deadlineAt: round.deadlineAt,
      durationSec: room.quizDurationSec,
    });
  };

  const schedulePlayerRemoval = (roomCode, room, playerId) => {
    room.disconnectDeadlines = room.disconnectDeadlines || new Map();
    room.disconnectDeadlines.set(playerId, now() + RECONNECT_GRACE_MS);
    const timer = setTimeoutFn(() => {
      room.disconnectedPlayers.delete(playerId);
      room.disconnectDeadlines?.delete(playerId);
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
      room.disconnectDeadlines?.delete(socket.id);

      if (room.started && room.gameState) {
        room.participantArchive = room.participantArchive || {};
        room.participantArchive[socket.id] = {
          profile: room.playerProfiles[socket.id],
          user: room.playerUsers?.[socket.id],
          anonId: room.playerAnonIds?.[socket.id],
          condition: room.playerConditions?.[socket.id],
          position: room.gameState.positions?.[socket.id] ?? 0,
          quizPoints: room.gameState.quizPoints?.[socket.id] ?? 0,
          stats: room.gameState.stats?.[socket.id]
            ? {
                ...room.gameState.stats[socket.id],
                quizLevels: { ...room.gameState.stats[socket.id].quizLevels },
              }
            : null,
        };
      }

      for (const [sessionToken, playerId] of Object.entries(room.sessionTokens)) {
        if (playerId === socket.id) {
          delete room.sessionTokens[sessionToken];
        }
      }
      room.players.splice(playerIndex, 1);
      delete room.playerProfiles[socket.id];
      if (room.playerUsers) {
        delete room.playerUsers[socket.id];
      }
      if (room.playerAnonIds) {
        delete room.playerAnonIds[socket.id];
      }
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
        if (
          room.gameState.status !== "finished" &&
          room.players.length === 1
        ) {
          finishByAbandonment(room.gameState);
        }
        io.to(roomCode).emit(
          "game_state_updated",
          getPublicGameState(room.gameState),
        );
        if (room.gameState.status === "finished") {
          emitGameOver(roomCode, room);
        }
      } else if (
        room.gameState &&
        room.gameState.status !== "finished" &&
        room.players.length === 1 &&
        room.quizRound
      ) {
        clearQuizRound(room.quizRound, clearTimeoutFn);
        room.quizRound = null;
        removePlayerFromGame(room.gameState, socket.id);
        finishByAbandonment(room.gameState);
        io.to(roomCode).emit(
          "game_state_updated",
          getPublicGameState(room.gameState),
        );
        emitGameOver(roomCode, room);
      }

      if (room.players.length === 0) {
        clearQuizRound(room.quizRound, clearTimeoutFn);
        room.quizRound = null;
        clearRoomExpiration(room);
        rooms.delete(roomCode);
        if (logger) {
          logger.info("match", "room_deleted_empty", { roomCode });
        } else {
          console.log(`Sala ${roomCode} deletada por estar vazia.`);
        }
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
    socket.on("create_room", async (payload) => {
      if (!allowEvent(socket, "create_room")) {
        return rejectRateLimitedEvent(socket);
      }
      const profileResult = normalizePlayerProfile(payload, 0);
      if (profileResult.error) {
        return socket.emit("room_error", { message: profileResult.error });
      }

      const requestedQuizDuration =
        payload?.quizDurationSec !== undefined
          ? Number(payload.quizDurationSec)
          : DEFAULT_QUIZ_DURATION_SEC;
      if (!ALLOWED_QUIZ_DURATIONS_SEC.includes(requestedQuizDuration)) {
        return socket.emit("room_error", {
          message: "Tempo do quiz inválido. Use 30, 45 ou 60 segundos.",
        });
      }

      const requestedMaxRounds =
        payload?.maxRounds !== undefined
          ? Number(payload.maxRounds)
          : DEFAULT_MAX_ROUNDS;
      if (!ALLOWED_MAX_ROUNDS.has(requestedMaxRounds)) {
        return socket.emit("room_error", {
          message: "Limite de rodadas inválido. Use 6 ou 8 rodadas.",
        });
      }

      let turmaId = null;
      let turmaCodigo = null;
      let initialStage = null;
      if (typeof payload?.turmaCodigo === "string" && payload.turmaCodigo.trim()) {
        const normalizedCode = payload.turmaCodigo.trim().toUpperCase();
        if (classRepository && typeof classRepository.findByCodigo === "function") {
          try {
            const turma = await classRepository.findByCodigo(normalizedCode);
            if (!turma) {
              return socket.emit("room_error", {
                message: "Código de turma não encontrado ou inativo.",
              });
            }
            turmaId = turma.id;
            turmaCodigo = turma.codigo;
            initialStage = turma.etapa_padrao ?? null;
          } catch (error) {
            logger?.warn("db", "class_lookup_failed", {
              code: error?.code,
              message: error?.message,
            });
            return socket.emit("room_error", {
              message: "Não foi possível validar o código da turma agora.",
            });
          }
        } else {
          turmaCodigo = normalizedCode;
        }
      }

      removeSocketFromRoom(socket);
      const roomCode = generateRoomCode();
      const sessionToken = getSessionToken(payload);
      const room = {
        players: [socket.id],
        hostId: socket.id,
        sessionTokens: {
          [sessionToken]: socket.id,
        },
        disconnectedPlayers: new Map(),
        disconnectDeadlines: new Map(),
        isPrivate: payload?.isPrivate === true,
        schoolStage: initialStage,
        quizDurationSec: requestedQuizDuration,
        maxRounds: requestedMaxRounds,
        turmaId,
        turmaCodigo,
        matrizCodigo: DEFAULT_MATRIX_CODE,
        started: false,
        playerConditions: null,
        previousConditions: {},
        quizRound: null,
        quizHistory: [],
        usedQuestionIds: new Set(),
        participantArchive: {},
        playerProfiles: {
          [socket.id]: profileResult.profile,
        },
        playerUsers: {
          [socket.id]: resolveSocketUserMeta(socket, payload),
        },
        playerAnonIds: {
          [socket.id]: randomUUID(),
        },
      };
      rooms.set(roomCode, room);
      scheduleRoomExpiration(roomCode, room);
      socket.join(roomCode);

      if (logger) {
        logger.info("match", "room_created", { roomCode, isPrivate: room.isPrivate });
      } else {
        console.log(`Sala ${roomCode} criada pelo jogador ${socket.id}`);
      }
      socket.emit("room_created", {
        roomCode,
        playerCount: 1,
        hostId: socket.id,
        isPrivate: room.isPrivate,
        schoolStage: room.schoolStage,
        quizDurationSec: room.quizDurationSec,
        maxRounds: room.maxRounds,
        turmaCodigo: room.turmaCodigo,
        started: room.started,
        sessionToken,
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
      room.playerUsers[socket.id] = resolveSocketUserMeta(socket, payload);
      room.playerAnonIds[socket.id] = randomUUID();
      room.sessionTokens[sessionToken] = socket.id;
      scheduleRoomExpiration(roomCode, room);
      socket.join(roomCode);

      if (logger) {
        logger.info("match", "player_joined", {
          roomCode,
          playerCount: room.players.length,
        });
      } else {
        console.log(`Jogador ${socket.id} entrou na sala ${roomCode}`);
      }
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
      room.disconnectDeadlines?.delete(oldPlayerId);
      replacePlayerId(room, oldPlayerId, socket.id);
      room.sessionTokens[sessionToken] = socket.id;
      socket.join(roomCode);

      socket.emit("room_resumed", {
        roomCode,
        hostId: room.hostId,
        isPrivate: room.isPrivate,
        schoolStage: room.schoolStage,
        quizDurationSec: room.quizDurationSec,
        maxRounds: room.maxRounds,
        turmaCodigo: room.turmaCodigo,
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

    socket.on("update_room_settings", async (payload) => {
      if (!allowEvent(socket, "update_room_settings")) {
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
          message: "Somente o anfitrião pode configurar a sala.",
        });
      }
      if (room.started && room.gameState?.status !== "finished") {
        return socket.emit("room_error", {
          message: "As configurações não podem ser alteradas durante a partida.",
        });
      }

      if (payload?.quizDurationSec !== undefined) {
        const dur = Number(payload.quizDurationSec);
        if (!ALLOWED_QUIZ_DURATIONS_SEC.includes(dur)) {
          return socket.emit("room_error", {
            message: "Tempo do quiz inválido. Use 30, 45 ou 60 segundos.",
          });
        }
        room.quizDurationSec = dur;
      }

      if (payload?.maxRounds !== undefined) {
        const rounds = Number(payload.maxRounds);
        if (!ALLOWED_MAX_ROUNDS.has(rounds)) {
          return socket.emit("room_error", {
            message: "Limite de rodadas inválido. Use 6 ou 8 rodadas.",
          });
        }
        room.maxRounds = rounds;
      }

      if (payload?.turmaCodigo !== undefined) {
        const rawCode =
          typeof payload.turmaCodigo === "string"
            ? payload.turmaCodigo.trim().toUpperCase()
            : "";
        if (!rawCode) {
          room.turmaId = null;
          room.turmaCodigo = null;
        } else if (classRepository && typeof classRepository.findByCodigo === "function") {
          try {
            const turma = await classRepository.findByCodigo(rawCode);
            if (!turma) {
              return socket.emit("room_error", {
                message: "Código de turma não encontrado ou inativo.",
              });
            }
            room.turmaId = turma.id;
            room.turmaCodigo = turma.codigo;
          } catch {
            return socket.emit("room_error", {
              message: "Não foi possível validar o código da turma agora.",
            });
          }
        } else {
          room.turmaCodigo = rawCode;
        }
      }

      scheduleRoomExpiration(roomCode, room);
      emitRoomUpdated(io, roomCode, room);
      emitLobbyRooms(io, rooms);
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
      if (room.started && room.gameState?.status !== "finished") {
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

      startMatchInRoom(roomCode, room, { isRematch: false });
    });

    socket.on("play_again", (payload) => {
      if (!allowEvent(socket, "play_again")) {
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
          message: "Somente o anfitrião pode iniciar uma revanche.",
        });
      }
      if (!room.gameState || room.gameState.status !== "finished") {
        return socket.emit("room_error", {
          message: "A revanche só pode ser iniciada após o término da partida.",
        });
      }
      if (room.players.length < MIN_PLAYERS || room.players.length > MAX_PLAYERS) {
        return socket.emit("room_error", {
          message: `São necessários de ${MIN_PLAYERS} a ${MAX_PLAYERS} jogadores para jogar novamente.`,
        });
      }

      clearQuizRound(room.quizRound, clearTimeoutFn);
      room.quizRound = null;
      startMatchInRoom(roomCode, room, { isRematch: true });
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

      const result = rollDice(room.gameState, randomInt, now);
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
        emitGameOver(roomCode, room);
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

      const currentTime = now();
      if (currentTime >= round.deadlineAt) {
        finishQuizRound(roomCode, room, round, "timeout", true);
        return respond({ success: false, code: "DEADLINE_EXPIRED" });
      }

      if (round.answers.has(socket.id)) {
        return respond({ success: false, code: "ALREADY_ANSWERED" });
      }

      round.answers.set(socket.id, {
        alternativa: payload.alternativa,
        receivedOrder: round.nextAnswerOrder++,
        responseTimeMs: Math.max(0, currentTime - (round.startedAt ?? currentTime)),
        answeredAt: new Date(currentTime),
      });
      respond({ success: true });

      if (allConnectedParticipantsAnswered(room, round)) {
        finishQuizRound(roomCode, room, round, "all_answered", true);
      }
    });

    socket.on("disconnect", () => {
      if (logger) {
        logger.info("match", "socket_disconnected", { socketId: socket.id });
      } else {
        console.log("Jogador desconectado:", socket.id);
      }
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
          return;
        }
        if (
          room.quizRound?.status === "active" &&
          allConnectedParticipantsAnswered(room, room.quizRound)
        ) {
          finishQuizRound(
            roomEntry[0],
            room,
            room.quizRound,
            "all_answered",
            true,
          );
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
      emitGameOver(normalizedRoomCode, room);
    }
    return true;
  };

  function beginQuizRound(roomCode, room, result) {
    const obstaclePosition = room.gameState.positions[result.playerId];
    const obstacle = getObstacleForPosition(obstaclePosition);
    const quizDurationMs =
      (room.quizDurationSec || DEFAULT_QUIZ_DURATION_SEC) * 1_000;
    const round = {
      quizId: createQuizId(),
      status: "preparing",
      turnNumber: result.turnNumber ?? null,
      matchRound: room.gameState.round,
      obstaclePosition,
      obstacleName: obstacle?.name ?? "obstaculo",
      participants: [...room.players],
      participantCount: room.players.length,
      answers: new Map(),
      disconnected: new Set(),
      reconnectedFrom: new Map(),
      questions: null,
      startedAt: null,
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
          position: obstaclePosition,
          participantIds: round.participants,
          playerConditions: room.playerConditions,
          usedQuestionIds: room.usedQuestionIds,
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
          if (Number.isSafeInteger(question?.id) && question.id > 0) {
            room.usedQuestionIds?.add(question.id);
          }
        }
        round.questions = remappedQuestions;
        round.startedAt = now();
        round.deadlineAt = round.startedAt + quizDurationMs;
        round.status = "active";
        round.timer = setTimeoutFn(() => {
          if (room.quizRound === round) {
            finishQuizRound(roomCode, room, round, "timeout", true);
          }
        }, quizDurationMs);

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
            durationSec: room.quizDurationSec || DEFAULT_QUIZ_DURATION_SEC,
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
    const finishedAt = now();
    clearQuizRound(round, clearTimeoutFn);

    let fastestCorrectPlayerId = null;
    const bonusMoveByPlayer = new Map();
    const historyAnswers = [];

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
                round.questions.get(playerId)?.resposta_correta,
          )
          .map(([playerId, answer]) => ({ playerId, ...answer }))
          .sort((left, right) => left.receivedOrder - right.receivedOrder);

        correctAnswers.forEach(({ playerId }, index) => {
          const points = round.participantCount - index;
          pointsByPlayer.set(playerId, points);
          addQuizPoints(room.gameState, playerId, points);
        });

        if (correctAnswers.length > 0) {
          fastestCorrectPlayerId = correctAnswers[0].playerId;
          const moveOutcome = applyQuizBonusMove(
            room.gameState,
            fastestCorrectPlayerId,
            1,
          );
          if (moveOutcome.stepsMoved > 0) {
            bonusMoveByPlayer.set(fastestCorrectPlayerId, moveOutcome.stepsMoved);
          }
        }
      }

      for (const playerId of round.participants) {
        const question = round.questions?.get(playerId);
        const answer = round.answers.get(playerId);
        const isDisconnected =
          !room.players.includes(playerId) || round.disconnected.has(playerId);
        const isCorrect =
          !isDisconnected &&
          Boolean(question) &&
          answer?.alternativa === question.resposta_correta;
        const points = pointsByPlayer.get(playerId) || 0;
        const bonusMove = bonusMoveByPlayer.get(playerId) || 0;
        const condition =
          room.playerConditions?.[playerId] ||
          room.participantArchive?.[playerId]?.condition ||
          CONDITIONS[0];
        const structuralLevel =
          getStructuralLevel(round.obstaclePosition, condition) || 1;

        if (question) {
          historyAnswers.push({
            playerId,
            questionId: Number.isInteger(question.id) ? question.id : null,
            condition,
            structuralLevel,
            selectedOption: isDisconnected ? null : (answer?.alternativa ?? null),
            correct: isCorrect,
            responseTimeMs: isDisconnected ? null : (answer?.responseTimeMs ?? null),
            receivedOrder:
              !isDisconnected && answer ? answer.receivedOrder + 1 : null,
            points,
            bonusMove,
            disconnected: isDisconnected,
            answeredAt: isDisconnected ? null : (answer?.answeredAt ?? null),
          });
        }

        if (isDisconnected || !question) {
          continue;
        }

        if (scoreAnswers) {
          recordQuizOutcome(room.gameState, playerId, {
            level: structuralLevel,
            answered: Boolean(answer),
            correct: isCorrect,
          });
        }
        io.to(playerId).emit("quiz_result", {
          quizId: round.quizId,
          alternativa: answer?.alternativa ?? null,
          correta: isCorrect,
          pontos: points,
          bonusMove,
          ...(answer?.responseTimeMs !== undefined
            ? { tempoRespostaMs: answer.responseTimeMs }
            : {}),
          respostaCorreta: question.resposta_correta,
          ...(question.explicacao !== null
            ? { explicacao: question.explicacao }
            : {}),
        });
      }
    }

    if (Array.isArray(room.quizHistory)) {
      room.quizHistory.push({
        quizId: round.quizId,
        turnNumber: round.turnNumber,
        round: round.matchRound,
        obstaclePosition: round.obstaclePosition,
        obstacleName: round.obstacleName,
        participantCount: round.participantCount,
        reason,
        startedAt: new Date(round.startedAt || finishedAt),
        finishedAt: new Date(finishedAt),
        answers: historyAnswers,
      });
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
      fastestCorrectPlayerId,
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
    if (room.gameState.status !== "finished" && room.players.length === 1) {
      finishByAbandonment(room.gameState);
    }

    io.to(roomCode).emit(
      "game_state_updated",
      getPublicGameState(room.gameState),
    );
    if (room.gameState.status === "finished") {
      emitGameOver(roomCode, room);
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
  ALLOWED_QUIZ_DURATIONS_SEC,
  DEFAULT_QUIZ_DURATION_SEC,
  MAX_PLAYERS,
  MIN_PLAYERS,
  RATE_LIMITS,
  RECONNECT_GRACE_MS,
  ROOM_IDLE_TIMEOUT_MS,
  assignConditionsWithRotation,
  attachLobbyHandlers,
};
