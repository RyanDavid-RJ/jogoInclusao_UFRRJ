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

type QuizAnswer = "A" | "B" | "C" | "D";

type QuizQuestion = {
  quizId: string;
  enunciado: string;
  alternativas: Record<QuizAnswer, string>;
  deadlineAt: number;
};

type QuizResult = {
  quizId: string;
  alternativa: QuizAnswer | null;
  correta: boolean;
  pontos: number;
  respostaCorreta: QuizAnswer;
  explicacao?: string;
};

type QuizError = {
  quizId: string;
  code: string;
};

type QuizAnswerAcknowledgement = {
  success: boolean;
  code?: string;
};

const QUIZ_ANSWERS: QuizAnswer[] = ["A", "B", "C", "D"];

const getQuizErrorMessage = (code: string) => {
  switch (code) {
    case "QUIZ_UNAVAILABLE":
      return "Não foi possível carregar o quiz nesta rodada. A partida continuará.";
    case "QUESTIONS_UNAVAILABLE":
      return "Não há perguntas disponíveis para este quiz. A partida continuará.";
    case "DEADLINE_EXPIRED":
      return "O tempo para responder terminou. Aguarde a retomada da partida.";
    case "INVALID_QUIZ":
      return "Esta pergunta não está mais ativa. Aguarde a atualização da partida.";
    case "NOT_PARTICIPANT":
      return "Você não está participando desta rodada do quiz.";
    case "INVALID_ANSWER":
      return "A alternativa enviada não é válida. Selecione uma das opções.";
    case "ALREADY_ANSWERED":
      return "Sua resposta já foi registrada. Aguarde os outros jogadores.";
    default:
      return "O quiz não pôde ser concluído. A partida continuará normalmente.";
  }
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
  const quizSubmissionLockRef = useRef(false);

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
  const [quizQuestion, setQuizQuestion] = useState<QuizQuestion | null>(null);
  const [quizSelectedAnswer, setQuizSelectedAnswer] =
    useState<QuizAnswer | null>(null);
  const [quizSubmitting, setQuizSubmitting] = useState(false);
  const [quizHasAnswered, setQuizHasAnswered] = useState(false);
  const [quizAnswerRejected, setQuizAnswerRejected] = useState(false);
  const [quizRemainingSeconds, setQuizRemainingSeconds] = useState(0);
  const [quizResult, setQuizResult] = useState<QuizResult | null>(null);
  const [quizError, setQuizError] = useState<QuizError | null>(null);

  useEffect(() => {
    socketRef.current = io(SERVER_URL);
    const socket = socketRef.current;

    socket.on("connect", () => {
      console.log("Ligado ao servidor com sucesso! ID:", socket.id);
    });

    socket.on("disconnect", () => {
      setIsInRoom(false);
      setRoomCode("");
      setPlayerCount(0);
      setIsHost(false);
      setIsReady(false);
      setIsStarted(false);
      setSchoolStage(null);
      setMyCondition(null);
      setGameState(null);
      setObstaclePending(null);
      setGameOver(null);
      setQuizQuestion(null);
      setQuizSelectedAnswer(null);
      setQuizSubmitting(false);
      setQuizHasAnswered(false);
      setQuizAnswerRejected(false);
      setQuizRemainingSeconds(0);
      setQuizResult(null);
      setQuizError(null);
      quizSubmissionLockRef.current = false;
      setErrorMsg("Conexão perdida com o servidor. Entre na sala novamente.");
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
      setQuizQuestion(null);
      setQuizSelectedAnswer(null);
      setQuizSubmitting(false);
      setQuizHasAnswered(false);
      setQuizAnswerRejected(false);
      setQuizResult(null);
      setQuizError(null);
      quizSubmissionLockRef.current = false;
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
      setQuizQuestion(null);
      setQuizSelectedAnswer(null);
      setQuizSubmitting(false);
      setQuizHasAnswered(false);
      setQuizAnswerRejected(false);
      setQuizResult(null);
      setQuizError(null);
      quizSubmissionLockRef.current = false;
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

    socket.on("quiz_question", (question: QuizQuestion) => {
      quizSubmissionLockRef.current = false;
      setQuizQuestion(question);
      setQuizSelectedAnswer(null);
      setQuizSubmitting(false);
      setQuizHasAnswered(false);
      setQuizAnswerRejected(false);
      setQuizResult(null);
      setQuizError(null);
    });

    socket.on("quiz_error", (error: QuizError) => {
      setQuizQuestion((current) =>
        current?.quizId === error.quizId ? null : current,
      );
      setQuizSelectedAnswer(null);
      setQuizSubmitting(false);
      setQuizHasAnswered(false);
      setQuizAnswerRejected(false);
      setQuizResult(null);
      quizSubmissionLockRef.current = false;
      setQuizError(error);
    });

    socket.on("quiz_result", (result: QuizResult) => {
      quizSubmissionLockRef.current = true;
      setQuizQuestion((current) =>
        current?.quizId === result.quizId ? null : current,
      );
      setQuizSubmitting(false);
      setQuizHasAnswered(true);
      setQuizResult(result);
    });

    socket.on("quiz_round_ended", ({ quizId }: { quizId: string }) => {
      quizSubmissionLockRef.current = false;
      setQuizQuestion((current) =>
        current?.quizId === quizId ? null : current,
      );
      setQuizSelectedAnswer(null);
      setQuizSubmitting(false);
      setQuizHasAnswered(false);
      setQuizAnswerRejected(false);
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

  useEffect(() => {
    if (!quizQuestion) {
      setQuizRemainingSeconds(0);
      return;
    }

    const updateRemainingSeconds = () => {
      setQuizRemainingSeconds(
        Math.max(0, Math.ceil((quizQuestion.deadlineAt - Date.now()) / 1000)),
      );
    };

    updateRemainingSeconds();
    const timer = setInterval(updateRemainingSeconds, 1000);
    return () => clearInterval(timer);
  }, [quizQuestion]);

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

  const handleSubmitQuizAnswer = () => {
    if (
      !quizQuestion ||
      !quizSelectedAnswer ||
      quizRemainingSeconds <= 0 ||
      quizSubmissionLockRef.current
    ) {
      return;
    }

    quizSubmissionLockRef.current = true;
    setQuizSubmitting(true);
    socketRef.current?.emit(
      "submit_quiz_answer",
      {
        quizId: quizQuestion.quizId,
        alternativa: quizSelectedAnswer,
      },
      (acknowledgement: QuizAnswerAcknowledgement) => {
        setQuizSubmitting(false);
        if (acknowledgement.success) {
          setQuizHasAnswered(true);
          return;
        }

        const code = acknowledgement.code || "UNKNOWN";
        setQuizError({ quizId: quizQuestion.quizId, code });
        setQuizAnswerRejected(true);
        if (code === "ALREADY_ANSWERED" || code === "DEADLINE_EXPIRED") {
          if (code === "ALREADY_ANSWERED") {
            setQuizHasAnswered(true);
          }
        }
      },
    );
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
            <Text style={styles.sectionTitle}>
              {quizQuestion ? "Quiz do obstáculo" : "Partida pausada"}
            </Text>
            {quizQuestion ? (
              <>
                <Text
                  style={styles.gameNotice}
                  accessibilityLiveRegion="polite"
                >
                  Tempo restante: {quizRemainingSeconds}{" "}
                  {quizRemainingSeconds === 1 ? "segundo" : "segundos"}
                </Text>
                <Text style={styles.quizQuestionText}>
                  {quizQuestion.enunciado}
                </Text>
                <View accessibilityRole="radiogroup">
                  {QUIZ_ANSWERS.map((answer) => {
                    const isSelected = quizSelectedAnswer === answer;
                    const isDisabled =
                      quizSubmitting ||
                      quizHasAnswered ||
                      quizAnswerRejected ||
                      quizRemainingSeconds <= 0;
                    return (
                      <TouchableOpacity
                        key={answer}
                        style={[
                          styles.quizAnswerButton,
                          isSelected && styles.selectedQuizAnswerButton,
                          isDisabled && styles.disabledButton,
                        ]}
                        onPress={() => setQuizSelectedAnswer(answer)}
                        disabled={isDisabled}
                        accessibilityRole="radio"
                        accessibilityLabel={`Alternativa ${answer}: ${quizQuestion.alternativas[answer]}`}
                        accessibilityState={{
                          checked: isSelected,
                          disabled: isDisabled,
                        }}
                      >
                        <Text
                          style={[
                            styles.quizAnswerText,
                            isSelected && styles.selectedQuizAnswerText,
                          ]}
                        >
                          {answer}. {quizQuestion.alternativas[answer]}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                <TouchableOpacity
                  style={[
                    styles.quizSubmitButton,
                    (!quizSelectedAnswer ||
                      quizSubmitting ||
                      quizHasAnswered ||
                      quizAnswerRejected ||
                      quizRemainingSeconds <= 0) &&
                      styles.disabledButton,
                  ]}
                  onPress={handleSubmitQuizAnswer}
                  disabled={
                    !quizSelectedAnswer ||
                    quizSubmitting ||
                    quizHasAnswered ||
                    quizAnswerRejected ||
                    quizRemainingSeconds <= 0
                  }
                  accessibilityRole="button"
                  accessibilityLabel="Enviar resposta do quiz"
                  accessibilityHint="Envia a alternativa selecionada uma única vez"
                >
                  <Text style={styles.buttonText}>Enviar resposta</Text>
                </TouchableOpacity>
                {quizSubmitting ? (
                  <Text style={styles.quizStatusText} accessibilityLiveRegion="polite">
                    Enviando sua resposta...
                  </Text>
                ) : quizHasAnswered ? (
                  <Text style={styles.quizStatusText} accessibilityLiveRegion="polite">
                    Resposta enviada. Aguardando os outros jogadores.
                  </Text>
                ) : quizAnswerRejected ? (
                  <Text style={styles.quizStatusText} accessibilityLiveRegion="polite">
                    Não foi possível registrar uma resposta. Aguarde o
                    encerramento desta rodada.
                  </Text>
                ) : quizRemainingSeconds <= 0 ? (
                  <Text style={styles.quizStatusText} accessibilityLiveRegion="polite">
                    Tempo esgotado. Aguarde o encerramento da rodada.
                  </Text>
                ) : null}
              </>
            ) : (
              <Text style={styles.gameNotice}>
                Aguardando a pergunta do quiz. Não é possível rolar o dado
                durante esta pausa.
              </Text>
            )}
            {obstaclePending ? (
              <Text style={styles.gameNotice}>
                {getPlayerLabel(obstaclePending.playerId, playerIds, ownPlayerId)}{" "}
                parou na posição {obstaclePending.position} na rodada{" "}
                {obstaclePending.round}.
              </Text>
            ) : null}
          </View>
        ) : null}

        {quizError ? (
          <View style={styles.quizErrorNotice} accessibilityLiveRegion="polite">
            <Text style={styles.quizErrorText}>
              {getQuizErrorMessage(quizError.code)}
            </Text>
          </View>
        ) : null}

        {quizResult ? (
          <View style={styles.quizResultNotice} accessibilityLiveRegion="polite">
            <Text style={styles.sectionTitle}>
              {quizResult.correta ? "Resposta correta!" : "Resultado do quiz"}
            </Text>
            <Text style={styles.gameNotice}>
              {quizResult.alternativa
                ? `Sua resposta: ${quizResult.alternativa}.`
                : "Você não enviou uma resposta a tempo."}
            </Text>
            {!quizResult.correta ? (
              <Text style={styles.gameNotice}>
                Resposta correta: {quizResult.respostaCorreta}.
              </Text>
            ) : null}
            <Text style={styles.gameNotice}>
              Pontos recebidos: {quizResult.pontos}.
            </Text>
            {quizResult.explicacao ? (
              <Text style={styles.gameNotice}>
                Explicação: {quizResult.explicacao}
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
  quizQuestionText: {
    color: "#333",
    fontSize: 17,
    fontWeight: "600",
    lineHeight: 24,
    marginVertical: 12,
  },
  quizAnswerButton: {
    backgroundColor: "#FFF",
    borderColor: "#8A96A8",
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
    padding: 12,
  },
  selectedQuizAnswerButton: {
    backgroundColor: "#E8F2FD",
    borderColor: "#208AEF",
    borderWidth: 2,
  },
  quizAnswerText: {
    color: "#333",
    fontSize: 15,
    lineHeight: 21,
  },
  selectedQuizAnswerText: {
    color: "#155A9C",
    fontWeight: "700",
  },
  quizSubmitButton: {
    width: "100%",
    minHeight: 48,
    backgroundColor: "#208AEF",
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  quizStatusText: {
    color: "#555",
    fontSize: 15,
    fontWeight: "600",
    marginTop: 10,
  },
  quizErrorNotice: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: "#FFF3E0",
    borderColor: "#FB8C00",
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 16,
  },
  quizErrorText: {
    color: "#8A4B08",
    fontSize: 15,
    lineHeight: 22,
  },
  quizResultNotice: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: "#E8F5E9",
    borderColor: "#4CAF50",
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
