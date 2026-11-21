// frontend/src/components/lobby/SplashView.tsx
// Tela de carregamento institucional do "Ludo Equidade (ICE • UFRRJ)".

import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import Animated, {
  FadeIn,
  SlideInDown,
  useReducedMotion,
} from "react-native-reanimated";

import type { ThemePalette } from "../../constants/duoTheme";

export interface SplashViewProps {
  palette: ThemePalette;
  connectionWaitTime: number;
}

export function SplashView({ palette, connectionWaitTime }: SplashViewProps) {
  const reduceMotion = useReducedMotion();
  const showSlowServerNotice = connectionWaitTime > 3;

  return (
    <Animated.View
      style={[styles.container, { backgroundColor: palette.background }]}
    >
      <Animated.View
        entering={reduceMotion ? undefined : FadeIn.duration(500)}
        style={styles.logoWrap}
      >
        <View
          style={[
            styles.instPill,
            {
              backgroundColor: palette.secondaryBg,
              borderColor: palette.secondaryBorder,
            },
          ]}
        >
          <Text
            style={[
              styles.instText,
              { color: palette.isDark ? "#7DD3FC" : palette.secondaryBorder },
            ]}
          >
            INSTITUTO DE CIÊNCIAS EXATAS • UFRRJ
          </Text>
        </View>

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
          Carregando motor multiplayer e acessibilidade...
        </Text>
      </Animated.View>

      <View style={styles.spinnerWrap}>
        <ActivityIndicator size="large" color={palette.primary} />
      </View>

      {showSlowServerNotice ? (
        <Animated.View
          entering={reduceMotion ? undefined : SlideInDown.duration(350)}
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
            segundos na primeira conexão. Aguarde ☕
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
    gap: 20,
  },
  logoWrap: {
    alignItems: "center",
    gap: 10,
  },
  instPill: {
    borderRadius: 999,
    borderWidth: 2,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  instText: {
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.6,
  },
  logoBadge: {
    borderRadius: 20,
    borderWidth: 2,
    borderBottomWidth: 6,
    paddingHorizontal: 24,
    paddingVertical: 14,
  },
  title: {
    fontSize: 24,
    fontWeight: "900",
    letterSpacing: 0.6,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 0.2,
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
