// frontend/src/components/profile/ProfileView.tsx
// Perfil do Jogador v2.0 — Preferências, consentimento LGPD, perspectivas vivenciadas e histórico.

import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import {
  ALL_CONDITIONS,
  AVATAR_IDS,
  formatDecimal,
  formatPercent,
  getConditionMeta,
  type AuthUser,
  type ThemePalette,
  type UserMatchHistoryResponse,
} from "../../constants/duoTheme";
import { apiClient } from "../../services/apiClient";
import {
  AvatarMedallion,
  DuoButton,
  DuoCard,
  InfoPill,
  StatKpiCard,
} from "../ui/DuoComponents";

export interface ProfileViewProps {
  user: AuthUser;
  authToken: string;
  onUpdatePreferences: (patch: {
    apelidoPadrao?: string;
    avatarPadrao?: string;
    consentimentoPesquisa?: boolean;
  }) => Promise<AuthUser>;
  onSignOut: () => void;
  onBackToPlay: () => void;
  palette: ThemePalette;
}

export function ProfileView({
  user,
  authToken,
  onUpdatePreferences,
  onSignOut,
  onBackToPlay,
  palette,
}: ProfileViewProps) {
  const [nickname, setNickname] = useState(user.apelidoPadrao);
  const [avatar, setAvatar] = useState(user.avatarPadrao);
  const [consent, setConsent] = useState(user.consentimentoPesquisa);
  const [saving, setSaving] = useState(false);
  const [saveFeedback, setSaveFeedback] = useState<string>("");
  const [saveError, setSaveError] = useState<string>("");

  const [history, setHistory] = useState<UserMatchHistoryResponse | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [historyError, setHistoryError] = useState("");

  useEffect(() => {
    setNickname(user.apelidoPadrao);
    setAvatar(user.avatarPadrao);
    setConsent(user.consentimentoPesquisa);
  }, [user]);

  const loadHistory = useCallback(() => {
    setLoadingHistory(true);
    setHistoryError("");
    apiClient
      .getMyMatchHistory(authToken, { limit: 25 })
      .then((data) => {
        setHistory(data);
      })
      .catch((error) => {
        setHistoryError(
          error instanceof Error
            ? error.message
            : "Não foi possível carregar o histórico.",
        );
      })
      .finally(() => {
        setLoadingHistory(false);
      });
  }, [authToken]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const handleSave = async () => {
    setSaving(true);
    setSaveFeedback("");
    setSaveError("");
    try {
      await onUpdatePreferences({
        apelidoPadrao: nickname.trim(),
        avatarPadrao: avatar,
        consentimentoPesquisa: consent,
      });
      setSaveFeedback("Preferências salvas com sucesso!");
    } catch (error) {
      setSaveError(
        error instanceof Error
          ? error.message
          : "Não foi possível salvar suas preferências.",
      );
    } finally {
      setSaving(false);
    }
  };

  const summary = history?.summary;
  const experiencedSet = new Set(summary?.perspectivasVivenciadas ?? []);
  const accuracy =
    summary && summary.totalRespondidos > 0
      ? summary.totalCorretos / summary.totalRespondidos
      : null;

  return (
    <ScrollView
      contentContainerStyle={[
        styles.content,
        { backgroundColor: palette.background },
      ]}
    >
      <View style={styles.wrap}>
        {/* Cabeçalho do Perfil */}
        <DuoCard palette={palette} padding={18}>
          <View style={styles.headerRow}>
            <AvatarMedallion
              avatarId={user.avatarPadrao}
              size="lg"
              palette={palette}
            />
            <View style={styles.headerInfo}>
              <Text style={[styles.userName, { color: palette.textMain }]}>
                {user.nome}
              </Text>
              <Text style={[styles.userEmail, { color: palette.textMuted }]}>
                {user.email}
              </Text>
              <View style={styles.badgesRow}>
                <InfoPill
                  text={
                    user.role === "admin"
                      ? "🛡️ Administrador"
                      : user.role === "professor"
                        ? "🎓 Professor"
                        : "🎮 Jogador"
                  }
                  tone={user.role === "jogador" ? "secondary" : "purple"}
                  palette={palette}
                />
                <InfoPill
                  text={
                    user.consentimentoPesquisa
                      ? "✓ Pesquisa LGPD ativa"
                      : "Pesquisa LGPD desativada"
                  }
                  tone={user.consentimentoPesquisa ? "primary" : "neutral"}
                  palette={palette}
                />
              </View>
            </View>
            <View style={styles.headerButtons}>
              <DuoButton
                title="Voltar ao Jogo"
                variant="secondary"
                size="sm"
                fullWidth={false}
                onPress={onBackToPlay}
                palette={palette}
              />
              <DuoButton
                title="Sair da Conta"
                variant="ghost"
                size="sm"
                fullWidth={false}
                onPress={onSignOut}
                palette={palette}
              />
            </View>
          </View>
        </DuoCard>

        {/* Perspectivas Vivenciadas (Rejogabilidade) */}
        <DuoCard palette={palette} padding={18}>
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionTitle, { color: palette.textMain }]}>
              🎭 Perspectivas Vivenciadas ({experiencedSet.size}/4)
            </Text>
            <InfoPill
              text={
                experiencedSet.size === 4
                  ? "Coleção completa!"
                  : "Jogue revanches para explorar todas"
              }
              tone={experiencedSet.size === 4 ? "primary" : "warning"}
              palette={palette}
            />
          </View>
          <View style={styles.perspectivesGrid}>
            {ALL_CONDITIONS.map((key) => {
              const meta = getConditionMeta(key);
              const unlocked = experiencedSet.has(key);
              return (
                <View
                  key={key}
                  style={[
                    styles.perspectiveCard,
                    {
                      backgroundColor: unlocked
                        ? palette.isDark
                          ? meta.darkBgTint
                          : meta.bgTint
                        : palette.surfaceAlt,
                      borderColor: unlocked ? meta.color : palette.cardBorder,
                      opacity: unlocked ? 1 : 0.65,
                    },
                  ]}
                >
                  <Text style={styles.perspectiveIcon}>{meta.personaIcon}</Text>
                  <Text
                    style={[
                      styles.perspectiveLabel,
                      { color: unlocked ? meta.color : palette.textMuted },
                    ]}
                    numberOfLines={2}
                  >
                    {meta.label}
                  </Text>
                  <Text
                    style={[
                      styles.perspectiveStatus,
                      { color: palette.textMuted },
                    ]}
                  >
                    {unlocked ? "✅ Vivenciada" : "🔒 Ainda não jogada"}
                  </Text>
                </View>
              );
            })}
          </View>
        </DuoCard>

        {/* KPIs do Jogador */}
        <View style={styles.kpiRow}>
          <StatKpiCard
            label="Partidas"
            value={String(summary?.totalPartidas ?? 0)}
            icon="🎲"
            palette={palette}
          />
          <StatKpiCard
            label="Vitórias"
            value={String(summary?.totalVitorias ?? 0)}
            icon="🏆"
            accentColor={palette.primaryBorder}
            palette={palette}
          />
          <StatKpiCard
            label="Destaques Quiz"
            value={String(summary?.totalDestaquesQuiz ?? 0)}
            icon="⭐"
            accentColor={palette.purpleBorder}
            palette={palette}
          />
          <StatKpiCard
            label="Acerto nos Quizzes"
            value={formatPercent(accuracy)}
            hint={
              summary
                ? `${summary.totalCorretos}/${summary.totalRespondidos} acertos`
                : undefined
            }
            icon="📝"
            accentColor={palette.secondaryBorder}
            palette={palette}
          />
        </View>

        {/* Preferências & LGPD */}
        <DuoCard palette={palette} padding={18}>
          <Text style={[styles.sectionTitle, { color: palette.textMain }]}>
            ⚙️ Preferências da Conta
          </Text>

          <Text style={[styles.fieldLabel, { color: palette.textMuted }]}>
            Apelido padrão (2 a 16 caracteres)
          </Text>
          <TextInput
            value={nickname}
            onChangeText={setNickname}
            maxLength={16}
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
            Avatar padrão
          </Text>
          <View style={styles.avatarRow}>
            {AVATAR_IDS.map((id) => (
              <AvatarMedallion
                key={id}
                avatarId={id}
                size="sm"
                selected={avatar === id}
                onPress={() => setAvatar(id)}
                palette={palette}
              />
            ))}
          </View>

          <Pressable
            onPress={() => setConsent((v) => !v)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: consent }}
            style={[
              styles.consentBox,
              {
                backgroundColor: consent ? palette.purpleBg : palette.surfaceAlt,
                borderColor: consent ? palette.purpleBorder : palette.cardBorder,
              },
            ]}
          >
            <View
              style={[
                styles.checkbox,
                {
                  backgroundColor: consent ? palette.purple : palette.cardBg,
                  borderColor: consent
                    ? palette.purpleBorder
                    : palette.inputBorder,
                },
              ]}
            >
              <Text style={styles.checkboxMark}>{consent ? "✓" : ""}</Text>
            </View>
            <View style={styles.consentWrap}>
              <Text style={[styles.consentTitle, { color: palette.textMain }]}>
                Autorizar uso anonimizado em pesquisa acadêmica (ICE — UFRRJ)
              </Text>
              <Text style={[styles.consentSub, { color: palette.textMuted }]}>
                Você pode revogar ou ativar a qualquer momento. Exportações
                científicas nunca incluem nome, e-mail ou foto.
              </Text>
            </View>
          </Pressable>

          {saveFeedback ? (
            <Text style={[styles.feedbackOk, { color: palette.primaryText }]}>
              ✅ {saveFeedback}
            </Text>
          ) : null}
          {saveError ? (
            <Text style={[styles.feedbackErr, { color: palette.danger }]}>
              ⚠️ {saveError}
            </Text>
          ) : null}

          <View style={styles.saveBtnWrap}>
            <DuoButton
              title={saving ? "Salvando..." : "Salvar Preferências"}
              icon="💾"
              disabled={saving || nickname.trim().length < 2}
              onPress={() => void handleSave()}
              palette={palette}
            />
          </View>
        </DuoCard>

        {/* Histórico de Partidas */}
        <DuoCard palette={palette} padding={18}>
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionTitle, { color: palette.textMain }]}>
              📜 Histórico Recente de Partidas
            </Text>
            <DuoButton
              title="Atualizar"
              variant="ghost"
              size="sm"
              fullWidth={false}
              onPress={loadHistory}
              palette={palette}
            />
          </View>

          {loadingHistory ? (
            <ActivityIndicator color={palette.secondary} />
          ) : historyError ? (
            <Text style={[styles.feedbackErr, { color: palette.danger }]}>
              ⚠️ {historyError}
            </Text>
          ) : !history || history.matches.length === 0 ? (
            <Text style={[styles.emptyText, { color: palette.textMuted }]}>
              Nenhuma partida registrada ainda para sua conta. Conclua uma
              partida logado com o Google para acompanhar sua trajetória aqui!
            </Text>
          ) : (
            <View style={styles.matchesList}>
              {history.matches.map((item) => {
                const cond = getConditionMeta(item.condicao);
                const dateLabel = item.finalizada_em
                  ? new Date(item.finalizada_em).toLocaleDateString("pt-BR")
                  : "Recente";
                return (
                  <View
                    key={item.partida_uuid}
                    style={[
                      styles.matchCard,
                      {
                        backgroundColor: palette.surfaceAlt,
                        borderColor: palette.cardBorder,
                      },
                    ]}
                  >
                    <View style={styles.matchTopRow}>
                      <Text
                        style={[styles.matchCond, { color: cond.color }]}
                      >
                        {cond.personaIcon} {cond.label}
                      </Text>
                      <Text style={[styles.matchDate, { color: palette.textMuted }]}>
                        {dateLabel} · {item.etapa_escolar}
                      </Text>
                    </View>
                    <View style={styles.badgesRow}>
                      {item.vencedor === 1 ? (
                        <InfoPill text="🏆 Vencedor" tone="warning" palette={palette} />
                      ) : null}
                      {item.destaque_quiz === 1 ? (
                        <InfoPill text="⭐ Destaque Quiz" tone="purple" palette={palette} />
                      ) : null}
                      <InfoPill
                        text={`Casa ${item.posicao_final}/30`}
                        tone="neutral"
                        palette={palette}
                      />
                      <InfoPill
                        text={`⭐ ${item.pontos_quiz} pts`}
                        tone="secondary"
                        palette={palette}
                      />
                      <InfoPill
                        text={`📝 ${item.quizzes_corretos}/${item.quizzes_respondidos}`}
                        tone="primary"
                        palette={palette}
                      />
                      {item.media_dado !== null ? (
                        <InfoPill
                          text={`🎲 Média ${formatDecimal(item.media_dado, 1)}`}
                          tone="neutral"
                          palette={palette}
                        />
                      ) : null}
                      {item.turma_codigo ? (
                        <InfoPill
                          text={`🎓 ${item.turma_codigo}`}
                          tone="purple"
                          palette={palette}
                        />
                      ) : null}
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </DuoCard>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, alignItems: "center", padding: 16 },
  wrap: { width: "100%", maxWidth: 960, gap: 16 },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 16,
  },
  headerInfo: { flex: 1, minWidth: 200, gap: 4 },
  userName: { fontSize: 20, fontWeight: "900" },
  userEmail: { fontSize: 13, fontWeight: "700" },
  badgesRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 4 },
  headerButtons: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 16, fontWeight: "900", marginBottom: 4 },
  perspectivesGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  perspectiveCard: {
    flexGrow: 1,
    flexBasis: 190,
    borderRadius: 14,
    borderWidth: 2,
    borderBottomWidth: 4,
    padding: 12,
    alignItems: "center",
    gap: 4,
  },
  perspectiveIcon: { fontSize: 28 },
  perspectiveLabel: { fontSize: 12, fontWeight: "900", textAlign: "center" },
  perspectiveStatus: { fontSize: 11, fontWeight: "700" },
  kpiRow: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  fieldLabel: {
    fontSize: 12,
    fontWeight: "800",
    marginTop: 10,
    marginBottom: 6,
  },
  input: {
    borderRadius: 12,
    borderWidth: 2,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    fontWeight: "800",
  },
  avatarRow: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  consentBox: {
    marginTop: 14,
    borderRadius: 14,
    borderWidth: 2,
    padding: 12,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 7,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  checkboxMark: { color: "#FFFFFF", fontWeight: "900", fontSize: 14 },
  consentWrap: { flex: 1, gap: 3 },
  consentTitle: { fontSize: 13, fontWeight: "900" },
  consentSub: { fontSize: 11, fontWeight: "700", lineHeight: 16 },
  feedbackOk: { fontSize: 13, fontWeight: "800", marginTop: 10 },
  feedbackErr: { fontSize: 13, fontWeight: "800", marginTop: 10 },
  saveBtnWrap: { marginTop: 14 },
  emptyText: { fontSize: 13, fontWeight: "700", lineHeight: 19 },
  matchesList: { gap: 10 },
  matchCard: {
    borderRadius: 14,
    borderWidth: 2,
    padding: 12,
    gap: 8,
  },
  matchTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 6,
  },
  matchCond: { fontSize: 14, fontWeight: "900" },
  matchDate: { fontSize: 12, fontWeight: "700" },
});
