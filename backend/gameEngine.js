const { randomInt: secureRandomInt } = require("node:crypto");

const FINISH_POSITION = 30;
const DEFAULT_MAX_ROUNDS = 8;
const ALLOWED_MAX_ROUNDS = new Set([6, 8]);
const OBSTACLE_POSITIONS = new Set([7, 14, 21, 28]);
const BONUS_POSITIONS = new Set([5, 10, 15, 20, 25]);
const OBSTACLE_NAMES = {
  7: "escada",
  14: "alerta_sonoro",
  21: "multidao_barulho",
  28: "placa_ilegivel",
};

const createPlayerStats = () => ({
  diceRolls: 0,
  diceTotal: 0,
  bonusTriggered: 0,
  obstaclesTriggered: 0,
  quizAnswered: 0,
  quizCorrect: 0,
  quizBonusMoves: 0,
  quizLevels: { 1: 0, 2: 0, 3: 0 },
});

const computeQuizHighlights = (gameState) => {
  const entries = Object.entries(gameState.quizPoints || {});
  if (entries.length === 0) {
    return [];
  }
  const bestScore = Math.max(...entries.map(([, score]) => score || 0));
  if (bestScore <= 0) {
    return [];
  }
  return entries
    .filter(([, score]) => (score || 0) === bestScore)
    .map(([playerId]) => playerId);
};

const createGameState = (
  playerIds,
  randomInt = secureRandomInt,
  { maxRounds = DEFAULT_MAX_ROUNDS } = {},
) => {
  const turnOrder = [...playerIds];
  const resolvedMaxRounds = ALLOWED_MAX_ROUNDS.has(maxRounds)
    ? maxRounds
    : DEFAULT_MAX_ROUNDS;

  for (let index = turnOrder.length - 1; index > 0; index--) {
    const swapIndex = randomInt(0, index + 1);
    [turnOrder[index], turnOrder[swapIndex]] = [
      turnOrder[swapIndex],
      turnOrder[index],
    ];
  }

  return {
    turnOrder,
    initialTurnOrder: [...turnOrder],
    positions: Object.fromEntries(playerIds.map((playerId) => [playerId, 0])),
    quizPoints: Object.fromEntries(playerIds.map((playerId) => [playerId, 0])),
    stats: Object.fromEntries(
      playerIds.map((playerId) => [playerId, createPlayerStats()]),
    ),
    currentTurnIndex: 0,
    round: 1,
    maxRounds: resolvedMaxRounds,
    turnNumber: 0,
    diceResult: null,
    status: "active",
    obstaclePending: null,
    lastEvent: null,
    turnHistory: [],
    winners: [],
    quizHighlights: [],
    endReason: null,
  };
};

const finishGame = (gameState, winners, reason) => {
  gameState.status = "finished";
  gameState.obstaclePending = null;
  gameState.winners = winners;
  gameState.quizHighlights = computeQuizHighlights(gameState);
  gameState.endReason = reason;
};

const finishByTieBreak = (gameState) => {
  const bestPosition = Math.max(...Object.values(gameState.positions));
  const positionLeaders = gameState.turnOrder.filter(
    (playerId) => gameState.positions[playerId] === bestPosition,
  );
  const bestScore = Math.max(
    ...positionLeaders.map((playerId) => gameState.quizPoints[playerId]),
  );
  const winners = positionLeaders.filter(
    (playerId) => gameState.quizPoints[playerId] === bestScore,
  );

  finishGame(gameState, winners, "round_limit");
};

const advanceTurn = (gameState) => {
  if (gameState.currentTurnIndex < gameState.turnOrder.length - 1) {
    gameState.currentTurnIndex++;
    return;
  }

  const maxRounds = gameState.maxRounds || DEFAULT_MAX_ROUNDS;
  if (gameState.round >= maxRounds) {
    finishByTieBreak(gameState);
    return;
  }

  gameState.currentTurnIndex = 0;
  gameState.round++;
};

const rollDice = (gameState, randomInt = secureRandomInt, now = Date.now) => {
  if (gameState.status !== "active") {
    return { accepted: false };
  }

  const playerId = gameState.turnOrder[gameState.currentTurnIndex];
  const fromPosition = gameState.positions[playerId];
  const result = randomInt(1, 7);
  const landedPosition = Math.min(FINISH_POSITION, fromPosition + result);
  const landedOnBonus = BONUS_POSITIONS.has(landedPosition);
  const newPosition = landedOnBonus
    ? Math.min(FINISH_POSITION, landedPosition + 2)
    : landedPosition;
  const landedOnObstacle =
    newPosition !== FINISH_POSITION && OBSTACLE_POSITIONS.has(landedPosition);

  gameState.turnNumber = (gameState.turnNumber || 0) + 1;
  gameState.diceResult = result;
  gameState.positions[playerId] = newPosition;

  const playerStats = gameState.stats?.[playerId];
  if (playerStats) {
    playerStats.diceRolls += 1;
    playerStats.diceTotal += result;
    if (landedOnBonus) {
      playerStats.bonusTriggered += 1;
    }
    if (landedOnObstacle) {
      playerStats.obstaclesTriggered += 1;
    }
  }

  const obstacleName = landedOnObstacle
    ? OBSTACLE_NAMES[landedPosition] ?? null
    : null;

  const eventType =
    newPosition === FINISH_POSITION
      ? "finish"
      : landedOnObstacle
        ? "obstacle"
        : landedOnBonus
          ? "bonus"
          : "roll";

  gameState.lastEvent = {
    type: eventType,
    playerId,
    diceResult: result,
    fromPosition,
    landedPosition,
    toPosition: newPosition,
    bonusTriggered: landedOnBonus,
    obstaclePosition: landedOnObstacle ? landedPosition : null,
    obstacleName,
    round: gameState.round,
  };

  if (Array.isArray(gameState.turnHistory)) {
    gameState.turnHistory.push({
      turnNumber: gameState.turnNumber,
      round: gameState.round,
      playerId,
      diceResult: result,
      fromPosition,
      landedPosition,
      toPosition: newPosition,
      ativouImpulso: landedOnBonus,
      ativouObstaculo: landedOnObstacle,
      obstaculoNome: obstacleName,
      occurredAt: new Date(now()),
    });
  }

  if (newPosition === FINISH_POSITION) {
    finishGame(gameState, [playerId], "finish");
    return {
      accepted: true,
      playerId,
      turnNumber: gameState.turnNumber,
      diceResult: result,
      fromPosition,
      landedPosition,
      newPosition,
      landedOnBonus,
      landedOnObstacle: false,
      gameOver: true,
    };
  }

  if (landedOnObstacle) {
    gameState.status = "paused";
    gameState.obstaclePending = { playerId, position: landedPosition };
    return {
      accepted: true,
      playerId,
      turnNumber: gameState.turnNumber,
      diceResult: result,
      fromPosition,
      landedPosition,
      newPosition,
      landedOnBonus,
      landedOnObstacle: true,
      gameOver: false,
    };
  }

  advanceTurn(gameState);
  return {
    accepted: true,
    playerId,
    turnNumber: gameState.turnNumber,
    diceResult: result,
    fromPosition,
    landedPosition,
    newPosition,
    landedOnBonus,
    landedOnObstacle: false,
    gameOver: gameState.status === "finished",
  };
};

const applyQuizBonusMove = (gameState, playerId, steps = 1) => {
  if (
    gameState.status === "finished" ||
    !gameState.turnOrder.includes(playerId) ||
    !Number.isSafeInteger(steps) ||
    steps <= 0
  ) {
    return { moved: false, stepsMoved: 0, gameOver: false };
  }

  const fromPosition = gameState.positions[playerId];
  const toPosition = Math.min(FINISH_POSITION, fromPosition + steps);
  const stepsMoved = toPosition - fromPosition;
  gameState.positions[playerId] = toPosition;

  const playerStats = gameState.stats?.[playerId];
  if (playerStats && stepsMoved > 0) {
    playerStats.quizBonusMoves = (playerStats.quizBonusMoves || 0) + stepsMoved;
  }

  gameState.lastEvent = {
    type: toPosition === FINISH_POSITION ? "finish" : "quiz_bonus",
    playerId,
    diceResult: null,
    fromPosition,
    landedPosition: toPosition,
    toPosition,
    bonusTriggered: false,
    obstaclePosition: null,
    obstacleName: null,
    round: gameState.round,
  };

  if (toPosition === FINISH_POSITION) {
    finishGame(gameState, [playerId], "finish");
    return { moved: true, fromPosition, toPosition, stepsMoved, gameOver: true };
  }

  return { moved: stepsMoved > 0, fromPosition, toPosition, stepsMoved, gameOver: false };
};

const completeObstaclePause = (gameState) => {
  if (gameState.status !== "paused" || !gameState.obstaclePending) {
    return false;
  }

  gameState.status = "active";
  gameState.obstaclePending = null;
  advanceTurn(gameState);
  return true;
};

const addQuizPoints = (gameState, playerId, points) => {
  if (
    !gameState.turnOrder.includes(playerId) ||
    !Number.isSafeInteger(points) ||
    points < 0
  ) {
    return false;
  }

  gameState.quizPoints[playerId] += points;
  return true;
};

const recordQuizOutcome = (
  gameState,
  playerId,
  { level, answered = false, correct = false } = {},
) => {
  const playerStats = gameState.stats?.[playerId];
  if (!playerStats) {
    return false;
  }

  if (answered) {
    playerStats.quizAnswered += 1;
  }
  if (correct) {
    playerStats.quizCorrect += 1;
  }
  if (level === 1 || level === 2 || level === 3) {
    playerStats.quizLevels[level] += 1;
  }
  return true;
};

const removePlayerFromGame = (gameState, playerId) => {
  const playerIndex = gameState.turnOrder.indexOf(playerId);
  if (playerIndex === -1) {
    return false;
  }

  const wasFinished = gameState.status === "finished";
  const wasCurrentPlayer =
    !wasFinished && gameState.currentTurnIndex === playerIndex;
  const wasLastPlayer = playerIndex === gameState.turnOrder.length - 1;
  const wasPendingPlayer = gameState.obstaclePending?.playerId === playerId;

  gameState.turnOrder.splice(playerIndex, 1);
  delete gameState.positions[playerId];
  delete gameState.quizPoints[playerId];
  if (gameState.stats) {
    delete gameState.stats[playerId];
  }

  if (wasFinished) {
    return true;
  }

  if (wasPendingPlayer) {
    gameState.status = "active";
    gameState.obstaclePending = null;
  }

  if (playerIndex < gameState.currentTurnIndex) {
    gameState.currentTurnIndex--;
  }

  if (wasCurrentPlayer) {
    if (wasLastPlayer) {
      const maxRounds = gameState.maxRounds || DEFAULT_MAX_ROUNDS;
      if (gameState.round >= maxRounds) {
        finishByTieBreak(gameState);
      } else {
        gameState.currentTurnIndex = 0;
        gameState.round++;
      }
    } else {
      gameState.currentTurnIndex = playerIndex;
    }
  }

  return true;
};

const getPublicGameState = (gameState) => ({
  positions: { ...gameState.positions },
  quizPoints: { ...gameState.quizPoints },
  currentPlayerId:
    gameState.status === "finished"
      ? null
      : gameState.turnOrder[gameState.currentTurnIndex],
  round: gameState.round,
  maxRounds: gameState.maxRounds || DEFAULT_MAX_ROUNDS,
  diceResult: gameState.diceResult,
  status: gameState.status,
  lastEvent: gameState.lastEvent ? { ...gameState.lastEvent } : null,
});

module.exports = {
  ALLOWED_MAX_ROUNDS,
  DEFAULT_MAX_ROUNDS,
  FINISH_POSITION,
  addQuizPoints,
  applyQuizBonusMove,
  completeObstaclePause,
  computeQuizHighlights,
  createGameState,
  getPublicGameState,
  recordQuizOutcome,
  removePlayerFromGame,
  rollDice,
};
