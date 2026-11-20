// frontend/src/components/game/QuizModal.tsx
// Overlay de quiz/obstáculo do "Ludo Equidade (UFRRJ)".
// Compatível com React Compiler. Sem shadow* no StyleSheet.

import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import Animated, {
  FadeInDown,
  FadeOutDown,
  useReducedMotion,
} from "react-native-reanimated";

import {
  OBSTACLE_META,
  QUIZ_ANSWERS,
  getQuizErrorMessage,
  type QuizAnswer,
  type QuizError,
  type QuizQuestion,
  type QuizResult,
  type ThemePalette,
} from "../../constants/duoTheme";
import { DuoButton, DuoCard } from "../ui/DuoComponents";

const QUIZ_TOTAL_SECONDS = 30;

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

  if (!question && !result && !error && !obstaclePending) {
    return null;
  }

  const obstacle = obstaclePending
    ? OBSTACLE_META[obstaclePending.position]
    : null;

  const clampedSeconds = Math.max(
    0,
    Math.min(remainingSeconds, QUIZ_TOTAL_SECONDS)
  );
  const progressPercent = (clampedSeconds / QUIZ_TOTAL_SECONDS) * 100;

  let timerColor = palette.primary;
  let timerBorder = palette.primaryBorder;
  if (clampedSeconds <= 5) {
    timerColor = palette.danger;
    timerBorder = palette.dangerBorder;
  } else if (clampedSeconds <= 15) {
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
      <Animated.View
        entering={reduceMotion ? undefined : FadeInDown.springify()}
        exiting={reduceMotion ? undefined : FadeOutDown}
        style={styles.modalWrap}
      >
        <DuoCard palette={palette} variant="default" padding={18}>
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
                Obstáculo: {obstacle.icon} {obstacle.title} - {obstacle.domain}
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
                <Text
                  style={[styles.timerLabel, { color: palette.textMuted }]}
                >
                  ⏱️ {clampedSeconds}s
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

              <Text
                style={[styles.questionText, { color: palette.textMain }]}
              >
                {question.enunciado}
              </Text>

              <View style={styles.answersWrap}>
                {QUIZ_ANSWERS.map((key) => {
                  const isSelected = selectedAnswer === key;
                  const alternativeText = question.alternativas[key];
                  return (
                    <DuoButton
                      key={key}
                      title={`${key}) ${alternativeText}`}
                      variant={isSelected ? "primary" : "ghost"}
                      size="md"
                      fullWidth
                      selected={isSelected}
                      onPress={
                        isSubmitting
                          ? undefined
                          : () => setSelectedAnswer(key)
                      }
                      disabled={isSubmitting}
                      palette={palette}
                      accessibilityLabel={`Alternativa ${key}: ${alternativeText}`}
                    />
                  );
                })}
              </View>

              {isSubmitting ? (
                <View
                  style={[
                    styles.waitingBanner,
                    {
                      backgroundColor: palette.surfaceAlt,
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
              <Text
                style={[
                  styles.resultTitle,
                  {
                    color: result.correta ? palette.primary : palette.danger,
                  },
                ]}
                accessibilityLiveRegion="polite"
              >
                {result.correta ? "✅ Correto!" : "❌ Incorreto"}
              </Text>

              <Text style={[styles.resultLine, { color: palette.textMain }]}>
                {result.alternativa
                  ? `Sua resposta: ${result.alternativa} · Gabarito: ${result.respostaCorreta}`
                  : `Sem resposta no prazo · Gabarito: ${result.respostaCorreta}`}
              </Text>
              <Text style={[styles.resultLine, { color: palette.textMain }]}>
                Pontos ganhos: ⭐ {result.pontos}
              </Text>

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
                    title="Continuar"
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
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  modalWrap: {
    width: "90%",
    maxWidth: 500,
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
    letterSpacing: 0.2,
    textAlign: "center",
  },
  timerHeader: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
  },
  timerLabel: {
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0.3,
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
  questionText: {
    fontSize: 15,
    fontWeight: "800",
    lineHeight: 22,
    marginTop: 4,
    marginBottom: 4,
  },
  answersWrap: {
    gap: 8,
  },
  confirmWrap: {
    marginTop: 6,
  },
  preparingWrap: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 18,
    gap: 10,
  },
  preparingText: {
    fontSize: 13,
    fontWeight: "700",
    textAlign: "center",
  },
  waitingBanner: {
    marginTop: 6,
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
  resultTitle: {
    fontSize: 20,
    fontWeight: "900",
    letterSpacing: 0.4,
    textAlign: "center",
    marginBottom: 4,
  },
  resultLine: {
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 0.2,
    textAlign: "center",
  },
  explanationCard: {
    marginTop: 6,
    borderRadius: 12,
    borderWidth: 2,
    borderBottomWidth: 4,
    padding: 12,
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
    marginTop: 4,
  },
  errorText: {
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 19,
  },
});
