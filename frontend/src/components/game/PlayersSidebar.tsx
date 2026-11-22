// frontend/src/components/game/PlayersSidebar.tsx
// Painel lateral responsivo v2.1 com ranking ao vivo (#1/#2/#3), destaque do turno
// e botão "Ocultar papel" para privacidade em laboratório/projeção.

import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import {
  getConditionMeta,
  type PlayerProfile,
  type ReconnectingPlayer,
  type ThemePalette,
} from "../../constants/duoTheme";
import { AvatarMedallion, DuoCard, InfoPill } from "../ui/DuoComponents";

export interface PlayersSidebarProps {
  players: PlayerProfile[];
  reconnectingPlayers?: ReconnectingPlayer[];
  positions: Record<string, number>;
  quizPoints: Record<string, number>;
  myCondition: string | null;
  ownPlayerId?: string;
  currentPlayerId?: string | null;
  palette: ThemePalette;
  scrollable?: boolean;
}

const FINISH_HOUSE = 30;
const RANK_MEDALS = ["🥇", "🥈", "🥉"];

export function PlayersSidebar({
  players,
  reconnectingPlayers = [],
  positions,
  quizPoints,
  myCondition,
  ownPlayerId,
  currentPlayerId,
  palette,
  scrollable = true,
}: PlayersSidebarProps) {
  const [hideRole, setHideRole] = useState(false);
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    if (reconnectingPlayers.length === 0) return;
    setNowMs(Date.now());
    const timer = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [reconnectingPlayers.length]);

  const hasCondition =
    myCondition !== null && myCondition.trim().length > 0;
  const conditionMeta = useMemo(
    () => (hasCondition ? getConditionMeta(myCondition) : null),
    [hasCondition, myCondition],
  );

  // Calcula posição no ranking ao vivo (posição no tabuleiro, depois pontos de quiz)
  const rankByPlayerId = useMemo(() => {
    const sorted = [...players].sort((a, b) => {
      const posDiff =
        (positions[b.playerId] ?? 0) - (positions[a.playerId] ?? 0);
      if (posDiff !== 0) return posDiff;
      return (quizPoints[b.playerId] ?? 0) - (quizPoints[a.playerId] ?? 0);
    });
    const map = new Map<string, number>();
    sorted.forEach((p, idx) => map.set(p.playerId, idx + 1));
    return map;
  }, [players, positions, quizPoints]);

  const content = (
    <>
      {/* SEÇÃO 1 — Sua Perspectiva Secreta (com modo discrição para projeção/sala) */}
      {hasCondition && conditionMeta !== null ? (
        <DuoCard
          palette={palette}
          variant="default"
          padding={14}
          style={{
            backgroundColor: hideRole
              ? palette.surfaceAlt
              : palette.isDark
                ? conditionMeta.darkBgTint
                : conditionMeta.bgTint,
            borderColor: hideRole ? palette.cardBorder : conditionMeta.color,
          }}
        >
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionTitle, { color: palette.textMain }]}>
              Sua Perspectiva
            </Text>
            <Pressable
              onPress={() => setHideRole((v) => !v)}
              accessibilityRole="button"
              accessibilityLabel={
                hideRole
                  ? "Mostrar minha perspectiva secreta"
                  : "Ocultar minha perspectiva secreta"
              }
              style={[
                styles.privacyBtn,
                {
                  backgroundColor: palette.cardBg,
                  borderColor: palette.cardBorder,
                },
              ]}
            >
              <Text style={[styles.privacyBtnText, { color: palette.textMain }]}>
                {hideRole ? "👁️ Mostrar" : "🙈 Ocultar"}
              </Text>
            </Pressable>
          </View>

          {hideRole ? (
            <Text style={[styles.hiddenNotice, { color: palette.textMuted }]}>
              🔒 Papel ocultado temporariamente (ideal para sala de aula ou
              projeção). Toque em &ldquo;Mostrar&rdquo; quando quiser rever.
            </Text>
          ) : (
            <>
              <View style={styles.conditionHeader}>
                <View
                  style={[
                    styles.conditionIconBadge,
                    {
                      backgroundColor: palette.cardBg,
                      borderColor: conditionMeta.color,
                    },
                  ]}
                >
                  <Text style={styles.conditionIcon}>
                    {conditionMeta.personaIcon}
                  </Text>
                </View>
                <Text
                  style={[styles.conditionLabel, { color: conditionMeta.color }]}
                  numberOfLines={2}
                >
                  {conditionMeta.label}
                </Text>
              </View>

              <Text
                style={[styles.conditionSummary, { color: palette.textMain }]}
              >
                {conditionMeta.summary}
              </Text>
              <Text style={[styles.secretNote, { color: palette.textMuted }]}>
                🔒 Segredo da partida — revelado aos demais só no encerramento.
              </Text>
            </>
          )}
        </DuoCard>
      ) : null}

      {/* SEÇÃO 2 — Ranking Ao Vivo */}
      <DuoCard palette={palette} variant="default" padding={14}>
        <Text style={[styles.sectionTitle, { color: palette.textMain }]}>
          Progresso dos Jogadores
        </Text>

        {players.length === 0 ? (
          <Text style={[styles.emptyText, { color: palette.textMuted }]}>
            Nenhum jogador na sala ainda.
          </Text>
        ) : (
          <View style={styles.playersList}>
            {players.map((player) => {
              const rawPosition = positions[player.playerId];
              const position =
                typeof rawPosition === "number" ? rawPosition : 0;
              const points = quizPoints[player.playerId] ?? 0;
              const clamped = Math.max(0, Math.min(position, FINISH_HOUSE));
              const progressPercent = (clamped / FINISH_HOUSE) * 100;
              const isTurn = player.playerId === currentPlayerId;
              const isOwn = player.playerId === ownPlayerId;
              const rank = rankByPlayerId.get(player.playerId) ?? 1;
              const rankLabel =
                rank <= 3 ? RANK_MEDALS[rank - 1] : `#${rank}`;

              return (
                <View
                  key={player.playerId}
                  style={[
                    styles.playerRow,
                    {
                      backgroundColor: isTurn
                        ? palette.primaryBg
                        : isOwn
                          ? palette.secondaryBg
                          : palette.surfaceAlt,
                      borderColor: isTurn
                        ? palette.primaryBorder
                        : isOwn
                          ? palette.secondaryBorder
                          : palette.cardBorder,
                    },
                  ]}
                  accessible
                  accessibilityLabel={`${rank}º lugar: ${player.name}${isOwn ? " (Você)" : ""}${isTurn ? ", jogando agora" : ""}. Posição ${position} de ${FINISH_HOUSE}. Pontos de quiz: ${points}.`}
                >
                  <AvatarMedallion
                    avatarId={player.avatarId}
                    size="sm"
                    selected={isTurn}
                    palette={palette}
                  />

                  <View style={styles.playerMain}>
                    <View style={styles.playerTopRow}>
                      <Text
                        style={[styles.playerName, { color: palette.textMain }]}
                        numberOfLines={1}
                      >
                        {rankLabel} {player.name}
                        {isOwn ? " (Você)" : ""}
                      </Text>
                      {isTurn ? (
                        <InfoPill
                          text="🎲 Vez"
                          tone="primary"
                          palette={palette}
                        />
                      ) : null}
                    </View>

                    <View
                      style={[
                        styles.progressTrack,
                        { backgroundColor: palette.cardBorder },
                      ]}
                    >
                      <View
                        style={[
                          styles.progressFill,
                          {
                            width: `${progressPercent}%`,
                            backgroundColor: isTurn
                              ? palette.primary
                              : palette.secondary,
                            borderColor: isTurn
                              ? palette.primaryBorder
                              : palette.secondaryBorder,
                          },
                        ]}
                      />
                    </View>

                    <View style={styles.chipsRow}>
                      <View
                        style={[
                          styles.chip,
                          {
                            backgroundColor: palette.cardBg,
                            borderColor: palette.cardBorder,
                          },
                        ]}
                      >
                        <Text
                          style={[styles.chipText, { color: palette.textMain }]}
                          numberOfLines={1}
                        >
                          Casa {position}/{FINISH_HOUSE}
                        </Text>
                      </View>

                      <View
                        style={[
                          styles.chip,
                          {
                            backgroundColor: palette.warningBg,
                            borderColor: palette.warningBorder,
                          },
                        ]}
                      >
                        <Text
                          style={[styles.chipText, { color: palette.textMain }]}
                          numberOfLines={1}
                        >
                          ⭐ {points} pts
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
              );
            })}

            {reconnectingPlayers.map((player) => {
              const secLeft = player.reconnectDeadlineAt
                ? Math.max(
                    0,
                    Math.ceil((player.reconnectDeadlineAt - nowMs) / 1000),
                  )
                : null;
              return (
                <View
                  key={`reconn-${player.playerId}`}
                  style={[
                    styles.playerRow,
                    {
                      backgroundColor: palette.warningBg,
                      borderColor: palette.warningBorder,
                      opacity: 0.88,
                    },
                  ]}
                >
                  <AvatarMedallion
                    avatarId={player.avatarId}
                    size="sm"
                    palette={palette}
                  />
                  <View style={styles.playerMain}>
                    <View style={styles.playerTopRow}>
                      <Text
                        style={[styles.playerName, { color: palette.textMain }]}
                        numberOfLines={1}
                      >
                        {player.name}
                      </Text>
                      <InfoPill
                        text={
                          secLeft !== null
                            ? `📡 ${secLeft}s`
                            : "📡 Reconectando"
                        }
                        tone="warning"
                        palette={palette}
                      />
                    </View>
                    <Text
                      style={[styles.reconnSub, { color: palette.textMuted }]}
                    >
                      Conexão oscilou — aguardando retorno à sala...
                    </Text>
                  </View>
                </View>
              );
            })}

            {players.length <= 1 && reconnectingPlayers.length > 0 ? (
              <View
                style={[
                  styles.soloNotice,
                  {
                    backgroundColor: palette.dangerBg,
                    borderColor: palette.dangerBorder,
                  },
                ]}
              >
                <Text
                  style={[styles.soloNoticeText, { color: palette.textMain }]}
                >
                  ⚠️ Demais jogadores desconectados. A partida encerrará
                  automaticamente se ninguém retornar — ou use 🚪 Sair no topo.
                </Text>
              </View>
            ) : null}
          </View>
        )}
      </DuoCard>
    </>
  );

  if (!scrollable) {
    return (
      <View
        style={[
          styles.scrollContent,
          { backgroundColor: palette.background },
        ]}
      >
        {content}
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.scroll, { backgroundColor: palette.background }]}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {content}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 10,
    gap: 12,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 6,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "900",
    letterSpacing: 0.2,
    marginBottom: 6,
  },
  privacyBtn: {
    borderRadius: 999,
    borderWidth: 1.5,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  privacyBtnText: {
    fontSize: 11,
    fontWeight: "800",
  },
  hiddenNotice: {
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 17,
  },
  conditionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 8,
  },
  conditionIconBadge: {
    width: 42,
    height: 42,
    borderRadius: 12,
    borderWidth: 2,
    borderBottomWidth: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  conditionIcon: {
    fontSize: 22,
  },
  conditionLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: "900",
  },
  conditionSummary: {
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 17,
  },
  secretNote: {
    fontSize: 11,
    fontWeight: "700",
    marginTop: 6,
    lineHeight: 15,
  },
  emptyText: {
    fontSize: 12,
    fontWeight: "700",
    textAlign: "center",
    paddingVertical: 8,
  },
  playersList: {
    gap: 8,
  },
  playerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 14,
    borderWidth: 2,
    borderBottomWidth: 4,
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  playerMain: {
    flex: 1,
    minWidth: 0,
    gap: 5,
  },
  playerTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 6,
  },
  playerName: {
    flex: 1,
    fontSize: 13,
    fontWeight: "900",
  },
  progressTrack: {
    width: "100%",
    height: 9,
    borderRadius: 999,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
    borderRightWidth: 2,
  },
  chipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  chip: {
    borderRadius: 999,
    borderWidth: 1.5,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  chipText: {
    fontSize: 10,
    fontWeight: "900",
  },
  reconnSub: {
    fontSize: 11,
    fontWeight: "700",
  },
  soloNotice: {
    borderRadius: 12,
    borderWidth: 2,
    padding: 10,
  },
  soloNoticeText: {
    fontSize: 11,
    fontWeight: "800",
    lineHeight: 16,
  },
});
