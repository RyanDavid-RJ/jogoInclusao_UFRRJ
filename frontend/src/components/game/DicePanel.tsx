// frontend/src/components/game/DicePanel.tsx
// Painel do dado animado do "Ludo Equidade (UFRRJ)".
// Compatível com React Compiler. Sem shadow* no StyleSheet.

import { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";

import { DICE_FACES, type ThemePalette } from "../../constants/duoTheme";
import { DuoButton, DuoCard } from "../ui/DuoComponents";

export interface DicePanelProps {
  diceResult: number | null;
  isMyTurn: boolean;
  currentPlayerName: string;
  onRollDice: () => void;
  palette: ThemePalette;
}

export function DicePanel({
  diceResult,
  isMyTurn,
  currentPlayerName,
  onRollDice,
  palette,
}: DicePanelProps) {
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
    translateY.value = -300;
    rotation.value = withTiming(360, {
      duration: 600,
      easing: Easing.out(Easing.cubic),
    });
    translateY.value = withSpring(0, { damping: 5, stiffness: 100 });
    scale.value = withSequence(
      withTiming(1.2, { duration: 200, easing: Easing.out(Easing.quad) }),
      withSpring(1, { damping: 6, stiffness: 120 }),
    );
  }, [diceResult, rotation, scale, translateY]);

  const pan = Gesture.Pan()
    .enabled(isMyTurn)
    .onUpdate((event) => {
      translateX.value = event.translationX;
      translateY.value = event.translationY;
    })
    .onEnd((event) => {
      if (event.translationY < -50) {
        runOnJS(onRollDice)();
      }
      translateX.value = withSpring(0);
      translateY.value = withSpring(0);
    });

  const diceAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { rotateZ: `${rotation.value}deg` },
      { scale: scale.value },
      { translateX: translateX.value },
      { translateY: translateY.value },
    ],
  }));

  const face =
    diceResult !== null ? DICE_FACES[diceResult] || "🎲" : "🎲";

  const cardStyle = isMyTurn
    ? { borderColor: palette.primaryBorder }
    : undefined;

  return (
    <DuoCard
      palette={palette}
      variant={isMyTurn ? "highlight" : "default"}
      padding={18}
      style={cardStyle}
    >
      <View style={styles.diceCenter}>
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
      </View>

      {isMyTurn ? (
        <View style={styles.statusWrap}>
          <Text style={[styles.myTurnBadge, { color: palette.primary }]}>
            🎯 SUA VEZ DE JOGAR!
          </Text>
          <DuoButton
            title="Arraste o dado para cima para jogar!"
            icon="🎲"
            variant="primary"
            size="lg"
            fullWidth
            onPress={onRollDice}
            palette={palette}
            accessibilityLabel="Rolar o dado"
            accessibilityHint="Rola o dado para avançar no tabuleiro"
          />
        </View>
      ) : (
        <View style={styles.statusWrap}>
          <Text
            style={[styles.waitingText, { color: palette.textMuted }]}
            numberOfLines={2}
          >
            ⏳ Aguardando o turno de {currentPlayerName}...
          </Text>
          <DuoButton
            title="Rolar dado"
            icon="🎲"
            variant="ghost"
            size="lg"
            fullWidth
            disabled
            palette={palette}
            accessibilityLabel="Aguardando seu turno para rolar o dado"
          />
        </View>
      )}
    </DuoCard>
  );
}

const styles = StyleSheet.create({
  diceCenter: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
  },
  diceFace: {
    width: 96,
    height: 96,
    borderRadius: 22,
    borderWidth: 2,
    borderBottomWidth: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  diceEmoji: {
    fontSize: 60,
    lineHeight: 68,
    textAlign: "center",
  },
  statusWrap: {
    marginTop: 12,
    gap: 10,
    alignItems: "center",
  },
  myTurnBadge: {
    fontSize: 14,
    fontWeight: "900",
    letterSpacing: 0.5,
    textAlign: "center",
  },
  waitingText: {
    fontSize: 13,
    fontWeight: "700",
    textAlign: "center",
    lineHeight: 18,
  },
});
