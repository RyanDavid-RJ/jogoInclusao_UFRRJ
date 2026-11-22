// frontend/src/components/game/DicePanel.tsx
// Painel do dado geométrico animado (tumble 3x3 + pulso no seu turno + feed narrativo +
// contador de reconexão quando o jogador da vez perde a internet).

import { useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  Easing,
  FadeInDown,
  cancelAnimation,
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";

import {
  formatTurnEvent,
  type PlayerProfile,
  type ReconnectingPlayer,
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
  currentPlayerId?: string | null;
  currentPlayerName: string;
  reconnectingPlayers?: ReconnectingPlayer[];
  lastEvent?: TurnEvent | null;
  players?: PlayerProfile[];
  ownPlayerId?: string;
  onRollDice: () => void;
  palette: ThemePalette;
}

const DIE_PIPS: Record<number, number[]> = {
  1: [4],
  2: [2, 6],
  3: [2, 4, 6],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
};

function TactileDieFace({
  value,
  isMyTurn,
  palette,
}: {
  value: number | null;
  isMyTurn: boolean;
  palette: ThemePalette;
}) {
  const pips = value !== null && DIE_PIPS[value] ? DIE_PIPS[value] : null;
  const pipColor = isMyTurn ? palette.primaryBorder : palette.textMain;

  if (!pips) {
    return (
      <View style={styles.dieEmptyInner}>
        <Text style={styles.dieEmptyIcon}>🎲</Text>
      </View>
    );
  }

  return (
    <View style={styles.pipGrid}>
      {Array.from({ length: 9 }).map((_, idx) => {
        const active = pips.includes(idx);
        return (
          <View key={`pip-${idx}`} style={styles.pipCell}>
            {active ? (
              <View style={[styles.pipDot, { backgroundColor: pipColor }]} />
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

export function DicePanel({
  diceResult,
  round,
  maxRounds = 8,
  status = "active",
  isMyTurn,
  currentPlayerId,
  currentPlayerName,
  reconnectingPlayers = [],
  lastEvent,
  players = [],
  ownPlayerId,
  onRollDice,
  palette,
}: DicePanelProps) {
  const reduceMotion = useReducedMotion();
  const [displayFace, setDisplayFace] = useState<number | null>(diceResult);
  const [reconnectSecondsLeft, setReconnectSecondsLeft] = useState<
    number | null
  >(null);

  const rotation = useSharedValue(0);
  const scale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const pulse = useSharedValue(1);

  const rollEventKey = lastEvent
    ? `${lastEvent.round}-${lastEvent.playerId}-${lastEvent.toPosition}-${lastEvent.diceResult ?? "x"}-${lastEvent.type}`
    : "init";

  // Animação de rolagem com ciclo rápido de faces + arco com mola
  useEffect(() => {
    if (diceResult === null) {
      setDisplayFace(null);
      return;
    }
    if (reduceMotion) {
      setDisplayFace(diceResult);
      return;
    }

    const tumbleFaces = [
      ((diceResult + 1) % 6) + 1,
      ((diceResult + 3) % 6) + 1,
      ((diceResult + 4) % 6) + 1,
      diceResult,
    ];
    let step = 0;
    setDisplayFace(tumbleFaces[0]);
    const faceTimer = setInterval(() => {
      step += 1;
      if (step >= tumbleFaces.length) {
        clearInterval(faceTimer);
        setDisplayFace(diceResult);
        return;
      }
      setDisplayFace(tumbleFaces[step]);
    }, 85);

    rotation.value = 0;
    scale.value = 1;
    translateY.value = -92;
    rotation.value = withTiming(360, {
      duration: 480,
      easing: Easing.out(Easing.cubic),
    });
    translateY.value = withSpring(0, { damping: 7, stiffness: 145 });
    scale.value = withSequence(
      withTiming(1.18, { duration: 150, easing: Easing.out(Easing.quad) }),
      withSpring(1, { damping: 7, stiffness: 130 }),
    );

    return () => clearInterval(faceTimer);
  }, [diceResult, rollEventKey, reduceMotion, rotation, scale, translateY]);

  // Pulso sutil de respiração no dado quando é a sua vez
  useEffect(() => {
    if (!isMyTurn || reduceMotion) {
      cancelAnimation(pulse);
      pulse.value = 1;
      return;
    }
    pulse.value = withRepeat(
      withSequence(
        withTiming(1.06, { duration: 680, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 680, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      true,
    );
    return () => {
      cancelAnimation(pulse);
    };
  }, [isMyTurn, reduceMotion, pulse]);

  // Verifica se o jogador do turno atual está reconectando
  const reconnectingActor = useMemo(
    () =>
      currentPlayerId
        ? reconnectingPlayers.find((p) => p.playerId === currentPlayerId) ??
          null
        : null,
    [currentPlayerId, reconnectingPlayers],
  );

  useEffect(() => {
    if (!reconnectingActor?.reconnectDeadlineAt) {
      setReconnectSecondsLeft(null);
      return;
    }
    const deadline = reconnectingActor.reconnectDeadlineAt;
    const update = () => {
      setReconnectSecondsLeft(
        Math.max(0, Math.ceil((deadline - Date.now()) / 1000)),
      );
    };
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [reconnectingActor]);

  const pan = Gesture.Pan()
    .enabled(isMyTurn)
    .onUpdate((event) => {
      translateX.value = event.translationX;
      translateY.value = event.translationY;
    })
    .onEnd((event) => {
      if (event.translationY < -42) {
        runOnJS(onRollDice)();
      }
      translateX.value = reduceMotion ? 0 : withSpring(0);
      translateY.value = reduceMotion ? 0 : withSpring(0);
    });

  const diceAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { rotateZ: `${rotation.value}deg` },
      { scale: scale.value * pulse.value },
      { translateX: translateX.value },
      { translateY: translateY.value },
    ],
  }));

  const allKnownProfiles = useMemo(
    () => [...players, ...reconnectingPlayers],
    [players, reconnectingPlayers],
  );
  const playerIds = useMemo(
    () => allKnownProfiles.map((p) => p.playerId),
    [allKnownProfiles],
  );
  const formattedEvent = useMemo(
    () => formatTurnEvent(lastEvent, playerIds, ownPlayerId, allKnownProfiles),
    [lastEvent, playerIds, ownPlayerId, allKnownProfiles],
  );

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

  const roundProgress =
    typeof round === "number"
      ? Math.max(0, Math.min(100, (round / Math.max(1, maxRounds)) * 100))
      : 0;

  const activeName =
    currentPlayerName || reconnectingActor?.name || "outro jogador";

  return (
    <DuoCard
      palette={palette}
      variant={
        reconnectingActor ? "warning" : isMyTurn ? "highlight" : "default"
      }
      padding={16}
      style={isMyTurn ? { borderColor: palette.primaryBorder } : undefined}
    >
      <View style={styles.topRow}>
        <View style={styles.turnWrap}>
          <Text
            style={[
              styles.turnIndicator,
              { color: isMyTurn ? palette.primaryText : palette.textMain },
            ]}
          >
            {isMyTurn
              ? "🎯 SUA VEZ DE JOGAR!"
              : reconnectingActor
                ? `📡 ${reconnectingActor.name} desconectou (${reconnectSecondsLeft !== null ? `${reconnectSecondsLeft}s` : "aguardando"}...)`
                : status === "paused"
                  ? "🚧 Obstáculo ativo — Quiz coletivo"
                  : status === "finished"
                    ? "🏆 Partida concluída"
                    : `⏳ Turno de ${activeName}`}
          </Text>
        </View>
        {typeof round === "number" ? (
          <View style={styles.roundCluster}>
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
            <View
              style={[
                styles.roundBarTrack,
                { backgroundColor: palette.cardBorder },
              ]}
            >
              <View
                style={[
                  styles.roundBarFill,
                  {
                    width: `${roundProgress}%`,
                    backgroundColor: palette.secondary,
                  },
                ]}
              />
            </View>
          </View>
        ) : null}
      </View>

      <View style={styles.diceRow}>
        <GestureDetector gesture={pan}>
          <Animated.View
            accessible
            accessibilityLabel={
              diceResult !== null
                ? `Dado mostrando face ${diceResult}`
                : "Dado pronto para rolar"
            }
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
            <TactileDieFace
              value={displayFace}
              isMyTurn={isMyTurn}
              palette={palette}
            />
          </Animated.View>
        </GestureDetector>

        <View style={styles.actionSide}>
          {isMyTurn ? (
            <DuoButton
              title="Rolar o Dado"
              subtitle="Clique no botão ou arraste o dado para cima"
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
                reconnectingActor
                  ? `Aguardando reconexão de ${reconnectingActor.name}...`
                  : status === "paused"
                    ? "Quiz em andamento..."
                    : status === "finished"
                      ? "Partida encerrada"
                      : `Aguardando ${activeName}...`
              }
              subtitle={
                reconnectingActor && reconnectSecondsLeft !== null
                  ? `O turno avança automaticamente em ${reconnectSecondsLeft}s se não retornar`
                  : undefined
              }
              icon={reconnectingActor ? "📡" : "🎲"}
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
        <Animated.View
          key={rollEventKey}
          entering={reduceMotion ? undefined : FadeInDown.duration(260)}
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
        </Animated.View>
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
  turnWrap: {
    flexShrink: 1,
  },
  turnIndicator: {
    fontSize: 15,
    fontWeight: "900",
    letterSpacing: 0.2,
  },
  roundCluster: {
    alignItems: "flex-end",
    gap: 4,
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
  roundBarTrack: {
    width: 104,
    height: 6,
    borderRadius: 999,
    overflow: "hidden",
  },
  roundBarFill: {
    height: "100%",
    borderRadius: 999,
  },
  diceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    flexWrap: "wrap",
  },
  diceFace: {
    width: 80,
    height: 80,
    borderRadius: 20,
    borderWidth: 2.5,
    borderBottomWidth: 6,
    padding: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  dieEmptyInner: {
    alignItems: "center",
    justifyContent: "center",
  },
  dieEmptyIcon: {
    fontSize: 40,
  },
  pipGrid: {
    width: "100%",
    height: "100%",
    flexDirection: "row",
    flexWrap: "wrap",
  },
  pipCell: {
    width: "33.33%",
    height: "33.33%",
    alignItems: "center",
    justifyContent: "center",
  },
  pipDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
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
    paddingVertical: 9,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  eventIcon: {
    fontSize: 17,
  },
  eventText: {
    flex: 1,
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 17,
  },
});
