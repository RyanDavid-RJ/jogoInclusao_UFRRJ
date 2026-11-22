// frontend/src/components/game/BoardTrack.tsx
// Trilha sinuosa responsiva v2.1: 5 colunas em desktop largo / 3 colunas em mobile,
// barra de corrida panorâmica (0..30) e destaque da casa do último evento.

import { useMemo } from "react";
import { StyleSheet, Text, useWindowDimensions, View } from "react-native";
import Animated, { FadeIn, ZoomIn, useReducedMotion } from "react-native-reanimated";

import {
  BONUS_META,
  OBSTACLE_META,
  getAvatarMeta,
  getPlayerMarker,
  type PlayerProfile,
  type ThemePalette,
  type TurnEvent,
} from "../../constants/duoTheme";
import { AvatarMedallion } from "../ui/DuoComponents";

const TOTAL_HOUSES = 31;
const FINISH_HOUSE = TOTAL_HOUSES - 1;
const START_HOUSE = 0;

type CellData = {
  house: number;
  arrow: string | null;
} | null;

function buildBoardRows(housesPerRow: number): CellData[][] {
  const totalRows = Math.ceil(TOTAL_HOUSES / housesPerRow);
  const rows: CellData[][] = [];
  for (let rowIndex = 0; rowIndex < totalRows; rowIndex += 1) {
    const base = rowIndex * housesPerRow;
    const isEvenRow = rowIndex % 2 === 0;
    const visualOrder: number[] = [];
    for (let i = 0; i < housesPerRow; i += 1) {
      visualOrder.push(isEvenRow ? base + i : base + (housesPerRow - 1 - i));
    }
    const lastVisitedHouse = Math.min(FINISH_HOUSE, base + housesPerRow - 1);

    const cells: CellData[] = visualOrder.map((house) => {
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

const BOARD_ROWS_3 = buildBoardRows(3);
const BOARD_ROWS_5 = buildBoardRows(5);

export interface BoardTrackProps {
  positions: Record<string, number>;
  ownPlayerId: string | undefined;
  currentPlayerId?: string | null;
  lastEvent?: TurnEvent | null;
  playerProfiles: PlayerProfile[];
  palette: ThemePalette;
}

export function BoardTrack({
  positions,
  ownPlayerId,
  currentPlayerId,
  lastEvent,
  playerProfiles,
  palette,
}: BoardTrackProps) {
  const { width } = useWindowDimensions();
  const useFiveCols = width >= 1140;
  const boardRows = useFiveCols ? BOARD_ROWS_5 : BOARD_ROWS_3;

  const reduceMotion = useReducedMotion();
  const playerIds = useMemo(
    () => playerProfiles.map((profile) => profile.playerId),
    [playerProfiles],
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
  const activeHouse = currentPlayerId ? positions[currentPlayerId] : undefined;
  const recentHouse = lastEvent?.toPosition;

  return (
    <Animated.View
      entering={reduceMotion ? undefined : FadeIn.duration(320)}
      style={[
        styles.container,
        {
          backgroundColor: palette.boardBg,
          borderColor: palette.boardBorder,
        },
      ]}
    >
      {/* Mini-trilha panorâmica da corrida (0 → 30) */}
      <View
        style={[
          styles.raceStrip,
          {
            backgroundColor: palette.cardBg,
            borderColor: palette.cardBorder,
          },
        ]}
      >
        <View style={styles.raceStripHeader}>
          <Text style={[styles.raceStripTitle, { color: palette.textMuted }]}>
            🏁 PANORAMA DA CORRIDA
          </Text>
          <View style={styles.legendRow}>
            <Text style={[styles.legendItem, { color: palette.primaryText }]}>
              🚀 Impulso +2
            </Text>
            <Text style={[styles.legendItem, { color: palette.textMain }]}>
              🚧 Obstáculo
            </Text>
            <Text style={[styles.legendItem, { color: palette.purpleBorder }]}>
              🏆 Casa 30
            </Text>
          </View>
        </View>

        <View
          style={[
            styles.raceRail,
            { backgroundColor: palette.surfaceAlt, borderColor: palette.cardBorder },
          ]}
        >
          {/* Marcadores dos 4 obstáculos no trilho */}
          {[7, 14, 21, 28].map((pos) => (
            <View
              key={`rail-obs-${pos}`}
              style={[
                styles.railObstacleTick,
                {
                  left: `${(pos / FINISH_HOUSE) * 100}%`,
                  backgroundColor: palette.warningBorder,
                },
              ]}
            />
          ))}
          {playerProfiles.map((p) => {
            const pos = Math.max(
              0,
              Math.min(FINISH_HOUSE, positions[p.playerId] ?? 0),
            );
            const pct = (pos / FINISH_HOUSE) * 100;
            const meta = getAvatarMeta(p.avatarId);
            const isOwn = p.playerId === ownPlayerId;
            return (
              <View
                key={`pin-${p.playerId}`}
                style={[
                  styles.railPin,
                  {
                    left: `${Math.min(96, Math.max(2, pct))}%`,
                    backgroundColor: isOwn ? palette.secondaryBg : palette.cardBg,
                    borderColor: isOwn ? palette.secondaryBorder : meta.borderColor,
                  },
                ]}
              >
                <Text style={styles.railPinEmoji}>{meta.emoji}</Text>
              </View>
            );
          })}
        </View>
      </View>

      {/* Grade sinuosa de 0 a 30 */}
      {boardRows.map((rowCells, rowIndex) => (
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
            const isActiveHere = activeHouse === cell.house;
            const isRecentHere = recentHouse === cell.house;
            const playersHere = playersByHouse.get(cell.house) ?? [];

            const houseDescription = [
              `Casa ${cell.house}`,
              isStart
                ? "Início"
                : isFinish
                  ? "Chegada"
                  : obstacle
                    ? `Obstáculo: ${obstacle.title} (${obstacle.domain})`
                    : bonus
                      ? `Impulso: avança 2 casas`
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
            let accentStrip: string | null = null;

            if (isStart) {
              bgColor = palette.secondaryBg;
              borderColor = palette.secondaryBorder;
              accentStrip = palette.secondary;
            } else if (isObstacle) {
              bgColor = palette.warningBg;
              borderColor = palette.warningBorder;
              accentStrip = palette.warningBorder;
            } else if (bonus) {
              bgColor = palette.primaryBg;
              borderColor = palette.primaryBorder;
              accentStrip = palette.primary;
            } else if (isFinish) {
              bgColor = palette.purpleBg;
              borderColor = palette.purpleBorder;
              accentStrip = palette.purple;
            } else if (isOwnHere) {
              bgColor = palette.secondaryBg;
              borderColor = palette.secondaryBorder;
            } else if (isRecentHere || isActiveHere) {
              borderColor = palette.primaryBorder;
            }

            return (
              <View
                key={`cell-${cell.house}`}
                style={[
                  styles.cell,
                  useFiveCols && styles.cellCompact,
                  { backgroundColor: bgColor, borderColor },
                ]}
                accessible
                accessibilityLabel={houseDescription}
              >
                {accentStrip ? (
                  <View
                    style={[
                      styles.cellTopAccent,
                      { backgroundColor: accentStrip },
                    ]}
                  />
                ) : null}

                <View style={styles.cellTopRow}>
                  <View
                    style={[
                      styles.houseBadge,
                      {
                        backgroundColor: isRecentHere
                          ? palette.primary
                          : palette.surfaceAlt,
                        borderColor: isRecentHere
                          ? palette.primaryBorder
                          : palette.cardBorder,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.houseNumber,
                        { color: isRecentHere ? "#FFFFFF" : palette.textMain },
                      ]}
                    >
                      {cell.house}
                    </Text>
                  </View>
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
                      <Text
                        style={[
                          styles.obstacleDomain,
                          { color: palette.textMuted },
                        ]}
                        numberOfLines={1}
                      >
                        {obstacle.domain}
                      </Text>
                    </>
                  ) : bonus ? (
                    <>
                      <Text style={styles.bonusIcon}>{bonus.icon}</Text>
                      <Text
                        style={[
                          styles.bonusTitle,
                          { color: palette.primaryText },
                        ]}
                        numberOfLines={1}
                      >
                        {bonus.title}
                      </Text>
                    </>
                  ) : isFinish ? (
                    <Text
                      style={[
                        styles.cellLabel,
                        { color: palette.purpleBorder },
                      ]}
                      numberOfLines={2}
                    >
                      CHEGADA 🏆
                    </Text>
                  ) : null}
                </View>

                {isRecentHere && lastEvent ? (
                  <Animated.View
                    entering={reduceMotion ? undefined : ZoomIn.springify()}
                    style={[
                      styles.eventCallout,
                      {
                        backgroundColor:
                          lastEvent.type === "quiz_bonus"
                            ? palette.purple
                            : lastEvent.type === "bonus" ||
                                lastEvent.type === "finish"
                              ? palette.primary
                              : lastEvent.type === "obstacle"
                                ? palette.warning
                                : palette.secondary,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.eventCalloutText,
                        {
                          color:
                            lastEvent.type === "obstacle"
                              ? "#1F2937"
                              : "#FFFFFF",
                        },
                      ]}
                    >
                      {lastEvent.type === "quiz_bonus"
                        ? "⚡ +1 QUIZ"
                        : lastEvent.type === "bonus"
                          ? "🚀 +2!"
                          : lastEvent.type === "obstacle"
                            ? "🚧 QUIZ!"
                            : lastEvent.type === "finish"
                              ? "🏆 FIM!"
                              : `🎲 +${lastEvent.diceResult ?? ""}`}
                    </Text>
                  </Animated.View>
                ) : null}

                {playersHere.length > 0 ? (
                  <View style={styles.playersRow}>
                    {playersHere.map((profile) => (
                      <Animated.View
                        key={`${profile.playerId}-${cell.house}`}
                        entering={reduceMotion ? undefined : ZoomIn.springify()}
                      >
                        <AvatarMedallion
                          avatarId={profile.avatarId}
                          size="sm"
                          selected={profile.playerId === currentPlayerId}
                          markerText={getPlayerMarker(
                            profile.playerId,
                            playerIds,
                            ownPlayerId,
                          )}
                          palette={palette}
                        />
                      </Animated.View>
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

const styles = StyleSheet.create({
  container: {
    width: "100%",
    borderRadius: 20,
    borderWidth: 2,
    padding: 10,
    marginTop: 10,
    gap: 8,
  },
  raceStrip: {
    borderRadius: 14,
    borderWidth: 2,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 10,
  },
  raceStripHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 6,
  },
  raceStripTitle: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.6,
  },
  legendRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  legendItem: {
    fontSize: 10,
    fontWeight: "800",
  },
  raceRail: {
    height: 16,
    borderRadius: 999,
    borderWidth: 2,
    position: "relative",
    justifyContent: "center",
    marginVertical: 6,
  },
  railObstacleTick: {
    position: "absolute",
    top: -2,
    bottom: -2,
    width: 3,
    borderRadius: 2,
    opacity: 0.7,
  },
  railPin: {
    position: "absolute",
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    transform: [{ translateX: -13 }],
  },
  railPinEmoji: {
    fontSize: 14,
  },
  row: {
    flexDirection: "row",
    gap: 7,
  },
  cell: {
    flex: 1,
    minHeight: 112,
    borderRadius: 16,
    borderWidth: 2,
    borderBottomWidth: 5,
    paddingHorizontal: 6,
    paddingTop: 6,
    paddingBottom: 8,
    justifyContent: "space-between",
    alignItems: "stretch",
    overflow: "hidden",
    position: "relative",
  },
  cellCompact: {
    minHeight: 96,
  },
  cellTopAccent: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 4,
  },
  cellSpacer: {
    flex: 1,
  },
  cellTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    minHeight: 18,
    marginTop: 2,
  },
  houseBadge: {
    borderRadius: 6,
    borderWidth: 1,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  houseNumber: {
    fontSize: 10,
    fontWeight: "900",
  },
  arrow: {
    fontSize: 12,
    fontWeight: "900",
  },
  cellContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 2,
    gap: 1,
  },
  cellLabel: {
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.3,
    textAlign: "center",
  },
  obstacleIcon: {
    fontSize: 19,
    lineHeight: 22,
    textAlign: "center",
  },
  obstacleTitle: {
    fontSize: 10,
    fontWeight: "900",
    textAlign: "center",
  },
  obstacleDomain: {
    fontSize: 9,
    fontWeight: "800",
    textAlign: "center",
  },
  bonusIcon: {
    fontSize: 19,
    lineHeight: 22,
    textAlign: "center",
  },
  bonusTitle: {
    fontSize: 10,
    fontWeight: "900",
    textAlign: "center",
  },
  playersRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    alignItems: "center",
    gap: 4,
    marginTop: 3,
  },
  eventCallout: {
    alignSelf: "center",
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 2,
    marginBottom: 2,
  },
  eventCalloutText: {
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 0.3,
  },
});
