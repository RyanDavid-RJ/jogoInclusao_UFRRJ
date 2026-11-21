const { randomUUID } = require("node:crypto");

function toMysqlDatetime(value) {
  const date = value instanceof Date ? value : new Date(value || Date.now());
  return date.toISOString().slice(0, 19).replace("T", " ");
}

function createMatchRepository(pool) {
  async function saveCompletedMatch(snapshot) {
    if (typeof pool.getConnection !== "function") {
      throw new Error("MySQL pool with transactions (getConnection) is required.");
    }

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      let matrizId = snapshot.matrizId ?? null;
      if (!matrizId && snapshot.matrizCodigo) {
        const [matrixRows] = await conn.execute(
          `SELECT id FROM matrizes_equidade WHERE codigo = ? LIMIT 1`,
          [snapshot.matrizCodigo],
        );
        matrizId = matrixRows[0]?.id ?? null;
      }

      const matchUuid = snapshot.uuid || randomUUID();
      const startedAt = new Date(snapshot.startedAt || Date.now());
      const finishedAt = new Date(snapshot.finishedAt || Date.now());
      const durationSec = Math.max(
        0,
        Math.round((finishedAt.getTime() - startedAt.getTime()) / 1000),
      );
      const participants = snapshot.participants || [];
      const turns = snapshot.turns || [];
      const quizRounds = snapshot.quizRounds || [];

      const totalObstacles = turns.filter((turn) => turn.ativouObstaculo).length;
      const totalBonuses = turns.filter((turn) => turn.ativouImpulso).length;
      const eligibleForResearch = participants.some((p) => p.consentiuPesquisa) ? 1 : 0;

      const [matchResult] = await conn.execute(
        `INSERT INTO partidas
          (uuid, room_code, turma_id, matriz_id, anfitriao_usuario_id,
           etapa_escolar, modo_privado, quiz_duracao_seg, max_rodadas,
           total_jogadores, rodadas_jogadas, total_turnos, total_obstaculos,
           total_impulsos, motivo_fim, elegivel_pesquisa, iniciada_em,
           finalizada_em, duracao_seg)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          matchUuid,
          snapshot.roomCode,
          snapshot.turmaId ?? null,
          matrizId,
          snapshot.hostUserId ?? null,
          snapshot.schoolStage,
          snapshot.isPrivate ? 1 : 0,
          snapshot.quizDurationSec ?? 30,
          snapshot.maxRounds ?? 8,
          participants.length,
          snapshot.roundsPlayed ?? 1,
          turns.length,
          totalObstacles,
          totalBonuses,
          snapshot.endReason || "finish",
          eligibleForResearch,
          toMysqlDatetime(startedAt),
          toMysqlDatetime(finishedAt),
          durationSec,
        ],
      );
      const partidaId = matchResult.insertId;

      const participantIdMap = new Map();
      for (const participant of participants) {
        const diceRolls = participant.stats?.diceRolls ?? 0;
        const diceTotal = participant.stats?.diceTotal ?? 0;
        const avgDice =
          diceRolls > 0 ? Number((diceTotal / diceRolls).toFixed(2)) : null;

        const [ppResult] = await conn.execute(
          `INSERT INTO partida_participantes
            (partida_id, usuario_id, participante_anon_id, apelido_partida,
             avatar_id, condicao, ordem_turno, posicao_final, pontos_quiz,
             vencedor, destaque_quiz, rolagens_dado, soma_dados, media_dado,
             impulsos_ativados, obstaculos_ativados, quizzes_respondidos,
             quizzes_corretos, nivel1_enfrentados, nivel2_enfrentados,
             nivel3_enfrentados, desconectou, consentiu_pesquisa)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            partidaId,
            participant.userId ?? null,
            participant.anonId || randomUUID(),
            String(participant.name || "Jogador").slice(0, 16),
            participant.avatarId || "coelho",
            participant.condition,
            participant.turnOrderPosition,
            participant.position ?? 0,
            participant.quizPoints ?? 0,
            participant.isWinner ? 1 : 0,
            participant.isQuizHighlight ? 1 : 0,
            diceRolls,
            diceTotal,
            avgDice,
            participant.stats?.bonusTriggered ?? 0,
            participant.stats?.obstaclesTriggered ?? 0,
            participant.stats?.quizAnswered ?? 0,
            participant.stats?.quizCorrect ?? 0,
            participant.stats?.quizLevels?.[1] ?? 0,
            participant.stats?.quizLevels?.[2] ?? 0,
            participant.stats?.quizLevels?.[3] ?? 0,
            participant.disconnected ? 1 : 0,
            participant.consentiuPesquisa ? 1 : 0,
          ],
        );
        participantIdMap.set(participant.playerId, ppResult.insertId);
      }

      const turnIdMap = new Map();
      for (const turn of turns) {
        const participantDbId = participantIdMap.get(turn.playerId);
        if (!participantDbId) {
          continue;
        }
        const [turnResult] = await conn.execute(
          `INSERT INTO partida_turnos
            (partida_id, participante_id, numero_turno, rodada, valor_dado,
             posicao_anterior, posicao_pouso, posicao_final, ativou_impulso,
             ativou_obstaculo, obstaculo_nome, ocorrido_em)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            partidaId,
            participantDbId,
            turn.turnNumber,
            turn.round,
            turn.diceResult,
            turn.fromPosition,
            turn.landedPosition,
            turn.toPosition,
            turn.ativouImpulso ? 1 : 0,
            turn.ativouObstaculo ? 1 : 0,
            turn.obstaculoNome ?? null,
            toMysqlDatetime(turn.occurredAt),
          ],
        );
        turnIdMap.set(turn.turnNumber, turnResult.insertId);
      }

      for (const quizRound of quizRounds) {
        const [qrResult] = await conn.execute(
          `INSERT INTO quiz_rodadas
            (partida_id, turno_id, quiz_uuid, rodada_partida, posicao_obstaculo,
             obstaculo_nome, participantes_n, motivo_fim, iniciada_em, finalizada_em)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            partidaId,
            turnIdMap.get(quizRound.turnNumber) ?? null,
            quizRound.quizId || randomUUID(),
            quizRound.round,
            quizRound.obstaclePosition,
            quizRound.obstacleName,
            quizRound.participantCount,
            quizRound.reason,
            toMysqlDatetime(quizRound.startedAt),
            toMysqlDatetime(quizRound.finishedAt),
          ],
        );
        const quizRodadaId = qrResult.insertId;

        for (const answer of quizRound.answers || []) {
          const participantDbId = participantIdMap.get(answer.playerId);
          if (!participantDbId || !Number.isInteger(answer.questionId)) {
            continue;
          }
          await conn.execute(
            `INSERT INTO quiz_respostas
              (quiz_rodada_id, participante_id, pergunta_id, condicao,
               nivel_estrutural, alternativa_marcada, correta, tempo_resposta_ms,
               ordem_recebimento, pontos_obtidos, avanco_bonus_casas,
               desconectado, respondido_em)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              quizRodadaId,
              participantDbId,
              answer.questionId,
              answer.condition,
              answer.structuralLevel,
              answer.selectedOption ?? null,
              answer.correct ? 1 : 0,
              answer.responseTimeMs ?? null,
              answer.receivedOrder ?? null,
              answer.points ?? 0,
              answer.bonusMove ?? 0,
              answer.disconnected ? 1 : 0,
              answer.answeredAt ? toMysqlDatetime(answer.answeredAt) : null,
            ],
          );
        }
      }

      await conn.commit();
      return { partidaId, uuid: matchUuid };
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }
  }

  async function getUserMatchHistory(usuarioId, { limit = 20, offset = 0 } = {}) {
    const safeLimit = Math.max(1, Math.min(100, Math.trunc(Number(limit)) || 20));
    const safeOffset = Math.max(0, Math.min(10000, Math.trunc(Number(offset)) || 0));

    const [matches] = await pool.execute(
      `SELECT pa.uuid AS partida_uuid,
              pa.etapa_escolar,
              pa.total_jogadores,
              pa.rodadas_jogadas,
              pa.motivo_fim,
              pa.duracao_seg,
              pa.finalizada_em,
              t.codigo AS turma_codigo,
              pp.condicao,
              pp.posicao_final,
              pp.pontos_quiz,
              pp.vencedor,
              pp.destaque_quiz,
              pp.media_dado,
              pp.impulsos_ativados,
              pp.quizzes_respondidos,
              pp.quizzes_corretos,
              pp.nivel1_enfrentados,
              pp.nivel2_enfrentados,
              pp.nivel3_enfrentados
       FROM partida_participantes AS pp
       INNER JOIN partidas AS pa ON pa.id = pp.partida_id
       LEFT JOIN turmas AS t ON t.id = pa.turma_id
       WHERE pp.usuario_id = ?
       ORDER BY pa.finalizada_em DESC
       LIMIT ${safeLimit} OFFSET ${safeOffset}`,
      [usuarioId],
    );

    const [summaryRows] = await pool.execute(
      `SELECT COUNT(*) AS total_partidas,
              COALESCE(SUM(vencedor), 0) AS total_vitorias,
              COALESCE(SUM(destaque_quiz), 0) AS total_destaques_quiz,
              COALESCE(SUM(quizzes_respondidos), 0) AS total_respondidos,
              COALESCE(SUM(quizzes_corretos), 0) AS total_corretos
       FROM partida_participantes
       WHERE usuario_id = ?`,
      [usuarioId],
    );

    const [perspectivesRows] = await pool.execute(
      `SELECT DISTINCT condicao
       FROM partida_participantes
       WHERE usuario_id = ?`,
      [usuarioId],
    );

    const summary = summaryRows[0] || {
      total_partidas: 0,
      total_vitorias: 0,
      total_destaques_quiz: 0,
      total_respondidos: 0,
      total_corretos: 0,
    };

    return {
      summary: {
        totalPartidas: Number(summary.total_partidas) || 0,
        totalVitorias: Number(summary.total_vitorias) || 0,
        totalDestaquesQuiz: Number(summary.total_destaques_quiz) || 0,
        totalRespondidos: Number(summary.total_respondidos) || 0,
        totalCorretos: Number(summary.total_corretos) || 0,
        perspectivasVivenciadas: perspectivesRows.map((row) => row.condicao),
      },
      matches,
    };
  }

  return {
    saveCompletedMatch,
    getUserMatchHistory,
  };
}

module.exports = { createMatchRepository, toMysqlDatetime };
