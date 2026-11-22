// frontend/src/components/lobby/HomeView.tsx
// Tela inicial v2.0 do "Ludo Equidade (ICE • UFRRJ)".
// Layout responsivo (2 colunas em desktop, pilha em mobile), Google OAuth + Convidado,
// consentimento LGPD para pesquisa acadêmica e configurações rápidas de sala.

import { Link, type Href } from "expo-router";
import { useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import Animated, {
  FadeIn,
  SlideInDown,
  useReducedMotion,
} from "react-native-reanimated";

import {
  AVATAR_IDS,
  MAX_ROUNDS_OPTIONS,
  QUIZ_DURATIONS,
  getAvatarMeta,
  type AuthUser,
  type MaxRoundsOption,
  type QuizDurationSec,
  type ThemePalette,
} from "../../constants/duoTheme";
import type { CreateRoomOptions } from "../../hooks/useGameSession";
import { GoogleSignInButton } from "../auth/GoogleSignInButton";
import {
  AvatarMedallion,
  DuoButton,
  DuoCard,
  InfoPill,
} from "../ui/DuoComponents";

export interface HomeViewProps {
  playerName: string;
  onChangeName: (name: string) => void;
  avatarId: string;
  onChangeAvatar: (id: string) => void;
  publicRoomsCount: number;
  authUser: AuthUser | null;
  serverGoogleEnabled: boolean;
  googleClientId?: string;
  isLoadingAuth?: boolean;
  isCheckingAuthStatus?: boolean;
  consentResearch: boolean;
  onToggleConsentResearch: (next: boolean) => void;
  onGoogleCredential: (idToken: string) => unknown;
  onOpenProfile: () => void;
  onSignOut: () => void;
  onJoinPublicRoom: () => void;
  onJoinPrivateRoom: () => void;
  onCreateRoom: (isPrivate: boolean, options?: CreateRoomOptions) => void;
  pendingInviteCode?: string | null;
  onJoinInvitedRoom?: (code: string) => void;
  onDismissInvite?: () => void;
  palette: ThemePalette;
}

const HOW_TO_PLAY_STEPS: { icon: string; title: string; text: string }[] = [
  {
    icon: "🎭",
    title: "Papel secreto",
    text: "Cada jogador recebe uma perspectiva de acessibilidade oculta até o final.",
  },
  {
    icon: "🎲",
    title: "Corrida & Impulsos",
    text: "Role o dado para avançar até a casa 30 e aproveite casas de Impulso (+2).",
  },
  {
    icon: "⚡",
    title: "Avanço por Equidade",
    text: "Nos obstáculos, todos respondem ao quiz; o 1º acerto mais rápido avança +1 casa!",
  },
  {
    icon: "💡",
    title: "A Virada da Equidade",
    text: "Ao final, os papéis e indicadores observados são revelados para debate coletivo.",
  },
];

export function HomeView({
  playerName,
  onChangeName,
  avatarId,
  onChangeAvatar,
  publicRoomsCount,
  authUser,
  serverGoogleEnabled,
  googleClientId,
  isLoadingAuth = false,
  isCheckingAuthStatus = false,
  consentResearch,
  onToggleConsentResearch,
  onGoogleCredential,
  onOpenProfile,
  onSignOut,
  onJoinPublicRoom,
  onJoinPrivateRoom,
  onCreateRoom,
  pendingInviteCode,
  onJoinInvitedRoom,
  onDismissInvite,
  palette,
}: HomeViewProps) {
  const { width } = useWindowDimensions();
  const isWide = width >= 920;
  const reduceMotion = useReducedMotion();

  const [isPrivateRoom, setIsPrivateRoom] = useState(false);
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  const [quizDurationSec, setQuizDurationSec] = useState<QuizDurationSec>(30);
  const [maxRounds, setMaxRounds] = useState<MaxRoundsOption>(8);
  const [turmaCodigo, setTurmaCodigo] = useState("");

  const trimmedName = playerName.trim();
  const canCreate = trimmedName.length >= 2;
  const avatarList = useMemo(() => AVATAR_IDS.slice(), []);
  const selectedMeta = getAvatarMeta(avatarId);

  const handleCreate = () => {
    onCreateRoom(isPrivateRoom, {
      quizDurationSec,
      maxRounds,
      turmaCodigo: turmaCodigo.trim() ? turmaCodigo.trim().toUpperCase() : undefined,
    });
  };

  return (
    <ScrollView
      contentContainerStyle={[
        styles.scrollContent,
        { backgroundColor: palette.background },
      ]}
      keyboardShouldPersistTaps="handled"
    >
      {/* HERO INSTITUCIONAL */}
      <Animated.View
        entering={reduceMotion ? undefined : FadeIn.duration(360)}
        style={styles.heroWrap}
      >
        <View style={styles.heroBadges}>
          <InfoPill
            text="🎓 ICE • UFRRJ"
            tone="secondary"
            palette={palette}
          />
          <InfoPill
            text="♿ Acessibilidade & Equidade"
            tone="primary"
            palette={palette}
          />
          <InfoPill
            text="📊 Ciência de Dados & Educação"
            tone="purple"
            palette={palette}
          />
        </View>
        <Text style={[styles.title, { color: palette.textMain }]}>
          Ludo Equidade
        </Text>
        <Text style={[styles.subtitle, { color: palette.textMuted }]}>
          Jogo multiplayer educativo onde estratégia, sorte e barreiras estruturais
          convidam a refletir sobre inclusão real.
        </Text>
      </Animated.View>

      {/* BANNER DE CONVITE DIRETO (?sala=XXXX / QR CODE) */}
      {pendingInviteCode && onJoinInvitedRoom ? (
        <View style={styles.inviteBannerWrap}>
          <DuoCard palette={palette} variant="highlight" padding={16}>
            <View style={styles.inviteRow}>
              <View style={styles.inviteInfo}>
                <InfoPill
                  text="🎟️ Convite por Link / QR Code"
                  tone="purple"
                  palette={palette}
                />
                <Text style={[styles.inviteTitle, { color: palette.textMain }]}>
                  Você foi convidado para a Sala {pendingInviteCode}
                </Text>
                <Text style={[styles.inviteSub, { color: palette.textMuted }]}>
                  {canCreate
                    ? `Pronto para entrar como ${trimmedName}!`
                    : "Escolha seu avatar e digite um apelido (2–16 letras) abaixo para entrar."}
                </Text>
              </View>
              <View style={styles.inviteActions}>
                <DuoButton
                  title={`Entrar na Sala ${pendingInviteCode}`}
                  icon="🚀"
                  variant="primary"
                  size="md"
                  fullWidth={false}
                  disabled={!canCreate}
                  onPress={() => onJoinInvitedRoom(pendingInviteCode)}
                  palette={palette}
                />
                {onDismissInvite ? (
                  <DuoButton
                    title="Dispensar"
                    variant="ghost"
                    size="sm"
                    fullWidth={false}
                    onPress={onDismissInvite}
                    palette={palette}
                  />
                ) : null}
              </View>
            </View>
          </DuoCard>
        </View>
      ) : null}

      {/* GRID PRINCIPAL */}
      <Animated.View
        entering={reduceMotion ? undefined : SlideInDown.duration(380)}
        style={[styles.mainGrid, isWide && styles.mainGridWide]}
      >
        {/* COLUNA 1: PERFIL DO JOGADOR + CONTA + CONSENTIMENTO */}
        <View style={styles.col}>
          <DuoCard palette={palette} variant="default" padding={18}>
            {/* Conta Google / Convidado */}
            <View style={styles.sectionHeaderRow}>
              <Text style={[styles.sectionTitle, { color: palette.textMain }]}>
                1. Sua Identidade na Partida
              </Text>
              <InfoPill
                text={authUser ? "Conta Google" : "Modo Convidado"}
                tone={authUser ? "primary" : "neutral"}
                palette={palette}
              />
            </View>

            {authUser ? (
              <View
                style={[
                  styles.signedInBox,
                  {
                    backgroundColor: palette.primaryBg,
                    borderColor: palette.primaryBorder,
                  },
                ]}
              >
                <View style={styles.signedInInfo}>
                  <Text style={[styles.signedInName, { color: palette.textMain }]}>
                    {authUser.nome}
                  </Text>
                  <Text
                    style={[styles.signedInEmail, { color: palette.textMuted }]}
                    numberOfLines={1}
                  >
                    {authUser.email} ·{" "}
                    {authUser.role === "admin"
                      ? "Administrador"
                      : authUser.role === "professor"
                        ? "Professor"
                        : "Jogador"}
                  </Text>
                </View>
                <View style={styles.signedInActions}>
                  <DuoButton
                    title="Perfil"
                    variant="secondary"
                    size="sm"
                    fullWidth={false}
                    onPress={onOpenProfile}
                    palette={palette}
                  />
                  <DuoButton
                    title="Sair"
                    variant="ghost"
                    size="sm"
                    fullWidth={false}
                    onPress={onSignOut}
                    palette={palette}
                  />
                </View>
              </View>
            ) : (
              <View style={styles.googleWrap}>
                <GoogleSignInButton
                  onCredential={onGoogleCredential}
                  serverGoogleEnabled={serverGoogleEnabled}
                  googleClientId={googleClientId}
                  isLoading={isLoadingAuth}
                  isCheckingStatus={isCheckingAuthStatus}
                  palette={palette}
                />
              </View>
            )}

            <View
              style={[styles.divider, { backgroundColor: palette.cardBorder }]}
            />

            {/* Vitrine de avatares */}
            <Text style={[styles.fieldLabel, { color: palette.textMain }]}>
              Escolha seu avatar
            </Text>
            <View style={styles.avatarGrid}>
              {avatarList.map((id) => (
                <AvatarMedallion
                  key={id}
                  avatarId={id}
                  size="md"
                  selected={id === avatarId}
                  showLabel
                  onPress={() => onChangeAvatar(id)}
                  palette={palette}
                />
              ))}
            </View>

            <View
              style={[styles.divider, { backgroundColor: palette.cardBorder }]}
            />

            {/* Apelido */}
            <Text style={[styles.fieldLabel, { color: palette.textMain }]}>
              Seu apelido na sala
            </Text>
            <View
              style={[
                styles.nicknamePreview,
                {
                  backgroundColor: palette.isDark
                    ? palette.surfaceAlt
                    : selectedMeta.bgTint,
                  borderColor: selectedMeta.borderColor,
                },
              ]}
            >
              <Text style={styles.nicknameEmoji}>{selectedMeta.emoji}</Text>
              <TextInput
                value={playerName}
                onChangeText={onChangeName}
                placeholder={`Ex.: ${selectedMeta.label}`}
                placeholderTextColor={palette.textMuted}
                maxLength={16}
                autoCapitalize="words"
                autoCorrect={false}
                returnKeyType="done"
                accessibilityLabel="Apelido do jogador"
                style={[
                  styles.nicknameInput,
                  {
                    backgroundColor: palette.inputBg,
                    borderColor: palette.inputBorder,
                    color: palette.textMain,
                  },
                ]}
              />
            </View>
            <Text style={[styles.helperText, { color: palette.textMuted }]}>
              {trimmedName.length === 0
                ? "Digite de 2 a 16 caracteres para criar ou entrar em uma sala."
                : `${trimmedName.length}/16 caracteres`}
            </Text>

            {/* Consentimento de Pesquisa (LGPD / ICE-UFRRJ) */}
            <Pressable
              onPress={() => onToggleConsentResearch(!consentResearch)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: consentResearch }}
              accessibilityLabel="Autorizar uso anonimizado desta partida para pesquisa acadêmica no ICE-UFRRJ"
              style={[
                styles.consentBox,
                {
                  backgroundColor: consentResearch
                    ? palette.purpleBg
                    : palette.surfaceAlt,
                  borderColor: consentResearch
                    ? palette.purpleBorder
                    : palette.cardBorder,
                },
              ]}
            >
              <View
                style={[
                  styles.checkbox,
                  {
                    backgroundColor: consentResearch
                      ? palette.purple
                      : palette.cardBg,
                    borderColor: consentResearch
                      ? palette.purpleBorder
                      : palette.inputBorder,
                  },
                ]}
              >
                <Text style={styles.checkboxMark}>
                  {consentResearch ? "✓" : ""}
                </Text>
              </View>
              <View style={styles.consentTextWrap}>
                <Text style={[styles.consentTitle, { color: palette.textMain }]}>
                  Contribuir com a pesquisa acadêmica (opcional · LGPD)
                </Text>
                <Text style={[styles.consentBody, { color: palette.textMuted }]}>
                  Seus dados de jogada podem entrar em estatísticas totalmente
                  anonimizadas (sem nome nem e-mail) para estudos de Educação e
                  Estatística no ICE-UFRRJ.
                </Text>
              </View>
            </Pressable>
          </DuoCard>
        </View>

        {/* COLUNA 2: ENTRAR / CRIAR SALA + COMO JOGAR */}
        <View style={styles.col}>
          <DuoCard palette={palette} variant="default" padding={18}>
            <View style={styles.sectionHeaderRow}>
              <Text style={[styles.sectionTitle, { color: palette.textMain }]}>
                2. Entrar na Partida
              </Text>
              <InfoPill
                text="4 a 8 jogadores"
                tone="warning"
                palette={palette}
              />
            </View>

            <View style={styles.actionsWrap}>
              <DuoButton
                title={
                  publicRoomsCount > 0
                    ? `Explorar Salas Públicas (${publicRoomsCount})`
                    : "Explorar Salas Públicas"
                }
                subtitle="Veja salas abertas esperando jogadores agora"
                icon="🔍"
                variant="secondary"
                size="md"
                onPress={onJoinPublicRoom}
                palette={palette}
                accessibilityHint="Abre a lista de salas públicas disponíveis"
              />
              <DuoButton
                title="Entrar com Código"
                subtitle="Digite o código de 4 caracteres da sala"
                icon="🔑"
                variant="ghost"
                size="md"
                onPress={onJoinPrivateRoom}
                palette={palette}
                accessibilityHint="Abre a tela para digitar o código da sala"
              />

              <View
                style={[styles.divider, { backgroundColor: palette.cardBorder }]}
              />

              <View style={styles.privacyWrap}>
                <Text style={[styles.fieldLabel, { color: palette.textMain }]}>
                  Criar nova sala
                </Text>
                <View style={styles.privacyRow}>
                  <DuoButton
                    title="🌐 Pública"
                    variant={!isPrivateRoom ? "secondary" : "ghost"}
                    size="sm"
                    selected={!isPrivateRoom}
                    fullWidth={false}
                    style={styles.flexOne}
                    onPress={() => setIsPrivateRoom(false)}
                    palette={palette}
                    accessibilityLabel="Criar sala pública"
                  />
                  <DuoButton
                    title="🔒 Privada"
                    variant={isPrivateRoom ? "secondary" : "ghost"}
                    size="sm"
                    selected={isPrivateRoom}
                    fullWidth={false}
                    style={styles.flexOne}
                    onPress={() => setIsPrivateRoom(true)}
                    palette={palette}
                    accessibilityLabel="Criar sala privada"
                  />
                </View>
              </View>

              {/* Configurações avançadas da nova sala */}
              <Pressable
                onPress={() => setShowAdvancedOptions((v) => !v)}
                accessibilityRole="button"
                accessibilityState={{ expanded: showAdvancedOptions }}
                style={[
                  styles.advancedToggle,
                  {
                    backgroundColor: palette.surfaceAlt,
                    borderColor: palette.cardBorder,
                  },
                ]}
              >
                <Text
                  style={[styles.advancedToggleText, { color: palette.textMain }]}
                >
                  ⚙️ Opções da sala ({quizDurationSec}s · {maxRounds} rodadas
                  {turmaCodigo.trim() ? ` · Turma ${turmaCodigo.trim().toUpperCase()}` : ""})
                </Text>
                <Text style={{ color: palette.textMuted, fontWeight: "900" }}>
                  {showAdvancedOptions ? "▲" : "▼"}
                </Text>
              </Pressable>

              {showAdvancedOptions ? (
                <View
                  style={[
                    styles.advancedBox,
                    {
                      backgroundColor: palette.surfaceAlt,
                      borderColor: palette.cardBorder,
                    },
                  ]}
                >
                  <Text style={[styles.miniLabel, { color: palette.textMuted }]}>
                    Tempo por Quiz (acessibilidade / leitura)
                  </Text>
                  <View style={styles.privacyRow}>
                    {QUIZ_DURATIONS.map((sec) => (
                      <DuoButton
                        key={sec}
                        title={`${sec}s`}
                        variant={quizDurationSec === sec ? "primary" : "ghost"}
                        size="sm"
                        selected={quizDurationSec === sec}
                        fullWidth={false}
                        style={styles.flexOne}
                        onPress={() => setQuizDurationSec(sec)}
                        palette={palette}
                      />
                    ))}
                  </View>

                  <Text style={[styles.miniLabel, { color: palette.textMuted }]}>
                    Duração da Partida
                  </Text>
                  <View style={styles.privacyRow}>
                    {MAX_ROUNDS_OPTIONS.map((rounds) => (
                      <DuoButton
                        key={rounds}
                        title={
                          rounds === 6
                            ? "6 rodadas (Rápida)"
                            : "8 rodadas (Padrão)"
                        }
                        variant={maxRounds === rounds ? "primary" : "ghost"}
                        size="sm"
                        selected={maxRounds === rounds}
                        fullWidth={false}
                        style={styles.flexOne}
                        onPress={() => setMaxRounds(rounds)}
                        palette={palette}
                      />
                    ))}
                  </View>

                  <Text style={[styles.miniLabel, { color: palette.textMuted }]}>
                    Código da Turma Docente (opcional)
                  </Text>
                  <TextInput
                    value={turmaCodigo}
                    onChangeText={(text) => setTurmaCodigo(text.toUpperCase())}
                    placeholder="Ex.: MAT101-2026A"
                    placeholderTextColor={palette.textMuted}
                    maxLength={16}
                    autoCapitalize="characters"
                    autoCorrect={false}
                    accessibilityLabel="Código da turma opcional"
                    style={[
                      styles.classInput,
                      {
                        backgroundColor: palette.inputBg,
                        borderColor: palette.inputBorder,
                        color: palette.textMain,
                      },
                    ]}
                  />
                </View>
              ) : null}

              <DuoButton
                title={
                  isPrivateRoom
                    ? "Criar Sala Privada"
                    : "Criar Sala Pública"
                }
                subtitle={
                  canCreate
                    ? isPrivateRoom
                      ? "Acesso somente pelo código de 4 caracteres"
                      : "Visível na lista de salas públicas"
                    : "Informe seu apelido (2–16 letras) antes"
                }
                icon="🚀"
                variant="primary"
                size="lg"
                fullWidth
                disabled={!canCreate}
                onPress={handleCreate}
                palette={palette}
                accessibilityHint={
                  isPrivateRoom
                    ? "Cria uma nova sala privada com você como anfitrião"
                    : "Cria uma nova sala pública com você como anfitrião"
                }
              />
            </View>
          </DuoCard>

          {/* Como funciona */}
          <DuoCard palette={palette} variant="default" padding={16}>
            <Text style={[styles.sectionTitle, { color: palette.textMain }]}>
              Como funciona a dinâmica
            </Text>
            <View style={styles.stepList}>
              {HOW_TO_PLAY_STEPS.map((step, index) => (
                <View
                  key={step.title}
                  style={[
                    styles.stepRow,
                    {
                      backgroundColor: palette.surfaceAlt,
                      borderColor: palette.cardBorder,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.stepIconBadge,
                      {
                        backgroundColor: palette.cardBg,
                        borderColor: palette.cardBorder,
                      },
                    ]}
                  >
                    <Text style={styles.stepIcon}>{step.icon}</Text>
                  </View>
                  <View style={styles.stepTextWrap}>
                    <Text
                      style={[styles.stepTitle, { color: palette.textMain }]}
                    >
                      {index + 1}. {step.title}
                    </Text>
                    <Text
                      style={[styles.stepText, { color: palette.textMuted }]}
                    >
                      {step.text}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </DuoCard>
        </View>
      </Animated.View>

      <View style={styles.footerWrap}>
        <Text style={[styles.footer, { color: palette.textMuted }]}>
          Ludo Equidade v2.0 · Instituto de Ciências Exatas (ICE) — UFRRJ ·
          Acessibilidade, Matemática e Inclusão.
        </Text>
        <View style={styles.legalLinksRow}>
          <Link
            href={"/privacidade" as Href}
            style={[styles.legalLink, { color: palette.secondaryBorder }]}
          >
            Política de Privacidade (LGPD)
          </Link>
          <Text style={[styles.footer, { color: palette.textMuted }]}>·</Text>
          <Link
            href={"/termos" as Href}
            style={[styles.legalLink, { color: palette.secondaryBorder }]}
          >
            Termos de Uso
          </Link>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 18,
    gap: 18,
  },
  heroWrap: {
    alignItems: "center",
    gap: 8,
    maxWidth: 760,
    paddingHorizontal: 8,
  },
  inviteBannerWrap: {
    width: "100%",
    maxWidth: 1080,
  },
  inviteRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 12,
  },
  inviteInfo: {
    flex: 1,
    minWidth: 220,
    alignItems: "flex-start",
    gap: 4,
  },
  inviteTitle: {
    fontSize: 16,
    fontWeight: "900",
  },
  inviteSub: {
    fontSize: 12,
    fontWeight: "700",
  },
  inviteActions: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
  },
  heroBadges: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 6,
  },
  title: {
    fontSize: 30,
    fontWeight: "900",
    letterSpacing: 0.4,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 20,
    textAlign: "center",
  },
  mainGrid: {
    width: "100%",
    maxWidth: 560,
    gap: 16,
  },
  mainGridWide: {
    maxWidth: 1080,
    flexDirection: "row",
    alignItems: "flex-start",
  },
  col: {
    flex: 1,
    gap: 16,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: 0.2,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: 0.2,
    marginBottom: 8,
  },
  miniLabel: {
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  googleWrap: {
    marginBottom: 2,
  },
  signedInBox: {
    borderRadius: 14,
    borderWidth: 2,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 10,
  },
  signedInInfo: {
    flex: 1,
    minWidth: 160,
    gap: 2,
  },
  signedInName: {
    fontSize: 14,
    fontWeight: "900",
  },
  signedInEmail: {
    fontSize: 12,
    fontWeight: "700",
  },
  signedInActions: {
    flexDirection: "row",
    gap: 6,
  },
  avatarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    alignItems: "flex-start",
    gap: 12,
  },
  divider: {
    height: 2,
    width: "100%",
    borderRadius: 999,
    marginVertical: 14,
    opacity: 0.7,
  },
  nicknamePreview: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 8,
    borderRadius: 14,
    borderWidth: 2,
  },
  nicknameEmoji: {
    fontSize: 24,
  },
  nicknameInput: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 2,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    fontWeight: "800",
  },
  helperText: {
    fontSize: 12,
    fontWeight: "700",
    marginTop: 6,
  },
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
  checkboxMark: {
    color: "#FFFFFF",
    fontWeight: "900",
    fontSize: 14,
  },
  consentTextWrap: {
    flex: 1,
    gap: 3,
  },
  consentTitle: {
    fontSize: 12,
    fontWeight: "900",
  },
  consentBody: {
    fontSize: 11,
    fontWeight: "700",
    lineHeight: 16,
  },
  actionsWrap: {
    gap: 10,
  },
  privacyWrap: {
    gap: 6,
  },
  privacyRow: {
    flexDirection: "row",
    gap: 8,
  },
  flexOne: {
    flex: 1,
  },
  advancedToggle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 12,
    borderWidth: 2,
    paddingHorizontal: 12,
    paddingVertical: 9,
    gap: 8,
  },
  advancedToggleText: {
    flex: 1,
    fontSize: 12,
    fontWeight: "800",
  },
  advancedBox: {
    borderRadius: 14,
    borderWidth: 2,
    padding: 12,
    gap: 8,
  },
  classInput: {
    borderRadius: 10,
    borderWidth: 2,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 0.6,
  },
  stepList: {
    gap: 8,
    marginTop: 6,
  },
  stepRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 14,
    borderWidth: 2,
    borderBottomWidth: 3,
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  stepIconBadge: {
    width: 34,
    height: 34,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  stepIcon: {
    fontSize: 16,
  },
  stepTextWrap: {
    flex: 1,
    gap: 2,
  },
  stepTitle: {
    fontSize: 13,
    fontWeight: "900",
  },
  stepText: {
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 17,
  },
  footerWrap: {
    alignItems: "center",
    gap: 6,
    marginTop: 6,
    paddingHorizontal: 12,
  },
  footer: {
    fontSize: 12,
    fontWeight: "700",
    textAlign: "center",
  },
  legalLinksRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    flexWrap: "wrap",
    gap: 8,
  },
  legalLink: {
    fontSize: 12,
    fontWeight: "900",
    textDecorationLine: "underline",
  },
});
