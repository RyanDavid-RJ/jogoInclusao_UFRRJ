const assert = require("node:assert/strict");
const test = require("node:test");

const {
  completeObstaclePause,
  createGameState,
  getPublicGameState,
  rollDice,
} = require("../gameEngine");

const diceSequence = (values) => (minimum, maximum) => {
  const value = values.shift();
  assert.ok(value >= minimum && value < maximum);
  return value;
};

const createState = () =>
  createGameState(["p1", "p2", "p3", "p4"], (_minimum, maximum) => maximum - 1);

const playRoll = (gameState, randomInt) => {
  const result = rollDice(gameState, randomInt);
  if (result.landedOnObstacle) {
    assert.equal(completeObstaclePause(gameState), true);
  }
  return result;
};

test("initializes positions, scores, and one shuffled turn order without changing players", () => {
  const playerIds = ["p1", "p2", "p3", "p4"];
  const randomInt = (minimum, maximum) => {
    assert.ok(maximum > minimum);
    return minimum;
  };
  const gameState = createGameState(playerIds, randomInt);

  assert.deepEqual(playerIds, ["p1", "p2", "p3", "p4"]);
  assert.deepEqual(new Set(gameState.turnOrder), new Set(playerIds));
  assert.deepEqual(gameState.positions, { p1: 0, p2: 0, p3: 0, p4: 0 });
  assert.deepEqual(gameState.quizPoints, { p1: 0, p2: 0, p3: 0, p4: 0 });
  assert.equal(gameState.round, 1);
  assert.equal(gameState.status, "active");
});

test("moves normally and advances the current turn", () => {
  const gameState = createState();
  const result = rollDice(gameState, diceSequence([3]));

  assert.equal(result.accepted, true);
  assert.equal(gameState.positions.p1, 3);
  assert.equal(gameState.turnOrder[gameState.currentTurnIndex], "p2");
  assert.equal(gameState.diceResult, 3);
});

test("caps movement at 30 and declares the winner immediately", () => {
  const gameState = createState();
  gameState.positions.p1 = 28;

  const result = rollDice(gameState, diceSequence([6]));

  assert.equal(gameState.positions.p1, 30);
  assert.equal(gameState.status, "finished");
  assert.deepEqual(gameState.winners, ["p1"]);
  assert.equal(result.gameOver, true);
});

test("pauses only when a roll lands exactly on an obstacle", () => {
  const landed = createState();
  landed.positions.p1 = 1;
  const landedResult = rollDice(landed, diceSequence([6]));

  assert.equal(landedResult.landedOnObstacle, true);
  assert.equal(landed.status, "paused");
  assert.deepEqual(landed.obstaclePending, { playerId: "p1", position: 7 });

  const passed = createState();
  passed.positions.p1 = 3;
  const passedResult = rollDice(passed, diceSequence([6]));

  assert.equal(passedResult.landedOnObstacle, false);
  assert.equal(passed.positions.p1, 9);
  assert.equal(passed.status, "active");
  assert.equal(passed.turnOrder[passed.currentTurnIndex], "p2");
});

test("completes an obstacle pause internally and advances the turn", () => {
  const gameState = createState();
  gameState.positions.p1 = 1;
  const randomInt = diceSequence([6, 1]);
  const firstRoll = rollDice(gameState, randomInt);
  assert.equal(firstRoll.landedOnObstacle, true);
  assert.equal(rollDice(gameState, randomInt).accepted, false);

  assert.equal(completeObstaclePause(gameState), true);
  assert.equal(gameState.status, "active");
  assert.equal(gameState.turnOrder[gameState.currentTurnIndex], "p2");
  assert.equal(completeObstaclePause(gameState), false);
});

test("advances two extra houses when landing on a bonus house", () => {
  for (const bonusHouse of [5, 10, 15, 20, 25]) {
    const gameState = createState();
    gameState.positions.p1 = bonusHouse - 1;

    const result = rollDice(gameState, diceSequence([1]));

    assert.equal(result.accepted, true);
    assert.equal(gameState.positions.p1, bonusHouse + 2);
    assert.equal(gameState.status, "active");
  }
});

test("ends after eight complete rounds and shares an unresolved tie", () => {
  const gameState = createState();
  const randomInt = diceSequence(Array(32).fill(1));

  for (let turn = 0; turn < 32; turn++) {
    playRoll(gameState, randomInt);
  }

  assert.equal(gameState.round, 8);
  assert.equal(gameState.status, "finished");
  assert.deepEqual(gameState.winners, ["p1", "p2", "p3", "p4"]);
  assert.equal(gameState.endReason, "round_limit");
});

test("breaks an eight-round tie by position and then quiz points", () => {
  const gameState = createState();
  const randomInt = diceSequence(Array(32).fill(1));

  for (let turn = 0; turn < 28; turn++) {
    playRoll(gameState, randomInt);
  }

  gameState.quizPoints.p2 = 2;
  gameState.quizPoints.p3 = 3;
  const targetPositions = { p1: 6, p2: 7, p3: 7, p4: 5 };
  for (const playerId of gameState.turnOrder) {
    gameState.positions[playerId] = targetPositions[playerId] - 1;
    playRoll(gameState, randomInt);
  }

  assert.equal(gameState.status, "finished");
  assert.deepEqual(gameState.winners, ["p3"]);
});

test("publishes only the public game state", () => {
  const gameState = createState();
  const publicState = getPublicGameState(gameState);

  assert.deepEqual(Object.keys(publicState), [
    "positions",
    "currentPlayerId",
    "round",
    "diceResult",
    "status",
  ]);
  assert.equal("turnOrder" in publicState, false);
  assert.equal("quizPoints" in publicState, false);
  assert.equal("obstaclePending" in publicState, false);
  assert.equal("winners" in publicState, false);
});
