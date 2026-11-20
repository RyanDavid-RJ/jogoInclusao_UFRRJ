import { useEffect, useRef, useState } from "react";
import { ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import Animated, { FadeIn, useReducedMotion } from "react-native-reanimated";
import {
  PublicRoomSummary,
  PlayerProfile,
  SchoolStage,
  SCHOOL_STAGES,
  ThemePalette,
} from "../../constants/duoTheme";
import { AvatarMedallion, DuoButton, DuoCard } from "../ui/DuoComponents";

export interface RoomsViewProps {
  viewState: "public_list" | "private_join" | "waiting_room";
  publicRooms: PublicRoomSummary[];
  roomCode: string;
  isPrivateRoom?: boolean;
  players: PlayerProfile[];
  hostId: string;
  ownPlayerId: string;
  schoolStage: SchoolStage | null;
  onSetSchoolStage: (stage: SchoolStage) => void;
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
  onSetSchoolStage,
  onStartGame,
  onLeaveRoom,
  onCloseRoom,
  onJoinSpecificRoom,
  onBackToHome,
  palette,
}: RoomsViewProps) {
  const reduceMotion = useReducedMotion();
  const [code, setCode] = useState("");
  const [confirmingClose, setConfirmingClose] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (copyTimerRef.current) {
        clearTimeout(copyTimerRef.current);
      }
    };
  }, []);

  const handleCopyCode = () => {
    const clipboard = (
      globalThis as {
        navigator?: { clipboard?: { writeText?: (text: string) => Promise<void> } };
      }
    ).navigator?.clipboard;
    if (!roomCode || typeof clipboard?.writeText !== "function") {
      return;
    }
    void clipboard.writeText(roomCode).then(() => {
      setCopiedCode(true);
      if (copyTimerRef.current) {
        clearTimeout(copyTimerRef.current);
      }
      copyTimerRef.current = setTimeout(() => {
        setCopiedCode(false);
      }, 2000);
    }).catch(() => {});
  };

  return (
    <ScrollView
      contentContainerStyle={[
        styles.content,
        { backgroundColor: palette.background },
      ]}
      keyboardShouldPersistTaps="handled"
    >
      <Animated.View
        entering={reduceMotion ? undefined : FadeIn.duration(400)}
        style={styles.wrap}
      >
        {viewState === "public_list" && (
          <DuoCard palette={palette} padding={20}>
            <DuoButton title="Voltar" variant="ghost" onPress={onBackToHome} palette={palette} />
            <Text style={[styles.title, { color: palette.textMain }]}>Salas Públicas</Text>
            {publicRooms.length === 0 ? (
              <Text style={[styles.emptyText, { color: palette.textMuted }]}>
                Nenhuma sala pública aberta no momento.
              </Text>
            ) : (
              publicRooms.map((room) => (
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
                  <View style={styles.roomInfo}>
                    <Text style={[styles.roomHost, { color: palette.textMain }]}>
                      {room.hostName}
                    </Text>
                    <Text style={[styles.roomMeta, { color: palette.textMuted }]}>
                      Sala {room.roomCode} · {room.playerCount}/8 jogadores
                    </Text>
                  </View>
                  <DuoButton
                    title="Entrar"
                    onPress={() => onJoinSpecificRoom(room.roomCode)}
                    palette={palette}
                    size="sm"
                    fullWidth={false}
                  />
                </View>
              ))
            )}
          </DuoCard>
        )}
        {viewState === "private_join" && (
          <DuoCard palette={palette} padding={20}>
            <DuoButton title="Voltar" variant="ghost" onPress={onBackToHome} palette={palette} />
            <Text style={[styles.title, { color: palette.textMain }]}>Sala Privada</Text>
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
              placeholder="Ex.: A1B2"
              placeholderTextColor={palette.textMuted}
              maxLength={4}
              autoCapitalize="characters"
              autoCorrect={false}
              accessibilityLabel="Código da sala"
            />
            <DuoButton title="Entrar" onPress={() => onJoinSpecificRoom(code)} palette={palette} />
          </DuoCard>
        )}
        {viewState === "waiting_room" && (
          <DuoCard palette={palette} padding={20}>
            <Text style={[styles.title, { color: palette.textMain }]}>Sala: {roomCode}</Text>
            <View style={styles.copyCodeRow}>
              <DuoButton
                title={copiedCode ? "✅ Código copiado!" : "📋 Copiar código"}
                variant={copiedCode ? "primary" : "ghost"}
                size="sm"
                fullWidth={false}
                onPress={handleCopyCode}
                palette={palette}
                accessibilityLabel={`Copiar código da sala ${roomCode}`}
              />
            </View>
            <View style={styles.roomMetaRow}>
              <View
                style={[
                  styles.metaPill,
                  {
                    backgroundColor: palette.surfaceAlt,
                    borderColor: palette.cardBorder,
                  },
                ]}
              >
                <Text style={[styles.metaPillText, { color: palette.textMain }]}>
                  {isPrivateRoom ? "🔒 Privada" : "🌐 Pública"}
                </Text>
              </View>
              <View
                style={[
                  styles.metaPill,
                  {
                    backgroundColor: palette.surfaceAlt,
                    borderColor: palette.cardBorder,
                  },
                ]}
              >
                <Text style={[styles.metaPillText, { color: palette.textMain }]}>
                  👥 {players.length}/8 jogadores
                </Text>
              </View>
            </View>
            <View style={styles.grid}>
              {Array.from({ length: 8 }).map((_, i) => {
                const p = players[i];
                return p ? (
                  <View key={p.playerId} style={styles.slot}>
                    <AvatarMedallion avatarId={p.avatarId} isHost={p.playerId === hostId} palette={palette} size="md" />
                    <Text style={{color: palette.textMain, fontSize: 11, fontWeight: "bold", marginTop: 4}} numberOfLines={1}>{p.name}</Text>
                  </View>
                ) : (
                  <View key={i} style={styles.emptySlot}><Text style={{color: palette.textMuted, fontSize: 10}}>Livre</Text></View>
                );
              })}
            </View>
            {ownPlayerId === hostId ? (
              <>
                <Text style={{textAlign: "center", color: palette.textMain, fontWeight: "bold", marginBottom: 10}}>Escolha a etapa escolar:</Text>
                <View style={styles.stageWrap}>
                  {SCHOOL_STAGES.map(s => (
                    <DuoButton key={s} title={s} variant={schoolStage === s ? "primary" : "ghost"} onPress={() => onSetSchoolStage(s)} palette={palette} size="sm" fullWidth={false} />
                  ))}
                </View>
                <DuoButton title="Iniciar Partida" onPress={onStartGame} disabled={players.length < 4 || !schoolStage} palette={palette} />
              </>
            ) : (
              <Text style={{color: palette.textMuted, textAlign: "center", marginBottom: 16}}>
                {schoolStage ? `Etapa: ${schoolStage} · Aguardando anfitrião...` : "Aguardando anfitrião..."}
              </Text>
            )}
            <View style={styles.roomActions}>
              {ownPlayerId === hostId && onCloseRoom ? (
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
                        style={styles.confirmBtn}
                        onPress={() => setConfirmingClose(false)}
                        palette={palette}
                      />
                      <DuoButton
                        title="Confirmar"
                        variant="danger"
                        size="sm"
                        fullWidth={false}
                        style={styles.confirmBtn}
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
                    title="Fechar Sala"
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
                variant={ownPlayerId === hostId && onCloseRoom ? "ghost" : "danger"}
                onPress={() => {
                  setConfirmingClose(false);
                  onLeaveRoom();
                }}
                palette={palette}
              />
            </View>
          </DuoCard>
        )}
      </Animated.View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, alignItems: "center", padding: 20 },
  wrap: { width: "100%", maxWidth: 500 },
  title: { fontSize: 24, fontWeight: "900", marginBottom: 16, textAlign: "center" },
  roomRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12, borderWidth: 2, borderRadius: 14, padding: 10, marginBottom: 10 },
  roomInfo: { flex: 1, gap: 4 },
  roomHost: { fontSize: 14, fontWeight: "900" },
  roomMeta: { fontSize: 12, fontWeight: "700" },
  emptyText: { fontSize: 13, fontWeight: "700", textAlign: "center", paddingVertical: 12 },
  input: { borderWidth: 2, borderRadius: 12, padding: 12, marginBottom: 16, textAlign: "center", fontSize: 20, fontWeight: "bold" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10, justifyContent: "center", marginBottom: 24 },
  slot: { alignItems: "center", width: "22%" },
  emptySlot: { width: 64, height: 64, borderRadius: 32, borderWidth: 2, borderStyle: "dashed", borderColor: "#CCC", alignItems: "center", justifyContent: "center" },
  stageWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8, justifyContent: "center", marginBottom: 20 },
  roomMetaRow: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 8, marginBottom: 16 },
  copyCodeRow: { alignItems: "center", marginBottom: 12 },
  metaPill: { borderRadius: 999, borderWidth: 2, paddingHorizontal: 10, paddingVertical: 4 },
  metaPillText: { fontSize: 12, fontWeight: "800" },
  roomActions: { marginTop: 12, gap: 10 },
  confirmCloseBox: { borderRadius: 14, borderWidth: 2, borderBottomWidth: 4, padding: 12, gap: 10 },
  confirmCloseText: { fontSize: 13, fontWeight: "800", textAlign: "center" },
  confirmCloseRow: { flexDirection: "row", gap: 8 },
  confirmBtn: { flex: 1 }
});
