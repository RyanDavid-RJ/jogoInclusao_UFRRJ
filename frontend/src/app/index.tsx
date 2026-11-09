import React, { useEffect, useRef, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
} from "react-native";
import io, { Socket } from "socket.io-client";

type SchoolStage = "Fundamental" | "Médio" | "Superior";

const SCHOOL_STAGES: SchoolStage[] = ["Fundamental", "Médio", "Superior"];
const PLAYER_COLORS = [
  "#208AEF",
  "#E67E22",
  "#8E44AD",
  "#16A085",
  "#C0392B",
  "#7F8C8D",
  "#D4AC0D",
  "#34495E",
];

type PublicGameState = {
  positions: Record<string, number>;
  currentPlayerId: string | null;
  round: number;
  diceResult: number | null;
  status: "active" | "paused" | "finished";
};

type ObstaclePending = {
  playerId: string;
  position: number;
  round: number;
};

type GameOver = {
  winners: string[];
  reason: "finish" | "round_limit";
};

const getPlayerLabel = (
  playerId: string,
  playerIds: string[],
  ownPlayerId: string | undefined,
) => {
  if (playerId === ownPlayerId) {
    return "Você";
  }

  return `Jogador ${playerIds.indexOf(playerId) + 1}`;
};

const getPlayerMarker = (
  playerId: string,
  playerIds: string[],
  ownPlayerId: string | undefined,
) => {
  if (playerId === ownPlayerId) {
    return "V";
  }

  return `J${playerIds.indexOf(playerId) + 1}`;
};

const SERVER_URL =
  process.env.EXPO_PUBLIC_SERVER_URL || "http://localhost:3000";

export default function IndexScreen() {
  const socketRef = useRef<Socket | null>(null);

  // Estados da Interface
  const [isInRoom, setIsInRoom] = useState(false);
  const [roomCode, setRoomCode] = useState("");
  const [inputCode, setInputCode] = useState("");
  const [playerCount, setPlayerCount] = useState(0);
  const [isHost, setIsHost] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [isStarted, setIsStarted] = useState(false);
  const [schoolStage, setSchoolStage] = useState<SchoolStage | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  // Novo estado: Guarda a condição sorteada para o utilizador atual
  const [myCondition, setMyCondition] = useState<string | null>(null);
  const [gameState, setGameState] = useState<PublicGameState | null>(null);
  const [obstaclePending, setObstaclePending] =
    useState<ObstaclePending | null>(null);
  const [gameOver, setGameOver] = useState<GameOver | null>(null);

  useEffect(() => {
    socketRef.current = io(SERVER_URL);
    const socket = socketRef.current;

    socket.on("connect", () => {
      console.log("Ligado ao servidor com sucesso! ID:", socket.id);
    });

    socket.on("room_created", ({ roomCode, playerCount, hostId, schoolStage }) => {
      setRoomCode(roomCode);
      setPlayerCount(playerCount);
      setIsHost(hostId === socket.id);
      setSchoolStage(schoolStage);
      setIsStarted(false);
      setIsReady(false);
      setMyCondition(null);
      setGameState(null);
      setObstaclePending(null);
      setGameOver(null);
      setIsInRoom(true);
      setErrorMsg("");
    });

    socket.on("room_joined", ({ roomCode, playerCount, hostId, schoolStage }) => {
      setRoomCode(roomCode);
      setPlayerCount(playerCount);
      setIsHost(hostId === socket.id);
      setSchoolStage(schoolStage);
      setIsStarted(false);
      setIsReady(false);
      setMyCondition(null);
      setGameState(null);
      setObstaclePending(null);
      setGameOver(null);
      setIsInRoom(true);
      setErrorMsg("");
    });

    socket.on("room_updated", ({ playerCount, hostId, schoolStage, started }) => {
      setPlayerCount(playerCount);
      setIsHost(hostId === socket.id);
      setSchoolStage(schoolStage);
      setIsStarted(started);
    });

    socket.on("game_started", ({ condition }) => {
      setIsReady(true);
      setIsStarted(true);
      setMyCondition(condition);
    });

    socket.on("game_state_updated", (nextGameState: PublicGameState) => {
      setGameState(nextGameState);
      if (nextGameState.status !== "paused") {
        setObstaclePending(null);
      }
    });

    socket.on("obstacle_pending", (pending: ObstaclePending) => {
      setObstaclePending(pending);
    });

    socket.on("game_over", (result: GameOver) => {
      setGameOver(result);
    });

    socket.on("room_error", ({ message }) => {
      setErrorMsg(message);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const handleCreateRoom = () => {
    setErrorMsg("");
    socketRef.current?.emit("create_room");
  };

  const handleJoinRoom = () => {
    if (inputCode.trim().length > 0) {
      setErrorMsg("");
      socketRef.current?.emit("join_room", {
        roomCode: inputCode.trim().toUpperCase(),
      });
    } else {
      setErrorMsg("Por favor, digite um código válido.");
    }
  };

  const handleStartGame = () => {
    setErrorMsg("");
    socketRef.current?.emit("start_game", { roomCode });
  };

  const handleSetSchoolStage = (nextStage: SchoolStage) => {
    setErrorMsg("");
    socketRef.current?.emit("set_school_stage", { roomCode, schoolStage: nextStage });
  };

  const handleRollDice = () => {
    setErrorMsg("");
    socketRef.current?.emit("roll_dice", { roomCode });
  };

  if (isInRoom && gameState) {
    const playerIds = Object.keys(gameState.positions);
    const ownPlayerId = socketRef.current?.id;
    const isMyTurn =
      gameState.status === "active" &&
      gameState.currentPlayerId === ownPlayerId;
    const isPaused =
      gameState.status === "paused" || obstaclePending !== null;
    const endReason =
      gameOver?.reason === "finish"
        ? "Um jogador alcançou a posição 20."
        : "O limite de 8 rodadas foi atingido.";

    return (
      <ScrollView
        style={styles.gameScrollView}
        contentContainerStyle={styles.gameContainer}
      >
        <Text style={styles.title}>Ludo Equidade</Text>
        <Text style={styles.subtitle}>Sala: {roomCode}</Text>
        {errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : null}

        <View style={styles.gameSummary}>
          <Text style={styles.gameSummaryText}>
            Rodada: {gameState.round}
          </Text>
          <Text style={styles.gameSummaryText}>
            Turno atual:{" "}
            {gameState.currentPlayerId
              ? getPlayerLabel(gameState.currentPlayerId, playerIds, ownPlayerId)
              : "partida encerrada"}
          </Text>
          <Text style={styles.gameSummaryText}>
            Último dado: {gameState.diceResult ?? "ainda não lançado"}
          </Text>
        </View>

        <View style={styles.board}>
          {Array.from({ length: 21 }, (_, position) => {
            const playersAtPosition = playerIds.filter(
              (playerId) => gameState.positions[playerId] === position,
            );

            return (
              <View key={position} style={styles.boardCell}>
                <Text style={styles.boardPosition}>{position}</Text>
                <View style={styles.boardTokens}>
                  {playersAtPosition.map((playerId) => (
                    <Text
                      key={playerId}
                      style={[
                        styles.playerToken,
                        {
                          backgroundColor:
                            PLAYER_COLORS[playerIds.indexOf(playerId) % PLAYER_COLORS.length],
                        },
                      ]}
                    >
                      {getPlayerMarker(playerId, playerIds, ownPlayerId)}
                    </Text>
                  ))}
                </View>
              </View>
            );
          })}
        </View>

        <View style={styles.playerList}>
          <Text style={styles.sectionTitle}>Posições dos jogadores</Text>
          {playerIds.map((playerId, index) => (
            <Text key={playerId} style={styles.playerPosition}>
              <Text
                style={{
                  color: PLAYER_COLORS[index % PLAYER_COLORS.length],
                  fontWeight: "700",
                }}
              >
                {getPlayerMarker(playerId, playerIds, ownPlayerId)}
              </Text>
              {"  "}
              {getPlayerLabel(playerId, playerIds, ownPlayerId)}:{" "}
              {gameState.positions[playerId]}/20
            </Text>
          ))}
        </View>

        {myCondition ? (
          <View style={styles.privateCondition}>
            <Text style={styles.privateConditionLabel}>Sua condição privada</Text>
            <Text style={styles.privateConditionText}>
              {myCondition.toUpperCase()}
            </Text>
          </View>
        ) : null}

        {isPaused ? (
          <View style={styles.pausedNotice}>
            <Text style={styles.sectionTitle}>Partida pausada</Text>
            <Text style={styles.gameNotice}>
              Aguardando o quiz futuro. Não é possível rolar o dado durante esta
              pausa.
            </Text>
            {obstaclePending ? (
              <Text style={styles.gameNotice}>
                {getPlayerLabel(obstaclePending.playerId, playerIds, ownPlayerId)}{" "}
                parou na posição {obstaclePending.position} na rodada{" "}
                {obstaclePending.round}.
              </Text>
            ) : null}
          </View>
        ) : null}

        {gameOver ? (
          <View style={styles.gameOverNotice}>
            <Text style={styles.sectionTitle}>Partida encerrada</Text>
            <Text style={styles.gameNotice}>{endReason}</Text>
            <Text style={styles.gameNotice}>
              {gameOver.winners.length > 1 ? "Vencedores: " : "Campeão: "}
              {gameOver.winners
                .map((winnerId) =>
                  getPlayerLabel(winnerId, playerIds, ownPlayerId),
                )
                .join(", ")}
            </Text>
          </View>
        ) : gameState.status === "finished" ? (
          <Text style={styles.gameNotice}>Finalizando a partida...</Text>
        ) : null}

        {!gameOver && !isPaused && isMyTurn ? (
          <TouchableOpacity style={styles.button} onPress={handleRollDice}>
            <Text style={styles.buttonText}>Rolar dado</Text>
          </TouchableOpacity>
        ) : null}
      </ScrollView>
    );
  }

  // TELA DE ESPERA (DENTRO DA SALA)
  if (isInRoom) {
    const canStart =
      playerCount >= 4 &&
      playerCount <= 8 &&
      schoolStage !== null &&
      !isStarted;

    return (
      <View style={styles.container}>
        <Text style={styles.title}>Sala: {roomCode}</Text>
        <Text style={styles.subtitle}>Jogadores: {playerCount} / 8</Text>
        <Text style={styles.schoolStageText}>
          Etapa escolar: {schoolStage ?? "não selecionada"}
        </Text>

        {errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : null}

        {isReady && myCondition ? (
          <View style={styles.readyContainer}>
            <Text style={styles.conditionLabel}>
              A sua condição no jogo será:
            </Text>
            <Text style={styles.conditionText}>
              {myCondition.toUpperCase()}
            </Text>
          </View>
        ) : (
          <>
            {isHost ? (
              <>
                {!isStarted ? (
                  <View style={styles.stageSelector}>
                    <Text style={styles.stageLabel}>Escolha a etapa escolar:</Text>
                    {SCHOOL_STAGES.map((stage) => (
                      <TouchableOpacity
                        key={stage}
                        style={[
                          styles.stageButton,
                          schoolStage === stage && styles.selectedStageButton,
                        ]}
                        onPress={() => handleSetSchoolStage(stage)}
                      >
                        <Text
                          style={[
                            styles.stageButtonText,
                            schoolStage === stage && styles.selectedStageButtonText,
                          ]}
                        >
                          {stage}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                ) : null}
                {!isStarted ? (
                  <TouchableOpacity
                    style={[styles.button, !canStart && styles.disabledButton]}
                    onPress={handleStartGame}
                    disabled={!canStart}
                  >
                    <Text style={styles.buttonText}>Iniciar partida</Text>
                  </TouchableOpacity>
                ) : null}
                <Text style={styles.waitingText}>
                  {isStarted
                    ? "Preparando a partida..."
                    : canStart
                    ? "A sala está pronta para começar."
                    : schoolStage === null
                      ? "Escolha uma etapa e aguarde pelo menos 4 jogadores."
                      : "Aguardando pelo menos 4 jogadores..."}
                </Text>
              </>
            ) : (
              <Text style={styles.waitingText}>
                Aguardando o anfitrião iniciar a partida...
              </Text>
            )}
          </>
        )}
      </View>
    );
  }

  // TELA INICIAL (LOBBY)
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Ludo Equidade</Text>

      {errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : null}

      <TouchableOpacity style={styles.button} onPress={handleCreateRoom}>
        <Text style={styles.buttonText}>Criar Nova Sala</Text>
      </TouchableOpacity>

      <View style={styles.divider}>
        <View style={styles.line} />
        <Text style={styles.orText}>OU</Text>
        <View style={styles.line} />
      </View>

      <TextInput
        style={styles.input}
        placeholder="Código da Sala (Ex: A1B2)"
        value={inputCode}
        onChangeText={(text) => setInputCode(text.toUpperCase())}
        maxLength={4}
        autoCapitalize="characters"
        autoCorrect={false}
      />

      <TouchableOpacity style={styles.button} onPress={handleJoinRoom}>
        <Text style={styles.buttonText}>Entrar na Sala</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F7FA",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  gameScrollView: {
    flex: 1,
    backgroundColor: "#F5F7FA",
  },
  gameContainer: {
    alignItems: "center",
    padding: 20,
    paddingBottom: 36,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 18,
    color: "#555",
    marginBottom: 12,
  },
  schoolStageText: {
    fontSize: 16,
    color: "#555",
    marginBottom: 24,
  },
  gameSummary: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  gameSummaryText: {
    color: "#333",
    fontSize: 16,
    fontWeight: "600",
    marginVertical: 3,
  },
  board: {
    width: "100%",
    maxWidth: 420,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  boardCell: {
    width: "18%",
    minHeight: 62,
    backgroundColor: "#FFF",
    borderColor: "#D8DEE8",
    borderWidth: 1,
    borderRadius: 8,
    alignItems: "center",
    paddingVertical: 5,
    marginBottom: 5,
  },
  boardPosition: {
    color: "#555",
    fontSize: 12,
    fontWeight: "700",
  },
  boardTokens: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
  },
  playerToken: {
    overflow: "hidden",
    borderRadius: 9,
    color: "#FFF",
    fontSize: 8,
    fontWeight: "700",
    textAlign: "center",
    minWidth: 18,
    height: 18,
    lineHeight: 18,
    margin: 1,
  },
  playerList: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  sectionTitle: {
    color: "#333",
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 8,
  },
  playerPosition: {
    color: "#444",
    fontSize: 15,
    marginVertical: 3,
  },
  privateCondition: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: "#E8F5E9",
    borderColor: "#4CAF50",
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 16,
    alignItems: "center",
  },
  privateConditionLabel: {
    color: "#2E7D32",
    fontSize: 15,
    marginBottom: 4,
  },
  privateConditionText: {
    color: "#1B5E20",
    fontSize: 20,
    fontWeight: "900",
  },
  pausedNotice: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: "#FFF3E0",
    borderColor: "#FB8C00",
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 16,
  },
  gameOverNotice: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: "#E8F5E9",
    borderColor: "#4CAF50",
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 16,
  },
  gameNotice: {
    color: "#444",
    fontSize: 15,
    marginVertical: 3,
  },
  stageSelector: {
    width: "100%",
    maxWidth: 300,
    marginBottom: 16,
  },
  stageLabel: {
    color: "#333",
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
    textAlign: "center",
  },
  stageButton: {
    backgroundColor: "#FFF",
    borderColor: "#208AEF",
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
    padding: 12,
    alignItems: "center",
  },
  selectedStageButton: {
    backgroundColor: "#208AEF",
  },
  stageButtonText: {
    color: "#208AEF",
    fontSize: 16,
    fontWeight: "600",
  },
  selectedStageButtonText: {
    color: "#FFF",
  },
  input: {
    width: "100%",
    maxWidth: 300,
    height: 50,
    backgroundColor: "#FFF",
    borderRadius: 8,
    paddingHorizontal: 15,
    fontSize: 18,
    borderWidth: 1,
    borderColor: "#DDD",
    textAlign: "center",
    marginBottom: 15,
  },
  button: {
    width: "100%",
    maxWidth: 300,
    height: 50,
    backgroundColor: "#208AEF",
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 15,
  },
  disabledButton: {
    opacity: 0.5,
  },
  buttonText: {
    color: "#FFF",
    fontSize: 18,
    fontWeight: "bold",
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    maxWidth: 300,
    marginVertical: 20,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: "#CCC",
  },
  orText: {
    marginHorizontal: 10,
    color: "#999",
    fontWeight: "bold",
  },
  errorText: {
    color: "#D32F2F",
    marginBottom: 15,
    fontSize: 16,
    fontWeight: "500",
  },
  waitingText: {
    fontSize: 18,
    color: "#FF9800",
    marginTop: 20,
    fontWeight: "bold",
  },
  readyContainer: {
    marginTop: 20,
    padding: 25,
    backgroundColor: "#E8F5E9",
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#4CAF50",
    width: "100%",
    maxWidth: 320,
  },
  conditionLabel: {
    fontSize: 18,
    color: "#2E7D32",
    marginBottom: 10,
    textAlign: "center",
  },
  conditionText: {
    fontSize: 32,
    color: "#1B5E20",
    fontWeight: "900",
    textAlign: "center",
    letterSpacing: 1,
  },
});
