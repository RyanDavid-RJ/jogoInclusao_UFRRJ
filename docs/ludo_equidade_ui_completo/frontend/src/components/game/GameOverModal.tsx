// frontend/src/components/game/GameOverModal.tsx
// "A Virada da Equidade" — revelação final do "Ludo Equidade (UFRRJ)".
// Compatível com React Compiler. Sem shadow* no StyleSheet.

import { useMemo } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import Animated, { FadeInUp, SlideInDown } from "react-native-reanimated";

import {
  getAvatarMeta,
  getConditionMeta,
  getPlayerLabel,
  type GameOver,
  type PlayerProfile,
  type ThemePalette,
} from "../../constants/duoTheme";
import { AvatarMedallion, DuoButton, DuoCard } from "../ui/DuoComponents";

const FINISH_HOUSE = 20;

/* ------------------------------------------------------------------ */
/* Props                                                               */
/* ------------------------------------------------------------------ */

export interface GameOverModalProps {
  gameOver: GameOver;
  playerProfiles: PlayerProfile[];
  ownPlayerId: string;
  onBackToHome: () => void;
  palette: ThemePalette;
}

/* ------------------------------------------------------------------ */
/* Componente                                                          */
/* ------------------------------------------------------------------ */

export function GameOverModal({
  gameOver,
  playerProfiles,
  ownPlayerId,
  onBackToHome,
  palette,
}: GameOverModalProps) {
  const playerIds = useMemo(
    () => playerProfiles.map((profile) => profile.playerId),
    [playerProfiles]
  );

  const winnerNames = useMemo(
    () =>
      gameOver.winners.map((id) =>
        getPlayerLabel(id, playerIds, ownPlayerId, playerProfiles)
      ),
    [gameOver.winners, playerIds, ownPlayerId, playerProfiles]
  );

  const reveal = gameOver.reveal ?? [];

  return (
    <View style={styles.overlay}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.mainWrap}>
          <DuoCard palette={palette} variant="default" padding={20}>
            {/* BANNER DE CAMPEÃO */}
            <Animated.View
              entering={SlideInDown.springify()}
              style={[
                styles.championBanner,
                {
                  backgroundColor: palette.warningBg,
                  borderColor: palette.warningBorder,
                },
              ]}
            >
              <Text style={styles.championEmoji}>🏆</Text>
              <Text
                style={[styles.championTitle, { color: palette.textMain }]}
              >
                {winnerNames.length > 1
                  ? "Vencedores da Partida"
                  : "Vencedor da Partida"}
              </Text>
              <Text
                style={[styles.championNames, { color: palette.textMain }]}
                numberOfLines={3}
              >
                {winnerNames.length > 0
                  ? winnerNames.join(" • ")
                  : "Nenhum vencedor registrado"}
              </Text>
            </Animated.View>

            {/* SEÇÃO: A VIRADA DA EQUIDADE */}
            <Text
              style={[styles.sectionTitle, { color: palette.textMain }]}
            >
              A Virada da Equidade: Quem era quem?
            </Text>

            {reveal.length === 0 ? (
              <Text
                style={[styles.emptyText, { color: palette.textMuted }]}
              >
                Nenhum dado de revelação disponível.
              </Text>
            ) : (
              <View style={styles.revealList}>
                {reveal.map((item, index) => {
                  const avatarMeta = getAvatarMeta(item.avatarId);
                  const conditionMeta = getConditionMeta(item.condition);
                  const playerLabel = getPlayerLabel(
                    item.playerId,
                    playerIds,
                    ownPlayerId,
                    playerProfiles
                  );
                  const isOwn = item.playerId === ownPlayerId;
                  const summary = item.summary ?? conditionMeta.summary;

                  return (
                    <Animated.View
                      key={item.playerId}
                      entering={FadeInUp.delay(index * 150).springify()}
                      style={[
                        styles.revealItem,
                        {
                          backgroundColor: isOwn
                            ? `${palette.secondary}14`
                            : palette.surfaceAlt,
                          borderColor: isOwn
                            ? palette.secondaryBorder
                            : palette.cardBorder,
                        },
                      ]}
                    >
                      <View style={styles.revealHeader}>
                        <Text
                          style={[
                            styles.revealName,
                            { color: palette.textMain },
                          ]}
                          numberOfLines={1}
                        >
                          {playerLabel}
                        </Text>
                        {isOwn ? (
                          <View
                            style={[
                              styles.ownBadge,
                              {
                                backgroundColor: palette.secondary,
                                borderColor: palette.secondaryBorder,
                              },
                            ]}
                          >
                            <Text style={styles.ownBadgeText}>VOCÊ</Text>
                          </View>
                        ) : null}
                      </View>

                      <View style={styles.transformRow}>
                        <View style={styles.transformSide}>
                          <AvatarMedallion
                            avatarId={item.avatarId}
                            size="md"
                            palette={palette}
                          />
                          <Text
                            style={[
                              styles.transformLabel,
                              { color: avatarMeta.color },
                            ]}
                            numberOfLines={1}
                          >
                            {avatarMeta.label}
                          </Text>
                        </View>

                        <Text
                          style={[
                            styles.transformArrow,
                            { color: palette.purpleBorder },
                          ]}
                        >
                          ➔
                        </Text>

                        <View style={styles.transformSide}>
                          <View
                            style={[
                              styles.conditionCircle,
                              {
                                backgroundColor: conditionMeta.bgTint,
                                borderColor: conditionMeta.color,
                              },
                            ]}
                          >
                            <Text style={styles.conditionCircleIcon}>
                              {conditionMeta.personaIcon}
                            </Text>
                          </View>
                          <Text
                            style={[
                              styles.transformLabel,
                              { color: conditionMeta.color },
                            ]}
                            numberOfLines={2}
                          >
                            {conditionMeta.label}
                          </Text>
                        </View>
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
                          >
                            Pos: {item.position}/{FINISH_HOUSE}
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
                          >
                            ⭐ {item.quizPoints}
                          </Text>
                        </View>
                      </View>

                      <Text
                        style={[
                          styles.conditionSummary,
                          { color: palette.textMuted },
                        ]}
                      >
                        {summary}
                      </Text>
                    </Animated.View>
                  );
                })}
              </View>
            )}
          </DuoCard>

          {/* SEÇÃO DE REFLEXÃO */}
          <DuoCard palette={palette} variant="warning" padding={16}>
            <Text
              style={[styles.reflectionTitle, { color: palette.textMain }]}
            >
              💭 Momento de Reflexão
            </Text>
            <Text
              style={[styles.reflectionLine, { color: palette.textMain }]}
            >
              • Como a sorte nos dados influenciou o resultado?
            </Text>
            <Text
              style={[styles.reflectionLine, { color: palette.textMain }]}
            >
              • E os obstáculos encontrados pelo caminho?
            </Text>
            <Text
              style={[styles.reflectionLine, { color: palette.textMain }]}
            >
              • O desempenho nos quizzes explica tudo?
            </Text>
          </DuoCard>

          {/* RODAPÉ */}
          <DuoButton
            title="Criar Nova Sala"
            icon="➕"
            variant="primary"
            size="lg"
            fullWidth
            onPress={onBackToHome}
            palette={palette}
            accessibilityLabel="Criar nova sala e voltar ao início"
            accessibilityHint="Fecha a tela de fim de jogo e retorna à tela inicial"
          />
        </View>
      </ScrollView>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Estilos                                                             */
/* ------------------------------------------------------------------ */

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  mainWrap: {
    width: "100%",
    maxWidth: 600,
    gap: 14,
  },

  /* ---- Champion banner ---- */
  championBanner: {
    borderRadius: 16,
    borderWidth: 2,
    borderBottomWidth: 5,
    paddingVertical: 16,
    paddingHorizontal: 14,
    alignItems: "center",
    gap: 4,
    marginBottom: 16,
  },
  championEmoji: {
    fontSize: 40,
    lineHeight: 46,
  },
  championTitle: {
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: 0.4,
    textAlign: "center",
  },
  championNames: {
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: 0.3,
    textAlign: "center",
    lineHeight: 21,
  },

  /* ---- Section title ---- */
  sectionTitle: {
    fontSize: 15,
    fontWeight: "900",
    letterSpacing: 0.3,
    marginBottom: 10,
  },
  emptyText: {
    fontSize: 12,
    fontWeight: "700",
    textAlign: "center",
    paddingVertical: 8,
  },

  /* ---- Reveal list ---- */
  revealList: {
    gap: 12,
  },
  revealItem: {
    borderRadius: 14,
    borderWidth: 2,
    borderBottomWidth: 4,
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 10,
  },
  revealHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  revealName: {
    flex: 1,
    fontSize: 14,
    fontWeight: "900",
    letterSpacing: 0.2,
  },
  ownBadge: {
    borderRadius: 999,
    borderWidth: 2,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  ownBadgeText: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.6,
    color: "#FFFFFF",
  },
  transformRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingVertical: 6,
  },
  transformSide: {
    flex: 1,
    alignItems: "center",
    gap: 6,
  },
  transformArrow: {
    fontSize: 28,
    lineHeight: 32,
    fontWeight: "900",
  },
  transformLabel: {
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.2,
    textAlign: "center",
  },
  conditionCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderBottomWidth: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  conditionCircleIcon: {
    fontSize: 30,
  },

  /* ---- Chips ---- */
  chipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 6,
  },
  chip: {
    borderRadius: 999,
    borderWidth: 2,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  chipText: {
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.3,
  },
  conditionSummary: {
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 18,
    textAlign: "center",
  },

  /* ---- Reflection ---- */
  reflectionTitle: {
    fontSize: 15,
    fontWeight: "900",
    letterSpacing: 0.3,
    marginBottom: 8,
  },
  reflectionLine: {
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 19,
    marginBottom: 4,
  },
});
