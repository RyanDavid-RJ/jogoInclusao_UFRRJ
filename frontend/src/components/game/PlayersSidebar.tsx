// frontend/src/components/game/PlayersSidebar.tsx
// Painel lateral/inferior responsivo do "Ludo Equidade (UFRRJ)".
// Compatível com React Compiler. Sem shadow* no StyleSheet.

import { useMemo } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import {
  getConditionMeta,
  type PlayerProfile,
  type ThemePalette,
} from "../../constants/duoTheme";
import { AvatarMedallion, DuoCard } from "../ui/DuoComponents";

/* ------------------------------------------------------------------ */
/* Props                                                               */
/* ------------------------------------------------------------------ */

export interface PlayersSidebarProps {
  players: PlayerProfile[];
  positions: Record<string, number>;
  quizPoints: Record<string, number>;
  myCondition: string | null;
  palette: ThemePalette;
}

const FINISH_HOUSE = 30;

/* ------------------------------------------------------------------ */
/* Componente                                                          */
/* ------------------------------------------------------------------ */

export function PlayersSidebar({
  players,
  positions,
  quizPoints,
  myCondition,
  palette,
}: PlayersSidebarProps) {
  const hasCondition =
    myCondition !== null && myCondition.trim().length > 0;
  const conditionMeta = useMemo(
    () => (hasCondition ? getConditionMeta(myCondition) : null),
    [hasCondition, myCondition]
  );

  return (
    <ScrollView
      style={[styles.scroll, { backgroundColor: palette.background }]}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* SEÇÃO 1 — Sua Perspectiva */}
      {hasCondition && conditionMeta !== null ? (
        <DuoCard
          palette={palette}
          variant="default"
          padding={14}
          style={{
            backgroundColor: conditionMeta.bgTint,
            borderColor: conditionMeta.color,
          }}
        >
          <Text
            style={[styles.sectionTitle, { color: palette.textMain }]}
          >
            Sua Perspectiva
          </Text>

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
              const progressPercent =
                (clamped / FINISH_HOUSE) * 100;

              return (
                <View
                  key={player.playerId}
                  style={[
                    styles.playerRow,
                    {
                      backgroundColor: palette.surfaceAlt,
                      borderColor: palette.cardBorder,
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
                        style={[
                          styles.playerName,
                          { color: palette.textMain },
                        ]}
                        numberOfLines={1}
                      >
                        {player.name}
                      </Text>
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
                            backgroundColor: palette.primary,
                            borderColor: palette.primaryBorder,
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
                          style={[
                            styles.chipText,
                            { color: palette.textMain },
                          ]}
                          numberOfLines={1}
                          ellipsizeMode="clip"
                        >
                          Pos: {position}/{FINISH_HOUSE}
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
                          style={[
                            styles.chipText,
                            { color: palette.textMain },
                          ]}
                          numberOfLines={1}
                          ellipsizeMode="clip"
                        >
                          ⭐ {points}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </DuoCard>
    </ScrollView>
  );
}

/* ------------------------------------------------------------------ */
/* Estilos                                                             */
/* ------------------------------------------------------------------ */

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 12,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "900",
    letterSpacing: 0.3,
    marginBottom: 10,
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
    letterSpacing: 0.2,
  },
  conditionSummary: {
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 18,
  },
  emptyText: {
    fontSize: 12,
    fontWeight: "700",
    textAlign: "center",
    paddingVertical: 8,
  },
  playersList: {
    gap: 10,
  },
  playerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 14,
    borderWidth: 2,
    borderBottomWidth: 4,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  playerMain: {
    flex: 1,
    minWidth: 0,
    gap: 6,
  },
  playerTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  playerName: {
    flex: 1,
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: 0.2,
  },
  progressTrack: {
    width: "100%",
    height: 10,
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
    maxWidth: "100%",
    borderRadius: 999,
    borderWidth: 2,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  chipText: {
    flexShrink: 1,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.3,
  },
});
