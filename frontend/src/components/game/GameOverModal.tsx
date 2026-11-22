// frontend/src/components/game/GameOverModal.tsx
// "A Virada da Equidade" v2.0 — Pódio Duplo (Corrida + Destaque do Quiz),
// indicadores observados e revanche instantânea com rotação de papéis.

import { useEffect, useMemo } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import Animated, {
  FadeInUp,
  SlideInDown,
  useReducedMotion,
} from "react-native-reanimated";

import {
  getAvatarMeta,
  getConditionMeta,
  getPlayerLabel,
  type GameOver,
  type PlayerProfile,
  type ThemePalette,
} from "../../constants/duoTheme";
import { playSound } from "../../utils/soundEffects";
import {
  AvatarMedallion,
  DuoButton,
  DuoCard,
  InfoPill,
} from "../ui/DuoComponents";

const FINISH_HOUSE = 30;

export interface GameOverModalProps {
  gameOver: GameOver;
  playerProfiles: PlayerProfile[];
  ownPlayerId: string;
  hostId: string;
  onPlayAgain: () => void;
  onBackToHome: () => void;
  palette: ThemePalette;
}

export function GameOverModal({
  gameOver,
  playerProfiles,
  ownPlayerId,
  hostId,
  onPlayAgain,
  onBackToHome,
  palette,
}: GameOverModalProps) {
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    playSound("victory");
  }, []);
  const playerIds = useMemo(
    () => playerProfiles.map((profile) => profile.playerId),
    [playerProfiles],
  );

  const winnerNames = useMemo(
    () =>
      gameOver.winners.map((id) =>
        getPlayerLabel(id, playerIds, ownPlayerId, playerProfiles),
      ),
    [gameOver.winners, playerIds, ownPlayerId, playerProfiles],
  );

  const quizHighlightNames = useMemo(
    () =>
      (gameOver.quizHighlights ?? []).map((id) =>
        getPlayerLabel(id, playerIds, ownPlayerId, playerProfiles),
      ),
    [gameOver.quizHighlights, playerIds, ownPlayerId, playerProfiles],
  );

  const reveal = useMemo(() => gameOver.reveal ?? [], [gameOver.reveal]);

  const groupMetrics = useMemo(() => {
    let totalBonuses = 0;
    let totalObstacles = 0;
    let totalAnswered = 0;
    let totalCorrect = 0;
    let totalQuizBonusMoves = 0;
    let hasStats = false;

    for (const item of reveal) {
      if (!item.stats) continue;
      hasStats = true;
      totalBonuses += item.stats.bonusTriggered;
      totalObstacles += item.stats.obstaclesTriggered;
      totalAnswered += item.stats.quizAnswered;
      totalCorrect += item.stats.quizCorrect;
      totalQuizBonusMoves += item.stats.quizBonusMoves ?? 0;
    }

    return {
      hasStats,
      totalBonuses,
      totalObstacles,
      totalAnswered,
      totalCorrect,
      totalQuizBonusMoves,
    };
  }, [reveal]);

  const isHost = ownPlayerId === hostId;
  const isAbandoned = gameOver.reason === "abandoned";
  const canRematch = isHost && !isAbandoned && playerProfiles.length >= 4;

  const CONFETTI_DOTS = [
    "#58CC02",
    "#1CB0F6",
    "#FFC800",
    "#A559D9",
    "#FF4B4B",
    "#00CD9C",
    "#FF9600",
    "#1CB0F6",
    "#58CC02",
    "#FFC800",
  ];

  return (
    <View style={styles.overlay} accessibilityViewIsModal>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.mainWrap}>
          <DuoCard palette={palette} variant="default" padding={20}>
            {!isAbandoned ? (
              <Animated.View
                entering={reduceMotion ? undefined : SlideInDown.duration(360)}
                style={styles.confettiRibbon}
                accessibilityElementsHidden
                importantForAccessibility="no-hide-descendants"
              >
                {CONFETTI_DOTS.map((color, idx) => (
                  <View
                    key={`conf-${idx}`}
                    style={[
                      styles.confettiDot,
                      {
                        backgroundColor: color,
                        marginTop: idx % 2 === 0 ? 0 : 6,
                      },
                    ]}
                  />
                ))}
              </Animated.View>
            ) : null}

            {/* PÓDIO DUPLO (OU ENCERRAMENTO POR ABANDONO) */}
            <Animated.View
              entering={reduceMotion ? undefined : SlideInDown.springify()}
              style={styles.podiumRow}
            >
              <View
                style={[
                  styles.podiumCard,
                  {
                    backgroundColor: isAbandoned
                      ? palette.surfaceAlt
                      : palette.warningBg,
                    borderColor: isAbandoned
                      ? palette.cardBorder
                      : palette.warningBorder,
                  },
                ]}
              >
                <Text style={styles.podiumEmoji}>
                  {isAbandoned ? "🚪" : "🏆"}
                </Text>
                <Text
                  style={[styles.podiumTitle, { color: palette.textMain }]}
                >
                  {isAbandoned
                    ? "Partida Encerrada"
                    : winnerNames.length > 1
                      ? "Vencedores da Corrida"
                      : "Vencedor da Corrida"}
                </Text>
                <Text
                  style={[styles.podiumNames, { color: palette.textMain }]}
                  numberOfLines={3}
                >
                  {isAbandoned
                    ? "Os demais participantes saíram da sala"
                    : winnerNames.length > 0
                      ? winnerNames.join(" • ")
                      : "Nenhum vencedor registrado"}
                </Text>
                <Text style={[styles.podiumMeta, { color: palette.textMuted }]}>
                  {isAbandoned
                    ? "Esta partida foi encerrada automaticamente para que você não fique sozinho."
                    : gameOver.reason === "finish"
                      ? "Chegou à casa 30"
                      : "Critério de desempate ao final das rodadas"}
                </Text>
              </View>

              {!isAbandoned && quizHighlightNames.length > 0 ? (
                <View
                  style={[
                    styles.podiumCard,
                    {
                      backgroundColor: palette.purpleBg,
                      borderColor: palette.purpleBorder,
                    },
                  ]}
                >
                  <Text style={styles.podiumEmoji}>⭐</Text>
                  <Text
                    style={[styles.podiumTitle, { color: palette.textMain }]}
                  >
                    Destaque do Quiz
                  </Text>
                  <Text
                    style={[styles.podiumNames, { color: palette.textMain }]}
                    numberOfLines={3}
                  >
                    {quizHighlightNames.join(" • ")}
                  </Text>
                  <Text style={[styles.podiumMeta, { color: palette.textMuted }]}>
                    Maior pontuação acumulada nos desafios
                  </Text>
                </View>
              ) : null}
            </Animated.View>

            {/* SEÇÃO: A VIRADA DA EQUIDADE */}
            <Text style={[styles.sectionTitle, { color: palette.textMain }]}>
              🎭 A Virada da Equidade: Quem era quem?
            </Text>

            {reveal.length === 0 ? (
              <Text style={[styles.emptyText, { color: palette.textMuted }]}>
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
                    playerProfiles,
                  );
                  const isOwn = item.playerId === ownPlayerId;
                  const isWinner = gameOver.winners.includes(item.playerId);
                  const summary = item.summary ?? conditionMeta.summary;

                  return (
                    <Animated.View
                      key={item.playerId}
                      entering={
                        reduceMotion
                          ? undefined
                          : FadeInUp.delay(index * 120).springify()
                      }
                      style={[
                        styles.revealItem,
                        {
                          backgroundColor: isOwn
                            ? palette.secondaryBg
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
                        <View style={styles.badgesWrap}>
                          {item.disconnected ? (
                            <InfoPill
                              text="📡 Saiu da sala"
                              tone="danger"
                              palette={palette}
                            />
                          ) : null}
                          {!isAbandoned && isWinner ? (
                            <InfoPill
                              text="🏆 Corrida"
                              tone="warning"
                              palette={palette}
                            />
                          ) : null}
                          {item.destaqueQuiz ? (
                            <InfoPill
                              text="⭐ Destaque Quiz"
                              tone="purple"
                              palette={palette}
                            />
                          ) : null}
                          {isOwn ? (
                            <InfoPill
                              text="VOCÊ"
                              tone="secondary"
                              palette={palette}
                            />
                          ) : null}
                        </View>
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
                                backgroundColor: palette.isDark
                                  ? conditionMeta.darkBgTint
                                  : conditionMeta.bgTint,
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
                        <InfoPill
                          text={`Casa ${item.position}/${FINISH_HOUSE}`}
                          tone="neutral"
                          palette={palette}
                        />
                        <InfoPill
                          text={`⭐ ${item.quizPoints} pts`}
                          tone="warning"
                          palette={palette}
                        />
                      </View>

                      <View
                        style={[
                          styles.revealProgressTrack,
                          { backgroundColor: palette.cardBorder },
                        ]}
                      >
                        <View
                          style={[
                            styles.revealProgressFill,
                            {
                              width: `${Math.min(100, Math.max(0, (item.position / FINISH_HOUSE) * 100))}%`,
                              backgroundColor: conditionMeta.color,
                            },
                          ]}
                        />
                      </View>

                      {item.stats ? (
                        <View style={styles.metricsRow}>
                          {item.stats.diceRolls > 0 ? (
                            <View
                              style={[
                                styles.metricChip,
                                {
                                  backgroundColor: palette.cardBg,
                                  borderColor: palette.cardBorder,
                                },
                              ]}
                            >
                              <Text
                                style={[
                                  styles.metricText,
                                  { color: palette.textMuted },
                                ]}
                              >
                                🎲 Média{" "}
                                {(item.stats.diceTotal / item.stats.diceRolls)
                                  .toFixed(1)
                                  .replace(".", ",")}{" "}
                                ({item.stats.diceRolls}x)
                              </Text>
                            </View>
                          ) : null}
                          {item.stats.bonusTriggered > 0 ? (
                            <View
                              style={[
                                styles.metricChip,
                                {
                                  backgroundColor: palette.cardBg,
                                  borderColor: palette.primaryBorder,
                                },
                              ]}
                            >
                              <Text
                                style={[
                                  styles.metricText,
                                  { color: palette.textMain },
                                ]}
                              >
                                🚀 Impulsos: {item.stats.bonusTriggered}
                              </Text>
                            </View>
                          ) : null}
                          {(item.stats.quizBonusMoves ?? 0) > 0 ? (
                            <View
                              style={[
                                styles.metricChip,
                                {
                                  backgroundColor: palette.purpleBg,
                                  borderColor: palette.purpleBorder,
                                },
                              ]}
                            >
                              <Text
                                style={[
                                  styles.metricText,
                                  { color: palette.textMain },
                                ]}
                              >
                                ⚡ +{item.stats.quizBonusMoves} casa(s) quiz
                              </Text>
                            </View>
                          ) : null}
                          {item.stats.quizLevels[1] +
                            item.stats.quizLevels[2] +
                            item.stats.quizLevels[3] >
                          0 ? (
                            <>
                              <View
                                style={[
                                  styles.metricChip,
                                  {
                                    backgroundColor: palette.cardBg,
                                    borderColor: palette.cardBorder,
                                  },
                                ]}
                              >
                                <Text
                                  style={[
                                    styles.metricText,
                                    { color: palette.textMain },
                                  ]}
                                >
                                  📝 Acertos: {item.stats.quizCorrect}/
                                  {item.stats.quizLevels[1] +
                                    item.stats.quizLevels[2] +
                                    item.stats.quizLevels[3]}
                                </Text>
                              </View>
                              <View
                                style={[
                                  styles.metricChip,
                                  {
                                    backgroundColor: palette.cardBg,
                                    borderColor: palette.purpleBorder,
                                  },
                                ]}
                              >
                                <Text
                                  style={[
                                    styles.metricText,
                                    { color: palette.textMain },
                                  ]}
                                >
                                  📊 N1:{item.stats.quizLevels[1]} · N2:
                                  {item.stats.quizLevels[2]} · N3:
                                  {item.stats.quizLevels[3]}
                                </Text>
                              </View>
                            </>
                          ) : null}
                        </View>
                      ) : null}

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
            <Text style={[styles.reflectionTitle, { color: palette.textMain }]}>
              💭 Momento de Reflexão (Debate em Grupo)
            </Text>
            {groupMetrics.hasStats ? (
              <Text
                style={[styles.reflectionSummary, { color: palette.textMain }]}
              >
                Nesta partida: {groupMetrics.totalObstacles} obstáculo(s) ·{" "}
                {groupMetrics.totalBonuses} impulso(s) ·{" "}
                {groupMetrics.totalQuizBonusMoves} avanço(s) por equidade ·{" "}
                {groupMetrics.totalCorrect}/{groupMetrics.totalAnswered} acertos
                nos quizzes.
              </Text>
            ) : null}
            <Text style={[styles.reflectionLine, { color: palette.textMain }]}>
              • Como a sorte nos dados, os impulsos e o avanço +1 do quiz
              influenciaram a corrida?
            </Text>
            <Text style={[styles.reflectionLine, { color: palette.textMain }]}>
              • Os níveis estruturais (N1–N3) diante dos mesmos obstáculos
              pesaram de forma diferente para cada papel?
            </Text>
            <Text style={[styles.reflectionLine, { color: palette.textMain }]}>
              • O desempenho individual explica tudo, ou equidade depende também
              de remover barreiras ambientais?
            </Text>
            <Text
              style={[
                styles.reflectionDisclaimer,
                { color: palette.textMuted },
              ]}
            >
              Nota pedagógica: estes indicadores resumem apenas fatos observados
              nesta partida, sem provar causalidade nem representar de forma
              universal a experiência de pessoas reais.
            </Text>
          </DuoCard>

          {/* RODAPÉ: REVANCHE INSTANTÂNEA + VOLTAR */}
          <View style={styles.footerActions}>
            {canRematch ? (
              <DuoButton
                title="Jogar Novamente (Novos Papéis)"
                subtitle="Mantém a sala e sorteia perspectivas diferentes para todos"
                icon="🔄"
                variant="primary"
                size="lg"
                fullWidth
                onPress={onPlayAgain}
                palette={palette}
                accessibilityLabel="Iniciar nova partida na mesma sala com rotação de papéis"
              />
            ) : !isHost ? (
              <View
                style={[
                  styles.waitRematchBox,
                  {
                    backgroundColor: palette.cardBg,
                    borderColor: palette.cardBorder,
                  },
                ]}
              >
                <Text
                  style={[styles.waitRematchText, { color: palette.textMuted }]}
                >
                  💡 O anfitrião pode iniciar uma revanche instantânea com novos
                  papéis nesta mesma sala.
                </Text>
              </View>
            ) : null}

            <DuoButton
              title="Voltar ao Início"
              icon="🏠"
              variant={canRematch ? "ghost" : "primary"}
              size="md"
              fullWidth
              onPress={onBackToHome}
              palette={palette}
              accessibilityLabel="Voltar à tela inicial"
            />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(15, 23, 42, 0.72)",
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  mainWrap: {
    width: "100%",
    maxWidth: 640,
    gap: 14,
  },
  confettiRibbon: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 14,
    marginBottom: 10,
  },
  confettiDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  revealProgressTrack: {
    height: 8,
    borderRadius: 999,
    overflow: "hidden",
  },
  revealProgressFill: {
    height: "100%",
    borderRadius: 999,
  },
  podiumRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 16,
  },
  podiumCard: {
    flexGrow: 1,
    flexBasis: 220,
    borderRadius: 16,
    borderWidth: 2,
    borderBottomWidth: 5,
    paddingVertical: 14,
    paddingHorizontal: 14,
    alignItems: "center",
    gap: 4,
  },
  podiumEmoji: {
    fontSize: 34,
    lineHeight: 40,
  },
  podiumTitle: {
    fontSize: 15,
    fontWeight: "900",
    textAlign: "center",
  },
  podiumNames: {
    fontSize: 15,
    fontWeight: "800",
    textAlign: "center",
    lineHeight: 20,
  },
  podiumMeta: {
    fontSize: 11,
    fontWeight: "700",
    textAlign: "center",
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "900",
    marginBottom: 10,
  },
  emptyText: {
    fontSize: 12,
    fontWeight: "700",
    textAlign: "center",
    paddingVertical: 8,
  },
  revealList: {
    gap: 12,
  },
  revealItem: {
    borderRadius: 16,
    borderWidth: 2,
    borderBottomWidth: 4,
    padding: 12,
    gap: 10,
  },
  revealHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 6,
  },
  revealName: {
    fontSize: 14,
    fontWeight: "900",
  },
  badgesWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 5,
  },
  transformRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingVertical: 4,
  },
  transformSide: {
    flex: 1,
    alignItems: "center",
    gap: 6,
  },
  transformArrow: {
    fontSize: 26,
    lineHeight: 30,
    fontWeight: "900",
  },
  transformLabel: {
    fontSize: 11,
    fontWeight: "900",
    textAlign: "center",
  },
  conditionCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderBottomWidth: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  conditionCircleIcon: {
    fontSize: 28,
  },
  chipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 6,
  },
  metricsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 6,
  },
  metricChip: {
    borderRadius: 10,
    borderWidth: 1.5,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  metricText: {
    fontSize: 11,
    fontWeight: "800",
  },
  conditionSummary: {
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 17,
    textAlign: "center",
  },
  reflectionTitle: {
    fontSize: 15,
    fontWeight: "900",
    marginBottom: 8,
  },
  reflectionSummary: {
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 18,
    marginBottom: 8,
  },
  reflectionLine: {
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 19,
    marginBottom: 4,
  },
  reflectionDisclaimer: {
    fontSize: 11,
    fontWeight: "700",
    lineHeight: 16,
    marginTop: 8,
  },
  footerActions: {
    gap: 10,
  },
  waitRematchBox: {
    borderRadius: 14,
    borderWidth: 2,
    padding: 12,
  },
  waitRematchText: {
    fontSize: 12,
    fontWeight: "700",
    textAlign: "center",
    lineHeight: 18,
  },
});
