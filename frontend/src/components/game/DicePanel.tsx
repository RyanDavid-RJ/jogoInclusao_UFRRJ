// frontend/src/components/game/DicePanel.tsx
// Painel do dado animado + feed narrativo de eventos de turno v2.0.

import { useEffect, useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";

import {
  DICE_FACES,
  formatTurnEvent,
  type PlayerProfile,
  type ThemePalette,
  type TurnEvent,
} from "../../constants/duoTheme";
import { DuoButton, DuoCard } from "../ui/DuoComponents";

export interface DicePanelProps {
  diceResult: number | null;
  round?: number;
  maxRounds?: number;
  status?: "active" | "paused" | "finished";
  isMyTurn: boolean;
  currentPlayerName: string;
  lastEvent?: TurnEvent | null;
  players?: PlayerProfile[];
  ownPlayerId?: string;
  onRollDice: () => void;
  palette: ThemePalette;
}

export function DicePanel({
  diceResult,
  round,
  maxRounds = 8,
  status = "active",
  isMyTurn,
  currentPlayerName,
  lastEvent,
  players = [],
  ownPlayerId,
  onRollDice,
  palette,
}: DicePanelProps) {
  const reduceMotion = useReducedMotion();
  const rotation = useSharedValue(0);
  const scale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);

  useEffect(() => {
    if (diceResult === null) {
      return;
    }
    rotation.value = 0;
    scale.value = 1;
    translateY.value = reduceMotion ? 0 : -140;
    if (reduceMotion) {
      return;
    }
    rotation.value = withTiming(360, {
      duration: 520,
      easing: Easing.out(Easing.cubic),
    });
    translateY.value = withSpring(0, { damping: 6, stiffness: 120 });
    scale.value = withSequence(
      withTiming(1.18, { duration: 180, easing: Easing.out(Easing.quad) }),
      withSpring(1, { damping: 7, stiffness: 120 }),
    );
  }, [diceResult, reduceMotion, rotation, scale, translateY]);

  const pan = Gesture.Pan()
    .enabled(isMyTurn)
    .onUpdate((event) => {
      translateX.value = event.translationX;
      translateY.value = event.translationY;
    })
    .onEnd((event) => {
      if (event.translationY < -45) {
        runOnJS(onRollDice)();
      }
      translateX.value = reduceMotion ? 0 : withSpring(0);
      translateY.value = reduceMotion ? 0 : withSpring(0);
    });

  const diceAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { rotateZ: `${rotation.value}deg` },
      { scale: scale.value },
      { translateX: translateX.value },
      { translateY: translateY.value },
    ],
  }));

  const playerIds = useMemo(
    () => players.map((p) => p.playerId),
    [players],
  );
  const formattedEvent = useMemo(
    () => formatTurnEvent(lastEvent, playerIds, ownPlayerId, players),
    [lastEvent, playerIds, ownPlayerId, players],
  );

  const face = diceResult !== null ? DICE_FACES[diceResult] || "🎲" : "🎲";

  const eventBg =
    formattedEvent?.tone === "success"
      ? palette.primaryBg
      : formattedEvent?.tone === "warning"
        ? palette.warningBg
        : formattedEvent?.tone === "purple"
          ? palette.purpleBg
          : palette.surfaceAlt;
  const eventBorder =
    formattedEvent?.tone === "success"
      ? palette.primaryBorder
      : formattedEvent?.tone === "warning"
        ? palette.warningBorder
        : formattedEvent?.tone === "purple"
          ? palette.purpleBorder
          : palette.cardBorder;

  return (
    <DuoCard
      palette={palette}
      variant={isMyTurn ? "highlight" : "default"}
      padding={16}
      style={isMyTurn ? { borderColor: palette.primaryBorder } : undefined}
    >
      <View style={styles.topRow}>
        <Text
          style={[
            styles.turnIndicator,
            { color: isMyTurn ? palette.primaryText : palette.textMuted },
          ]}
        >
          {isMyTurn
            ? "🎯 SUA VEZ DE JOGAR!"
            : status === "paused"
              ? "🚧 Obstáculo ativo — Quiz em andamento"
              : status === "finished"
                ? "🏆 Partida concluída"
                : `⏳ Turno de ${currentPlayerName}`}
        </Text>
        {typeof round === "number" ? (
          <View
            style={[
              styles.roundPill,
              {
                backgroundColor: palette.cardBg,
                borderColor: palette.cardBorder,
              },
            ]}
          >
            <Text style={[styles.roundText, { color: palette.textMain }]}>
              🏁 Rodada {round}/{maxRounds}
            </Text>
          </View>
        ) : null}
      </View>

      <View style={styles.diceRow}>
        <GestureDetector gesture={pan}>
          <Animated.View
            style={[
              styles.diceFace,
              {
                borderColor: isMyTurn
                  ? palette.primaryBorder
                  : palette.cardBorder,
                backgroundColor: palette.cardBg,
              },
              diceAnimatedStyle,
            ]}
          >
            <Text style={styles.diceEmoji} numberOfLines={1}>
              {face}
            </Text>
          </Animated.View>
        </GestureDetector>

        <View style={styles.actionSide}>
          {isMyTurn ? (
            <DuoButton
              title="Rolar o Dado"
              subtitle="Clique ou arraste o dado para cima"
              icon="🎲"
              variant="primary"
              size="lg"
              fullWidth
              onPress={onRollDice}
              palette={palette}
              accessibilityLabel="Rolar o dado"
              accessibilityHint="Rola o dado para avançar no tabuleiro"
            />
          ) : (
            <DuoButton
              title={
                status === "paused"
                  ? "Quiz em andamento..."
                  : status === "finished"
                    ? "Partida encerrada"
                    : `Aguardando ${currentPlayerName}...`
              }
              icon="🎲"
              variant="ghost"
              size="lg"
              fullWidth
              disabled
              palette={palette}
              accessibilityLabel="Aguardando seu turno para rolar o dado"
            />
          )}
        </View>
      </View>

      {formattedEvent ? (
        <View
          accessibilityLiveRegion="polite"
          style={[
            styles.eventBanner,
            { backgroundColor: eventBg, borderColor: eventBorder },
          ]}
        >
          <Text style={styles.eventIcon}>{formattedEvent.icon}</Text>
          <Text style={[styles.eventText, { color: palette.textMain }]}>
            {formattedEvent.text}
          </Text>
        </View>
      ) : null}
    </DuoCard>
  );
}

const styles = StyleSheet.create({
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
  },
  turnIndicator: {
    fontSize: 14,
    fontWeight: "900",
    letterSpacing: 0.3,
  },
  roundPill: {
    borderRadius: 999,
    borderWidth: 2,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  roundText: {
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.3,
  },
  diceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    flexWrap: "wrap",
  },
  diceFace: {
    width: 82,
    height: 82,
    borderRadius: 20,
    borderWidth: 2,
    borderBottomWidth: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  diceEmoji: {
    fontSize: 52,
    lineHeight: 58,
    textAlign: "center",
  },
  actionSide: {
    flex: 1,
    minWidth: 190,
  },
  eventBanner: {
    marginTop: 12,
    borderRadius: 12,
    borderWidth: 2,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  eventIcon: {
    fontSize: 16,
  },
  eventText: {
    flex: 1,
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 17,
  },
});
