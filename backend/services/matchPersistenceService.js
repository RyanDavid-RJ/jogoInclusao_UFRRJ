function createMatchPersistenceService({ matchRepository, logger } = {}) {
  async function persistMatch(snapshot) {
    if (!matchRepository || typeof matchRepository.saveCompletedMatch !== "function") {
      return { persisted: false, reason: "NOT_CONFIGURED" };
    }

    try {
      const saved = await matchRepository.saveCompletedMatch(snapshot);
      logger?.info("match", "match_persisted", {
        partidaId: saved.partidaId,
        roomCode: snapshot.roomCode,
        totalPlayers: snapshot.participants?.length ?? 0,
      });
      return { persisted: true, ...saved };
    } catch (error) {
      if (error?.code === "ER_NO_SUCH_TABLE") {
        logger?.warn("db", "analytics_tables_not_migrated", {
          code: error.code,
          roomCode: snapshot.roomCode,
        });
        return { persisted: false, reason: "SCHEMA_NOT_MIGRATED" };
      }
      logger?.error("db", "match_persistence_failed", {
        code: error?.code,
        message: error?.message,
        roomCode: snapshot.roomCode,
      });
      return { persisted: false, reason: "DB_ERROR" };
    }
  }

  return { persistMatch };
}

module.exports = { createMatchPersistenceService };
