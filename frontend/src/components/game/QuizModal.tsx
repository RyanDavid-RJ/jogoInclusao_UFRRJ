// frontend/src/components/game/QuizModal.tsx
// Overlay de quiz/obstáculo v2.1 com cartões táteis de alternativa alinhados à esquerda,
// tempo dinâmico (30/45/60s), atalhos de teclado (A–D, Enter, Esc) e feedback +1 casa.

import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, {
  FadeInDown,
  FadeOutDown,
  useReducedMotion,
} from "react-native-reanimated";

import {
  OBSTACLE_META,
  QUIZ_ANSWERS,
  formatSecondsFromMs,
  getQuizErrorMessage,
  type QuizAnswer,
  type QuizError,
  type QuizQuestion,
  type QuizResult,
  type ThemePalette,
} from "../../constants/duoTheme";
import { playSound } from "../../utils/soundEffects";
import { DuoButton, DuoCard, InfoPill } from "../ui/DuoComponents";

export interface QuizModalProps {
  question: QuizQuestion | null;
  result: QuizResult | null;
  error: QuizError | null;
  obstaclePending: { position: number } | null;
  remainingSeconds: number;
  onSubmit: (answer: QuizAnswer) => void;
  onDismiss?: () => void;
  palette: ThemePalette;
}

export function QuizModal({
  question,
  result,
  error,
  obstaclePending,
  remainingSeconds,
  onSubmit,
  onDismiss,
  palette,
}: QuizModalProps) {
  const reduceMotion = useReducedMotion();
  const [selectedAnswer, setSelectedAnswer] = useState<QuizAnswer | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const activeQuizId = question?.quizId ?? null;

  useEffect(() => {
    setSelectedAnswer(null);
    setIsSubmitting(false);
  }, [activeQuizId]);

  useEffect(() => {
    if (!result) return;
    playSound(result.correta ? "quiz_correct" : "quiz_wrong");
  }, [result]);

  useEffect(() => {
    if (Platform.OS !== "web" || typeof window === "undefined") {
      return;
    }
    if (!question && !result && !error) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }

      if (question && !result && !error && !isSubmitting) {
        const key = event.key.toUpperCase();
        if (key === "A" || key === "B" || key === "C" || key === "D") {
          event.preventDefault();
          playSound("click");
          setSelectedAnswer(key);
        } else if (event.key === "Enter" && selectedAnswer) {
          event.preventDefault();
          setIsSubmitting(true);
          onSubmit(selectedAnswer);
        }
      } else if ((result || error) && onDismiss) {
        if (event.key === "Enter" || event.key === "Escape") {
          event.preventDefault();
          onDismiss();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [question, result, error, isSubmitting, selectedAnswer, onSubmit, onDismiss]);

  if (!question && !result && !error && !obstaclePending) {
    return null;
  }

  const obstacle = obstaclePending
    ? OBSTACLE_META[obstaclePending.position]
    : null;

  const totalSeconds = question?.durationSec ?? 30;
  const clampedSeconds = Math.max(0, Math.min(remainingSeconds, totalSeconds));
  const progressPercent = (clampedSeconds / Math.max(1, totalSeconds)) * 100;

  let timerColor = palette.primary;
  let timerBorder = palette.primaryBorder;
  if (clampedSeconds <= 5) {
    timerColor = palette.danger;
    timerBorder = palette.dangerBorder;
  } else if (clampedSeconds <= Math.ceil(totalSeconds / 2)) {
    timerColor = palette.warning;
    timerBorder = palette.warningBorder;
  }

  const handleSubmit = () => {
    if (!selectedAnswer || isSubmitting) {
      return;
    }
    setIsSubmitting(true);
    onSubmit(selectedAnswer);
  };

  return (
    <View style={styles.overlay} accessibilityViewIsModal>
      <ScrollView
        contentContainerStyle={styles.scrollCenter}
        keyboardShouldPersistTaps="handled"
      >
        <Animated.View
          entering={reduceMotion ? undefined : FadeInDown.springify()}
          exiting={reduceMotion ? undefined : FadeOutDown}
          style={styles.modalWrap}
        >
          <DuoCard palette={palette} variant="default" padding={20}>
            {/* Cabeçalho do obstáculo */}
            {obstacle ? (
              <View
                style={[
                  styles.obstacleHeader,
                  {
                    backgroundColor: palette.warningBg,
                    borderColor: palette.warningBorder,
                  },
                ]}
              >
                <Text
                  style={[styles.obstacleText, { color: palette.textMain }]}
                  numberOfLines={2}
                >
                  Obstáculo: {obstacle.icon} {obstacle.title} · {obstacle.domain}
                </Text>
              </View>
            ) : null}

            {/* ESTADO: PREPARANDO DESAFIO */}
            {!question && !result && !error && obstaclePending ? (
              <View style={styles.preparingWrap}>
                <ActivityIndicator size="small" color={palette.secondary} />
                <Text
                  style={[styles.preparingText, { color: palette.textMuted }]}
                  accessibilityLiveRegion="polite"
                >
                  Preparando o desafio para todos os jogadores...
                </Text>
              </View>
            ) : null}

            {/* ESTADO: PERGUNTA */}
            {question && !result && !error ? (
              <View style={styles.section}>
                <View style={styles.timerHeader}>
                  <InfoPill
                    text="⚡ 1º acerto = +1 casa"
                    tone="purple"
                    palette={palette}
                  />
                  <Text
                    style={[
                      styles.timerLabel,
                      {
                        color:
                          clampedSeconds <= 5
                            ? palette.danger
                            : palette.textMain,
                      },
                    ]}
                  >
                    ⏱️ {clampedSeconds}s / {totalSeconds}s
                  </Text>
                </View>

                <View
                  style={[
                    styles.progressTrack,
                    { backgroundColor: palette.cardBorder },
                  ]}
                >
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${progressPercent}%`,
                        backgroundColor: timerColor,
                        borderColor: timerBorder,
                      },
                    ]}
                  />
                </View>

                <View
                  style={[
                    styles.questionCard,
                    {
                      backgroundColor: palette.surfaceAlt,
                      borderColor: palette.cardBorder,
                    },
                  ]}
                >
                  <Text style={[styles.questionText, { color: palette.textMain }]}>
                    {question.enunciado}
                  </Text>
                </View>

                {/* Cartões táteis de alternativa com badge [A/B/C/D] */}
                <View style={styles.answersWrap}>
                  {QUIZ_ANSWERS.map((key) => {
                    const isSelected = selectedAnswer === key;
                    const alternativeText = question.alternativas[key];
                    return (
                      <Pressable
                        key={key}
                        disabled={isSubmitting}
                        onPress={() => {
                          playSound("click");
                          setSelectedAnswer(key);
                        }}
                        accessibilityRole="button"
                        accessibilityState={{
                          selected: isSelected,
                          disabled: isSubmitting,
                        }}
                        accessibilityLabel={`Alternativa ${key}: ${alternativeText}`}
                        style={({ pressed }) => [
                          styles.optionCard,
                          {
                            backgroundColor: isSelected
                              ? palette.primaryBg
                              : palette.cardBg,
                            borderColor: isSelected
                              ? palette.primaryBorder
                              : palette.cardBorder,
                          },
                          pressed && !isSubmitting && styles.optionPressed,
                          isSubmitting && styles.optionDisabled,
                        ]}
                      >
                        <View
                          style={[
                            styles.optionBadge,
                            {
                              backgroundColor: isSelected
                                ? palette.primary
                                : palette.surfaceAlt,
                              borderColor: isSelected
                                ? palette.primaryBorder
                                : palette.cardBorder,
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.optionBadgeText,
                              {
                                color: isSelected
                                  ? "#FFFFFF"
                                  : palette.textMain,
                              },
                            ]}
                          >
                            {key}
                          </Text>
                        </View>
                        <Text
                          style={[
                            styles.optionText,
                            { color: palette.textMain },
                          ]}
                        >
                          {alternativeText}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                {Platform.OS === "web" && !isSubmitting ? (
                  <Text
                    style={[styles.keyboardHint, { color: palette.textMuted }]}
                  >
                    ⌨️ Teclado: pressione A, B, C ou D para escolher e Enter para
                    confirmar.
                  </Text>
                ) : null}

                {isSubmitting ? (
                  <View
                    style={[
                      styles.waitingBanner,
                      {
                        backgroundColor: palette.secondaryBg,
                        borderColor: palette.secondaryBorder,
                      },
                    ]}
                    accessibilityLiveRegion="polite"
                  >
                    <Text
                      style={[styles.waitingText, { color: palette.textMain }]}
                    >
                      ⏳ Resposta enviada! Aguardando os demais jogadores...
                    </Text>
                  </View>
                ) : (
                  <View style={styles.confirmWrap}>
                    <DuoButton
                      title="Confirmar Resposta"
                      icon="✅"
                      variant="primary"
                      size="lg"
                      fullWidth
                      onPress={handleSubmit}
                      disabled={!selectedAnswer || isSubmitting}
                      palette={palette}
                      accessibilityLabel="Confirmar resposta selecionada"
                      accessibilityHint="Envia sua resposta e aguarda o resultado da rodada"
                    />
                  </View>
                )}
              </View>
            ) : null}

            {/* ESTADO: RESULTADO */}
            {result ? (
              <View style={styles.section}>
                <View
                  style={[
                    styles.resultBanner,
                    {
                      backgroundColor: result.correta
                        ? palette.primaryBg
                        : palette.dangerBg,
                      borderColor: result.correta
                        ? palette.primaryBorder
                        : palette.dangerBorder,
                    },
                  ]}
                >
                  <Text style={styles.resultEmoji}>
                    {result.correta ? "🎉" : "💡"}
                  </Text>
                  <Text
                    style={[
                      styles.resultTitle,
                      {
                        color: result.correta
                          ? palette.primaryText
                          : palette.danger,
                      },
                    ]}
                    accessibilityLiveRegion="polite"
                  >
                    {result.correta ? "Resposta Correta!" : "Resposta Incorreta"}
                  </Text>
                </View>

                {result.bonusMove && result.bonusMove > 0 ? (
                  <View
                    style={[
                      styles.bonusBanner,
                      {
                        backgroundColor: palette.purpleBg,
                        borderColor: palette.purpleBorder,
                      },
                    ]}
                  >
                    <Text
                      style={[styles.bonusBannerText, { color: palette.textMain }]}
                    >
                      ⚡ Avanço por Equidade: você foi o 1º a acertar e avançou +
                      {result.bonusMove} casa no tabuleiro!
                    </Text>
                  </View>
                ) : null}

                <View style={styles.resultPillsRow}>
                  <InfoPill
                    text={
                      result.alternativa
                        ? `Sua resposta: ${result.alternativa}`
                        : "Tempo esgotado"
                    }
                    tone={result.correta ? "primary" : "danger"}
                    palette={palette}
                  />
                  <InfoPill
                    text={`Gabarito: ${result.respostaCorreta}`}
                    tone="secondary"
                    palette={palette}
                  />
                  <InfoPill
                    text={`⭐ +${result.pontos} pts`}
                    tone="warning"
                    palette={palette}
                  />
                  {result.tempoRespostaMs !== undefined ? (
                    <InfoPill
                      text={`⏱️ ${formatSecondsFromMs(result.tempoRespostaMs)}`}
                      tone="neutral"
                      palette={palette}
                    />
                  ) : null}
                </View>

                {result.explicacao ? (
                  <View
                    style={[
                      styles.explanationCard,
                      {
                        backgroundColor: palette.surfaceAlt,
                        borderColor: palette.cardBorder,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.explanationLabel,
                        { color: palette.textMuted },
                      ]}
                    >
                      💡 Explicação pedagógica
                    </Text>
                    <Text
                      style={[
                        styles.explanationText,
                        { color: palette.textMain },
                      ]}
                    >
                      {result.explicacao}
                    </Text>
                  </View>
                ) : null}

                {onDismiss ? (
                  <View style={styles.confirmWrap}>
                    <DuoButton
                      title="Continuar no Tabuleiro"
                      variant="secondary"
                      size="md"
                      fullWidth
                      onPress={onDismiss}
                      palette={palette}
                      accessibilityLabel="Fechar resultado do quiz e voltar ao tabuleiro"
                    />
                  </View>
                ) : null}
              </View>
            ) : null}

            {/* ESTADO: ERRO */}
            {error ? (
              <View style={styles.section}>
                <View
                  style={[
                    styles.errorBanner,
                    {
                      backgroundColor: palette.dangerBg,
                      borderColor: palette.dangerBorder,
                    },
                  ]}
                  accessibilityRole="alert"
                  accessibilityLiveRegion="polite"
                >
                  <Text style={[styles.errorText, { color: palette.textMain }]}>
                    ⚠️ {getQuizErrorMessage(error.code)}
                  </Text>
                </View>
                {onDismiss ? (
                  <DuoButton
                    title="Continuar"
                    variant="ghost"
                    size="md"
                    fullWidth
                    onPress={onDismiss}
                    palette={palette}
                    accessibilityLabel="Fechar aviso de erro do quiz"
                  />
                ) : null}
              </View>
            ) : null}
          </DuoCard>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(15, 23, 42, 0.72)",
    zIndex: 40,
  },
  scrollCenter: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  modalWrap: {
    width: "100%",
    maxWidth: 560,
  },
  section: {
    gap: 12,
  },
  obstacleHeader: {
    borderRadius: 12,
    borderWidth: 2,
    borderBottomWidth: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
  },
  obstacleText: {
    fontSize: 13,
    fontWeight: "900",
    textAlign: "center",
  },
  timerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
  },
  timerLabel: {
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: 0.2,
  },
  progressTrack: {
    width: "100%",
    height: 12,
    borderRadius: 999,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
    borderRightWidth: 2,
  },
  questionCard: {
    borderRadius: 14,
    borderWidth: 2,
    padding: 14,
  },
  questionText: {
    fontSize: 16,
    fontWeight: "800",
    lineHeight: 24,
  },
  answersWrap: {
    gap: 8,
  },
  optionCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 14,
    borderWidth: 2,
    borderBottomWidth: 4,
    paddingHorizontal: 12,
    paddingVertical: 11,
    minHeight: 52,
  },
  optionPressed: {
    transform: [{ translateY: 2 }],
  },
  optionDisabled: {
    opacity: 0.6,
  },
  optionBadge: {
    width: 32,
    height: 32,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  optionBadgeText: {
    fontSize: 14,
    fontWeight: "900",
  },
  optionText: {
    flex: 1,
    fontSize: 14,
    fontWeight: "800",
    lineHeight: 20,
  },
  keyboardHint: {
    fontSize: 11,
    fontWeight: "700",
    textAlign: "center",
  },
  confirmWrap: {
    marginTop: 4,
  },
  preparingWrap: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 20,
    gap: 10,
  },
  preparingText: {
    fontSize: 13,
    fontWeight: "700",
    textAlign: "center",
  },
  waitingBanner: {
    marginTop: 4,
    borderRadius: 12,
    borderWidth: 2,
    borderBottomWidth: 4,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  waitingText: {
    fontSize: 13,
    fontWeight: "800",
    textAlign: "center",
  },
  resultBanner: {
    borderRadius: 16,
    borderWidth: 2,
    borderBottomWidth: 4,
    padding: 14,
    alignItems: "center",
    gap: 4,
  },
  resultEmoji: {
    fontSize: 32,
  },
  resultTitle: {
    fontSize: 20,
    fontWeight: "900",
    textAlign: "center",
  },
  bonusBanner: {
    borderRadius: 12,
    borderWidth: 2,
    borderBottomWidth: 4,
    padding: 10,
  },
  bonusBannerText: {
    fontSize: 13,
    fontWeight: "900",
    textAlign: "center",
    lineHeight: 18,
  },
  resultPillsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 6,
  },
  explanationCard: {
    borderRadius: 12,
    borderWidth: 2,
    borderBottomWidth: 4,
    padding: 12,
    gap: 4,
  },
  explanationLabel: {
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  explanationText: {
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 19,
  },
  errorBanner: {
    borderRadius: 14,
    borderWidth: 2,
    borderBottomWidth: 4,
    padding: 12,
  },
  errorText: {
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 19,
  },
});
