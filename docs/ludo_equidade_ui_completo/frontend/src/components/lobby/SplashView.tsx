// frontend/src/components/lobby/SplashView.tsx
// Tela de carregamento puramente visual do "Ludo Equidade (UFRRJ)".
// Compatível com React Compiler. Sem shadow* no StyleSheet.

import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import Animated, { FadeIn, SlideInDown } from "react-native-reanimated";

import type { ThemePalette } from "../../constants/duoTheme";

export interface SplashViewProps {
  palette: ThemePalette;
  connectionWaitTime: number;
}

export function SplashView({ palette, connectionWaitTime }: SplashViewProps) {
  const showSlowServerNotice = connectionWaitTime > 3;

  return (
    <Animated.View
      style={[styles.container, { backgroundColor: palette.background }]}
    >
      <Animated.View
        entering={FadeIn.duration(600)}
        style={styles.logoWrap}
      >
        <View
          style={[
            styles.logoBadge,
            {
              backgroundColor: palette.cardBg,
              borderColor: palette.cardBorder,
            },
          ]}
        >
          <Text style={[styles.title, { color: palette.textMain }]}>
            🎲 LUDO EQUIDADE
          </Text>
        </View>
        <Text style={[styles.subtitle, { color: palette.textMuted }]}>
          Carregando motor do jogo...
        </Text>
      </Animated.View>

      <View style={styles.spinnerWrap}>
        <ActivityIndicator size="large" color={palette.primary} />
      </View>

      {showSlowServerNotice ? (
        <Animated.View
          entering={SlideInDown.duration(400)}
          style={[
            styles.slowCard,
            {
              backgroundColor: palette.warningBg,
              borderColor: palette.warningBorder,
            },
          ]}
        >
          <Text style={[styles.slowText, { color: palette.textMain }]}>
            Acordando o servidor gratuito no Render... Isso pode levar até 40
            segundos. Aguarde ☕
          </Text>
        </Animated.View>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
    gap: 24,
  },
  logoWrap: {
    alignItems: "center",
    gap: 10,
  },
  logoBadge: {
    borderRadius: 18,
    borderWidth: 2,
    borderBottomWidth: 5,
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  title: {
    fontSize: 22,
    fontWeight: "900",
    letterSpacing: 0.6,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 0.3,
    textAlign: "center",
  },
  spinnerWrap: {
    marginTop: 4,
    marginBottom: 4,
  },
  slowCard: {
    maxWidth: 420,
    borderRadius: 16,
    borderWidth: 2,
    borderBottomWidth: 4,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  slowText: {
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 19,
    textAlign: "center",
  },
});
