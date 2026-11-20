const { randomInt: secureRandomInt } = require("node:crypto");

const FINISH_POSITION = 30;
const MAX_ROUNDS = 8;
const OBSTACLE_POSITIONS = new Set([7, 14, 21, 28]);
const BONUS_POSITIONS = new Set([5, 10, 15, 20, 25]);

const createPlayerStats = () => ({
  diceRolls: 0,
  diceTotal: 0,
  bonusTriggered: 0,
  obstaclesTriggered: 0,
  quizAnswered: 0,
  quizCorrect: 0,
  quizLevels: { 1: 0, 2: 0, 3: 0 },
});

const createGameState = (playerIds, randomInt = secureRandomInt) => {
  const turnOrder = [...playerIds];

  for (let index = turnOrder.length - 1; index > 0; index--) {
    const swapIndex = randomInt(0, index + 1);
    [turnOrder[index], turnOrder[swapIndex]] = [
      turnOrder[swapIndex],
      turnOrder[index],
    ];
  }

  return {
    turnOrder,
    positions: Object.fromEntries(playerIds.map((playerId) => [playerId, 0])),
    quizPoints: Object.fromEntries(playerIds.map((playerId) => [playerId, 0])),
    stats: Object.fromEntries(
      playerIds.map((playerId) => [playerId, createPlayerStats()]),
    ),
    currentTurnIndex: 0,
    round: 1,
    diceResult: null,
    status: "active",
    obstaclePending: null,
    winners: [],
    endReason: null,
  };
};

const finishGame = (gameState, winners, reason) => {
  gameState.status = "finished";
  gameState.obstaclePending = null;
  gameState.winners = winners;
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

  if (gameState.round >= MAX_ROUNDS) {
    finishByTieBreak(gameState);
    return;
  }

  gameState.currentTurnIndex = 0;
  gameState.round++;
};

const rollDice = (gameState, randomInt = secureRandomInt) => {
  if (gameState.status !== "active") {
    return { accepted: false };
  }

  const playerId = gameState.turnOrder[gameState.currentTurnIndex];
  const result = randomInt(1, 7);
  const landedPosition = Math.min(
    FINISH_POSITION,
    gameState.positions[playerId] + result,
  );
  const landedOnBonus = BONUS_POSITIONS.has(landedPosition);
  const newPosition = landedOnBonus
    ? Math.min(FINISH_POSITION, landedPosition + 2)
    : landedPosition;

  gameState.diceResult = result;
  gameState.positions[playerId] = newPosition;

  const playerStats = gameState.stats?.[playerId];
  if (playerStats) {
    playerStats.diceRolls += 1;
    playerStats.diceTotal += result;
    if (landedOnBonus) {
      playerStats.bonusTriggered += 1;
    }
  }

  if (newPosition === FINISH_POSITION) {
    finishGame(gameState, [playerId], "finish");
    return { accepted: true, playerId, landedOnObstacle: false, gameOver: true };
  }

  if (OBSTACLE_POSITIONS.has(landedPosition)) {
    if (playerStats) {
      playerStats.obstaclesTriggered += 1;
    }
    gameState.status = "paused";
    gameState.obstaclePending = { playerId, position: landedPosition };
    return { accepted: true, playerId, landedOnObstacle: true, gameOver: false };
  }

  advanceTurn(gameState);
  return {
    accepted: true,
    playerId,
    landedOnObstacle: false,
    gameOver: gameState.status === "finished",
  };
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
      if (gameState.round >= MAX_ROUNDS) {
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
  diceResult: gameState.diceResult,
  status: gameState.status,
});

module.exports = {
  addQuizPoints,
  completeObstaclePause,
  createGameState,
  getPublicGameState,
  recordQuizOutcome,
  removePlayerFromGame,
  rollDice,
};
