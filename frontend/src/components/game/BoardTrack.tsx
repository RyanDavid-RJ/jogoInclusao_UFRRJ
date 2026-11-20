// frontend/src/components/game/BoardTrack.tsx
// Trilha sinuosa do tabuleiro do "Ludo Equidade (UFRRJ)".
// Compatível com React Compiler. Sem shadow* no StyleSheet.

import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, { FadeIn, useReducedMotion } from "react-native-reanimated";

import {
  BONUS_META,
  OBSTACLE_META,
  getPlayerMarker,
  type PlayerProfile,
  type ThemePalette,
} from "../../constants/duoTheme";
import { AvatarMedallion } from "../ui/DuoComponents";

/* ------------------------------------------------------------------ */
/* Configuração estática do tabuleiro                                  */
/* ------------------------------------------------------------------ */

const TOTAL_HOUSES = 31;
const HOUSES_PER_ROW = 3;
const TOTAL_ROWS = Math.ceil(TOTAL_HOUSES / HOUSES_PER_ROW); // 11
const FINISH_HOUSE = TOTAL_HOUSES - 1; // 30
const START_HOUSE = 0;

type CellData = {
  house: number;
  arrow: string | null;
} | null;

function buildBoardRows(): CellData[][] {
  const rows: CellData[][] = [];
  for (let rowIndex = 0; rowIndex < TOTAL_ROWS; rowIndex += 1) {
    const base = rowIndex * HOUSES_PER_ROW;
    const isEvenRow = rowIndex % 2 === 0;
    const housesInVisualOrder = isEvenRow
      ? [base, base + 1, base + 2]
      : [base + 2, base + 1, base];
    const lastVisitedHouse = Math.min(FINISH_HOUSE, base + HOUSES_PER_ROW - 1);

    const cells: CellData[] = housesInVisualOrder.map((house) => {
      if (house > FINISH_HOUSE) {
        return null;
      }
      let arrow: string | null = null;
      if (house !== FINISH_HOUSE) {
        if (house === lastVisitedHouse) {
          arrow = "⤵";
        } else if (isEvenRow) {
          arrow = "➔";
        } else {
          arrow = "⬅";
        }
      }
      return { house, arrow };
    });
    rows.push(cells);
  }
  return rows;
}

const BOARD_ROWS = buildBoardRows();

/* ------------------------------------------------------------------ */
/* Props                                                               */
/* ------------------------------------------------------------------ */

export interface BoardTrackProps {
  positions: Record<string, number>;
  ownPlayerId: string | undefined;
  playerProfiles: PlayerProfile[];
  palette: ThemePalette;
}

/* ------------------------------------------------------------------ */
/* Componente                                                          */
/* ------------------------------------------------------------------ */

export function BoardTrack({
  positions,
  ownPlayerId,
  playerProfiles,
  palette,
}: BoardTrackProps) {
  const reduceMotion = useReducedMotion();
  const playerIds = useMemo(
    () => playerProfiles.map((profile) => profile.playerId),
    [playerProfiles]
  );

  const playersByHouse = useMemo(() => {
    const map = new Map<number, PlayerProfile[]>();
    for (const profile of playerProfiles) {
      const house = positions[profile.playerId];
      if (typeof house !== "number") {
        continue;
      }
      const existing = map.get(house);
      if (existing) {
        existing.push(profile);
      } else {
        map.set(house, [profile]);
      }
    }
    return map;
  }, [positions, playerProfiles]);

  const ownHouse =
    ownPlayerId !== undefined ? positions[ownPlayerId] : undefined;
  const ownHighlightBg = `${palette.secondary}1A`;

  return (
    <Animated.View
      entering={reduceMotion ? undefined : FadeIn.duration(400)}
      style={[styles.container, { backgroundColor: palette.background }]}
    >
      {BOARD_ROWS.map((rowCells, rowIndex) => (
        <View key={`row-${rowIndex}`} style={styles.row}>
          {rowCells.map((cell, cellIndex) => {
            if (cell === null) {
              return (
                <View
                  key={`spacer-${rowIndex}-${cellIndex}`}
                  style={styles.cellSpacer}
                />
              );
            }
            const obstacle = OBSTACLE_META[cell.house];
            const bonus = BONUS_META[cell.house];
            const isStart = cell.house === START_HOUSE;
            const isFinish = cell.house === FINISH_HOUSE;
            const isObstacle = Boolean(obstacle);
            const isOwnHere = ownHouse === cell.house;
            const playersHere = playersByHouse.get(cell.house) ?? [];
            const houseDescription = [
              `Casa ${cell.house}`,
              isStart
                ? "Início"
                : isFinish
                  ? "Chegada"
                  : obstacle
                    ? `Obstáculo: ${obstacle.title}`
                    : bonus
                      ? `Impulso: ${bonus.title}`
                      : null,
              playersHere.length > 0
                ? `Jogadores: ${playersHere
                    .map((profile) => profile.name)
                    .join(", ")}`
                : "Sem jogadores",
            ]
              .filter(Boolean)
              .join(". ");

            let bgColor = palette.cardBg;
            let borderColor = palette.cardBorder;

            if (isStart) {
              bgColor = palette.surfaceAlt;
              borderColor = palette.secondaryBorder;
            } else if (isObstacle) {
              bgColor = palette.warningBg;
              borderColor = palette.warningBorder;
            } else if (bonus) {
              bgColor = palette.surfaceAlt;
              borderColor = palette.primaryBorder;
            } else if (isFinish) {
              bgColor = palette.surfaceAlt;
              borderColor = palette.primaryBorder;
            } else if (isOwnHere) {
              bgColor = ownHighlightBg;
              borderColor = palette.secondaryBorder;
            }

            return (
              <View
                key={`cell-${cell.house}`}
                style={[
                  styles.cell,
                  { backgroundColor: bgColor, borderColor },
                ]}
                accessible
                accessibilityLabel={houseDescription}
              >
                <View style={styles.cellTopRow}>
                  <Text
                    style={[styles.houseNumber, { color: palette.textMuted }]}
                  >
                    {cell.house}
                  </Text>
                  {cell.arrow ? (
                    <Text style={[styles.arrow, { color: palette.textMuted }]}>
                      {cell.arrow}
                    </Text>
                  ) : null}
                </View>

                <View style={styles.cellContent}>
                  {isStart ? (
                    <Text
                      style={[
                        styles.cellLabel,
                        { color: palette.secondaryBorder },
                      ]}
                      numberOfLines={2}
                    >
                      INÍCIO 🏁
                    </Text>
                  ) : obstacle ? (
                    <>
                      <Text style={styles.obstacleIcon}>{obstacle.icon}</Text>
                      <Text
                        style={[
                          styles.obstacleTitle,
                          { color: palette.textMain },
                        ]}
                        numberOfLines={2}
                      >
                        {obstacle.title}
                      </Text>
                    </>
                  ) : bonus ? (
                    <>
                      <Text style={styles.bonusIcon}>{bonus.icon}</Text>
                      <Text
                        style={[
                          styles.bonusTitle,
                          { color: palette.textMain },
                        ]}
                        numberOfLines={2}
                      >
                        {bonus.title}
                      </Text>
                    </>
                  ) : isFinish ? (
                    <Text
                      style={[
                        styles.cellLabel,
                        { color: palette.primaryBorder },
                      ]}
                      numberOfLines={2}
                    >
                      CHEGADA 🏆
                    </Text>
                  ) : null}
                </View>

                {playersHere.length > 0 ? (
                  <View style={styles.playersRow}>
                    {playersHere.map((profile) => (
                      <AvatarMedallion
                        key={profile.playerId}
                        avatarId={profile.avatarId}
                        size="sm"
                        markerText={getPlayerMarker(
                          profile.playerId,
                          playerIds,
                          ownPlayerId
                        )}
                        palette={palette}
                      />
                    ))}
                  </View>
                ) : null}
              </View>
            );
          })}
        </View>
      ))}
    </Animated.View>
  );
}

/* ------------------------------------------------------------------ */
/* Estilos                                                             */
/* ------------------------------------------------------------------ */

const styles = StyleSheet.create({
  container: {
    width: "100%",
    borderRadius: 20,
    padding: 10,
    gap: 8,
  },
  row: {
    flexDirection: "row",
    gap: 8,
  },
  cell: {
    flex: 1,
    minHeight: 110,
    borderRadius: 16,
    borderWidth: 2,
    borderBottomWidth: 5,
    paddingHorizontal: 6,
    paddingTop: 6,
    paddingBottom: 8,
    justifyContent: "space-between",
    alignItems: "stretch",
  },
  cellSpacer: {
    flex: 1,
  },
  cellTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    minHeight: 14,
  },
  houseNumber: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  arrow: {
    fontSize: 12,
    fontWeight: "900",
  },
  cellContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 4,
    gap: 2,
  },
  cellLabel: {
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.4,
    textAlign: "center",
  },
  obstacleIcon: {
    fontSize: 20,
    lineHeight: 24,
    textAlign: "center",
  },
  obstacleTitle: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.2,
    textAlign: "center",
  },
  bonusIcon: {
    fontSize: 20,
    lineHeight: 24,
    textAlign: "center",
  },
  bonusTitle: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.2,
    textAlign: "center",
  },
  playersRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
});
