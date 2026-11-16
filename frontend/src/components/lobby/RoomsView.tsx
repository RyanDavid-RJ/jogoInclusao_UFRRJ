import { useState } from "react";
import { ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { PublicRoomSummary, PlayerProfile, SchoolStage, SCHOOL_STAGES, ThemePalette } from "../../constants/duoTheme";
import { DuoButton, DuoCard, AvatarMedallion } from "../ui/DuoComponents";

export interface RoomsViewProps {
  viewState: "public_list" | "private_join" | "waiting_room";
  publicRooms: PublicRoomSummary[];
  roomCode: string;
  players: PlayerProfile[];
  hostId: string;
  ownPlayerId: string;
  schoolStage: SchoolStage | null;
  onSetSchoolStage: (stage: SchoolStage) => void;
  onStartGame: () => void;
  onLeaveRoom: () => void;
  onJoinSpecificRoom: (code: string) => void;
  onBackToHome: () => void;
  palette: ThemePalette;
}

export function RoomsView({ viewState, publicRooms, roomCode, players, hostId, ownPlayerId, schoolStage, onSetSchoolStage, onStartGame, onLeaveRoom, onJoinSpecificRoom, onBackToHome, palette }: RoomsViewProps) {
  const [code, setCode] = useState("");

  return (
    <ScrollView contentContainerStyle={[styles.content, { backgroundColor: palette.background }]}>
      <Animated.View entering={FadeIn.duration(400)} style={styles.wrap}>
        {viewState === "public_list" && (
          <DuoCard palette={palette} padding={20}>
            <DuoButton title="Voltar" variant="ghost" onPress={onBackToHome} palette={palette} />
            <Text style={[styles.title, { color: palette.textMain }]}>Salas Públicas</Text>
            {publicRooms.length === 0 ? <Text style={{color: palette.textMuted}}>Nenhuma sala pública aberta.</Text> : publicRooms.map(r => (
              <View key={r.roomCode} style={styles.roomRow}>
                <Text style={{color: palette.textMain, fontWeight: "bold"}}>{r.hostName}</Text>
                <DuoButton title="Entrar" onPress={() => onJoinSpecificRoom(r.roomCode)} palette={palette} size="sm" />
              </View>
            ))}
          </DuoCard>
        )}
        {viewState === "private_join" && (
          <DuoCard palette={palette} padding={20}>
            <DuoButton title="Voltar" variant="ghost" onPress={onBackToHome} palette={palette} />
            <Text style={[styles.title, { color: palette.textMain }]}>Sala Privada</Text>
            <TextInput style={[styles.input, { color: palette.textMain, borderColor: palette.inputBorder, backgroundColor: palette.inputBg }]} value={code} onChangeText={setCode} placeholder="Código" placeholderTextColor={palette.textMuted} maxLength={4} autoCapitalize="characters" />
            <DuoButton title="Entrar" onPress={() => onJoinSpecificRoom(code)} palette={palette} />
          </DuoCard>
        )}
        {viewState === "waiting_room" && (
          <DuoCard palette={palette} padding={20}>
            <Text style={[styles.title, { color: palette.textMain }]}>Sala: {roomCode}</Text>
            <View style={styles.grid}>
              {Array.from({length: 8}).map((_, i) => {
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
                    <DuoButton key={s} title={s} variant={schoolStage === s ? "primary" : "ghost"} onPress={() => onSetSchoolStage(s)} palette={palette} size="sm" />
                  ))}
                </View>
                <DuoButton title="Iniciar Partida" onPress={onStartGame} disabled={players.length < 4 || !schoolStage} palette={palette} />
              </>
            ) : (
              <Text style={{color: palette.textMuted, textAlign: "center", marginBottom: 16}}>Aguardando anfitrião...</Text>
            )}
            <View style={{marginTop: 10}}>
                <DuoButton title="Sair da Sala" variant="danger" onPress={onLeaveRoom} palette={palette} />
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
  roomRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  input: { borderWidth: 2, borderRadius: 12, padding: 12, marginBottom: 16, textAlign: "center", fontSize: 20, fontWeight: "bold" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10, justifyContent: "center", marginBottom: 24 },
  slot: { alignItems: "center", width: "22%" },
  emptySlot: { width: 64, height: 64, borderRadius: 32, borderWidth: 2, borderStyle: "dashed", borderColor: "#CCC", alignItems: "center", justifyContent: "center" },
  stageWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8, justifyContent: "center", marginBottom: 20 }
});
