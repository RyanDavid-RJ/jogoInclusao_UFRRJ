// frontend/src/components/ui/HowToPlayModal.tsx
// Guia rápido interativo + referência da dinâmica pedagógica do Ludo Equidade (ICE • UFRRJ).

import { useEffect } from "react";
import { Platform, ScrollView, StyleSheet, Text, View } from "react-native";

import {
  ALL_CONDITIONS,
  OBSTACLE_META,
  getConditionMeta,
  type ThemePalette,
} from "../../constants/duoTheme";
import { DuoButton, DuoCard, InfoPill } from "./DuoComponents";

export interface HowToPlayModalProps {
  visible: boolean;
  onClose: () => void;
  palette: ThemePalette;
}

const RULES_ITEMS = [
  {
    icon: "🎭",
    title: "1. Papel Secreto de Acessibilidade",
    body: "Ao iniciar (4 a 8 jogadores), cada participante recebe uma perspectiva privada. Ninguém vê o papel dos demais até o final.",
  },
  {
    icon: "🎲",
    title: "2. Corrida no Tabuleiro (Casas 0 a 30)",
    body: "Na sua vez, role o dado (1 a 6) clicando no botão ou arrastando o dado para cima. Casas de Impulso (5, 10, 15, 20 e 25) concedem +2 casas extras!",
  },
  {
    icon: "🚧",
    title: "3. Obstáculos e Quiz Simultâneo",
    body: "Ao parar em um obstáculo (7, 14, 21 ou 28), todos respondem ao quiz simultaneamente. A dificuldade estrutural (N1, N2 ou N3) reflete a interação entre a barreira e cada papel.",
  },
  {
    icon: "⚡",
    title: "4. Avanço por Equidade (+1 Casa)",
    body: "O primeiro jogador a acertar o quiz ganha pontuação máxima na rodada e avança +1 casa no tabuleiro (sem ativar outro obstáculo).",
  },
  {
    icon: "🏆",
    title: "5. Pódio Duplo e Virada da Equidade",
    body: "A partida encerra quando alguém chega à casa 30 ou ao fim das rodadas (6 ou 8). Celebramos Vencedor da Corrida e Destaque do Quiz, revelando papéis e métricas para o debate.",
  },
];

export function HowToPlayModal({
  visible,
  onClose,
  palette,
}: HowToPlayModalProps) {
  useEffect(() => {
    if (!visible || Platform.OS !== "web" || typeof window === "undefined") {
      return;
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [visible, onClose]);

  if (!visible) {
    return null;
  }

  return (
    <View style={styles.overlay} accessibilityViewIsModal>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.wrap}>
          <DuoCard palette={palette} padding={20}>
            <View style={styles.headerRow}>
              <View style={styles.headerText}>
                <InfoPill text="🎓 ICE • UFRRJ" tone="secondary" palette={palette} />
                <Text style={[styles.title, { color: palette.textMain }]}>
                  Guia Rápido — Ludo Equidade
                </Text>
              </View>
              <DuoButton
                title="Fechar"
                icon="✕"
                variant="ghost"
                size="sm"
                fullWidth={false}
                onPress={onClose}
                palette={palette}
              />
            </View>

            <View style={styles.list}>
              {RULES_ITEMS.map((item) => (
                <View
                  key={item.title}
                  style={[
                    styles.ruleCard,
                    {
                      backgroundColor: palette.surfaceAlt,
                      borderColor: palette.cardBorder,
                    },
                  ]}
                >
                  <Text style={styles.ruleIcon}>{item.icon}</Text>
                  <View style={styles.ruleContent}>
                    <Text style={[styles.ruleTitle, { color: palette.textMain }]}>
                      {item.title}
                    </Text>
                    <Text style={[styles.ruleBody, { color: palette.textMuted }]}>
                      {item.body}
                    </Text>
                  </View>
                </View>
              ))}
            </View>

            <Text style={[styles.sectionTitle, { color: palette.textMain }]}>
              🚧 Os 4 Obstáculos do Tabuleiro
            </Text>
            <View style={styles.gridRow}>
              {Object.entries(OBSTACLE_META).map(([house, meta]) => (
                <View
                  key={house}
                  style={[
                    styles.miniCard,
                    {
                      backgroundColor: palette.warningBg,
                      borderColor: palette.warningBorder,
                    },
                  ]}
                >
                  <Text style={styles.miniIcon}>{meta.icon}</Text>
                  <Text style={[styles.miniTitle, { color: palette.textMain }]}>
                    Casa {house} · {meta.title}
                  </Text>
                  <Text style={[styles.miniSub, { color: palette.textMuted }]}>
                    {meta.domain}: {meta.description}
                  </Text>
                </View>
              ))}
            </View>

            <Text style={[styles.sectionTitle, { color: palette.textMain }]}>
              🎭 As 4 Perspectivas Vivenciadas
            </Text>
            <View style={styles.gridRow}>
              {ALL_CONDITIONS.map((cond) => {
                const meta = getConditionMeta(cond);
                return (
                  <View
                    key={cond}
                    style={[
                      styles.miniCard,
                      {
                        backgroundColor: palette.isDark
                          ? meta.darkBgTint
                          : meta.bgTint,
                        borderColor: meta.color,
                      },
                    ]}
                  >
                    <Text style={styles.miniIcon}>{meta.personaIcon}</Text>
                    <Text style={[styles.miniTitle, { color: meta.color }]}>
                      {meta.label}
                    </Text>
                    <Text style={[styles.miniSub, { color: palette.textMain }]}>
                      {meta.summary}
                    </Text>
                  </View>
                );
              })}
            </View>

            <View style={styles.footer}>
              <DuoButton
                title="Entendi — Voltar"
                icon="✅"
                variant="primary"
                size="md"
                onPress={onClose}
                palette={palette}
              />
            </View>
          </DuoCard>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(15, 23, 42, 0.72)",
    zIndex: 50,
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  wrap: {
    width: "100%",
    maxWidth: 680,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 14,
  },
  headerText: {
    flex: 1,
    alignItems: "flex-start",
    gap: 6,
  },
  title: {
    fontSize: 20,
    fontWeight: "900",
  },
  list: {
    gap: 8,
    marginBottom: 16,
  },
  ruleCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    borderRadius: 14,
    borderWidth: 2,
    padding: 10,
  },
  ruleIcon: {
    fontSize: 20,
    marginTop: 1,
  },
  ruleContent: {
    flex: 1,
    gap: 2,
  },
  ruleTitle: {
    fontSize: 13,
    fontWeight: "900",
  },
  ruleBody: {
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 17,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "900",
    marginTop: 6,
    marginBottom: 8,
  },
  gridRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
  },
  miniCard: {
    flexGrow: 1,
    flexBasis: 240,
    borderRadius: 14,
    borderWidth: 2,
    padding: 10,
    gap: 3,
  },
  miniIcon: {
    fontSize: 18,
  },
  miniTitle: {
    fontSize: 12,
    fontWeight: "900",
  },
  miniSub: {
    fontSize: 11,
    fontWeight: "700",
    lineHeight: 16,
  },
  footer: {
    marginTop: 8,
  },
});
