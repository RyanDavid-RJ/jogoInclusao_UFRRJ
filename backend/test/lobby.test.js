const assert = require("node:assert/strict");
const test = require("node:test");

const { attachLobbyHandlers, MAX_PLAYERS, MIN_PLAYERS } = require("../lobby");
const { createQuizService } = require("../quizService");

const question = {
  enunciado: "Quanto é 2 + 2?",
  opcao_a: "4",
  opcao_b: "3",
  opcao_c: "5",
  opcao_d: "6",
  resposta_correta: "A",
  explicacao: "Somando dois e dois, obtemos quatro.",
};

const createFakeClock = (initialTime = 1_000) => {
  let time = initialTime;
  let nextTimerId = 1;
  const timers = new Map();

  return {
    now: () => time,
    setTime(value) {
      time = value;
    },
    setTimeoutFn(callback, delay) {
      const timerId = nextTimerId++;
      timers.set(timerId, { callback, delay });
      return timerId;
    },
    clearTimeoutFn(timerId) {
      timers.delete(timerId);
    },
    advance(milliseconds) {
      time += milliseconds;
      const expiredTimers = [...timers.entries()].filter(
        ([, timer]) => timer.delay <= milliseconds,
      );
      for (const [timerId, timer] of expiredTimers) {
        timers.delete(timerId);
        timer.callback();
      }
    },
    get timerCount() {
      return timers.size;
    },
  };
};

class FakeSocket {
  constructor(io, id) {
    this.io = io;
    this.id = id;
    this.handlers = new Map();
    this.events = [];
  }

  on(eventName, handler) {
    this.handlers.set(eventName, handler);
  }

  emit(eventName, payload) {
    this.events.push({ eventName, payload });
  }

  join(roomCode) {
    if (!this.io.rooms.has(roomCode)) {
      this.io.rooms.set(roomCode, new Set());
    }
    this.io.rooms.get(roomCode).add(this.id);
  }

  clientEmit(eventName, ...args) {
    return this.handlers.get(eventName)?.(...args);
  }

  eventsFor(eventName) {
    return this.events.filter((event) => event.eventName === eventName);
  }
}

class FakeIo {
  constructor() {
    this.handlers = new Map();
    this.sockets = new Map();
    this.rooms = new Map();
    this.emissions = [];
  }

  on(eventName, handler) {
    this.handlers.set(eventName, handler);
  }

  connect(id) {
    const socket = new FakeSocket(this, id);
    this.sockets.set(id, socket);
    this.handlers.get("connection")(socket);
    return socket;
  }

  to(target) {
    return {
      emit: (eventName, payload) => {
        this.emissions.push({ target, eventName, payload });
        const recipients = this.sockets.has(target)
          ? [this.sockets.get(target)]
          : [...(this.rooms.get(target) || [])].map((id) =>
              this.sockets.get(id),
            );
        recipients.forEach((socket) => socket.emit(eventName, payload));
      },
    };
  }
}

const createLobby = (randomInt, dependencies = {}) => {
  const io = new FakeIo();
  const rooms = new Map();
  const clock = dependencies.clock || createFakeClock();
  const questionRepository = dependencies.questionRepository || {
    async findRandomQuestion() {
      return question;
    },
  };
  const quizService =
    dependencies.quizService || createQuizService(questionRepository);
  const completeObstaclePause = attachLobbyHandlers(io, rooms, {
    randomInt,
    quizService,
    now: clock.now,
    setTimeoutFn: clock.setTimeoutFn,
    clearTimeoutFn: clock.clearTimeoutFn,
    createQuizId: () => "quiz-test",
  });

  const host = io.connect("player-1");
  host.clientEmit("create_room");
  const { roomCode } = host.eventsFor("room_created")[0].payload;

  return {
    io,
    rooms,
    roomCode,
    host,
    players: [host],
    completeObstaclePause,
    clock,
  };
};

const addPlayers = (lobby, count) => {
  while (lobby.players.length < count) {
    const socket = lobby.io.connect(`player-${lobby.players.length + 1}`);
    socket.clientEmit("join_room", { roomCode: lobby.roomCode });
    lobby.players.push(socket);
  }
};

const setSchoolStage = (socket, roomCode, schoolStage) => {
  socket.clientEmit("set_school_stage", { roomCode, schoolStage });
};

const startGame = (socket, roomCode) => {
  socket.clientEmit("start_game", { roomCode });
};

const startLobbyGame = (randomInt, dependencies) => {
  const lobby = createLobby(randomInt, dependencies);
  addPlayers(lobby, 4);
  setSchoolStage(lobby.host, lobby.roomCode, "Fundamental");
  startGame(lobby.host, lobby.roomCode);
  return lobby;
};

const startLobbyAtObstacle = async (
  position,
  { diceResult = Math.min(position, 6), ...dependencies } = {},
) => {
  let shuffleCalls = 0;
  const lobby = startLobbyGame(
    (minimum) => {
      if (shuffleCalls < 3) {
        shuffleCalls += 1;
        return minimum;
      }
      return diceResult;
    },
    dependencies,
  );
  const room = lobby.rooms.get(lobby.roomCode);
  const currentPlayerId =
    room.gameState.turnOrder[room.gameState.currentTurnIndex];
  room.gameState.positions[currentPlayerId] = position - diceResult;
  const currentPlayer = lobby.io.sockets.get(currentPlayerId);
  await currentPlayer.clientEmit("roll_dice", { roomCode: lobby.roomCode });
  return { ...lobby, room, currentPlayer };
};

const submitAnswer = (socket, quizId, alternativa) => {
  let acknowledgement;
  socket.clientEmit(
    "submit_quiz_answer",
    { quizId, alternativa },
    (response) => {
      acknowledgement = response;
    },
  );
  return acknowledgement;
};

const answerAllPlayers = (lobby, alternativa = "A") => {
  const room = lobby.rooms.get(lobby.roomCode);
  for (const playerId of room.quizRound.participants) {
    const socket = lobby.io.sockets.get(playerId);
    submitAnswer(socket, room.quizRound.quizId, alternativa);
  }
};

test("supports a 4-player minimum, with no automatic start at four", () => {
  assert.equal(MIN_PLAYERS, 4);
  const lobby = createLobby();
  setSchoolStage(lobby.host, lobby.roomCode, "Fundamental");
  addPlayers(lobby, 3);

  startGame(lobby.host, lobby.roomCode);
  assert.equal(lobby.host.eventsFor("room_error").length, 1);
  assert.equal(lobby.io.emissions.filter(({ eventName }) => eventName === "game_started").length, 0);

  addPlayers(lobby, 4);
  assert.equal(lobby.io.emissions.filter(({ eventName }) => eventName === "game_started").length, 0);

  startGame(lobby.host, lobby.roomCode);
  const startedEvents = lobby.io.emissions.filter(
    ({ eventName }) => eventName === "game_started",
  );
  assert.equal(startedEvents.length, 4);
  assert.equal(
    new Set(startedEvents.map(({ payload }) => payload.condition)).size,
    4,
  );
});

test("allows eight players and rejects a ninth player", () => {
  assert.equal(MAX_PLAYERS, 8);
  const lobby = createLobby();
  setSchoolStage(lobby.host, lobby.roomCode, "Médio");
  addPlayers(lobby, 8);

  const ninthPlayer = lobby.io.connect("player-9");
  ninthPlayer.clientEmit("join_room", { roomCode: lobby.roomCode });
  assert.equal(lobby.rooms.get(lobby.roomCode).players.length, 8);
  assert.equal(ninthPlayer.eventsFor("room_joined").length, 0);
  assert.match(ninthPlayer.eventsFor("room_error")[0].payload.message, /8\/8/);

  startGame(lobby.host, lobby.roomCode);
  const roles = lobby.players.map(
    (player) => player.eventsFor("game_started")[0].payload.condition,
  );
  const requiredRoles = new Set(["cadeirante", "cego", "surdo", "neuroatipico"]);
  assert.deepEqual(new Set(roles.slice(0, 4)), requiredRoles);
  assert.ok(roles.every((role) => requiredRoles.has(role)));
});

test("rejects a start request when a room has more than eight players", () => {
  const lobby = createLobby();
  setSchoolStage(lobby.host, lobby.roomCode, "Superior");
  addPlayers(lobby, 8);
  const ninthPlayer = lobby.io.connect("player-9");
  lobby.rooms.get(lobby.roomCode).players.push(ninthPlayer.id);

  startGame(lobby.host, lobby.roomCode);
  assert.match(lobby.host.eventsFor("room_error")[0].payload.message, /4 a 8/);
  assert.equal(lobby.io.emissions.filter(({ eventName }) => eventName === "game_started").length, 0);
});

test("only the host can start the game", () => {
  const lobby = createLobby();
  setSchoolStage(lobby.host, lobby.roomCode, "Fundamental");
  addPlayers(lobby, 4);

  startGame(lobby.players[1], lobby.roomCode);
  assert.match(
    lobby.players[1].eventsFor("room_error")[0].payload.message,
    /anfitrião/,
  );
  assert.equal(lobby.io.emissions.filter(({ eventName }) => eventName === "game_started").length, 0);

  startGame(lobby.host, lobby.roomCode);
  assert.equal(lobby.io.emissions.filter(({ eventName }) => eventName === "game_started").length, 4);
});

test("rejects duplicate starts and sends only each player's private role", () => {
  const lobby = createLobby();
  setSchoolStage(lobby.host, lobby.roomCode, "Médio");
  addPlayers(lobby, 4);

  startGame(lobby.host, lobby.roomCode);
  const firstStartEvents = lobby.io.emissions.filter(
    ({ eventName }) => eventName === "game_started",
  );
  startGame(lobby.host, lobby.roomCode);

  assert.equal(
    lobby.io.emissions.filter(({ eventName }) => eventName === "game_started").length,
    firstStartEvents.length,
  );
  assert.match(lobby.host.eventsFor("room_error")[0].payload.message, /iniciada/);
  assert.deepEqual(
    firstStartEvents.map(({ target }) => target).sort(),
    lobby.players.map(({ id }) => id).sort(),
  );
  for (const player of lobby.players) {
    const [event] = player.eventsFor("game_started");
    assert.deepEqual(Object.keys(event.payload), ["condition"]);
  }
  const publicStateEvents = lobby.io.emissions.filter(
    ({ eventName }) =>
      eventName === "game_state_updated" || eventName === "obstacle_pending",
  );
  assert.ok(publicStateEvents.length > 0);
  for (const { payload } of publicStateEvents) {
    assert.equal("condition" in payload, false);
    assert.equal("playerConditions" in payload, false);
  }
});

test("roll_dice authorizes only the current player in a valid started room", () => {
  const values = [3, 2, 1, 1, 1];
  const randomInt = (_minimum, _maximum) => values.shift();
  const lobby = startLobbyGame(randomInt);
  const { turnOrder } = lobby.rooms.get(lobby.roomCode).gameState;
  const currentPlayer = lobby.io.sockets.get(turnOrder[0]);
  const otherPlayer = lobby.io.sockets.get(turnOrder[1]);

  otherPlayer.clientEmit("roll_dice", { roomCode: lobby.roomCode, dice: 6 });
  assert.match(otherPlayer.eventsFor("room_error")[0].payload.message, /turno/);
  assert.equal(lobby.rooms.get(lobby.roomCode).gameState.diceResult, null);

  currentPlayer.clientEmit("roll_dice", {
    dice: 6,
    position: 20,
    playerId: otherPlayer.id,
    condition: "cego",
    points: 999,
  });
  assert.equal(lobby.rooms.get(lobby.roomCode).gameState.positions[currentPlayer.id], 1);
  assert.equal(lobby.rooms.get(lobby.roomCode).gameState.diceResult, 1);
});

test("roll_dice rejects missing, invalid, unstarted, paused, and finished games", async () => {
  const lobby = createLobby();
  lobby.host.clientEmit("roll_dice", { roomCode: lobby.roomCode });
  assert.match(lobby.host.eventsFor("room_error")[0].payload.message, /iniciada/);

  const outsider = lobby.io.connect("outsider");
  outsider.clientEmit("roll_dice", { roomCode: lobby.roomCode });
  assert.match(outsider.eventsFor("room_error")[0].payload.message, /não pertence/);
  outsider.clientEmit("roll_dice", { roomCode: "" });
  assert.match(outsider.eventsFor("room_error").at(-1).payload.message, /não pertence/);
  outsider.clientEmit("roll_dice", { roomCode: "XXXX" });
  assert.match(outsider.eventsFor("room_error").at(-1).payload.message, /Sala não encontrada/);

  const values = [3, 2, 1, 4, 1];
  const started = startLobbyGame((_minimum, _maximum) => values.shift());
  const gameState = started.rooms.get(started.roomCode).gameState;
  const currentPlayer = started.io.sockets.get(
    gameState.turnOrder[gameState.currentTurnIndex],
  );
  await currentPlayer.clientEmit("roll_dice", { roomCode: started.roomCode });
  assert.equal(gameState.status, "paused");
  currentPlayer.clientEmit("roll_dice", { roomCode: started.roomCode });
  assert.match(currentPlayer.eventsFor("room_error").at(-1).payload.message, /pausada/);
  assert.equal(started.completeObstaclePause(started.roomCode), false);
  answerAllPlayers(started);
  assert.equal(gameState.status, "active");

  for (const playerId of gameState.turnOrder) {
    gameState.positions[playerId] = 19;
  }
  const nextPlayer = started.io.sockets.get(
    gameState.turnOrder[gameState.currentTurnIndex],
  );
  await nextPlayer.clientEmit("roll_dice", { roomCode: started.roomCode });
  assert.equal(gameState.status, "finished");
  nextPlayer.clientEmit("roll_dice", { roomCode: started.roomCode });
  assert.match(nextPlayer.eventsFor("room_error").at(-1).payload.message, /encerrada/);
});

test("initializes turn state after the existing start validations and emits a winner", () => {
  const values = [3, 2, 1, 1, 1];
  const lobby = startLobbyGame((_minimum, _maximum) => values.shift());
  const room = lobby.rooms.get(lobby.roomCode);
  const [initialState] = lobby.host.eventsFor("game_state_updated");

  assert.deepEqual(Object.keys(initialState.payload), [
    "positions",
    "currentPlayerId",
    "round",
    "diceResult",
    "status",
  ]);
  assert.equal(initialState.payload.status, "active");
  assert.deepEqual(room.gameState.turnOrder.slice().sort(), room.players.slice().sort());

  const winner = lobby.io.sockets.get(room.gameState.turnOrder[0]);
  room.gameState.positions[winner.id] = 19;
  winner.clientEmit("roll_dice", { roomCode: lobby.roomCode, dice: 1 });

  assert.deepEqual(lobby.io.emissions.at(-2).payload.positions, {
    ...room.gameState.positions,
  });
  assert.equal(lobby.io.emissions.at(-1).eventName, "game_over");
  assert.deepEqual(lobby.io.emissions.at(-1).payload.winners, [winner.id]);
});

test("obstacle pause is released only after the simultaneous quiz ends", async () => {
  const values = [3, 2, 1, 4, 1];
  const lobby = startLobbyGame((_minimum, _maximum) => values.shift());
  const room = lobby.rooms.get(lobby.roomCode);
  const currentPlayer = lobby.io.sockets.get(room.gameState.turnOrder[0]);
  await currentPlayer.clientEmit("roll_dice", { roomCode: lobby.roomCode });

  assert.equal(room.gameState.status, "paused");
  assert.equal(
    lobby.io.emissions.some(({ eventName }) => eventName === "obstacle_pending"),
    true,
  );
  const obstacleEvent = lobby.io.emissions.find(
    ({ eventName }) => eventName === "obstacle_pending",
  );
  assert.deepEqual(Object.keys(obstacleEvent.payload), [
    "playerId",
    "position",
    "round",
  ]);
  assert.equal(
    [...lobby.io.sockets.values()].some((socket) =>
      socket.handlers.has("ignore_obstacle"),
    ),
    false,
  );

  assert.equal(lobby.completeObstaclePause(lobby.roomCode), false);
  assert.equal(room.gameState.status, "paused");
  answerAllPlayers(lobby);
  assert.equal(room.quizRound, null);
  assert.equal(room.gameState.status, "active");
  assert.equal(
    room.gameState.turnOrder[room.gameState.currentTurnIndex],
    lobby.players[1].id,
  );
});

test("does not fetch questions when creating a room or starting a game", () => {
  let queryCount = 0;
  const lobby = createLobby(undefined, {
    questionRepository: {
      async findRandomQuestion() {
        queryCount += 1;
        return question;
      },
    },
  });
  addPlayers(lobby, 4);
  setSchoolStage(lobby.host, lobby.roomCode, "Fundamental");
  startGame(lobby.host, lobby.roomCode);

  assert.equal(queryCount, 0);
});

test("starts question retrieval only for exact landings on the four obstacles", async () => {
  const calls = [];
  const service = createQuizService({
    async findRandomQuestion(filters) {
      calls.push(filters);
      return question;
    },
  });

  for (const position of [4, 8, 12, 16]) {
    const diceResult = Math.min(position, 6);
    let shuffleCalls = 0;
    const lobby = startLobbyGame(
      (minimum) => {
        if (shuffleCalls < 3) {
          shuffleCalls += 1;
          return minimum;
        }
        return diceResult;
      },
      { quizService: service },
    );
    const room = lobby.rooms.get(lobby.roomCode);
    const playerId = room.gameState.turnOrder[room.gameState.currentTurnIndex];
    room.gameState.positions[playerId] = position - diceResult;
    const socket = lobby.io.sockets.get(playerId);
    await socket.clientEmit("roll_dice", { roomCode: lobby.roomCode });
    assert.equal(room.gameState.status, "paused");
    assert.equal(room.quizRound.status, "active");
    for (const participantId of [...room.gameState.turnOrder]) {
      submitAnswer(
        lobby.io.sockets.get(participantId),
        room.quizRound.quizId,
        "A",
      );
    }
  }
  assert.equal(calls.length, 16);

  let shuffleCalls = 0;
  const noObstacleLobby = startLobbyGame(
    (minimum) => {
      if (shuffleCalls < 3) {
        shuffleCalls += 1;
        return minimum;
      }
      return 2;
    },
    { quizService: service },
  );
  const room = noObstacleLobby.rooms.get(noObstacleLobby.roomCode);
  const playerId = room.gameState.turnOrder[room.gameState.currentTurnIndex];
  room.gameState.positions[playerId] = 3;
  const socket = noObstacleLobby.io.sockets.get(playerId);
  await socket.clientEmit("roll_dice", { roomCode: noObstacleLobby.roomCode });
  assert.equal(room.gameState.positions[playerId], 5);
  assert.equal(room.quizRound, null);
  assert.equal(calls.length, 16);
});

test("sends simultaneous private questions without answers or other players' questions", async () => {
  const questionsByLevel = [];
  const lobby = await startLobbyAtObstacle(4, {
    questionRepository: {
      async findRandomQuestion({ nivelEstrutural }) {
        questionsByLevel.push(nivelEstrutural);
        return { ...question, enunciado: `Pergunta de nível ${nivelEstrutural}` };
      },
    },
  });
  const room = lobby.room;
  const round = room.quizRound;

  assert.equal(questionsByLevel.length, 4);
  assert.equal(new Set(questionsByLevel).size, 3);
  for (const player of lobby.players) {
    const [event] = player.eventsFor("quiz_question");
    assert.ok(event);
    assert.deepEqual(Object.keys(event.payload).sort(), [
      "alternativas",
      "deadlineAt",
      "enunciado",
      "quizId",
    ]);
    assert.equal(event.payload.quizId, round.quizId);
    assert.equal(event.payload.deadlineAt, lobby.clock.now() + 30_000);
    assert.equal("resposta_correta" in event.payload, false);
    assert.equal("respostaCorreta" in event.payload, false);
    assert.equal("explicacao" in event.payload, false);
    assert.equal("tags" in event.payload, false);
  }
  const questionEmissions = lobby.io.emissions.filter(
    ({ eventName }) => eventName === "quiz_question",
  );
  assert.equal(questionEmissions.length, 4);
  assert.deepEqual(
    questionEmissions.map(({ target }) => target).sort(),
    lobby.players.map(({ id }) => id).sort(),
  );
  assert.equal(
    lobby.io.emissions.some(
      ({ target, payload }) =>
        target === lobby.roomCode &&
        (payload?.playerConditions || payload?.condition),
    ),
    false,
  );
});

test("rejects invalid, stale, duplicate, nonparticipant, and expired answers", async () => {
  const lobby = await startLobbyAtObstacle(4);
  const { quizId } = lobby.room.quizRound;
  const player = lobby.players[0];

  assert.deepEqual(submitAnswer(player, "old-quiz", "A"), {
    success: false,
    code: "INVALID_QUIZ",
  });
  assert.deepEqual(submitAnswer(player, quizId, "E"), {
    success: false,
    code: "INVALID_ANSWER",
  });
  assert.equal(lobby.room.quizRound.answers.size, 0);

  const outsider = lobby.io.connect("outsider");
  lobby.room.players.push(outsider.id);
  assert.deepEqual(submitAnswer(outsider, quizId, "A"), {
    success: false,
    code: "NOT_PARTICIPANT",
  });
  lobby.room.players.pop();

  assert.deepEqual(submitAnswer(player, quizId, "A"), { success: true });
  assert.deepEqual(submitAnswer(player, quizId, "B"), {
    success: false,
    code: "ALREADY_ANSWERED",
  });
  assert.equal(lobby.room.quizRound.answers.size, 1);

  lobby.clock.setTime(lobby.room.quizRound.deadlineAt);
  assert.deepEqual(
    submitAnswer(
      lobby.io.sockets.get(lobby.room.quizRound.participants[1]),
      quizId,
      "A",
    ),
    { success: false, code: "DEADLINE_EXPIRED" },
  );
  assert.equal(lobby.room.quizRound, null);
  assert.deepEqual(submitAnswer(player, quizId, "A"), {
    success: false,
    code: "INVALID_QUIZ",
  });
  assert.equal(lobby.clock.timerCount, 0);
});

test("scores correct answers by server receipt order and gives wrong/timeout zero", async () => {
  const lobby = await startLobbyAtObstacle(4);
  const { quizId, participants } = lobby.room.quizRound;
  const [first, second, third] = participants;

  assert.deepEqual(submitAnswer(lobby.io.sockets.get(first), quizId, "A"), {
    success: true,
  });
  assert.deepEqual(submitAnswer(lobby.io.sockets.get(second), quizId, "B"), {
    success: true,
  });
  assert.deepEqual(submitAnswer(lobby.io.sockets.get(third), quizId, "A"), {
    success: true,
  });
  lobby.clock.advance(30_000);

  assert.equal(lobby.room.gameState.quizPoints[first], 4);
  assert.equal(lobby.room.gameState.quizPoints[second], 0);
  assert.equal(lobby.room.gameState.quizPoints[third], 3);
  const fourth = participants[3];
  assert.equal(lobby.room.gameState.quizPoints[fourth], 0);
  for (const playerId of participants) {
    const [result] = lobby.io.sockets.get(playerId).eventsFor("quiz_result").slice(-1);
    assert.ok(result);
    assert.equal(result.payload.pontos, lobby.room.gameState.quizPoints[playerId]);
    assert.equal(result.payload.respostaCorreta, "A");
    assert.equal(result.payload.explicacao, question.explicacao);
  }
  const roundEnded = lobby.io.emissions.filter(
    ({ eventName }) => eventName === "quiz_round_ended",
  );
  assert.equal(roundEnded.at(-1).payload.motivo, "timeout");
  const resultEmissions = lobby.io.emissions.filter(
    ({ eventName }) => eventName === "quiz_result",
  );
  assert.deepEqual(
    resultEmissions.map(({ target }) => target).sort(),
    participants.slice().sort(),
  );
  for (const { target, payload } of roundEnded) {
    assert.equal(target, lobby.roomCode);
    assert.equal("respostas" in payload, false);
  }
});

test("completes a round with null explanations and sends private results without explanation", async () => {
  const lobby = await startLobbyAtObstacle(4, {
    questionRepository: {
      async findRandomQuestion() {
        return { ...question, explicacao: null };
      },
    },
  });
  const { quizId, participants } = lobby.room.quizRound;
  const questionEmissions = lobby.io.emissions.filter(
    ({ eventName }) => eventName === "quiz_question",
  );

  assert.equal(questionEmissions.length, participants.length);
  assert.deepEqual(
    questionEmissions.map(({ target }) => target).sort(),
    participants.slice().sort(),
  );
  for (const { payload } of questionEmissions) {
    assert.equal("explicacao" in payload, false);
    assert.equal("respostaCorreta" in payload, false);
  }

  const [first, second, third, fourth] = participants;
  assert.deepEqual(submitAnswer(lobby.io.sockets.get(first), quizId, "A"), {
    success: true,
  });
  assert.deepEqual(submitAnswer(lobby.io.sockets.get(second), quizId, "B"), {
    success: true,
  });
  assert.deepEqual(submitAnswer(lobby.io.sockets.get(third), quizId, "A"), {
    success: true,
  });
  assert.deepEqual(submitAnswer(lobby.io.sockets.get(fourth), quizId, "A"), {
    success: true,
  });

  assert.equal(lobby.room.quizRound, null);
  assert.equal(lobby.room.gameState.quizPoints[first], 4);
  assert.equal(lobby.room.gameState.quizPoints[second], 0);
  assert.equal(lobby.room.gameState.quizPoints[third], 3);
  assert.equal(lobby.room.gameState.quizPoints[fourth], 2);

  const resultEmissions = lobby.io.emissions.filter(
    ({ eventName }) => eventName === "quiz_result",
  );
  assert.deepEqual(
    resultEmissions.map(({ target }) => target).sort(),
    participants.slice().sort(),
  );
  for (const { target, payload } of resultEmissions) {
    assert.ok(participants.includes(target));
    assert.equal("explicacao" in payload, false);
    assert.equal(payload.respostaCorreta, "A");
    assert.equal(payload.pontos, lobby.room.gameState.quizPoints[target]);
  }
  assert.equal(
    lobby.io.emissions.some(
      ({ target, eventName }) =>
        target === lobby.roomCode && eventName === "quiz_result",
    ),
    false,
  );
});

test("question or database failures send no partial questions, score nothing, and resume the game", async (t) => {
  await t.test("missing question", async () => {
    let queryCount = 0;
    const lobby = await startLobbyAtObstacle(4, {
      questionRepository: {
        async findRandomQuestion() {
          queryCount += 1;
          return queryCount === 1 ? question : null;
        },
      },
    });
    const room = lobby.room;

    assert.equal(queryCount, 4);
    assert.equal(
      lobby.io.emissions.some(({ eventName }) => eventName === "quiz_question"),
      false,
    );
    assert.deepEqual(
      lobby.io.emissions.find(({ eventName }) => eventName === "quiz_error")
        .payload.code,
      "QUESTIONS_UNAVAILABLE",
    );
    assert.ok(Object.values(room.gameState.quizPoints).every((points) => points === 0));
    assert.equal(room.quizRound, null);
    assert.equal(room.gameState.status, "active");
    assert.equal(
      room.gameState.turnOrder[room.gameState.currentTurnIndex],
      room.gameState.turnOrder[1],
    );
  });

  await t.test("database failure", async () => {
    const originalConsoleError = console.error;
    const logs = [];
    console.error = (...values) => logs.push(values.join(" "));
    try {
      const lobby = await startLobbyAtObstacle(4, {
        questionRepository: {
          async findRandomQuestion() {
            throw new Error("sensitive SQL and credentials");
          },
        },
      });

      assert.equal(
        lobby.io.emissions.some(({ eventName }) => eventName === "quiz_question"),
        false,
      );
      assert.equal(
        lobby.io.emissions.find(({ eventName }) => eventName === "quiz_error")
          .payload.code,
        "QUIZ_UNAVAILABLE",
      );
      assert.deepEqual(logs, ["Quiz question lookup failed."]);
      assert.equal(lobby.room.quizRound, null);
      assert.equal(lobby.room.gameState.status, "active");
      assert.ok(
        Object.values(lobby.room.gameState.quizPoints).every((points) => points === 0),
      );
    } finally {
      console.error = originalConsoleError;
    }
  });
});

test("keeps the fixed participant count after disconnection and completes when connected players answer", async () => {
  const lobby = await startLobbyAtObstacle(4);
  const room = lobby.room;
  const { quizId, participants } = room.quizRound;
  const disconnectedId = participants[0];
  const originalTurnIndex = room.gameState.currentTurnIndex;

  lobby.io.sockets.get(disconnectedId).clientEmit("disconnect");
  assert.equal(room.quizRound.participantCount, 4);
  assert.equal(room.gameState.status, "paused");
  assert.equal(room.gameState.currentTurnIndex, originalTurnIndex);

  for (const playerId of participants.slice(1)) {
    submitAnswer(lobby.io.sockets.get(playerId), quizId, "A");
  }

  assert.equal(room.quizRound, null);
  assert.equal(room.gameState.status, "active");
  assert.equal(room.gameState.turnOrder.includes(disconnectedId), false);
  assert.deepEqual(
    participants.slice(1).map((playerId) => room.gameState.quizPoints[playerId]),
    [4, 3, 2],
  );
  assert.equal(lobby.clock.timerCount, 0);
});

test("ends the match after the final obstacle pause reaches the round limit", async () => {
  let shuffleCalls = 0;
  const lobby = startLobbyGame((minimum) => {
    if (shuffleCalls < 3) {
      shuffleCalls += 1;
      return minimum;
    }
    return 2;
  });
  const room = lobby.rooms.get(lobby.roomCode);
  room.gameState.round = 8;
  room.gameState.currentTurnIndex = room.gameState.turnOrder.length - 1;
  const playerId = room.gameState.turnOrder[room.gameState.currentTurnIndex];
  room.gameState.positions[playerId] = 2;
  await lobby.io.sockets.get(playerId).clientEmit("roll_dice", {
    roomCode: lobby.roomCode,
  });

  answerAllPlayers(lobby);
  assert.equal(room.gameState.status, "finished");
  assert.equal(room.gameState.endReason, "round_limit");
  assert.equal(
    lobby.io.emissions.some(({ eventName }) => eventName === "game_over"),
    true,
  );
});

test("clears the quiz timer when every player disconnects and the room is removed", async () => {
  const lobby = await startLobbyAtObstacle(4);
  assert.equal(lobby.clock.timerCount, 1);

  for (const player of lobby.players) {
    player.clientEmit("disconnect");
  }

  assert.equal(lobby.rooms.has(lobby.roomCode), false);
  assert.equal(lobby.clock.timerCount, 0);
});

test("preserves room_joined and transfers host when the host disconnects", () => {
  const lobby = createLobby();
  addPlayers(lobby, 2);
  assert.deepEqual(lobby.players[1].eventsFor("room_joined")[0].payload, {
    roomCode: lobby.roomCode,
    playerCount: 2,
    hostId: lobby.host.id,
    schoolStage: null,
    started: false,
  });

  lobby.host.clientEmit("disconnect");
  const room = lobby.rooms.get(lobby.roomCode);
  assert.equal(room.hostId, lobby.players[1].id);
  assert.equal(room.players.length, 1);
});

test("advances the turn when the current player disconnects", () => {
  const lobby = startLobbyGame((_minimum, maximum) => maximum - 1);
  const room = lobby.rooms.get(lobby.roomCode);
  const [disconnectedPlayerId, nextPlayerId] = room.gameState.turnOrder;

  lobby.io.sockets.get(disconnectedPlayerId).clientEmit("disconnect");

  assert.equal(room.gameState.turnOrder.includes(disconnectedPlayerId), false);
  assert.equal(
    room.gameState.turnOrder[room.gameState.currentTurnIndex],
    nextPlayerId,
  );
  assert.equal(
    lobby.host.eventsFor("game_state_updated").at(-1).payload.currentPlayerId,
    nextPlayerId,
  );
});

test("resumes a paused game when its pending player disconnects", () => {
  const lobby = startLobbyGame((_minimum, maximum) => maximum - 1);
  const room = lobby.rooms.get(lobby.roomCode);
  const [disconnectedPlayerId, nextPlayerId] = room.gameState.turnOrder;
  room.gameState.status = "paused";
  room.gameState.obstaclePending = {
    playerId: disconnectedPlayerId,
    position: 4,
  };

  lobby.io.sockets.get(disconnectedPlayerId).clientEmit("disconnect");

  assert.equal(room.gameState.status, "active");
  assert.equal(room.gameState.obstaclePending, null);
  assert.equal(
    room.gameState.turnOrder[room.gameState.currentTurnIndex],
    nextPlayerId,
  );
});

test("rejects an invalid school stage", () => {
  const lobby = createLobby();

  setSchoolStage(lobby.host, lobby.roomCode, "Pós-graduação");

  assert.match(lobby.host.eventsFor("room_error")[0].payload.message, /inválida/);
  assert.equal(lobby.rooms.get(lobby.roomCode).schoolStage, null);
});

test("only the host can choose the school stage", () => {
  const lobby = createLobby();
  addPlayers(lobby, 2);

  setSchoolStage(lobby.players[1], lobby.roomCode, "Fundamental");

  assert.match(lobby.players[1].eventsFor("room_error")[0].payload.message, /anfitrião/);
  assert.equal(lobby.rooms.get(lobby.roomCode).schoolStage, null);
});

test("rejects starting without a school stage", () => {
  const lobby = createLobby();
  addPlayers(lobby, 4);

  startGame(lobby.host, lobby.roomCode);

  assert.match(lobby.host.eventsFor("room_error")[0].payload.message, /etapa escolar/);
  assert.equal(lobby.rooms.get(lobby.roomCode).started, false);
  assert.equal(lobby.io.emissions.filter(({ eventName }) => eventName === "game_started").length, 0);
});

test("a valid school stage is shared and the host can start manually", () => {
  const lobby = createLobby();
  addPlayers(lobby, 4);

  setSchoolStage(lobby.host, lobby.roomCode, "Superior");
  assert.equal(lobby.rooms.get(lobby.roomCode).schoolStage, "Superior");
  assert.ok(
    lobby.players.every((player) =>
      player.eventsFor("room_updated").some(({ payload }) => payload.schoolStage === "Superior"),
    ),
  );
  assert.equal(lobby.io.emissions.filter(({ eventName }) => eventName === "game_started").length, 0);

  startGame(lobby.host, lobby.roomCode);

  assert.equal(lobby.rooms.get(lobby.roomCode).started, true);
  assert.equal(lobby.io.emissions.filter(({ eventName }) => eventName === "game_started").length, 4);
});

test("rejects changing the school stage after the game starts", () => {
  const lobby = createLobby();
  addPlayers(lobby, 4);
  setSchoolStage(lobby.host, lobby.roomCode, "Médio");
  startGame(lobby.host, lobby.roomCode);

  setSchoolStage(lobby.host, lobby.roomCode, "Superior");

  assert.match(lobby.host.eventsFor("room_error").at(-1).payload.message, /após o início/);
  assert.equal(lobby.rooms.get(lobby.roomCode).schoolStage, "Médio");
});

test("the transferred host can choose the stage and continue before the game starts", () => {
  const lobby = createLobby();
  addPlayers(lobby, 4);
  setSchoolStage(lobby.host, lobby.roomCode, "Fundamental");
  lobby.host.clientEmit("disconnect");

  const newHost = lobby.players[1];
  assert.equal(lobby.rooms.get(lobby.roomCode).hostId, newHost.id);
  setSchoolStage(newHost, lobby.roomCode, "Superior");
  addPlayers(lobby, 5);
  startGame(newHost, lobby.roomCode);

  assert.equal(lobby.rooms.get(lobby.roomCode).schoolStage, "Superior");
  assert.equal(lobby.rooms.get(lobby.roomCode).started, true);
  assert.equal(lobby.io.emissions.filter(({ eventName }) => eventName === "game_started").length, 4);
});
