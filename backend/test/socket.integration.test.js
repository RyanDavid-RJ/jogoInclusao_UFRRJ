const assert = require("node:assert/strict");
const http = require("node:http");
const test = require("node:test");
const { Server } = require("socket.io");
const { io: createSocketClient } = require("socket.io-client");

const { attachLobbyHandlers } = require("../lobby");
const { createQuizService } = require("../quizService");

const QUESTIONS_BY_LEVEL = {
  1: {
    enunciado: "Pergunta de nível 1",
    opcao_a: "Nível 1 - A",
    opcao_b: "Nível 1 - B",
    opcao_c: "Nível 1 - C",
    opcao_d: "Nível 1 - D",
    resposta_correta: "B",
    explicacao: "Explicação do nível 1.",
  },
  2: {
    enunciado: "Pergunta de nível 2",
    opcao_a: "Nível 2 - A",
    opcao_b: "Nível 2 - B",
    opcao_c: "Nível 2 - C",
    opcao_d: "Nível 2 - D",
    resposta_correta: "C",
    explicacao: null,
  },
  3: {
    enunciado: "Pergunta de nível 3",
    opcao_a: "Nível 3 - A",
    opcao_b: "Nível 3 - B",
    opcao_c: "Nível 3 - C",
    opcao_d: "Nível 3 - D",
    resposta_correta: "D",
    explicacao: "Explicação do nível 3.",
  },
};

const LEVEL_BY_CONDITION_AT_POSITION_FOUR = {
  cadeirante: 3,
  surdo: 1,
  cego: 2,
  neuroatipico: 1,
};

const waitForEvent = (socket, eventName, predicate = () => true) =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      socket.off(eventName, onEvent);
      reject(new Error(`Timed out waiting for Socket.IO event "${eventName}".`));
    }, 5_000);
    const onEvent = (payload) => {
      if (!predicate(payload)) {
        return;
      }
      clearTimeout(timer);
      socket.off(eventName, onEvent);
      resolve(payload);
    };
    socket.on(eventName, onEvent);
  });

const emitWithAck = (socket, eventName, payload) =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`Timed out waiting for "${eventName}" acknowledgement.`)),
      5_000,
    );
    socket.emit(eventName, payload, (response) => {
      clearTimeout(timer);
      resolve(response);
    });
  });

const closeSocketFixture = async ({ sockets, io, httpServer }) => {
  const errors = [];

  for (const socket of sockets) {
    try {
      socket.disconnect();
    } catch (error) {
      errors.push(error);
    }
  }

  try {
    if (io) {
      await new Promise((resolve) => io.close(resolve));
    }
  } catch (error) {
    errors.push(error);
  } finally {
    try {
      if (httpServer?.listening) {
        await new Promise((resolve, reject) => {
          httpServer.close((error) => (error ? reject(error) : resolve()));
        });
      }
    } catch (error) {
      errors.push(error);
    }
  }

  if (errors.length > 0) {
    throw new AggregateError(errors, "Failed to close the Socket.IO test fixture.");
  }
};

const createQuizFixture = async (t, { findRandomQuestion } = {}) => {
  const sockets = [];
  const httpServer = http.createServer();
  const io = new Server(httpServer);
  const timers = [];
  let now = 1_000;

  t.after(() => closeSocketFixture({ sockets, io, httpServer }));

  const quizService = createQuizService({
    async findRandomQuestion(filters) {
      if (findRandomQuestion) {
        return findRandomQuestion(filters);
      }
      return { ...QUESTIONS_BY_LEVEL[filters.nivelEstrutural] };
    },
  });
  const rooms = new Map();
  attachLobbyHandlers(io, rooms, {
    quizService,
    createQuizId: () => "integration-quiz",
    randomInt: (minimum) => (minimum === 1 ? 4 : minimum),
    now: () => now,
    setTimeoutFn(callback, delay) {
      const timer = { callback, delay, cleared: false };
      timers.push(timer);
      return timer;
    },
    clearTimeoutFn(timer) {
      timer.cleared = true;
    },
  });

  await new Promise((resolve, reject) => {
    httpServer.once("error", reject);
    httpServer.listen(0, "127.0.0.1", () => {
      httpServer.off("error", reject);
      resolve();
    });
  });

  const { port } = httpServer.address();
  const url = `http://127.0.0.1:${port}`;
  const connectClient = async () => {
    const socket = createSocketClient(url, {
      forceNew: true,
      reconnection: false,
      transports: ["websocket"],
    });
    sockets.push(socket);
    await waitForEvent(socket, "connect");
    return socket;
  };
  const players = await Promise.all(
    Array.from({ length: 4 }, () => connectClient()),
  );
  const received = Object.fromEntries(
    ["quiz_question", "quiz_result", "quiz_round_ended", "quiz_error", "game_state_updated"]
      .map((eventName) => [
        eventName,
        new Map(players.map((player) => [player.id, []])),
      ]),
  );
  const conditions = new Map();
  for (const player of players) {
    for (const eventName of Object.keys(received)) {
      player.on(eventName, (payload) => received[eventName].get(player.id).push(payload));
    }
    player.on("game_started", ({ condition }) =>
      conditions.set(player.id, condition),
    );
  }

  const host = players[0];
  const roomCreated = waitForEvent(host, "room_created");
  host.emit("create_room");
  const { roomCode } = await roomCreated;

  for (const player of players.slice(1)) {
    const joined = waitForEvent(player, "room_joined");
    player.emit("join_room", { roomCode });
    await joined;
  }

  const stageUpdated = waitForEvent(host, "room_updated");
  host.emit("set_school_stage", { roomCode, schoolStage: "Fundamental" });
  await stageUpdated;

  const startedEvents = players.map((player) =>
    waitForEvent(player, "game_started"),
  );
  const initialStateEvent = waitForEvent(host, "game_state_updated");
  host.emit("start_game", { roomCode });
  const [, initialState] = await Promise.all([
    Promise.all(startedEvents),
    initialStateEvent,
  ]);
  assert.equal(initialState.status, "active");
  const currentPlayer = players.find(
    (player) => player.id === initialState.currentPlayerId,
  );
  assert.ok(currentPlayer, "the current player should be in the room");
  const nextPlayer =
    players[(players.indexOf(currentPlayer) + 1) % players.length];

  return {
    conditions,
    currentPlayer,
    host,
    openObstacleRound: async ({ waitForQuestions = true } = {}) => {
      const questionEvents = waitForQuestions
        ? Promise.all(players.map((player) => waitForEvent(player, "quiz_question")))
        : null;
      const obstacleEvent = waitForEvent(host, "obstacle_pending");
      const pausedStateEvent = waitForEvent(
        host,
        "game_state_updated",
        (state) => state.status === "paused",
      );
      currentPlayer.emit("roll_dice", { roomCode });
      await Promise.all([obstacleEvent, pausedStateEvent]);
      return questionEvents ? questionEvents : [];
    },
    nextPlayer,
    players,
    received,
    roomCode,
    rooms,
    expireQuizDeadline() {
      const timer = timers.findLast((candidate) => !candidate.cleared);
      assert.ok(timer, "an active quiz deadline should be scheduled");
      now += timer.delay;
      timer.callback();
    },
  };
};

const correctAnswerFor = (fixture, player) => {
  const level =
    LEVEL_BY_CONDITION_AT_POSITION_FOUR[fixture.conditions.get(player.id)];
  return QUESTIONS_BY_LEVEL[level].resposta_correta;
};

test("runs a private quiz round over real Socket.IO clients", async (t) => {
  const sockets = [];
  let httpServer;
  let io;

  t.after(() => closeSocketFixture({ sockets, io, httpServer }));

  httpServer = http.createServer();
  io = new Server(httpServer);

  const repositoryCalls = [];
  const quizService = createQuizService({
    async findRandomQuestion(filters) {
      repositoryCalls.push(filters);
      return { ...QUESTIONS_BY_LEVEL[filters.nivelEstrutural] };
    },
  });
  const rooms = new Map();
  attachLobbyHandlers(io, rooms, {
    quizService,
    createQuizId: () => "integration-quiz",
    randomInt: (minimum) => (minimum === 1 ? 4 : minimum),
  });

  await new Promise((resolve, reject) => {
    httpServer.once("error", reject);
    httpServer.listen(0, "127.0.0.1", () => {
      httpServer.off("error", reject);
      resolve();
    });
  });

  const { port } = httpServer.address();
  const url = `http://127.0.0.1:${port}`;
  const connectClient = async () => {
    const socket = createSocketClient(url, {
      forceNew: true,
      reconnection: false,
      transports: ["websocket"],
    });
    sockets.push(socket);
    await waitForEvent(socket, "connect");
    return socket;
  };

  const players = await Promise.all(
    Array.from({ length: 4 }, () => connectClient()),
  );
  const outsider = await connectClient();
  const host = players[0];

  const roomCreated = waitForEvent(host, "room_created");
  host.emit("create_room");
  const { roomCode } = await roomCreated;

  for (const player of players.slice(1)) {
    const joined = waitForEvent(player, "room_joined");
    player.emit("join_room", { roomCode });
    await joined;
  }

  const stageUpdated = waitForEvent(host, "room_updated");
  host.emit("set_school_stage", { roomCode, schoolStage: "Fundamental" });
  await stageUpdated;

  const startedEvents = players.map((player) =>
    waitForEvent(player, "game_started"),
  );
  const initialStateEvent = waitForEvent(host, "game_state_updated");
  host.emit("start_game", { roomCode });
  const [conditions, initialState] = await Promise.all([
    Promise.all(startedEvents),
    initialStateEvent,
  ]);
  assert.equal(initialState.status, "active");

  const currentPlayer = players.find(
    (player) => player.id === initialState.currentPlayerId,
  );
  assert.ok(currentPlayer, "the current player should be in the room");
  const nextPlayer =
    players[(players.indexOf(currentPlayer) + 1) % players.length];

  const questionsReceived = new Map(
    [...players, outsider].map((socket) => [socket.id, []]),
  );
  const resultsReceived = new Map(
    [...players, outsider].map((socket) => [socket.id, []]),
  );
  const roundEndsReceived = new Map(
    [...players, outsider].map((socket) => [socket.id, []]),
  );
  for (const socket of [...players, outsider]) {
    socket.on("quiz_question", (payload) =>
      questionsReceived.get(socket.id).push(payload),
    );
    socket.on("quiz_result", (payload) =>
      resultsReceived.get(socket.id).push(payload),
    );
    socket.on("quiz_round_ended", (payload) =>
      roundEndsReceived.get(socket.id).push(payload),
    );
  }

  const privateQuestionEvents = players.map((player) =>
    waitForEvent(player, "quiz_question"),
  );
  const obstaclePendingEvent = waitForEvent(host, "obstacle_pending");
  const pausedStateEvent = waitForEvent(
    host,
    "game_state_updated",
    (state) => state.status === "paused",
  );
  currentPlayer.emit("roll_dice", { roomCode });

  const [obstaclePending, pausedState] = await Promise.all([
    obstaclePendingEvent,
    pausedStateEvent,
  ]);
  assert.equal(obstaclePending.position, 4);
  assert.equal(pausedState.status, "paused");
  assert.equal(pausedState.positions[currentPlayer.id], 4);

  const questions = await Promise.all(privateQuestionEvents);
  const expectedLevels = new Map(
    players.map((player, index) => [
      player.id,
      LEVEL_BY_CONDITION_AT_POSITION_FOUR[conditions[index].condition],
    ]),
  );
  assert.equal(repositoryCalls.length, 4);
  assert.ok(
    repositoryCalls.every(
      ({ etapaEscolar }) => etapaEscolar === "Fundamental",
    ),
  );

  for (const player of players) {
    const question = questionsReceived.get(player.id);
    const expected = QUESTIONS_BY_LEVEL[expectedLevels.get(player.id)];
    assert.equal(question.length, 1);
    assert.equal(question[0].enunciado, expected.enunciado);
    assert.deepEqual(question[0].alternativas, {
      A: expected.opcao_a,
      B: expected.opcao_b,
      C: expected.opcao_c,
      D: expected.opcao_d,
    });
    assert.deepEqual(
      Object.keys(question[0]).sort(),
      ["alternativas", "deadlineAt", "enunciado", "quizId"],
    );
  }
  assert.equal(questionsReceived.get(outsider.id).length, 0);
  assert.ok(questions.every(({ quizId }) => quizId === "integration-quiz"));

  const resultEvents = players.map((player) =>
    waitForEvent(player, "quiz_result"),
  );
  const roundEndedEvent = waitForEvent(host, "quiz_round_ended");
  const updatedStates = players.map((player) =>
    waitForEvent(
      player,
      "game_state_updated",
      (state) => state.status === "active" && state.currentPlayerId !== currentPlayer.id,
    ),
  );
  const answerByPlayer = new Map(
    players.map((player, index) => {
      const expected =
        QUESTIONS_BY_LEVEL[expectedLevels.get(player.id)].resposta_correta;
      return [player.id, index === 0 ? expected : expected === "A" ? "B" : "A"];
    }),
  );

  for (const player of players.slice(0, -1)) {
    const response = await emitWithAck(player, "submit_quiz_answer", {
      quizId: "integration-quiz",
      alternativa: answerByPlayer.get(player.id),
    });
    assert.deepEqual(response, { success: true });
  }
  const finalResponse = await emitWithAck(players.at(-1), "submit_quiz_answer", {
    quizId: "integration-quiz",
    alternativa: answerByPlayer.get(players.at(-1).id),
  });
  assert.deepEqual(finalResponse, { success: true });

  const [results, roundEnded, finalStates] = await Promise.all([
    Promise.all(resultEvents),
    roundEndedEvent,
    Promise.all(updatedStates),
  ]);
  for (const [index, player] of players.entries()) {
    const expectedQuestion =
      QUESTIONS_BY_LEVEL[expectedLevels.get(player.id)];
    const result = resultsReceived.get(player.id);
    assert.equal(result.length, 1);
    assert.equal(result[0].alternativa, answerByPlayer.get(player.id));
    assert.equal(
      result[0].correta,
      answerByPlayer.get(player.id) === expectedQuestion.resposta_correta,
    );
    assert.equal(result[0].respostaCorreta, expectedQuestion.resposta_correta);
    if (expectedQuestion.explicacao === null) {
      assert.equal(Object.hasOwn(result[0], "explicacao"), false);
    } else {
      assert.equal(result[0].explicacao, expectedQuestion.explicacao);
    }
    assert.equal(results[index].quizId, "integration-quiz");
  }

  assert.equal(resultsReceived.get(outsider.id).length, 0);
  assert.equal(roundEndsReceived.get(outsider.id).length, 0);
  assert.equal(roundEnded.motivo, "all_answered");
  assert.equal(
    Object.hasOwn(roundEnded, "respostaCorreta") ||
      Object.hasOwn(roundEnded, "explicacao"),
    false,
  );
  assert.equal(finalStates.every((state) => state.status === "active"), true);
  assert.equal(finalStates[0].positions[currentPlayer.id], 4);
  assert.equal(finalStates[0].currentPlayerId, nextPlayer.id);
  assert.equal(rooms.get(roomCode).gameState.status, "active");
});

test("finalizes a quiz by deadline when a participant does not answer", async (t) => {
  const fixture = await createQuizFixture(t);
  await fixture.openObstacleRound();

  const { currentPlayer } = fixture;
  const unansweredPlayers = fixture.players.filter(
    (player) => player.id !== currentPlayer.id,
  );
  const resultEvents = fixture.players.map((player) =>
    waitForEvent(player, "quiz_result"),
  );
  const roundEndedEvent = waitForEvent(
    fixture.host,
    "quiz_round_ended",
  );
  const advancedStateEvent = waitForEvent(
    fixture.host,
    "game_state_updated",
    (state) =>
      state.status === "active" && state.currentPlayerId !== currentPlayer.id,
  );

  const response = await emitWithAck(currentPlayer, "submit_quiz_answer", {
    quizId: "integration-quiz",
    alternativa: correctAnswerFor(fixture, currentPlayer),
  });
  assert.deepEqual(response, { success: true });

  fixture.expireQuizDeadline();
  const [results, roundEnded, advancedState] = await Promise.all([
    Promise.all(resultEvents),
    roundEndedEvent,
    advancedStateEvent,
  ]);

  assert.equal(roundEnded.motivo, "timeout");
  const currentPlayerResult = results[fixture.players.indexOf(currentPlayer)];
  assert.equal(
    currentPlayerResult.alternativa,
    correctAnswerFor(fixture, currentPlayer),
  );
  assert.equal(currentPlayerResult.pontos, fixture.players.length);
  for (const player of unansweredPlayers) {
    const result = results[fixture.players.indexOf(player)];
    assert.equal(result.alternativa, null);
    assert.equal(result.pontos, 0);
    assert.equal(result.correta, false);
  }
  assert.equal(advancedState.status, "active");
  assert.equal(advancedState.currentPlayerId, fixture.nextPlayer.id);
  assert.equal(fixture.rooms.get(fixture.roomCode).quizRound, null);
});

test("does not partially deliver questions when the question source fails", async (t) => {
  for (const scenario of [
    { name: "question absent", returns: null, errorCode: "QUESTIONS_UNAVAILABLE" },
    {
      name: "repository error",
      error: new Error("in-memory repository failure"),
      errorCode: "QUIZ_UNAVAILABLE",
    },
  ]) {
    await t.test(scenario.name, async (subtest) => {
      const fixture = await createQuizFixture(subtest, {
        async findRandomQuestion() {
          if (scenario.error) {
            throw scenario.error;
          }
          return scenario.returns;
        },
      });
      const quizErrorEvent = waitForEvent(fixture.host, "quiz_error");
      const roundEndedEvent = waitForEvent(
        fixture.host,
        "quiz_round_ended",
      );
      const advancedStateEvent = waitForEvent(
        fixture.host,
        "game_state_updated",
        (state) =>
          state.status === "active" &&
          state.currentPlayerId !== fixture.currentPlayer.id,
      );

      await fixture.openObstacleRound({ waitForQuestions: false });
      const [quizError, roundEnded, advancedState] = await Promise.all([
        quizErrorEvent,
        roundEndedEvent,
        advancedStateEvent,
      ]);

      assert.equal(quizError.code, scenario.errorCode);
      assert.equal(
        roundEnded.motivo,
        scenario.errorCode === "QUESTIONS_UNAVAILABLE"
          ? "questions_unavailable"
          : "quiz_unavailable",
      );
      for (const player of fixture.players) {
        assert.equal(fixture.received.quiz_question.get(player.id).length, 0);
        assert.equal(fixture.received.quiz_result.get(player.id).length, 0);
        assert.equal(roundEnded.placar[player.id], 0);
        assert.equal(
          fixture.rooms.get(fixture.roomCode).gameState.quizPoints[player.id],
          0,
        );
      }
      assert.equal(advancedState.status, "active");
      assert.equal(advancedState.currentPlayerId, fixture.nextPlayer.id);
      assert.equal(fixture.rooms.get(fixture.roomCode).quizRound, null);
    });
  }
});

test("ignores a disconnected participant's answer and keeps the original quiz score count", async (t) => {
  const fixture = await createQuizFixture(t);
  await fixture.openObstacleRound();

  const departedPlayer = fixture.players[3];
  const departedPlayerId = departedPlayer.id;
  const departureAnswer = await emitWithAck(
    departedPlayer,
    "submit_quiz_answer",
    {
      quizId: "integration-quiz",
      alternativa: correctAnswerFor(fixture, departedPlayer),
    },
  );
  assert.deepEqual(departureAnswer, { success: true });
  const playerCountUpdated = waitForEvent(
    fixture.host,
    "room_updated",
    ({ playerCount }) => playerCount === 3,
  );
  departedPlayer.disconnect();
  await playerCountUpdated;

  const remainingPlayers = fixture.players.slice(0, 3);
  const resultEvents = remainingPlayers.map((player) =>
    waitForEvent(player, "quiz_result"),
  );
  const roundEndedEvent = waitForEvent(fixture.host, "quiz_round_ended");
  const advancedStateEvent = waitForEvent(
    fixture.host,
    "game_state_updated",
    (state) =>
      state.status === "active" &&
      state.currentPlayerId !== fixture.currentPlayer.id,
  );
  for (const player of remainingPlayers) {
    const response = await emitWithAck(player, "submit_quiz_answer", {
      quizId: "integration-quiz",
      alternativa: correctAnswerFor(fixture, player),
    });
    assert.deepEqual(response, { success: true });
  }

  const [results, roundEnded, advancedState] = await Promise.all([
    Promise.all(resultEvents),
    roundEndedEvent,
    advancedStateEvent,
  ]);

  assert.equal(roundEnded.motivo, "all_answered");
  assert.equal(roundEnded.placar[departedPlayerId], 0);
  assert.deepEqual(
    results.map(({ pontos }) => pontos),
    [4, 3, 2],
  );
  assert.equal(
    fixture.rooms.get(fixture.roomCode).gameState.quizPoints[remainingPlayers[0].id],
    4,
  );
  assert.equal(
    Object.hasOwn(
      fixture.rooms.get(fixture.roomCode).gameState.quizPoints,
      departedPlayerId,
    ),
    false,
  );
  assert.equal(advancedState.status, "active");
  assert.equal(advancedState.currentPlayerId, fixture.nextPlayer.id);
  assert.equal(fixture.rooms.get(fixture.roomCode).quizRound, null);
});
