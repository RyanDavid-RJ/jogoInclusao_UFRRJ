// frontend/src/components/lobby/RoomsView.tsx
// Salas públicas, entrada por código e sala de espera v2.0 com configurações do anfitrião.

import { useEffect, useMemo, useState } from "react";
import { Platform, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import Animated, { FadeIn, useReducedMotion } from "react-native-reanimated";

import {
  MAX_ROUNDS_OPTIONS,
  QUIZ_DURATIONS,
  SCHOOL_STAGES,
  type MaxRoundsOption,
  type PlayerProfile,
  type PublicRoomSummary,
  type QuizDurationSec,
  type SchoolStage,
  type ThemePalette,
} from "../../constants/duoTheme";
import {
  AvatarMedallion,
  DuoButton,
  DuoCard,
  InfoPill,
} from "../ui/DuoComponents";
import { RoomQrCode } from "../ui/RoomQrCode";

export interface RoomsViewProps {
  viewState: "public_list" | "private_join" | "waiting_room";
  publicRooms: PublicRoomSummary[];
  roomCode: string;
  isPrivateRoom?: boolean;
  players: PlayerProfile[];
  hostId: string;
  ownPlayerId: string;
  schoolStage: SchoolStage | null;
  quizDurationSec: QuizDurationSec;
  maxRounds: MaxRoundsOption;
  turmaCodigo: string | null;
  onSetSchoolStage: (stage: SchoolStage) => void;
  onUpdateRoomSettings: (settings: {
    quizDurationSec?: QuizDurationSec;
    maxRounds?: MaxRoundsOption;
    turmaCodigo?: string;
  }) => void;
  onStartGame: () => void;
  onLeaveRoom: () => void;
  onCloseRoom?: () => void;
  onJoinSpecificRoom: (code: string) => void;
  onBackToHome: () => void;
  palette: ThemePalette;
}

export function RoomsView({
  viewState,
  publicRooms,
  roomCode,
  isPrivateRoom = false,
  players,
  hostId,
  ownPlayerId,
  schoolStage,
  quizDurationSec,
  maxRounds,
  turmaCodigo,
  onSetSchoolStage,
  onUpdateRoomSettings,
  onStartGame,
  onLeaveRoom,
  onCloseRoom,
  onJoinSpecificRoom,
  onBackToHome,
  palette,
}: RoomsViewProps) {
  const reduceMotion = useReducedMotion();
  const [code, setCode] = useState("");
  const [classCodeInput, setClassCodeInput] = useState(turmaCodigo ?? "");
  const [confirmingClose, setConfirmingClose] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [showQrCode, setShowQrCode] = useState(false);

  const inviteUrl = useMemo(() => {
    if (!roomCode) return "";
    const base =
      Platform.OS === "web" &&
      typeof window !== "undefined" &&
      window.location?.origin
        ? window.location.origin
        : "https://jogoinclusaoufrrj.vercel.app";
    return `${base}/?sala=${encodeURIComponent(roomCode)}`;
  }, [roomCode]);

  useEffect(() => {
    setClassCodeInput(turmaCodigo ?? "");
  }, [turmaCodigo]);

  useEffect(() => {
    if (!copiedCode) return;
    const timer = setTimeout(() => setCopiedCode(false), 2200);
    return () => clearTimeout(timer);
  }, [copiedCode]);

  useEffect(() => {
    if (!copiedLink) return;
    const timer = setTimeout(() => setCopiedLink(false), 2200);
    return () => clearTimeout(timer);
  }, [copiedLink]);

  const copyToClipboard = (text: string, onCopied: () => void) => {
    const clipboard = (
      globalThis as {
        navigator?: {
          clipboard?: { writeText?: (value: string) => Promise<void> };
        };
      }
    ).navigator?.clipboard;
    if (!text || typeof clipboard?.writeText !== "function") {
      return;
    }
    void clipboard
      .writeText(text)
      .then(() => {
        onCopied();
      })
      .catch(() => {});
  };

  const handleCopyCode = () => copyToClipboard(roomCode, () => setCopiedCode(true));

  const handleCopyLink = () => copyToClipboard(inviteUrl, () => setCopiedLink(true));

  const isHost = ownPlayerId === hostId;
  const missingPlayers = Math.max(0, 4 - players.length);
  const canStart = players.length >= 4 && Boolean(schoolStage);

  return (
    <ScrollView
      contentContainerStyle={[
        styles.content,
        { backgroundColor: palette.background },
      ]}
      keyboardShouldPersistTaps="handled"
    >
      <Animated.View
        entering={reduceMotion ? undefined : FadeIn.duration(320)}
        style={styles.wrap}
      >
        {/* LISTA DE SALAS PÚBLICAS */}
        {viewState === "public_list" ? (
          <DuoCard palette={palette} padding={20}>
            <View style={styles.topActionRow}>
              <DuoButton
                title="← Voltar"
                variant="ghost"
                size="sm"
                fullWidth={false}
                onPress={onBackToHome}
                palette={palette}
              />
              <InfoPill
                text={`${publicRooms.length} sala(s) aberta(s)`}
                tone="secondary"
                palette={palette}
              />
            </View>
            <Text style={[styles.title, { color: palette.textMain }]}>
              Salas Públicas
            </Text>
            {publicRooms.length === 0 ? (
              <View
                style={[
                  styles.emptyBox,
                  {
                    backgroundColor: palette.surfaceAlt,
                    borderColor: palette.cardBorder,
                  },
                ]}
              >
                <Text style={[styles.emptyTitle, { color: palette.textMain }]}>
                  Nenhuma sala pública aberta agora
                </Text>
                <Text style={[styles.emptyText, { color: palette.textMuted }]}>
                  Volte à tela inicial para criar uma nova sala e convidar seus
                  colegas.
                </Text>
              </View>
            ) : (
              <View style={styles.roomsList}>
                {publicRooms.map((room) => (
                  <View
                    key={room.roomCode}
                    style={[
                      styles.roomRow,
                      {
                        backgroundColor: palette.surfaceAlt,
                        borderColor: palette.cardBorder,
                      },
                    ]}
                  >
                    <AvatarMedallion
                      avatarId={room.hostAvatarId}
                      size="sm"
                      isHost
                      palette={palette}
                    />
                    <View style={styles.roomInfo}>
                      <Text
                        style={[styles.roomHost, { color: palette.textMain }]}
                        numberOfLines={1}
                      >
                        Sala de {room.hostName}
                      </Text>
                      <View style={styles.roomBadgesRow}>
                        <InfoPill
                          text={`#${room.roomCode}`}
                          tone="secondary"
                          palette={palette}
                        />
                        <InfoPill
                          text={`👥 ${room.playerCount}/8`}
                          tone="neutral"
                          palette={palette}
                        />
                        {room.schoolStage ? (
                          <InfoPill
                            text={room.schoolStage}
                            tone="primary"
                            palette={palette}
                          />
                        ) : null}
                        {room.quizDurationSec ? (
                          <InfoPill
                            text={`⏱️ ${room.quizDurationSec}s`}
                            tone="neutral"
                            palette={palette}
                          />
                        ) : null}
                        {room.turmaCodigo ? (
                          <InfoPill
                            text={`🎓 ${room.turmaCodigo}`}
                            tone="purple"
                            palette={palette}
                          />
                        ) : null}
                      </View>
                    </View>
                    <DuoButton
                      title="Entrar"
                      onPress={() => onJoinSpecificRoom(room.roomCode)}
                      palette={palette}
                      size="sm"
                      fullWidth={false}
                    />
                  </View>
                ))}
              </View>
            )}
          </DuoCard>
        ) : null}

        {/* ENTRAR EM SALA PRIVADA */}
        {viewState === "private_join" ? (
          <DuoCard palette={palette} padding={20}>
            <View style={styles.topActionRow}>
              <DuoButton
                title="← Voltar"
                variant="ghost"
                size="sm"
                fullWidth={false}
                onPress={onBackToHome}
                palette={palette}
              />
            </View>
            <Text style={[styles.title, { color: palette.textMain }]}>
              Entrar com Código
            </Text>
            <Text style={[styles.subtitle, { color: palette.textMuted }]}>
              Informe o código de 4 caracteres compartilhado pelo anfitrião da
              sala.
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  color: palette.textMain,
                  borderColor: palette.inputBorder,
                  backgroundColor: palette.inputBg,
                },
              ]}
              value={code}
              onChangeText={(value) => setCode(value.toUpperCase())}
              onSubmitEditing={() => {
                if (code.trim().length === 4) onJoinSpecificRoom(code);
              }}
              placeholder="A1B2"
              placeholderTextColor={palette.textMuted}
              maxLength={4}
              autoCapitalize="characters"
              autoCorrect={false}
              returnKeyType="go"
              accessibilityLabel="Código da sala"
            />
            <DuoButton
              title="Entrar na Sala"
              icon="🔑"
              size="lg"
              disabled={code.trim().length !== 4}
              onPress={() => onJoinSpecificRoom(code)}
              palette={palette}
            />
          </DuoCard>
        ) : null}

        {/* SALA DE ESPERA */}
        {viewState === "waiting_room" ? (
          <DuoCard palette={palette} padding={20}>
            <View style={styles.waitingHeader}>
              <Text style={[styles.codeLabel, { color: palette.textMuted }]}>
                CÓDIGO DA SALA
              </Text>
              <Text style={[styles.codeHero, { color: palette.textMain }]}>
                {roomCode}
              </Text>
              <View style={styles.inviteButtonsRow}>
                <DuoButton
                  title={copiedCode ? "Código copiado!" : "Copiar código"}
                  icon={copiedCode ? "✅" : "📋"}
                  variant={copiedCode ? "primary" : "ghost"}
                  size="sm"
                  fullWidth={false}
                  onPress={handleCopyCode}
                  palette={palette}
                  accessibilityLabel={`Copiar código da sala ${roomCode}`}
                />
                <DuoButton
                  title={copiedLink ? "Link copiado!" : "Copiar link"}
                  icon={copiedLink ? "✅" : "🔗"}
                  variant={copiedLink ? "primary" : "secondary"}
                  size="sm"
                  fullWidth={false}
                  onPress={handleCopyLink}
                  palette={palette}
                  accessibilityLabel="Copiar link direto de convite da sala"
                />
                <DuoButton
                  title={showQrCode ? "Ocultar QR" : "QR Code"}
                  icon="📱"
                  variant={showQrCode ? "purple" : "ghost"}
                  size="sm"
                  fullWidth={false}
                  onPress={() => setShowQrCode((v) => !v)}
                  palette={palette}
                  accessibilityLabel="Mostrar ou ocultar QR Code de convite"
                />
              </View>
              {showQrCode && inviteUrl ? (
                <View style={styles.qrWrap}>
                  <RoomQrCode
                    value={inviteUrl}
                    caption={`Aponte a câmera do celular para entrar direto na Sala ${roomCode}`}
                    palette={palette}
                  />
                </View>
              ) : null}
            </View>

            {/* Barra de prontidão da sala */}
            <View style={styles.readinessWrap}>
              <View style={styles.readinessLabelRow}>
                <Text style={[styles.readinessText, { color: palette.textMuted }]}>
                  {players.length >= 4
                    ? "✅ Quórum atingido — pronto para jogar!"
                    : `👥 Faltam ${missingPlayers} jogador(es) para o mínimo de 4`}
                </Text>
                <Text style={[styles.readinessCount, { color: palette.textMain }]}>
                  {players.length}/8
                </Text>
              </View>
              <View
                style={[
                  styles.readinessTrack,
                  { backgroundColor: palette.cardBorder },
                ]}
              >
                <View
                  style={[
                    styles.readinessFill,
                    {
                      width: `${Math.min(100, (players.length / 4) * 100)}%`,
                      backgroundColor:
                        players.length >= 4 ? palette.primary : palette.secondary,
                    },
                  ]}
                />
              </View>
            </View>

            <View style={styles.roomMetaRow}>
              <InfoPill
                text={isPrivateRoom ? "🔒 Privada" : "🌐 Pública"}
                tone="neutral"
                palette={palette}
              />
              <InfoPill
                text={`👥 ${players.length}/8 jogadores`}
                tone={players.length >= 4 ? "primary" : "warning"}
                palette={palette}
              />
              <InfoPill
                text={`⏱️ Quiz ${quizDurationSec}s`}
                tone="secondary"
                palette={palette}
              />
              <InfoPill
                text={`🏁 ${maxRounds} rodadas`}
                tone="neutral"
                palette={palette}
              />
              {turmaCodigo ? (
                <InfoPill
                  text={`🎓 Turma ${turmaCodigo}`}
                  tone="purple"
                  palette={palette}
                />
              ) : null}
            </View>

            {/* Grade de 8 jogadores */}
            <View style={styles.grid}>
              {Array.from({ length: 8 }).map((_, i) => {
                const p = players[i];
                const isSelf = p?.playerId === ownPlayerId;
                return p ? (
                  <View key={p.playerId} style={styles.slot}>
                    <AvatarMedallion
                      avatarId={p.avatarId}
                      isHost={p.playerId === hostId}
                      selected={isSelf}
                      palette={palette}
                      size="md"
                    />
                    <Text
                      style={[
                        styles.slotName,
                        { color: isSelf ? palette.secondaryBorder : palette.textMain },
                      ]}
                      numberOfLines={1}
                    >
                      {isSelf ? `${p.name} (Você)` : p.name}
                    </Text>
                  </View>
                ) : (
                  <View
                    key={`empty-${i}`}
                    style={[
                      styles.emptySlot,
                      {
                        borderColor: palette.cardBorder,
                        backgroundColor: palette.surfaceAlt,
                      },
                    ]}
                  >
                    <Text
                      style={[styles.emptySlotText, { color: palette.textMuted }]}
                    >
                      Livre
                    </Text>
                  </View>
                );
              })}
            </View>

            {/* Configurações do Anfitrião */}
            {isHost ? (
              <View
                style={[
                  styles.configPanel,
                  {
                    backgroundColor: palette.surfaceAlt,
                    borderColor: palette.cardBorder,
                  },
                ]}
              >
                <Text style={[styles.configTitle, { color: palette.textMain }]}>
                  ⚙️ Configurações da Partida (Anfitrião)
                </Text>

                <Text style={[styles.configLabel, { color: palette.textMuted }]}>
                  Etapa Escolar (obrigatório)
                </Text>
                <View style={styles.optionRow}>
                  {SCHOOL_STAGES.map((stage) => (
                    <DuoButton
                      key={stage}
                      title={stage}
                      variant={schoolStage === stage ? "primary" : "ghost"}
                      selected={schoolStage === stage}
                      onPress={() => onSetSchoolStage(stage)}
                      palette={palette}
                      size="sm"
                      fullWidth={false}
                      style={styles.flexOne}
                    />
                  ))}
                </View>

                <Text style={[styles.configLabel, { color: palette.textMuted }]}>
                  Tempo por Quiz
                </Text>
                <View style={styles.optionRow}>
                  {QUIZ_DURATIONS.map((sec) => (
                    <DuoButton
                      key={sec}
                      title={`${sec}s`}
                      variant={quizDurationSec === sec ? "secondary" : "ghost"}
                      selected={quizDurationSec === sec}
                      onPress={() => onUpdateRoomSettings({ quizDurationSec: sec })}
                      palette={palette}
                      size="sm"
                      fullWidth={false}
                      style={styles.flexOne}
                    />
                  ))}
                </View>

                <Text style={[styles.configLabel, { color: palette.textMuted }]}>
                  Limite de Rodadas
                </Text>
                <View style={styles.optionRow}>
                  {MAX_ROUNDS_OPTIONS.map((rounds) => (
                    <DuoButton
                      key={rounds}
                      title={
                        rounds === 6 ? "6 rodadas (Rápida)" : "8 rodadas (Padrão)"
                      }
                      variant={maxRounds === rounds ? "secondary" : "ghost"}
                      selected={maxRounds === rounds}
                      onPress={() => onUpdateRoomSettings({ maxRounds: rounds })}
                      palette={palette}
                      size="sm"
                      fullWidth={false}
                      style={styles.flexOne}
                    />
                  ))}
                </View>

                <Text style={[styles.configLabel, { color: palette.textMuted }]}>
                  Vincular Turma Docente (opcional)
                </Text>
                <View style={styles.classBindRow}>
                  <TextInput
                    value={classCodeInput}
                    onChangeText={(v) => setClassCodeInput(v.toUpperCase())}
                    placeholder="Ex.: MAT101-2026A"
                    placeholderTextColor={palette.textMuted}
                    maxLength={16}
                    autoCapitalize="characters"
                    autoCorrect={false}
                    style={[
                      styles.classInput,
                      {
                        backgroundColor: palette.inputBg,
                        borderColor: palette.inputBorder,
                        color: palette.textMain,
                      },
                    ]}
                  />
                  <DuoButton
                    title="Aplicar"
                    variant="purple"
                    size="sm"
                    fullWidth={false}
                    onPress={() =>
                      onUpdateRoomSettings({
                        turmaCodigo: classCodeInput.trim().toUpperCase(),
                      })
                    }
                    palette={palette}
                  />
                </View>

                <View style={styles.startWrap}>
                  <DuoButton
                    title="Iniciar Partida"
                    icon="🎲"
                    subtitle={
                      missingPlayers > 0
                        ? `Aguardando mais ${missingPlayers} jogador(es) (mínimo 4)`
                        : !schoolStage
                          ? "Selecione a etapa escolar acima"
                          : "Tudo pronto! Papéis secretos serão sorteados."
                    }
                    onPress={onStartGame}
                    disabled={!canStart}
                    size="lg"
                    palette={palette}
                  />
                </View>
              </View>
            ) : (
              <View
                style={[
                  styles.guestWaitBox,
                  {
                    backgroundColor: palette.surfaceAlt,
                    borderColor: palette.cardBorder,
                  },
                ]}
              >
                <Text style={[styles.guestWaitTitle, { color: palette.textMain }]}>
                  ⏳ Aguardando o anfitrião iniciar a partida
                </Text>
                <Text style={[styles.guestWaitSub, { color: palette.textMuted }]}>
                  {schoolStage
                    ? `Etapa: ${schoolStage} · Quiz ${quizDurationSec}s · ${maxRounds} rodadas`
                    : "O anfitrião ainda está escolhendo a etapa escolar."}
                </Text>
              </View>
            )}

            {/* Ações da Sala */}
            <View style={styles.roomActions}>
              {isHost && onCloseRoom ? (
                confirmingClose ? (
                  <View
                    style={[
                      styles.confirmCloseBox,
                      {
                        backgroundColor: palette.dangerBg,
                        borderColor: palette.dangerBorder,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.confirmCloseText,
                        { color: palette.textMain },
                      ]}
                    >
                      Encerrar esta sala para todos os jogadores?
                    </Text>
                    <View style={styles.confirmCloseRow}>
                      <DuoButton
                        title="Cancelar"
                        variant="ghost"
                        size="sm"
                        fullWidth={false}
                        style={styles.flexOne}
                        onPress={() => setConfirmingClose(false)}
                        palette={palette}
                      />
                      <DuoButton
                        title="Confirmar"
                        variant="danger"
                        size="sm"
                        fullWidth={false}
                        style={styles.flexOne}
                        onPress={() => {
                          setConfirmingClose(false);
                          onCloseRoom();
                        }}
                        palette={palette}
                      />
                    </View>
                  </View>
                ) : (
                  <DuoButton
                    title="Fechar Sala para Todos"
                    variant="danger"
                    size="sm"
                    onPress={() => setConfirmingClose(true)}
                    palette={palette}
                    accessibilityHint="Encerra a sala para todos os participantes"
                  />
                )
              ) : null}
              <DuoButton
                title="Sair da Sala"
                variant={isHost && onCloseRoom ? "ghost" : "danger"}
                size="md"
                onPress={() => {
                  setConfirmingClose(false);
                  onLeaveRoom();
                }}
                palette={palette}
              />
            </View>
          </DuoCard>
        ) : null}
      </Animated.View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, alignItems: "center", padding: 16 },
  wrap: { width: "100%", maxWidth: 620 },
  topActionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: "900",
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 13,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 16,
    lineHeight: 19,
  },
  emptyBox: {
    borderRadius: 16,
    borderWidth: 2,
    padding: 20,
    alignItems: "center",
    gap: 6,
  },
  emptyTitle: { fontSize: 15, fontWeight: "900", textAlign: "center" },
  emptyText: { fontSize: 13, fontWeight: "700", textAlign: "center", lineHeight: 18 },
  roomsList: { gap: 10 },
  roomRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 2,
    borderBottomWidth: 4,
    borderRadius: 16,
    padding: 12,
  },
  roomInfo: { flex: 1, gap: 6, minWidth: 0 },
  roomHost: { fontSize: 14, fontWeight: "900" },
  roomBadgesRow: { flexDirection: "row", flexWrap: "wrap", gap: 5 },
  input: {
    borderWidth: 2,
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    textAlign: "center",
    fontSize: 26,
    fontWeight: "900",
    letterSpacing: 6,
  },
  waitingHeader: {
    alignItems: "center",
    gap: 8,
    marginBottom: 14,
  },
  inviteButtonsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 8,
  },
  qrWrap: {
    marginTop: 8,
    alignItems: "center",
  },
  readinessWrap: {
    gap: 5,
    marginBottom: 14,
  },
  readinessLabelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  readinessText: {
    fontSize: 12,
    fontWeight: "800",
  },
  readinessCount: {
    fontSize: 12,
    fontWeight: "900",
  },
  readinessTrack: {
    height: 8,
    borderRadius: 999,
    overflow: "hidden",
  },
  readinessFill: {
    height: "100%",
    borderRadius: 999,
  },
  codeLabel: {
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1.2,
  },
  codeHero: {
    fontSize: 34,
    fontWeight: "900",
    letterSpacing: 6,
  },
  roomMetaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 6,
    marginBottom: 18,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    justifyContent: "center",
    marginBottom: 20,
  },
  slot: { alignItems: "center", width: "22%", minWidth: 68 },
  slotName: { fontSize: 11, fontWeight: "800", marginTop: 6, textAlign: "center" },
  emptySlot: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
  },
  emptySlotText: { fontSize: 10, fontWeight: "800" },
  configPanel: {
    borderRadius: 16,
    borderWidth: 2,
    padding: 14,
    gap: 10,
  },
  configTitle: { fontSize: 14, fontWeight: "900" },
  configLabel: {
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginTop: 2,
  },
  optionRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  flexOne: { flex: 1 },
  classBindRow: { flexDirection: "row", gap: 8, alignItems: "center" },
  classInput: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 2,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  startWrap: { marginTop: 8 },
  guestWaitBox: {
    borderRadius: 14,
    borderWidth: 2,
    padding: 14,
    alignItems: "center",
    gap: 4,
  },
  guestWaitTitle: { fontSize: 14, fontWeight: "900", textAlign: "center" },
  guestWaitSub: { fontSize: 12, fontWeight: "700", textAlign: "center" },
  roomActions: { marginTop: 14, gap: 10 },
  confirmCloseBox: {
    borderRadius: 14,
    borderWidth: 2,
    borderBottomWidth: 4,
    padding: 12,
    gap: 10,
  },
  confirmCloseText: { fontSize: 13, fontWeight: "800", textAlign: "center" },
  confirmCloseRow: { flexDirection: "row", gap: 8 },
});
