// frontend/src/components/teacher/AnalyticsCharts.tsx
// Visualizações estatísticas de nível acadêmico para o Painel Docente (ICE — UFRRJ).
// Zero dependências de gráfico externas, compatível com modo claro, escuro e daltônico, sem shadow*.

import { useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import {
  ALL_CONDITIONS,
  OBSTACLE_LABELS_BY_KEY,
  formatDecimal,
  formatPercent,
  formatSecondsFromMs,
  getConditionMeta,
  type ConditionKey,
  type EmpiricalMatrixItem,
  type EquityByConditionItem,
  type QuestionPerformanceItem,
  type QuizAnswer,
  type SchoolStage,
  type ThemePalette,
} from "../../constants/duoTheme";
import { DuoButton, InfoPill } from "../ui/DuoComponents";

const OBSTACLE_KEYS = [
  "escada",
  "alerta_sonoro",
  "multidao_barulho",
  "placa_ilegivel",
] as const;

// Matriz Teórica v1.0-baseline (espelha backend/quizService.js e database/migrations/002)
const THEORETICAL_MATRIX: Record<string, Record<ConditionKey, 1 | 2 | 3>> = {
  escada: { cadeirante: 3, cego: 2, surdo: 1, neuroatipico: 1 },
  alerta_sonoro: { cadeirante: 1, cego: 1, surdo: 3, neuroatipico: 2 },
  multidao_barulho: { cadeirante: 1, cego: 2, surdo: 1, neuroatipico: 3 },
  placa_ilegivel: { cadeirante: 1, cego: 3, surdo: 1, neuroatipico: 2 },
};

/* ================================================================== */
/* 1. Gráfico Comparativo de Equidade por Condição (com linha teórica) */
/* ================================================================== */

type EquityMetricKey = "winRate" | "avgPosition" | "quizAccuracy" | "avgDice";

interface EquityComparisonChartProps {
  rows: EquityByConditionItem[];
  palette: ThemePalette;
}

export function EquityComparisonChart({
  rows,
  palette,
}: EquityComparisonChartProps) {
  const [metric, setMetric] = useState<EquityMetricKey>("winRate");

  // Agrega quando "Todas as etapas" retorna múltiplas linhas por condição
  const aggregated = useMemo(() => {
    const map = new Map<
      ConditionKey,
      {
        n: number;
        wins: number;
        posWeighted: number;
        diceWeighted: number;
        diceN: number;
        quizWeighted: number;
        quizN: number;
        n1: number;
        n2: number;
        n3: number;
      }
    >();

    for (const cond of ALL_CONDITIONS) {
      map.set(cond, {
        n: 0,
        wins: 0,
        posWeighted: 0,
        diceWeighted: 0,
        diceN: 0,
        quizWeighted: 0,
        quizN: 0,
        n1: 0,
        n2: 0,
        n3: 0,
      });
    }

    for (const row of rows) {
      const bucket = map.get(row.condicao);
      if (!bucket) continue;
      const n = Number(row.total_participacoes) || 0;
      bucket.n += n;
      bucket.wins += Number(row.total_vitorias) || 0;
      if (row.posicao_media !== null) {
        bucket.posWeighted += Number(row.posicao_media) * n;
      }
      if (row.media_dado_geral !== null) {
        bucket.diceWeighted += Number(row.media_dado_geral) * n;
        bucket.diceN += n;
      }
      if (row.taxa_acerto_quiz !== null) {
        bucket.quizWeighted += Number(row.taxa_acerto_quiz) * n;
        bucket.quizN += n;
      }
      bucket.n1 += Number(row.total_nivel1) || 0;
      bucket.n2 += Number(row.total_nivel2) || 0;
      bucket.n3 += Number(row.total_nivel3) || 0;
    }

    return ALL_CONDITIONS.map((cond) => {
      const b = map.get(cond)!;
      return {
        condicao: cond,
        n: b.n,
        winRate: b.n > 0 ? b.wins / b.n : null,
        avgPosition: b.n > 0 ? b.posWeighted / b.n : null,
        avgDice: b.diceN > 0 ? b.diceWeighted / b.diceN : null,
        quizAccuracy: b.quizN > 0 ? b.quizWeighted / b.quizN : null,
        n1: b.n1,
        n2: b.n2,
        n3: b.n3,
      };
    });
  }, [rows]);

  const totalN = aggregated.reduce((acc, item) => acc + item.n, 0);

  const metricConfig = {
    winRate: {
      title: "Taxa de Vitória por Perspectiva",
      referenceLabel: "Referência uniforme (4 papéis): 25,0%",
      referencePercent: 25,
      max: 1,
    },
    avgPosition: {
      title: "Posição Média Final no Tabuleiro (0 a 30)",
      referenceLabel: "Meta de chegada: casa 30",
      referencePercent: null as number | null,
      max: 30,
    },
    quizAccuracy: {
      title: "Taxa Média de Acerto nos Quizzes",
      referenceLabel: "Patamar intermediário: 50,0%",
      referencePercent: 50,
      max: 1,
    },
    avgDice: {
      title: "Média Empírica do Dado (Controle de Aleatoriedade)",
      referenceLabel: "Valor esperado teórico E[X] = 3,50 (dado justo d6)",
      referencePercent: (3.5 / 6) * 100,
      max: 6,
    },
  }[metric];

  return (
    <View style={styles.chartBlock}>
      <View style={styles.metricTabs}>
        <DuoButton
          title="🏆 Vitória"
          variant={metric === "winRate" ? "purple" : "ghost"}
          size="sm"
          fullWidth={false}
          onPress={() => setMetric("winRate")}
          palette={palette}
        />
        <DuoButton
          title="📍 Posição"
          variant={metric === "avgPosition" ? "purple" : "ghost"}
          size="sm"
          fullWidth={false}
          onPress={() => setMetric("avgPosition")}
          palette={palette}
        />
        <DuoButton
          title="📝 Acerto Quiz"
          variant={metric === "quizAccuracy" ? "purple" : "ghost"}
          size="sm"
          fullWidth={false}
          onPress={() => setMetric("quizAccuracy")}
          palette={palette}
        />
        <DuoButton
          title="🎲 Dado E[X]"
          variant={metric === "avgDice" ? "purple" : "ghost"}
          size="sm"
          fullWidth={false}
          onPress={() => setMetric("avgDice")}
          palette={palette}
        />
      </View>

      <View style={styles.chartHeader}>
        <Text style={[styles.chartTitle, { color: palette.textMain }]}>
          {metricConfig.title}
        </Text>
        <InfoPill
          text={metricConfig.referenceLabel}
          tone="secondary"
          palette={palette}
        />
      </View>

      {totalN === 0 ? (
        <View
          style={[
            styles.emptyChart,
            {
              backgroundColor: palette.surfaceAlt,
              borderColor: palette.cardBorder,
            },
          ]}
        >
          <Text style={[styles.emptyChartText, { color: palette.textMuted }]}>
            Conclua pelo menos 1 partida neste recorte para preencher as barras
            empíricas comparativas.
          </Text>
        </View>
      ) : (
        <View style={styles.barsList}>
          {aggregated.map((item) => {
            const meta = getConditionMeta(item.condicao);
            const rawVal =
              metric === "winRate"
                ? item.winRate
                : metric === "avgPosition"
                  ? item.avgPosition
                  : metric === "quizAccuracy"
                    ? item.quizAccuracy
                    : item.avgDice;

            const pct =
              rawVal !== null
                ? Math.max(0, Math.min(100, (rawVal / metricConfig.max) * 100))
                : 0;

            const formatted =
              metric === "winRate" || metric === "quizAccuracy"
                ? formatPercent(rawVal)
                : metric === "avgDice"
                  ? formatDecimal(rawVal, 2)
                  : `${formatDecimal(rawVal, 1)} / 30`;

            return (
              <View key={item.condicao} style={styles.barRowWrap}>
                <View style={styles.barLabelRow}>
                  <Text
                    style={[styles.barConditionLabel, { color: meta.color }]}
                    numberOfLines={1}
                  >
                    {meta.personaIcon} {meta.label}
                  </Text>
                  <Text style={[styles.barValueText, { color: palette.textMain }]}>
                    {formatted}{" "}
                    <Text style={{ color: palette.textMuted, fontWeight: "700" }}>
                      (n={item.n})
                    </Text>
                  </Text>
                </View>

                <View
                  style={[
                    styles.barTrack,
                    {
                      backgroundColor: palette.surfaceAlt,
                      borderColor: palette.cardBorder,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.barFill,
                      {
                        width: `${pct}%`,
                        backgroundColor: meta.color,
                      },
                    ]}
                  />
                  {metricConfig.referencePercent !== null ? (
                    <View
                      style={[
                        styles.referenceLine,
                        {
                          left: `${metricConfig.referencePercent}%`,
                          backgroundColor: palette.textMain,
                        },
                      ]}
                    />
                  ) : null}
                </View>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

/* ================================================================== */
/* 2. Heatmap Visual 4x4 — Matriz Obstáculo × Condição                 */
/* ================================================================== */

interface EmpiricalMatrixHeatmapProps {
  rows: EmpiricalMatrixItem[];
  palette: ThemePalette;
}

export function EmpiricalMatrixHeatmap({
  rows,
  palette,
}: EmpiricalMatrixHeatmapProps) {
  const [viewMode, setViewMode] = useState<"empirical" | "theoretical">(
    rows.length > 0 ? "empirical" : "theoretical",
  );

  // Indexa por `${obstaculo}:${condicao}` agregando etapas quando necessário
  const cellMap = useMemo(() => {
    const map = new Map<
      string,
      {
        level: 1 | 2 | 3;
        obs: number;
        answered: number;
        correct: number;
        timeWeighted: number;
        timeN: number;
      }
    >();

    for (const row of rows) {
      const key = `${row.obstaculo_nome}:${row.condicao}`;
      const existing = map.get(key) ?? {
        level: row.nivel_estrutural,
        obs: 0,
        answered: 0,
        correct: 0,
        timeWeighted: 0,
        timeN: 0,
      };
      const obs = Number(row.total_observacoes) || 0;
      const ans = Number(row.total_respondidas) || 0;
      const cor = Number(row.total_acertos) || 0;
      existing.obs += obs;
      existing.answered += ans;
      existing.correct += cor;
      if (row.tempo_medio_ms !== null && ans > 0) {
        existing.timeWeighted += Number(row.tempo_medio_ms) * ans;
        existing.timeN += ans;
      }
      map.set(key, existing);
    }

    return map;
  }, [rows]);

  const getLevelColors = (level: 1 | 2 | 3) => {
    if (level === 1) {
      return { bg: palette.primaryBg, border: palette.primaryBorder };
    }
    if (level === 2) {
      return { bg: palette.warningBg, border: palette.warningBorder };
    }
    return { bg: palette.dangerBg, border: palette.dangerBorder };
  };

  const getAccuracyColors = (rate: number | null) => {
    if (rate === null) {
      return { bg: palette.surfaceAlt, border: palette.cardBorder };
    }
    if (rate >= 0.7) {
      return { bg: palette.primaryBg, border: palette.primaryBorder };
    }
    if (rate >= 0.4) {
      return { bg: palette.warningBg, border: palette.warningBorder };
    }
    return { bg: palette.dangerBg, border: palette.dangerBorder };
  };

  return (
    <View style={styles.chartBlock}>
      <View style={styles.chartHeader}>
        <View style={styles.metricTabs}>
          <DuoButton
            title="🧪 Empírico (Observado)"
            variant={viewMode === "empirical" ? "purple" : "ghost"}
            size="sm"
            fullWidth={false}
            onPress={() => setViewMode("empirical")}
            palette={palette}
          />
          <DuoButton
            title="📐 Matriz Teórica (N1–N3)"
            variant={viewMode === "theoretical" ? "secondary" : "ghost"}
            size="sm"
            fullWidth={false}
            onPress={() => setViewMode("theoretical")}
            palette={palette}
          />
        </View>
        <View style={styles.legendPills}>
          <InfoPill
            text={viewMode === "theoretical" ? "N1 Acesso pleno" : "≥70% acerto"}
            tone="primary"
            palette={palette}
          />
          <InfoPill
            text={viewMode === "theoretical" ? "N2 Barreira média" : "40–69%"}
            tone="warning"
            palette={palette}
          />
          <InfoPill
            text={viewMode === "theoretical" ? "N3 Barreira severa" : "<40%"}
            tone="danger"
            palette={palette}
          />
        </View>
      </View>

      {/* Cabeçalho das colunas (4 Condições) */}
      <View style={styles.heatmapTable}>
        <View style={styles.heatmapRow}>
          <View style={styles.heatmapCorner}>
            <Text style={[styles.heatmapHeaderText, { color: palette.textMuted }]}>
              Obstáculo \ Papel
            </Text>
          </View>
          {ALL_CONDITIONS.map((cond) => {
            const meta = getConditionMeta(cond);
            return (
              <View
                key={`head-${cond}`}
                style={[
                  styles.heatmapColHead,
                  {
                    backgroundColor: palette.surfaceAlt,
                    borderColor: meta.color,
                  },
                ]}
              >
                <Text style={styles.heatmapColIcon}>{meta.personaIcon}</Text>
                <Text
                  style={[styles.heatmapColTitle, { color: meta.color }]}
                  numberOfLines={1}
                >
                  {meta.shortLabel}
                </Text>
              </View>
            );
          })}
        </View>

        {/* Linhas dos 4 Obstáculos */}
        {OBSTACLE_KEYS.map((obsKey) => (
          <View key={`row-${obsKey}`} style={styles.heatmapRow}>
            <View
              style={[
                styles.heatmapRowHead,
                {
                  backgroundColor: palette.surfaceAlt,
                  borderColor: palette.cardBorder,
                },
              ]}
            >
              <Text
                style={[styles.heatmapRowHeadText, { color: palette.textMain }]}
                numberOfLines={2}
              >
                {OBSTACLE_LABELS_BY_KEY[obsKey] ?? obsKey}
              </Text>
            </View>

            {ALL_CONDITIONS.map((cond) => {
              const theoreticalLevel = THEORETICAL_MATRIX[obsKey][cond];
              const stats = cellMap.get(`${obsKey}:${cond}`);
              const rate =
                stats && stats.answered > 0
                  ? stats.correct / stats.answered
                  : null;
              const meanMs =
                stats && stats.timeN > 0
                  ? stats.timeWeighted / stats.timeN
                  : null;

              const colors =
                viewMode === "theoretical"
                  ? getLevelColors(theoreticalLevel)
                  : getAccuracyColors(rate);

              return (
                <View
                  key={`cell-${obsKey}-${cond}`}
                  style={[
                    styles.heatmapCell,
                    {
                      backgroundColor: colors.bg,
                      borderColor: colors.border,
                    },
                  ]}
                  accessible
                  accessibilityLabel={`${OBSTACLE_LABELS_BY_KEY[obsKey]} versus ${getConditionMeta(cond).label}: Nível ${theoreticalLevel}${rate !== null ? `, acerto ${formatPercent(rate)}, n igual a ${stats?.obs ?? 0}` : ", sem observações ainda"}`}
                >
                  {viewMode === "theoretical" ? (
                    <>
                      <Text
                        style={[
                          styles.heatmapBigValue,
                          { color: palette.textMain },
                        ]}
                      >
                        N{theoreticalLevel}
                      </Text>
                      <Text
                        style={[
                          styles.heatmapSubText,
                          { color: palette.textMuted },
                        ]}
                      >
                        {theoreticalLevel === 1
                          ? "Pleno"
                          : theoreticalLevel === 2
                            ? "Médio"
                            : "Severo"}
                      </Text>
                    </>
                  ) : (
                    <>
                      <Text
                        style={[
                          styles.heatmapBigValue,
                          { color: palette.textMain },
                        ]}
                      >
                        {rate !== null ? formatPercent(rate) : "—"}
                      </Text>
                      <Text
                        style={[
                          styles.heatmapSubText,
                          { color: palette.textMuted },
                        ]}
                      >
                        N{theoreticalLevel} · n={stats?.obs ?? 0}
                      </Text>
                      {meanMs !== null ? (
                        <Text
                          style={[
                            styles.heatmapTinyText,
                            { color: palette.textMuted },
                          ]}
                        >
                          ⏱ {formatSecondsFromMs(meanMs)}
                        </Text>
                      ) : null}
                    </>
                  )}
                </View>
              );
            })}
          </View>
        ))}
      </View>
    </View>
  );
}

/* ================================================================== */
/* 3. Barra Empilhada por Etapa Escolar                                */
/* ================================================================== */

export function StageDistributionBar({
  stages,
  palette,
}: {
  stages: { etapa_escolar: SchoolStage; quantidade: number }[];
  palette: ThemePalette;
}) {
  const total = stages.reduce((acc, s) => acc + (Number(s.quantidade) || 0), 0);
  if (total === 0) {
    return null;
  }

  const stageColor = (stage: SchoolStage) => {
    if (stage === "Fundamental") return palette.primary;
    if (stage === "Médio") return palette.secondary;
    return palette.purple;
  };

  return (
    <View style={styles.stageWrap}>
      <Text style={[styles.stageLabel, { color: palette.textMuted }]}>
        Distribuição de partidas por etapa escolar ({total} total)
      </Text>
      <View
        style={[
          styles.stackedTrack,
          { backgroundColor: palette.surfaceAlt, borderColor: palette.cardBorder },
        ]}
      >
        {stages.map((item) => {
          const qty = Number(item.quantidade) || 0;
          const pct = (qty / total) * 100;
          if (pct <= 0) return null;
          return (
            <View
              key={item.etapa_escolar}
              style={{
                width: `${pct}%`,
                height: "100%",
                backgroundColor: stageColor(item.etapa_escolar),
              }}
            />
          );
        })}
      </View>
      <View style={styles.legendPills}>
        {stages.map((item) => {
          const qty = Number(item.quantidade) || 0;
          const pct = ((qty / total) * 100).toFixed(0);
          return (
            <InfoPill
              key={item.etapa_escolar}
              text={`${item.etapa_escolar}: ${qty} (${pct}%)`}
              tone={
                item.etapa_escolar === "Fundamental"
                  ? "primary"
                  : item.etapa_escolar === "Médio"
                    ? "secondary"
                    : "purple"
              }
              palette={palette}
            />
          );
        })}
      </View>
    </View>
  );
}

/* ================================================================== */
/* 4. Mini Barras de Distratores (A/B/C/D) por Questão                 */
/* ================================================================== */

export function DistractorBars({
  perf,
  correctAnswer,
  palette,
}: {
  perf: QuestionPerformanceItem;
  correctAnswer?: QuizAnswer;
  palette: ThemePalette;
}) {
  const counts: Record<QuizAnswer, number> = {
    A: Number(perf.escolhas_a) || 0,
    B: Number(perf.escolhas_b) || 0,
    C: Number(perf.escolhas_c) || 0,
    D: Number(perf.escolhas_d) || 0,
  };
  const total = Math.max(1, counts.A + counts.B + counts.C + counts.D);

  return (
    <View
      style={[
        styles.distractorBox,
        {
          backgroundColor: palette.surfaceAlt,
          borderColor: palette.cardBorder,
        },
      ]}
    >
      <View style={styles.distractorHeader}>
        <Text style={[styles.distractorTitle, { color: palette.textMuted }]}>
          📊 Diagnóstico Psicométrico (n={perf.total_aplicacoes} · p=
          {formatPercent(perf.taxa_acerto_respondidas)} · ⏱
          {formatSecondsFromMs(perf.tempo_medio_ms)})
        </Text>
      </View>
      <View style={styles.distractorGrid}>
        {(["A", "B", "C", "D"] as const).map((letter) => {
          const count = counts[letter];
          const pct = Math.round((count / total) * 100);
          const isCorrect = correctAnswer === letter;
          return (
            <View key={letter} style={styles.distractorItem}>
              <View style={styles.distractorRowTop}>
                <Text
                  style={[
                    styles.distractorLetter,
                    {
                      color: isCorrect ? palette.primaryText : palette.textMain,
                    },
                  ]}
                >
                  {letter}
                  {isCorrect ? " ✓" : ""}
                </Text>
                <Text
                  style={[styles.distractorPct, { color: palette.textMuted }]}
                >
                  {pct}% ({count})
                </Text>
              </View>
              <View
                style={[
                  styles.distractorTrack,
                  { backgroundColor: palette.cardBg },
                ]}
              >
                <View
                  style={[
                    styles.distractorFill,
                    {
                      width: `${pct}%`,
                      backgroundColor: isCorrect
                        ? palette.primary
                        : palette.secondary,
                    },
                  ]}
                />
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  chartBlock: {
    gap: 12,
  },
  metricTabs: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  chartHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 8,
  },
  chartTitle: {
    fontSize: 14,
    fontWeight: "900",
  },
  emptyChart: {
    borderRadius: 14,
    borderWidth: 2,
    borderStyle: "dashed",
    padding: 16,
    alignItems: "center",
  },
  emptyChartText: {
    fontSize: 12,
    fontWeight: "700",
    textAlign: "center",
  },
  barsList: {
    gap: 10,
  },
  barRowWrap: {
    gap: 4,
  },
  barLabelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  barConditionLabel: {
    fontSize: 13,
    fontWeight: "900",
    flex: 1,
  },
  barValueText: {
    fontSize: 12,
    fontWeight: "900",
  },
  barTrack: {
    height: 18,
    borderRadius: 999,
    borderWidth: 2,
    overflow: "hidden",
    position: "relative",
    justifyContent: "center",
  },
  barFill: {
    height: "100%",
    borderRadius: 999,
  },
  referenceLine: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: 2,
    opacity: 0.7,
  },
  legendPills: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  heatmapTable: {
    gap: 6,
  },
  heatmapRow: {
    flexDirection: "row",
    gap: 6,
    alignItems: "stretch",
  },
  heatmapCorner: {
    width: 112,
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  heatmapHeaderText: {
    fontSize: 10,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  heatmapColHead: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 2,
    paddingVertical: 6,
    paddingHorizontal: 4,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  heatmapColIcon: {
    fontSize: 16,
  },
  heatmapColTitle: {
    fontSize: 10,
    fontWeight: "900",
    textAlign: "center",
  },
  heatmapRowHead: {
    width: 112,
    borderRadius: 12,
    borderWidth: 2,
    paddingHorizontal: 8,
    paddingVertical: 8,
    justifyContent: "center",
  },
  heatmapRowHeadText: {
    fontSize: 11,
    fontWeight: "900",
    lineHeight: 14,
  },
  heatmapCell: {
    flex: 1,
    minHeight: 62,
    borderRadius: 12,
    borderWidth: 2,
    borderBottomWidth: 4,
    padding: 6,
    alignItems: "center",
    justifyContent: "center",
    gap: 1,
  },
  heatmapBigValue: {
    fontSize: 14,
    fontWeight: "900",
  },
  heatmapSubText: {
    fontSize: 10,
    fontWeight: "800",
    textAlign: "center",
  },
  heatmapTinyText: {
    fontSize: 9,
    fontWeight: "700",
  },
  stageWrap: {
    gap: 6,
    marginTop: 6,
  },
  stageLabel: {
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  stackedTrack: {
    height: 14,
    borderRadius: 999,
    borderWidth: 2,
    overflow: "hidden",
    flexDirection: "row",
  },
  distractorBox: {
    marginTop: 6,
    borderRadius: 12,
    borderWidth: 1.5,
    padding: 10,
    gap: 8,
  },
  distractorHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  distractorTitle: {
    fontSize: 11,
    fontWeight: "800",
  },
  distractorGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  distractorItem: {
    flexGrow: 1,
    flexBasis: 110,
    gap: 3,
  },
  distractorRowTop: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  distractorLetter: {
    fontSize: 11,
    fontWeight: "900",
  },
  distractorPct: {
    fontSize: 10,
    fontWeight: "800",
  },
  distractorTrack: {
    height: 8,
    borderRadius: 999,
    overflow: "hidden",
  },
  distractorFill: {
    height: "100%",
    borderRadius: 999,
  },
});
