const { randomInt: secureRandomInt } = require("node:crypto");

const FINISH_POSITION = 20;
const MAX_ROUNDS = 8;
const OBSTACLE_POSITIONS = new Set([4, 8, 12, 16]);

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
  const newPosition = Math.min(
    FINISH_POSITION,
    gameState.positions[playerId] + result,
  );

  gameState.diceResult = result;
  gameState.positions[playerId] = newPosition;

  if (newPosition === FINISH_POSITION) {
    finishGame(gameState, [playerId], "finish");
    return { accepted: true, playerId, landedOnObstacle: false, gameOver: true };
  }

  if (OBSTACLE_POSITIONS.has(newPosition)) {
    gameState.status = "paused";
    gameState.obstaclePending = { playerId, position: newPosition };
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

const getPublicGameState = (gameState) => ({
  positions: { ...gameState.positions },
  currentPlayerId:
    gameState.status === "finished"
      ? null
      : gameState.turnOrder[gameState.currentTurnIndex],
  round: gameState.round,
  diceResult: gameState.diceResult,
  status: gameState.status,
});

module.exports = {
  completeObstaclePause,
  createGameState,
  getPublicGameState,
  rollDice,
};
