const assert = require("node:assert/strict");
const test = require("node:test");

const { createMatchRepository } = require("../repositories/matchRepository");
const { createMatchPersistenceService } = require("../services/matchPersistenceService");

function createMockTransactionalPool({ failAtCall = null } = {}) {
  const executed = [];
  let began = false;
  let committed = false;
  let rolledBack = false;
  let released = false;
  let nextInsertId = 100;

  const conn = {
    async beginTransaction() {
      began = true;
    },
    async execute(sql, params) {
      executed.push({ sql, params });
      if (failAtCall && executed.length === failAtCall) {
        const err = new Error("simulated failure");
        err.code = "ER_LOCK_DEADLOCK";
        throw err;
      }
      if (/SELECT id FROM matrizes_equidade/i.test(sql)) {
        return [[{ id: 1 }]];
      }
      return [{ insertId: nextInsertId++ }];
    },
    async commit() {
      committed = true;
    },
    async rollback() {
      rolledBack = true;
    },
    release() {
      released = true;
    },
  };

  return {
    pool: {
      async getConnection() {
        return conn;
      },
    },
    state: () => ({ executed, began, committed, rolledBack, released }),
  };
}

const sampleSnapshot = {
  roomCode: "ABCD",
  matrizCodigo: "v1.0-baseline",
  schoolStage: "Superior",
  isPrivate: false,
  quizDurationSec: 45,
  maxRounds: 8,
  roundsPlayed: 3,
  endReason: "finish",
  startedAt: new Date("2026-11-21T12:00:00Z"),
  finishedAt: new Date("2026-11-21T12:05:00Z"),
  participants: [
    {
      playerId: "p1",
      userId: 2,
      anonId: "anon-1",
      name: "Ana",
      avatarId: "coruja",
      condition: "cadeirante",
      turnOrderPosition: 1,
      position: 30,
      quizPoints: 4,
      isWinner: true,
      isQuizHighlight: true,
      stats: {
        diceRolls: 3,
        diceTotal: 15,
        bonusTriggered: 1,
        obstaclesTriggered: 1,
        quizAnswered: 1,
        quizCorrect: 1,
        quizLevels: { 1: 0, 2: 0, 3: 1 },
      },
      disconnected: false,
      consentiuPesquisa: true,
    },
  ],
  turns: [
    {
      turnNumber: 1,
      round: 1,
      playerId: "p1",
      diceResult: 6,
      fromPosition: 1,
      landedPosition: 7,
      toPosition: 7,
      ativouImpulso: false,
      ativouObstaculo: true,
      obstaculoNome: "escada",
      occurredAt: new Date("2026-11-21T12:01:00Z"),
    },
  ],
  quizRounds: [
    {
      quizId: "quiz-1",
      turnNumber: 1,
      round: 1,
      obstaclePosition: 7,
      obstacleName: "escada",
      participantCount: 4,
      reason: "all_answered",
      startedAt: new Date("2026-11-21T12:01:05Z"),
      finishedAt: new Date("2026-11-21T12:01:20Z"),
      answers: [
        {
          playerId: "p1",
          questionId: 12,
          condition: "cadeirante",
          structuralLevel: 3,
          selectedOption: "C",
          correct: true,
          responseTimeMs: 4200,
          receivedOrder: 1,
          points: 4,
          bonusMove: 1,
          disconnected: false,
          answeredAt: new Date("2026-11-21T12:01:09Z"),
        },
      ],
    },
  ],
};

test("saves match, participants, turns, quiz rounds and answers in a single transaction", async () => {
  const { pool, state } = createMockTransactionalPool();
  const repo = createMatchRepository(pool);

  const saved = await repo.saveCompletedMatch(sampleSnapshot);
  assert.equal(saved.partidaId, 100);
  assert.ok(saved.uuid);

  const s = state();
  assert.equal(s.began, true);
  assert.equal(s.committed, true);
  assert.equal(s.rolledBack, false);
  assert.equal(s.released, true);
  assert.equal(s.executed.length, 6); // matrix + match + participant + turn + quizRound + quizAnswer
});

test("rolls back transaction and releases connection when an insert fails", async () => {
  const { pool, state } = createMockTransactionalPool({ failAtCall: 4 });
  const repo = createMatchRepository(pool);

  await assert.rejects(repo.saveCompletedMatch(sampleSnapshot));
  const s = state();
  assert.equal(s.rolledBack, true);
  assert.equal(s.committed, false);
  assert.equal(s.released, true);
});

test("matchPersistenceService degrades safely if analytics tables are not yet migrated", async () => {
  const warnings = [];
  const service = createMatchPersistenceService({
    matchRepository: {
      async saveCompletedMatch() {
        const err = new Error("Table 'defaultdb.partidas' doesn't exist");
        err.code = "ER_NO_SUCH_TABLE";
        throw err;
      },
    },
    logger: {
      warn: (category, event, meta) => warnings.push({ category, event, meta }),
      error: () => {},
      info: () => {},
    },
  });

  const outcome = await service.persistMatch(sampleSnapshot);
  assert.deepEqual(outcome, { persisted: false, reason: "SCHEMA_NOT_MIGRATED" });
  assert.equal(warnings.length, 1);
});
