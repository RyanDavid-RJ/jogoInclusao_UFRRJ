// frontend/src/components/game/DicePanel.tsx
// Painel do dado animado do "Ludo Equidade (UFRRJ)".
// Compatível com React Compiler. Sem shadow* no StyleSheet.

import { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing,
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

  useEffect(() => {
    if (diceResult === null) {
      return;
    }
    rotation.value = 0;
    scale.value = 1;
    rotation.value = withTiming(360, {
      duration: 600,
      easing: Easing.out(Easing.cubic),
    });
    scale.value = withSequence(
      withTiming(1.2, { duration: 200, easing: Easing.out(Easing.quad) }),
      withSpring(1, { damping: 6, stiffness: 120 }),
    );
  }, [diceResult, rotation, scale]);

  const diceAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { rotateZ: `${rotation.value}deg` },
      { scale: scale.value },
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
      </View>

      {isMyTurn ? (
        <View style={styles.statusWrap}>
          <Text style={[styles.myTurnBadge, { color: palette.primary }]}>
            🎯 SUA VEZ DE JOGAR!
          </Text>
          <DuoButton
            title="Rolar dado"
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
