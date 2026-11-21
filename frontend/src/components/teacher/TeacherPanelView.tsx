// frontend/src/components/teacher/TeacherPanelView.tsx
// Painel de Professores & Pesquisa Científica (ICE — UFRRJ) v2.0.
// 4 abas: Indicadores & Exportação LGPD | Banco de Questões & Psicométrico | Turmas | Usuários (Admin).

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import {
  OBSTACLE_LABELS_BY_KEY,
  QUIZ_ANSWERS,
  REVIEW_STATUSES,
  REVIEW_STATUS_META,
  SCHOOL_STAGES,
  SYSTEM_ROLES,
  formatDecimal,
  formatPercent,
  formatSecondsFromMs,
  getConditionMeta,
  type AnalyticsOverviewResponse,
  type AuthUser,
  type EquityAnalyticsResponse,
  type QuestionAdminItem,
  type QuestionPayloadInput,
  type QuestionPerformanceItem,
  type QuizAnswer,
  type ReviewStatus,
  type SchoolStage,
  type SystemRole,
  type ThemePalette,
  type TurmaSummary,
} from "../../constants/duoTheme";
import { apiClient, type ApiAuthCredentials } from "../../services/apiClient";
import { GoogleSignInButton } from "../auth/GoogleSignInButton";
import {
  DuoButton,
  DuoCard,
  InfoPill,
  StatKpiCard,
} from "../ui/DuoComponents";

type TeacherTab = "analytics" | "questions" | "classes" | "users";

export interface TeacherPanelViewProps {
  authUser: AuthUser | null;
  authToken: string | null;
  adminToken: string;
  isTeacherAccess: boolean;
  isAdmin: boolean;
  serverGoogleEnabled: boolean;
  isLoadingAuth?: boolean;
  isCheckingAuthStatus?: boolean;
  onGoogleCredential: (idToken: string) => unknown;
  onUnlockWithAdminToken: (token: string) => Promise<void>;
  onClearAdminToken: () => void;
  onCreateRoomForClass: (turmaCodigo: string) => void;
  onBackToPlay: () => void;
  palette: ThemePalette;
}

const EMPTY_FORM: QuestionPayloadInput = {
  etapa_escolar: "Superior",
  nivel_estrutural: 1,
  enunciado: "",
  opcao_a: "",
  opcao_b: "",
  opcao_c: "",
  opcao_d: "",
  resposta_correta: "A",
  explicacao: "",
  area_tematica: "Matemática",
  codigo_bncc: "",
  status_revisao: "aprovada",
};

export function TeacherPanelView({
  authUser,
  authToken,
  adminToken,
  isTeacherAccess,
  isAdmin,
  serverGoogleEnabled,
  isLoadingAuth = false,
  isCheckingAuthStatus = false,
  onGoogleCredential,
  onUnlockWithAdminToken,
  onClearAdminToken,
  onCreateRoomForClass,
  onBackToPlay,
  palette,
}: TeacherPanelViewProps) {
  const [activeTab, setActiveTab] = useState<TeacherTab>("analytics");
  const [tokenInput, setTokenInput] = useState("");
  const [unlocking, setUnlocking] = useState(false);
  const [unlockError, setUnlockError] = useState("");

  const [stageFilter, setStageFilter] = useState<SchoolStage | "">("");
  const [levelFilter, setLevelFilter] = useState<1 | 2 | 3 | "">("");
  const [statusFilter, setStatusFilter] = useState<ReviewStatus | "">("");
  const [searchQuery, setSearchQuery] = useState("");

  const [loading, setLoading] = useState(false);
  const [bannerError, setBannerError] = useState("");
  const [bannerSuccess, setBannerSuccess] = useState("");

  const [overview, setOverview] = useState<AnalyticsOverviewResponse | null>(
    null,
  );
  const [equity, setEquity] = useState<EquityAnalyticsResponse | null>(null);
  const [questions, setQuestions] = useState<QuestionAdminItem[]>([]);
  const [questionStats, setQuestionStats] = useState<QuestionPerformanceItem[]>(
    [],
  );
  const [turmas, setTurmas] = useState<TurmaSummary[]>([]);
  const [adminUsers, setAdminUsers] = useState<AuthUser[]>([]);

  // Editor de Questão
  const [showQuestionForm, setShowQuestionForm] = useState(false);
  const [editingQuestionId, setEditingQuestionId] = useState<number | null>(
    null,
  );
  const [questionForm, setQuestionForm] =
    useState<QuestionPayloadInput>(EMPTY_FORM);
  const [savingQuestion, setSavingQuestion] = useState(false);

  // Formulário de Turma
  const [newClassCode, setNewClassCode] = useState("");
  const [newClassName, setNewClassName] = useState("");
  const [newClassInst, setNewClassInst] = useState("UFRRJ — ICE");
  const [newClassStage, setNewClassStage] = useState<SchoolStage>("Superior");
  const [savingClass, setSavingClass] = useState(false);

  const credentials: ApiAuthCredentials = useMemo(
    () => ({
      authToken,
      adminToken: adminToken || undefined,
    }),
    [authToken, adminToken],
  );

  const statsByQuestionId = useMemo(() => {
    const map = new Map<number, QuestionPerformanceItem>();
    for (const item of questionStats) {
      map.set(item.pergunta_id, item);
    }
    return map;
  }, [questionStats]);

  const loadTabData = useCallback(async () => {
    if (!isTeacherAccess) return;
    setLoading(true);
    setBannerError("");
    try {
      if (activeTab === "analytics") {
        const [ov, eq] = await Promise.all([
          apiClient.getAnalyticsOverview(credentials, { etapa: stageFilter }),
          apiClient.getEquityAnalytics(credentials, { etapa: stageFilter }),
        ]);
        setOverview(ov);
        setEquity(eq);
      } else if (activeTab === "questions") {
        const [qs, perf] = await Promise.all([
          apiClient.listQuestions(credentials, {
            etapa: stageFilter,
            nivel: levelFilter,
            status: statusFilter,
            q: searchQuery,
            includeAnswer: true,
          }),
          apiClient
            .getQuestionsAnalytics(credentials, {
              etapa: stageFilter,
              nivel: levelFilter,
              status: statusFilter,
            })
            .catch(() => ({ perguntas: [] })),
        ]);
        setQuestions(qs);
        setQuestionStats(perf.perguntas ?? []);
      } else if (activeTab === "classes" && authToken) {
        const res = await apiClient.listClasses(authToken);
        setTurmas(res.turmas ?? []);
      } else if (activeTab === "users" && authToken && isAdmin) {
        const res = await apiClient.listAdminUsers(authToken);
        setAdminUsers(res.usuarios ?? []);
      }
    } catch (error) {
      setBannerError(
        error instanceof Error
          ? error.message
          : "Não foi possível carregar os dados do painel docente.",
      );
    } finally {
      setLoading(false);
    }
  }, [
    isTeacherAccess,
    activeTab,
    credentials,
    stageFilter,
    levelFilter,
    statusFilter,
    searchQuery,
    authToken,
    isAdmin,
  ]);

  useEffect(() => {
    void loadTabData();
  }, [loadTabData]);

  const handleUnlock = async () => {
    setUnlocking(true);
    setUnlockError("");
    try {
      await onUnlockWithAdminToken(tokenInput);
      setTokenInput("");
    } catch (error) {
      setUnlockError(
        error instanceof Error
          ? error.message
          : "Token administrativo inválido ou servidor indisponível.",
      );
    } finally {
      setUnlocking(false);
    }
  };

  const handleExport = async (
    dataset: "participacoes" | "respostas",
    format: "csv" | "json",
  ) => {
    setBannerError("");
    setBannerSuccess("");
    try {
      const result = await apiClient.downloadAnonymousDataset(credentials, {
        dataset,
        format,
        etapa: stageFilter,
      });
      setBannerSuccess(
        `Exportação concluída: ${result.filename}${
          result.recordCount !== undefined
            ? ` (${result.recordCount} registro(s) anonimizados)`
            : ""
        }.`,
      );
    } catch (error) {
      setBannerError(
        error instanceof Error ? error.message : "Erro ao exportar dataset.",
      );
    }
  };

  const openNewQuestion = () => {
    setEditingQuestionId(null);
    setQuestionForm({ ...EMPTY_FORM });
    setShowQuestionForm(true);
    setBannerError("");
    setBannerSuccess("");
  };

  const openEditQuestion = (item: QuestionAdminItem) => {
    setEditingQuestionId(item.id);
    setQuestionForm({
      etapa_escolar: item.etapa_escolar,
      nivel_estrutural: item.nivel_estrutural,
      enunciado: item.enunciado,
      opcao_a: item.opcao_a,
      opcao_b: item.opcao_b,
      opcao_c: item.opcao_c,
      opcao_d: item.opcao_d,
      resposta_correta: item.resposta_correta ?? "A",
      explicacao: item.explicacao ?? "",
      area_tematica: item.area_tematica ?? "",
      codigo_bncc: item.codigo_bncc ?? "",
      status_revisao: item.status_revisao ?? "aprovada",
    });
    setShowQuestionForm(true);
    setBannerError("");
    setBannerSuccess("");
  };

  const handleSaveQuestion = async () => {
    setSavingQuestion(true);
    setBannerError("");
    setBannerSuccess("");
    try {
      if (editingQuestionId) {
        await apiClient.updateQuestion(
          credentials,
          editingQuestionId,
          questionForm,
        );
        setBannerSuccess(`Pergunta #${editingQuestionId} atualizada.`);
      } else {
        const created = await apiClient.createQuestion(
          credentials,
          questionForm,
        );
        setBannerSuccess(`Pergunta #${created.id} cadastrada no banco.`);
      }
      setShowQuestionForm(false);
      setEditingQuestionId(null);
      await loadTabData();
    } catch (error) {
      setBannerError(
        error instanceof Error ? error.message : "Erro ao salvar pergunta.",
      );
    } finally {
      setSavingQuestion(false);
    }
  };

  const handleChangeQuestionStatus = async (
    id: number,
    patch: { status_revisao?: ReviewStatus; ativa?: boolean },
  ) => {
    setBannerError("");
    setBannerSuccess("");
    try {
      await apiClient.updateQuestionStatus(credentials, id, patch);
      setBannerSuccess(`Status da pergunta #${id} atualizado.`);
      await loadTabData();
    } catch (error) {
      setBannerError(
        error instanceof Error
          ? error.message
          : "Não foi possível atualizar o status.",
      );
    }
  };

  const handleCreateClass = async () => {
    if (!authToken) return;
    setSavingClass(true);
    setBannerError("");
    setBannerSuccess("");
    try {
      const { turma } = await apiClient.createClass(authToken, {
        codigo: newClassCode.trim().toUpperCase(),
        nome: newClassName.trim(),
        instituicao: newClassInst.trim() || "UFRRJ",
        etapa_padrao: newClassStage,
      });
      setBannerSuccess(`Turma ${turma.codigo} criada com sucesso!`);
      setNewClassCode("");
      setNewClassName("");
      await loadTabData();
    } catch (error) {
      setBannerError(
        error instanceof Error ? error.message : "Não foi possível criar turma.",
      );
    } finally {
      setSavingClass(false);
    }
  };

  const handleToggleClassActive = async (turma: TurmaSummary) => {
    if (!authToken) return;
    try {
      await apiClient.updateClass(authToken, turma.id, {
        ativa: turma.ativa !== 1,
      });
      await loadTabData();
    } catch (error) {
      setBannerError(
        error instanceof Error
          ? error.message
          : "Erro ao atualizar status da turma.",
      );
    }
  };

  const handleRoleChange = async (userId: number, role: SystemRole) => {
    if (!authToken) return;
    try {
      await apiClient.updateAdminUserRole(authToken, userId, role);
      setBannerSuccess("Papel do usuário atualizado.");
      await loadTabData();
    } catch (error) {
      setBannerError(
        error instanceof Error
          ? error.message
          : "Não foi possível atualizar papel.",
      );
    }
  };

  /* ---------------------------------------------------------------------- */
  /* Tela de Acesso Institucional (quando não autenticado como docente)     */
  /* ---------------------------------------------------------------------- */

  if (!isTeacherAccess) {
    return (
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { backgroundColor: palette.background },
        ]}
      >
        <View style={styles.gateWrap}>
          <DuoCard palette={palette} padding={22}>
            <View style={styles.gateHeader}>
              <InfoPill
                text="🎓 ICE • UFRRJ · Pesquisa & Docência"
                tone="purple"
                palette={palette}
              />
              <Text style={[styles.gateTitle, { color: palette.textMain }]}>
                Painel de Professores e Pesquisa
              </Text>
              <Text style={[styles.gateSub, { color: palette.textMuted }]}>
                Gerencie o banco de questões, acompanhe indicadores empíricos de
                equidade (Estatística & Probabilidade), crie turmas e exporte
                datasets anonimizados (CSV / JSON) em conformidade com a LGPD.
              </Text>
            </View>

            <View style={styles.gateSection}>
              <Text style={[styles.fieldLabel, { color: palette.textMain }]}>
                Opção 1 — Entrar com Conta Google Docente
              </Text>
              {authUser ? (
                <View
                  style={[
                    styles.infoBox,
                    {
                      backgroundColor: palette.warningBg,
                      borderColor: palette.warningBorder,
                    },
                  ]}
                >
                  <Text style={[styles.infoBoxText, { color: palette.textMain }]}>
                    Você entrou como {authUser.email} (papel atual:{" "}
                    {authUser.role}). Peça a um administrador para promover sua
                    conta para Professor ou utilize o token institucional abaixo.
                  </Text>
                </View>
              ) : (
                <GoogleSignInButton
                  onCredential={onGoogleCredential}
                  serverGoogleEnabled={serverGoogleEnabled}
                  isLoading={isLoadingAuth}
                  isCheckingStatus={isCheckingAuthStatus}
                  palette={palette}
                />
              )}
            </View>

            <View
              style={[styles.divider, { backgroundColor: palette.cardBorder }]}
            />

            <View style={styles.gateSection}>
              <Text style={[styles.fieldLabel, { color: palette.textMain }]}>
                Opção 2 — Acesso com Token Administrativo Docente
              </Text>
              <Text style={[styles.helperText, { color: palette.textMuted }]}>
                Informe o `QUESTION_ADMIN_TOKEN` do servidor para acessar
                indicadores, banco de perguntas e exportação científica
                imediatamente (mantido apenas em memória durante a sessão).
              </Text>
              <TextInput
                value={tokenInput}
                onChangeText={setTokenInput}
                placeholder="Cole o token docente aqui"
                placeholderTextColor={palette.textMuted}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                style={[
                  styles.input,
                  {
                    backgroundColor: palette.inputBg,
                    borderColor: palette.inputBorder,
                    color: palette.textMain,
                  },
                ]}
              />
              {unlockError ? (
                <Text style={[styles.errorText, { color: palette.danger }]}>
                  ⚠️ {unlockError}
                </Text>
              ) : null}
              <DuoButton
                title={unlocking ? "Validando..." : "Acessar Painel Docente"}
                icon="🔓"
                variant="purple"
                disabled={unlocking || !tokenInput.trim()}
                onPress={() => void handleUnlock()}
                palette={palette}
              />
            </View>

            <View style={styles.gateFooter}>
              <DuoButton
                title="← Voltar ao Jogo"
                variant="ghost"
                size="sm"
                onPress={onBackToPlay}
                palette={palette}
              />
            </View>
          </DuoCard>
        </View>
      </ScrollView>
    );
  }

  /* ---------------------------------------------------------------------- */
  /* Painel Docente Autorizado                                              */
  /* ---------------------------------------------------------------------- */

  return (
    <ScrollView
      contentContainerStyle={[
        styles.content,
        { backgroundColor: palette.background },
      ]}
    >
      <View style={styles.wrap}>
        {/* Cabeçalho do Painel */}
        <DuoCard palette={palette} padding={16}>
          <View style={styles.topRow}>
            <View style={styles.topInfo}>
              <Text style={[styles.panelTitle, { color: palette.textMain }]}>
                📊 Painel Docente & Pesquisa — ICE • UFRRJ
              </Text>
              <Text style={[styles.panelSub, { color: palette.textMuted }]}>
                {authUser
                  ? `Autenticado como ${authUser.nome} (${authUser.role})`
                  : "Sessão autenticada via Token Docente Institucional"}
              </Text>
            </View>
            <View style={styles.topButtons}>
              <DuoButton
                title="Atualizar"
                icon="🔄"
                variant="ghost"
                size="sm"
                fullWidth={false}
                onPress={() => void loadTabData()}
                palette={palette}
              />
              {adminToken && !authUser ? (
                <DuoButton
                  title="Bloquear"
                  variant="danger"
                  size="sm"
                  fullWidth={false}
                  onPress={onClearAdminToken}
                  palette={palette}
                />
              ) : null}
              <DuoButton
                title="Voltar ao Jogo"
                variant="secondary"
                size="sm"
                fullWidth={false}
                onPress={onBackToPlay}
                palette={palette}
              />
            </View>
          </View>

          {/* Abas */}
          <View style={styles.tabsRow}>
            <DuoButton
              title="📈 Indicadores & LGPD"
              variant={activeTab === "analytics" ? "purple" : "ghost"}
              selected={activeTab === "analytics"}
              size="sm"
              fullWidth={false}
              onPress={() => setActiveTab("analytics")}
              palette={palette}
            />
            <DuoButton
              title="📚 Banco de Questões"
              variant={activeTab === "questions" ? "purple" : "ghost"}
              selected={activeTab === "questions"}
              size="sm"
              fullWidth={false}
              onPress={() => setActiveTab("questions")}
              palette={palette}
            />
            <DuoButton
              title="🎓 Turmas"
              variant={activeTab === "classes" ? "purple" : "ghost"}
              selected={activeTab === "classes"}
              size="sm"
              fullWidth={false}
              onPress={() => setActiveTab("classes")}
              palette={palette}
            />
            {isAdmin ? (
              <DuoButton
                title="👥 Usuários"
                variant={activeTab === "users" ? "purple" : "ghost"}
                selected={activeTab === "users"}
                size="sm"
                fullWidth={false}
                onPress={() => setActiveTab("users")}
                palette={palette}
              />
            ) : null}
          </View>
        </DuoCard>

        {bannerError ? (
          <DuoCard palette={palette} variant="danger" padding={12}>
            <Text style={[styles.bannerText, { color: palette.textMain }]}>
              ⚠️ {bannerError}
            </Text>
          </DuoCard>
        ) : null}

        {bannerSuccess ? (
          <DuoCard palette={palette} variant="success" padding={12}>
            <Text style={[styles.bannerText, { color: palette.textMain }]}>
              ✅ {bannerSuccess}
            </Text>
          </DuoCard>
        ) : null}

        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={palette.purple} />
            <Text style={[styles.helperText, { color: palette.textMuted }]}>
              Carregando dados do banco...
            </Text>
          </View>
        ) : null}

        {/* ============================================================== */}
        {/* ABA 1: INDICADORES & EXPORTAÇÃO CIENTÍFICA                     */}
        {/* ============================================================== */}
        {activeTab === "analytics" ? (
          <>
            {/* Filtro de Etapa */}
            <DuoCard palette={palette} padding={14}>
              <View style={styles.filterRow}>
                <Text style={[styles.filterLabel, { color: palette.textMuted }]}>
                  Filtrar por etapa:
                </Text>
                <DuoButton
                  title="Todas"
                  variant={stageFilter === "" ? "secondary" : "ghost"}
                  size="sm"
                  fullWidth={false}
                  onPress={() => setStageFilter("")}
                  palette={palette}
                />
                {SCHOOL_STAGES.map((stage) => (
                  <DuoButton
                    key={stage}
                    title={stage}
                    variant={stageFilter === stage ? "secondary" : "ghost"}
                    size="sm"
                    fullWidth={false}
                    onPress={() => setStageFilter(stage)}
                    palette={palette}
                  />
                ))}
              </View>
            </DuoCard>

            {/* KPIs */}
            <View style={styles.kpiRow}>
              <StatKpiCard
                label="Partidas"
                value={String(overview?.partidas.total_partidas ?? 0)}
                hint={`Média ${formatDecimal(overview?.partidas.rodadas_media, 1)} rodadas`}
                icon="🎲"
                palette={palette}
              />
              <StatKpiCard
                label="Participações"
                value={String(overview?.partidas.total_participacoes ?? 0)}
                hint={`${overview?.partidas.total_obstaculos ?? 0} obstáculos · ${overview?.partidas.total_impulsos ?? 0} impulsos`}
                icon="👥"
                accentColor={palette.secondaryBorder}
                palette={palette}
              />
              <StatKpiCard
                label="Acerto Global (Quiz)"
                value={formatPercent(overview?.quiz.taxa_acerto_global)}
                hint={`${overview?.quiz.total_acertos ?? 0}/${overview?.quiz.total_respostas ?? 0} respostas`}
                icon="✅"
                accentColor={palette.primaryBorder}
                palette={palette}
              />
              <StatKpiCard
                label="Tempo Médio Resposta"
                value={formatSecondsFromMs(overview?.quiz.tempo_medio_ms)}
                hint={`Duração média: ${formatDecimal(overview?.partidas.duracao_media_seg, 0)}s`}
                icon="⏱️"
                accentColor={palette.purpleBorder}
                palette={palette}
              />
            </View>

            {/* Exportação Científica Anonimizada */}
            <DuoCard palette={palette} variant="purple" padding={16}>
              <Text style={[styles.sectionTitle, { color: palette.textMain }]}>
                📥 Exportação Científica Anonimizada (R / Python / SPSS)
              </Text>
              <Text style={[styles.helperText, { color: palette.textMain }]}>
                Gera arquivos prontos para análise estatística (ANOVA, Qui-Quadrado,
                TRI/Rasch, Modelos Mistos) contendo exclusivamente participantes
                com consentimento LGPD ativo e identificadores pseudonimizados
                (`participante_anon_id`), sem nome nem e-mail.
              </Text>
              <View style={styles.exportRow}>
                <DuoButton
                  title="Participações (.CSV)"
                  icon="📊"
                  variant="primary"
                  size="sm"
                  fullWidth={false}
                  onPress={() => void handleExport("participacoes", "csv")}
                  palette={palette}
                />
                <DuoButton
                  title="Participações (.JSON)"
                  icon="📄"
                  variant="secondary"
                  size="sm"
                  fullWidth={false}
                  onPress={() => void handleExport("participacoes", "json")}
                  palette={palette}
                />
                <DuoButton
                  title="Respostas por Item (.CSV)"
                  icon="🧪"
                  variant="primary"
                  size="sm"
                  fullWidth={false}
                  onPress={() => void handleExport("respostas", "csv")}
                  palette={palette}
                />
                <DuoButton
                  title="Respostas por Item (.JSON)"
                  icon="📄"
                  variant="secondary"
                  size="sm"
                  fullWidth={false}
                  onPress={() => void handleExport("respostas", "json")}
                  palette={palette}
                />
              </View>
            </DuoCard>

            {/* Equidade por Condição */}
            <DuoCard palette={palette} padding={16}>
              <Text style={[styles.sectionTitle, { color: palette.textMain }]}>
                ⚖️ Equidade por Perspectiva (vw_equidade_por_condicao)
              </Text>
              {!equity || equity.porCondicao.length === 0 ? (
                <Text style={[styles.helperText, { color: palette.textMuted }]}>
                  Ainda não há partidas concluídas persistidas neste recorte.
                  Conclua uma partida após aplicar as migrations 002 e 003 para
                  visualizar a distribuição empírica por perspectiva.
                </Text>
              ) : (
                <View style={styles.dataList}>
                  {equity.porCondicao.map((row, idx) => {
                    const meta = getConditionMeta(row.condicao);
                    return (
                      <View
                        key={`${row.etapa_escolar}-${row.condicao}-${idx}`}
                        style={[
                          styles.dataCard,
                          {
                            backgroundColor: palette.surfaceAlt,
                            borderColor: meta.color,
                          },
                        ]}
                      >
                        <View style={styles.dataTop}>
                          <Text
                            style={[styles.dataTitle, { color: meta.color }]}
                          >
                            {meta.personaIcon} {meta.label}
                          </Text>
                          <InfoPill
                            text={`${row.etapa_escolar} · N=${row.total_participacoes}`}
                            tone="neutral"
                            palette={palette}
                          />
                        </View>
                        <View style={styles.pillGroup}>
                          <InfoPill
                            text={`Vitória: ${formatPercent(row.taxa_vitoria)}`}
                            tone="warning"
                            palette={palette}
                          />
                          <InfoPill
                            text={`Pos. média: ${formatDecimal(row.posicao_media, 1)}`}
                            tone="secondary"
                            palette={palette}
                          />
                          <InfoPill
                            text={`Dado médio: ${formatDecimal(row.media_dado_geral, 2)}`}
                            tone="neutral"
                            palette={palette}
                          />
                          <InfoPill
                            text={`Acerto quiz: ${formatPercent(row.taxa_acerto_quiz)}`}
                            tone="primary"
                            palette={palette}
                          />
                          <InfoPill
                            text={`N1:${row.total_nivel1} · N2:${row.total_nivel2} · N3:${row.total_nivel3}`}
                            tone="purple"
                            palette={palette}
                          />
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}
            </DuoCard>

            {/* Matriz Empírica Obstáculo × Condição */}
            <DuoCard palette={palette} padding={16}>
              <Text style={[styles.sectionTitle, { color: palette.textMain }]}>
                🧮 Matriz Empírica: Obstáculo × Condição (vw_matriz_empirica)
              </Text>
              {!equity || equity.matrizEmpirica.length === 0 ? (
                <Text style={[styles.helperText, { color: palette.textMuted }]}>
                  Sem observações empíricas de quiz para este filtro ainda.
                </Text>
              ) : (
                <View style={styles.dataList}>
                  {equity.matrizEmpirica.map((row, idx) => {
                    const meta = getConditionMeta(row.condicao);
                    return (
                      <View
                        key={`${row.obstaculo_nome}-${row.condicao}-${idx}`}
                        style={[
                          styles.dataCard,
                          {
                            backgroundColor: palette.surfaceAlt,
                            borderColor: palette.cardBorder,
                          },
                        ]}
                      >
                        <View style={styles.dataTop}>
                          <Text
                            style={[
                              styles.dataTitle,
                              { color: palette.textMain },
                            ]}
                          >
                            {OBSTACLE_LABELS_BY_KEY[row.obstaculo_nome] ??
                              row.obstaculo_nome}{" "}
                            × {meta.personaIcon} {meta.shortLabel}
                          </Text>
                          <InfoPill
                            text={`Nível ${row.nivel_estrutural} · N=${row.total_observacoes}`}
                            tone="purple"
                            palette={palette}
                          />
                        </View>
                        <View style={styles.pillGroup}>
                          <InfoPill
                            text={`Acerto (resp.): ${formatPercent(row.taxa_acerto_respondidas)}`}
                            tone="primary"
                            palette={palette}
                          />
                          <InfoPill
                            text={`Acerto (global): ${formatPercent(row.taxa_acerto_global)}`}
                            tone="secondary"
                            palette={palette}
                          />
                          <InfoPill
                            text={`Timeout: ${formatPercent(row.taxa_timeout_ou_saida)}`}
                            tone="warning"
                            palette={palette}
                          />
                          <InfoPill
                            text={`Tempo: ${formatSecondsFromMs(row.tempo_medio_ms)}`}
                            tone="neutral"
                            palette={palette}
                          />
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}
            </DuoCard>
          </>
        ) : null}

        {/* ============================================================== */}
        {/* ABA 2: BANCO DE QUESTÕES & DIAGNÓSTICO PSICOMÉTRICO            */}
        {/* ============================================================== */}
        {activeTab === "questions" ? (
          <>
            <DuoCard palette={palette} padding={16}>
              <View style={styles.topRow}>
                <Text style={[styles.sectionTitle, { color: palette.textMain }]}>
                  📚 Acervo de Perguntas ({questions.length})
                </Text>
                <DuoButton
                  title={showQuestionForm ? "Fechar Formulário" : "Nova Pergunta"}
                  icon={showQuestionForm ? "✕" : "➕"}
                  variant={showQuestionForm ? "ghost" : "primary"}
                  size="sm"
                  fullWidth={false}
                  onPress={() =>
                    showQuestionForm
                      ? setShowQuestionForm(false)
                      : openNewQuestion()
                  }
                  palette={palette}
                />
              </View>

              {/* Filtros */}
              <View style={styles.filterGroup}>
                <TextInput
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder="Buscar no enunciado..."
                  placeholderTextColor={palette.textMuted}
                  style={[
                    styles.input,
                    {
                      backgroundColor: palette.inputBg,
                      borderColor: palette.inputBorder,
                      color: palette.textMain,
                    },
                  ]}
                />
                <View style={styles.filterRow}>
                  <DuoButton
                    title="Todas etapas"
                    variant={stageFilter === "" ? "secondary" : "ghost"}
                    size="sm"
                    fullWidth={false}
                    onPress={() => setStageFilter("")}
                    palette={palette}
                  />
                  {SCHOOL_STAGES.map((stage) => (
                    <DuoButton
                      key={stage}
                      title={stage}
                      variant={stageFilter === stage ? "secondary" : "ghost"}
                      size="sm"
                      fullWidth={false}
                      onPress={() => setStageFilter(stage)}
                      palette={palette}
                    />
                  ))}
                </View>
                <View style={styles.filterRow}>
                  <DuoButton
                    title="Todos níveis"
                    variant={levelFilter === "" ? "secondary" : "ghost"}
                    size="sm"
                    fullWidth={false}
                    onPress={() => setLevelFilter("")}
                    palette={palette}
                  />
                  {([1, 2, 3] as const).map((lvl) => (
                    <DuoButton
                      key={lvl}
                      title={`Nível ${lvl}`}
                      variant={levelFilter === lvl ? "secondary" : "ghost"}
                      size="sm"
                      fullWidth={false}
                      onPress={() => setLevelFilter(lvl)}
                      palette={palette}
                    />
                  ))}
                  <DuoButton
                    title="Todos status"
                    variant={statusFilter === "" ? "purple" : "ghost"}
                    size="sm"
                    fullWidth={false}
                    onPress={() => setStatusFilter("")}
                    palette={palette}
                  />
                  {REVIEW_STATUSES.map((st) => (
                    <DuoButton
                      key={st}
                      title={REVIEW_STATUS_META[st].label}
                      variant={statusFilter === st ? "purple" : "ghost"}
                      size="sm"
                      fullWidth={false}
                      onPress={() => setStatusFilter(st)}
                      palette={palette}
                    />
                  ))}
                </View>
              </View>
            </DuoCard>

            {/* Formulário de Criação / Edição */}
            {showQuestionForm ? (
              <DuoCard palette={palette} variant="highlight" padding={18}>
                <Text style={[styles.sectionTitle, { color: palette.textMain }]}>
                  {editingQuestionId
                    ? `✏️ Editar Pergunta #${editingQuestionId}`
                    : "➕ Cadastrar Nova Pergunta"}
                </Text>

                <Text style={[styles.fieldLabel, { color: palette.textMuted }]}>
                  Etapa Escolar
                </Text>
                <View style={styles.filterRow}>
                  {SCHOOL_STAGES.map((stage) => (
                    <DuoButton
                      key={stage}
                      title={stage}
                      variant={
                        questionForm.etapa_escolar === stage
                          ? "primary"
                          : "ghost"
                      }
                      size="sm"
                      fullWidth={false}
                      onPress={() =>
                        setQuestionForm((f) => ({ ...f, etapa_escolar: stage }))
                      }
                      palette={palette}
                    />
                  ))}
                </View>

                <Text style={[styles.fieldLabel, { color: palette.textMuted }]}>
                  Nível Estrutural (1 = Acesso pleno · 2 = Médio · 3 = Barreira severa)
                </Text>
                <View style={styles.filterRow}>
                  {([1, 2, 3] as const).map((lvl) => (
                    <DuoButton
                      key={lvl}
                      title={`Nível ${lvl}`}
                      variant={
                        questionForm.nivel_estrutural === lvl
                          ? "purple"
                          : "ghost"
                      }
                      size="sm"
                      fullWidth={false}
                      onPress={() =>
                        setQuestionForm((f) => ({ ...f, nivel_estrutural: lvl }))
                      }
                      palette={palette}
                    />
                  ))}
                </View>

                <View style={styles.twoColRow}>
                  <View style={styles.flexOne}>
                    <Text
                      style={[styles.fieldLabel, { color: palette.textMuted }]}
                    >
                      Área Temática
                    </Text>
                    <TextInput
                      value={questionForm.area_tematica ?? ""}
                      onChangeText={(v) =>
                        setQuestionForm((f) => ({ ...f, area_tematica: v }))
                      }
                      placeholder="Ex.: Matemática, Estatística, Cidadania"
                      placeholderTextColor={palette.textMuted}
                      style={[
                        styles.input,
                        {
                          backgroundColor: palette.inputBg,
                          borderColor: palette.inputBorder,
                          color: palette.textMain,
                        },
                      ]}
                    />
                  </View>
                  <View style={styles.flexOne}>
                    <Text
                      style={[styles.fieldLabel, { color: palette.textMuted }]}
                    >
                      Código BNCC / Referência (opcional)
                    </Text>
                    <TextInput
                      value={questionForm.codigo_bncc ?? ""}
                      onChangeText={(v) =>
                        setQuestionForm((f) => ({
                          ...f,
                          codigo_bncc: v.toUpperCase(),
                        }))
                      }
                      placeholder="Ex.: EM13MAT102"
                      placeholderTextColor={palette.textMuted}
                      style={[
                        styles.input,
                        {
                          backgroundColor: palette.inputBg,
                          borderColor: palette.inputBorder,
                          color: palette.textMain,
                        },
                      ]}
                    />
                  </View>
                </View>

                <Text style={[styles.fieldLabel, { color: palette.textMuted }]}>
                  Enunciado *
                </Text>
                <TextInput
                  value={questionForm.enunciado}
                  onChangeText={(v) =>
                    setQuestionForm((f) => ({ ...f, enunciado: v }))
                  }
                  multiline
                  numberOfLines={3}
                  placeholder="Digite o enunciado da questão..."
                  placeholderTextColor={palette.textMuted}
                  style={[
                    styles.textArea,
                    {
                      backgroundColor: palette.inputBg,
                      borderColor: palette.inputBorder,
                      color: palette.textMain,
                    },
                  ]}
                />

                {(
                  [
                    ["A", "opcao_a"],
                    ["B", "opcao_b"],
                    ["C", "opcao_c"],
                    ["D", "opcao_d"],
                  ] as const
                ).map(([letter, field]) => (
                  <View key={letter}>
                    <Text
                      style={[styles.fieldLabel, { color: palette.textMuted }]}
                    >
                      Alternativa {letter} *
                    </Text>
                    <TextInput
                      value={questionForm[field]}
                      onChangeText={(v) =>
                        setQuestionForm((f) => ({ ...f, [field]: v }))
                      }
                      placeholder={`Texto da alternativa ${letter}`}
                      placeholderTextColor={palette.textMuted}
                      style={[
                        styles.input,
                        {
                          backgroundColor: palette.inputBg,
                          borderColor: palette.inputBorder,
                          color: palette.textMain,
                        },
                      ]}
                    />
                  </View>
                ))}

                <Text style={[styles.fieldLabel, { color: palette.textMuted }]}>
                  Gabarito (Resposta Correta) *
                </Text>
                <View style={styles.filterRow}>
                  {QUIZ_ANSWERS.map((ans: QuizAnswer) => (
                    <DuoButton
                      key={ans}
                      title={ans}
                      variant={
                        questionForm.resposta_correta === ans
                          ? "primary"
                          : "ghost"
                      }
                      size="sm"
                      fullWidth={false}
                      onPress={() =>
                        setQuestionForm((f) => ({ ...f, resposta_correta: ans }))
                      }
                      palette={palette}
                    />
                  ))}
                </View>

                <Text style={[styles.fieldLabel, { color: palette.textMuted }]}>
                  Explicação Pedagógica (exibida no feedback do quiz)
                </Text>
                <TextInput
                  value={questionForm.explicacao ?? ""}
                  onChangeText={(v) =>
                    setQuestionForm((f) => ({ ...f, explicacao: v }))
                  }
                  multiline
                  numberOfLines={2}
                  placeholder="Explique por que o gabarito está correto..."
                  placeholderTextColor={palette.textMuted}
                  style={[
                    styles.textArea,
                    {
                      backgroundColor: palette.inputBg,
                      borderColor: palette.inputBorder,
                      color: palette.textMain,
                    },
                  ]}
                />

                <Text style={[styles.fieldLabel, { color: palette.textMuted }]}>
                  Status de Curadoria
                </Text>
                <View style={styles.filterRow}>
                  {REVIEW_STATUSES.map((st) => (
                    <DuoButton
                      key={st}
                      title={`${REVIEW_STATUS_META[st].icon} ${REVIEW_STATUS_META[st].label}`}
                      variant={
                        questionForm.status_revisao === st ? "purple" : "ghost"
                      }
                      size="sm"
                      fullWidth={false}
                      onPress={() =>
                        setQuestionForm((f) => ({ ...f, status_revisao: st }))
                      }
                      palette={palette}
                    />
                  ))}
                </View>

                <View style={styles.formActionsRow}>
                  <DuoButton
                    title="Cancelar"
                    variant="ghost"
                    size="md"
                    fullWidth={false}
                    onPress={() => setShowQuestionForm(false)}
                    palette={palette}
                  />
                  <DuoButton
                    title={savingQuestion ? "Salvando..." : "Salvar Pergunta"}
                    icon="💾"
                    variant="primary"
                    size="md"
                    fullWidth={false}
                    disabled={savingQuestion}
                    onPress={() => void handleSaveQuestion()}
                    palette={palette}
                  />
                </View>
              </DuoCard>
            ) : null}

            {/* Lista de Questões */}
            <View style={styles.dataList}>
              {questions.map((q) => {
                const perf = statsByQuestionId.get(q.id);
                const isActive = q.ativa !== 0 && q.ativa !== false;
                const revStatus = q.status_revisao ?? "aprovada";

                return (
                  <DuoCard key={q.id} palette={palette} padding={14}>
                    <View style={styles.dataTop}>
                      <View style={styles.pillGroup}>
                        <InfoPill
                          text={`#${q.id}`}
                          tone="neutral"
                          palette={palette}
                        />
                        <InfoPill
                          text={q.etapa_escolar}
                          tone="secondary"
                          palette={palette}
                        />
                        <InfoPill
                          text={`Nível ${q.nivel_estrutural}`}
                          tone="purple"
                          palette={palette}
                        />
                        <InfoPill
                          text={`${REVIEW_STATUS_META[revStatus].icon} ${REVIEW_STATUS_META[revStatus].label}`}
                          tone={
                            revStatus === "aprovada"
                              ? "primary"
                              : revStatus === "arquivada"
                                ? "danger"
                                : "warning"
                          }
                          palette={palette}
                        />
                        {q.area_tematica ? (
                          <InfoPill
                            text={q.area_tematica}
                            tone="neutral"
                            palette={palette}
                          />
                        ) : null}
                        {q.resposta_correta ? (
                          <InfoPill
                            text={`Gabarito: ${q.resposta_correta}`}
                            tone="primary"
                            palette={palette}
                          />
                        ) : null}
                      </View>
                    </View>

                    <Text
                      style={[styles.questionBody, { color: palette.textMain }]}
                    >
                      {q.enunciado}
                    </Text>

                    <View style={styles.optionsMiniList}>
                      <Text
                        style={[styles.optionMini, { color: palette.textMuted }]}
                      >
                        A) {q.opcao_a} · B) {q.opcao_b}
                      </Text>
                      <Text
                        style={[styles.optionMini, { color: palette.textMuted }]}
                      >
                        C) {q.opcao_c} · D) {q.opcao_d}
                      </Text>
                    </View>

                    {perf && perf.total_aplicacoes > 0 ? (
                      <View style={styles.pillGroup}>
                        <InfoPill
                          text={`Aplicações: ${perf.total_aplicacoes}`}
                          tone="neutral"
                          palette={palette}
                        />
                        <InfoPill
                          text={`Facilidade p: ${formatPercent(perf.taxa_acerto_respondidas)}`}
                          tone="primary"
                          palette={palette}
                        />
                        <InfoPill
                          text={`Tempo: ${formatSecondsFromMs(perf.tempo_medio_ms)}`}
                          tone="secondary"
                          palette={palette}
                        />
                        <InfoPill
                          text={`Distratores A:${perf.escolhas_a} B:${perf.escolhas_b} C:${perf.escolhas_c} D:${perf.escolhas_d}`}
                          tone="purple"
                          palette={palette}
                        />
                      </View>
                    ) : null}

                    <View style={styles.itemActionsRow}>
                      <DuoButton
                        title="Editar"
                        icon="✏️"
                        variant="ghost"
                        size="sm"
                        fullWidth={false}
                        onPress={() => openEditQuestion(q)}
                        palette={palette}
                      />
                      {revStatus !== "aprovada" ? (
                        <DuoButton
                          title="Aprovar"
                          icon="✅"
                          variant="primary"
                          size="sm"
                          fullWidth={false}
                          onPress={() =>
                            void handleChangeQuestionStatus(q.id, {
                              status_revisao: "aprovada",
                              ativa: true,
                            })
                          }
                          palette={palette}
                        />
                      ) : null}
                      <DuoButton
                        title={isActive ? "Arquivar" : "Reativar"}
                        variant={isActive ? "danger" : "secondary"}
                        size="sm"
                        fullWidth={false}
                        onPress={() =>
                          void handleChangeQuestionStatus(q.id, {
                            status_revisao: isActive ? "arquivada" : "aprovada",
                            ativa: !isActive,
                          })
                        }
                        palette={palette}
                      />
                    </View>
                  </DuoCard>
                );
              })}
            </View>
          </>
        ) : null}

        {/* ============================================================== */}
        {/* ABA 3: TURMAS PEDAGÓGICAS                                      */}
        {/* ============================================================== */}
        {activeTab === "classes" ? (
          !authToken ? (
            <DuoCard palette={palette} variant="warning" padding={18}>
              <Text style={[styles.sectionTitle, { color: palette.textMain }]}>
                🎓 Gestão de Turmas requer Conta Google Docente
              </Text>
              <Text style={[styles.helperText, { color: palette.textMain }]}>
                Cada turma fica vinculada ao docente responsável no banco de
                dados. Entre com sua conta Google de professor/admin para criar
                e gerenciar códigos de turma (ex.: MAT101-2026A).
              </Text>
            </DuoCard>
          ) : (
            <>
              <DuoCard palette={palette} padding={16}>
                <Text style={[styles.sectionTitle, { color: palette.textMain }]}>
                  ➕ Criar Nova Turma / Sessão Pedagógica
                </Text>
                <View style={styles.twoColRow}>
                  <View style={styles.flexOne}>
                    <Text
                      style={[styles.fieldLabel, { color: palette.textMuted }]}
                    >
                      Código da Turma (3–16 chars)
                    </Text>
                    <TextInput
                      value={newClassCode}
                      onChangeText={(v) => setNewClassCode(v.toUpperCase())}
                      placeholder="Ex.: MAT101-2026A"
                      placeholderTextColor={palette.textMuted}
                      maxLength={16}
                      autoCapitalize="characters"
                      style={[
                        styles.input,
                        {
                          backgroundColor: palette.inputBg,
                          borderColor: palette.inputBorder,
                          color: palette.textMain,
                        },
                      ]}
                    />
                  </View>
                  <View style={styles.flexOne}>
                    <Text
                      style={[styles.fieldLabel, { color: palette.textMuted }]}
                    >
                      Nome da Turma / Disciplina
                    </Text>
                    <TextInput
                      value={newClassName}
                      onChangeText={setNewClassName}
                      placeholder="Ex.: Estatística Aplicada — Turma A"
                      placeholderTextColor={palette.textMuted}
                      maxLength={120}
                      style={[
                        styles.input,
                        {
                          backgroundColor: palette.inputBg,
                          borderColor: palette.inputBorder,
                          color: palette.textMain,
                        },
                      ]}
                    />
                  </View>
                </View>

                <Text style={[styles.fieldLabel, { color: palette.textMuted }]}>
                  Instituição / Departamento
                </Text>
                <TextInput
                  value={newClassInst}
                  onChangeText={setNewClassInst}
                  placeholder="Ex.: UFRRJ — ICE / Depto. Matemática"
                  placeholderTextColor={palette.textMuted}
                  style={[
                    styles.input,
                    {
                      backgroundColor: palette.inputBg,
                      borderColor: palette.inputBorder,
                      color: palette.textMain,
                    },
                  ]}
                />

                <Text style={[styles.fieldLabel, { color: palette.textMuted }]}>
                  Etapa Escolar Padrão
                </Text>
                <View style={styles.filterRow}>
                  {SCHOOL_STAGES.map((stage) => (
                    <DuoButton
                      key={stage}
                      title={stage}
                      variant={newClassStage === stage ? "primary" : "ghost"}
                      size="sm"
                      fullWidth={false}
                      onPress={() => setNewClassStage(stage)}
                      palette={palette}
                    />
                  ))}
                </View>

                <View style={styles.saveWrap}>
                  <DuoButton
                    title={savingClass ? "Criando..." : "Criar Turma"}
                    icon="🎓"
                    disabled={
                      savingClass ||
                      newClassCode.trim().length < 3 ||
                      newClassName.trim().length < 2
                    }
                    onPress={() => void handleCreateClass()}
                    palette={palette}
                  />
                </View>
              </DuoCard>

              <DuoCard palette={palette} padding={16}>
                <Text style={[styles.sectionTitle, { color: palette.textMain }]}>
                  📋 Turmas Cadastradas ({turmas.length})
                </Text>
                {turmas.length === 0 ? (
                  <Text style={[styles.helperText, { color: palette.textMuted }]}>
                    Nenhuma turma cadastrada ainda.
                  </Text>
                ) : (
                  <View style={styles.dataList}>
                    {turmas.map((t) => (
                      <View
                        key={t.id}
                        style={[
                          styles.dataCard,
                          {
                            backgroundColor: palette.surfaceAlt,
                            borderColor:
                              t.ativa === 1
                                ? palette.purpleBorder
                                : palette.cardBorder,
                          },
                        ]}
                      >
                        <View style={styles.dataTop}>
                          <Text
                            style={[styles.dataTitle, { color: palette.textMain }]}
                          >
                            {t.codigo} — {t.nome}
                          </Text>
                          <InfoPill
                            text={t.ativa === 1 ? "Ativa" : "Inativa"}
                            tone={t.ativa === 1 ? "primary" : "danger"}
                            palette={palette}
                          />
                        </View>
                        <View style={styles.pillGroup}>
                          <InfoPill
                            text={t.etapa_padrao}
                            tone="secondary"
                            palette={palette}
                          />
                          {t.instituicao ? (
                            <InfoPill
                              text={t.instituicao}
                              tone="neutral"
                              palette={palette}
                            />
                          ) : null}
                          <InfoPill
                            text={`🎲 ${t.total_partidas ?? 0} partida(s)`}
                            tone="purple"
                            palette={palette}
                          />
                        </View>
                        <View style={styles.itemActionsRow}>
                          {t.ativa === 1 ? (
                            <DuoButton
                              title="Criar Sala para esta Turma"
                              icon="🚀"
                              variant="primary"
                              size="sm"
                              fullWidth={false}
                              onPress={() => onCreateRoomForClass(t.codigo)}
                              palette={palette}
                            />
                          ) : null}
                          <DuoButton
                            title={t.ativa === 1 ? "Desativar" : "Reativar"}
                            variant="ghost"
                            size="sm"
                            fullWidth={false}
                            onPress={() => void handleToggleClassActive(t)}
                            palette={palette}
                          />
                        </View>
                      </View>
                    ))}
                  </View>
                )}
              </DuoCard>
            </>
          )
        ) : null}

        {/* ============================================================== */}
        {/* ABA 4: USUÁRIOS & PAPÉIS RBAC (ADMIN ONLY)                     */}
        {/* ============================================================== */}
        {activeTab === "users" && isAdmin ? (
          <DuoCard palette={palette} padding={16}>
            <Text style={[styles.sectionTitle, { color: palette.textMain }]}>
              👥 Administração de Usuários ({adminUsers.length})
            </Text>
            <Text style={[styles.helperText, { color: palette.textMuted }]}>
              Promova docentes (ex.: professores do ICE-UFRRJ) para `professor`
              ou `admin` assim que fizerem o primeiro login com Google.
            </Text>
            <View style={styles.dataList}>
              {adminUsers.map((u) => (
                <View
                  key={u.id}
                  style={[
                    styles.dataCard,
                    {
                      backgroundColor: palette.surfaceAlt,
                      borderColor: palette.cardBorder,
                    },
                  ]}
                >
                  <View style={styles.dataTop}>
                    <View>
                      <Text
                        style={[styles.dataTitle, { color: palette.textMain }]}
                      >
                        {u.nome}
                      </Text>
                      <Text
                        style={[styles.optionMini, { color: palette.textMuted }]}
                      >
                        {u.email}
                      </Text>
                    </View>
                    <InfoPill
                      text={u.role}
                      tone={u.role === "jogador" ? "neutral" : "purple"}
                      palette={palette}
                    />
                  </View>
                  <View style={styles.filterRow}>
                    {SYSTEM_ROLES.map((role) => (
                      <DuoButton
                        key={role}
                        title={role}
                        variant={u.role === role ? "purple" : "ghost"}
                        size="sm"
                        fullWidth={false}
                        disabled={u.role === role}
                        onPress={() => void handleRoleChange(u.id, role)}
                        palette={palette}
                      />
                    ))}
                  </View>
                </View>
              ))}
            </View>
          </DuoCard>
        ) : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, alignItems: "center", padding: 16 },
  gateWrap: { width: "100%", maxWidth: 580 },
  gateHeader: { alignItems: "center", gap: 8, marginBottom: 16 },
  gateTitle: { fontSize: 22, fontWeight: "900", textAlign: "center" },
  gateSub: { fontSize: 13, fontWeight: "700", textAlign: "center", lineHeight: 19 },
  gateSection: { gap: 10 },
  gateFooter: { marginTop: 16 },
  infoBox: { borderRadius: 12, borderWidth: 2, padding: 12 },
  infoBoxText: { fontSize: 12, fontWeight: "700", lineHeight: 18 },
  divider: { height: 2, marginVertical: 16, opacity: 0.7 },
  wrap: { width: "100%", maxWidth: 1080, gap: 14 },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 10,
  },
  topInfo: { flex: 1, minWidth: 220, gap: 3 },
  panelTitle: { fontSize: 18, fontWeight: "900" },
  panelSub: { fontSize: 12, fontWeight: "700" },
  topButtons: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  tabsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 },
  bannerText: { fontSize: 13, fontWeight: "800" },
  loadingWrap: { alignItems: "center", padding: 16, gap: 8 },
  sectionTitle: { fontSize: 16, fontWeight: "900", marginBottom: 6 },
  fieldLabel: { fontSize: 12, fontWeight: "800", marginTop: 10, marginBottom: 4 },
  helperText: { fontSize: 12, fontWeight: "700", lineHeight: 18 },
  errorText: { fontSize: 12, fontWeight: "800" },
  input: {
    borderRadius: 12,
    borderWidth: 2,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 14,
    fontWeight: "700",
  },
  textArea: {
    borderRadius: 12,
    borderWidth: 2,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    fontWeight: "700",
    minHeight: 72,
    textAlignVertical: "top",
  },
  filterGroup: { gap: 10, marginTop: 8 },
  filterRow: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 6 },
  filterLabel: { fontSize: 12, fontWeight: "800", marginRight: 4 },
  kpiRow: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  exportRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 },
  dataList: { gap: 10, marginTop: 8 },
  dataCard: {
    borderRadius: 14,
    borderWidth: 2,
    padding: 12,
    gap: 8,
  },
  dataTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 8,
  },
  dataTitle: { fontSize: 14, fontWeight: "900" },
  pillGroup: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  twoColRow: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  flexOne: { flex: 1, minWidth: 200 },
  formActionsRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
    marginTop: 14,
  },
  questionBody: {
    fontSize: 14,
    fontWeight: "800",
    lineHeight: 20,
    marginVertical: 6,
  },
  optionsMiniList: { gap: 2, marginBottom: 8 },
  optionMini: { fontSize: 12, fontWeight: "700" },
  itemActionsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 10,
  },
  saveWrap: { marginTop: 14 },
});
