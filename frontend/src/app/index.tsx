import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  TextInput,
} from "react-native";
import { io, Socket } from "socket.io-client";

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
const AVATAR_IDS = ["coelho", "gato", "urso", "raposa", "pinguim", "coruja", "sapo", "leao"];
const AVATAR_META: Record<string, { label: string; emoji: string; color: string }> = {
  coelho: { label: "Coelho", emoji: "🐰", color: "#1CB0F6" },
  gato: { label: "Gato", emoji: "🐱", color: "#FF9600" },
  urso: { label: "Urso", emoji: "🐻", color: "#A559D9" },
  raposa: { label: "Raposa", emoji: "🦊", color: "#FF4B4B" },
  pinguim: { label: "Pinguim", emoji: "🐧", color: "#2B70C9" },
  coruja: { label: "Coruja", emoji: "🦉", color: "#58CC02" },
  sapo: { label: "Sapo", emoji: "🐸", color: "#46A302" },
  leao: { label: "Leão", emoji: "🦁", color: "#FFC800" },
};
const OBSTACLE_META: Record<number, { title: string; domain: string; icon: string }> = {
  4: { title: "Escada", domain: "Mobilidade", icon: "🪜" },
  8: { title: "Alerta Sonoro", domain: "Audição", icon: "🔔" },
  12: { title: "Multidão e Barulho", domain: "Sensorial", icon: "📢" },
  16: { title: "Placa Ilegível", domain: "Visão", icon: "🪧" },
};
const CONDITION_META: Record<string, { label: string; personaIcon: string; summary: string }> = {
  cadeirante: { label: "Pessoa Cadeirante", personaIcon: "🧑‍🦽", summary: "Perspectiva de mobilidade física diante de barreiras arquitetônicas." },
  cego: { label: "Pessoa com Deficiência Visual", personaIcon: "🧑‍🦯", summary: "Perspectiva de orientação espacial e leitura diante de barreiras visuais." },
  surdo: { label: "Pessoa Surda", personaIcon: "🤟", summary: "Perspectiva de comunicação visual diante de barreiras sonoras." },
  neuroatipico: { label: "Pessoa Neuroatípica", personaIcon: "🧠", summary: "Perspectiva de processamento sensorial diante de ambientes sobrecarregados." },
};

type PlayerProfile = {
  playerId: string;
  name: string;
  avatarId: string;
};

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
  roles: {
    playerId: string;
    condition: string;
  }[];
  reveal?: {
    playerId: string;
    name: string;
    avatarId: string;
    condition: string;
    position: number;
    quizPoints: number;
    summary?: string;
  }[];
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
const DICE_FACES: Record<number, string> = {
  1: "⚀",
  2: "⚁",
  3: "⚂",
  4: "⚃",
  5: "⚄",
  6: "⚅",
};

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
      return `O quiz não pôde ser concluído. A partida continuará normalmente. Código: ${code}.`;
  }
};

const getPlayerLabel = (
  playerId: string,
  playerIds: string[],
  ownPlayerId: string | undefined,
  profiles: PlayerProfile[] = [],
) => {
  if (playerId === ownPlayerId) {
    return "Você";
  }

  return (
    profiles.find((profile) => profile.playerId === playerId)?.name ||
    `Jogador ${playerIds.indexOf(playerId) + 1}`
  );
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
  const entranceOpacity = useRef(new Animated.Value(0)).current;

  // Estados da Interface
  const [isInRoom, setIsInRoom] = useState(false);
  const [roomCode, setRoomCode] = useState("");
  const [inputCode, setInputCode] = useState("");
  const [playerName, setPlayerName] = useState("");
  const [avatarId, setAvatarId] = useState("coelho");
  const [playerCount, setPlayerCount] = useState(0);
  const [playerProfiles, setPlayerProfiles] = useState<PlayerProfile[]>([]);
  const [isHost, setIsHost] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [isStarted, setIsStarted] = useState(false);
  const [schoolStage, setSchoolStage] = useState<SchoolStage | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [isConnected, setIsConnected] = useState(false);

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
      setIsConnected(true);
      console.log("Ligado ao servidor com sucesso! ID:", socket.id);
    });

    socket.on("disconnect", () => {
      setIsConnected(false);
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

    socket.on("room_created", ({ roomCode, playerCount, hostId, schoolStage, players }) => {
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
      if (Array.isArray(players)) {
        setPlayerProfiles(players);
      }
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

    socket.on("room_updated", ({ playerCount, hostId, schoolStage, started, players }) => {
      setPlayerCount(playerCount);
      setIsHost(hostId === socket.id);
      setSchoolStage(schoolStage);
      setIsStarted(started);
      if (Array.isArray(players)) {
        setPlayerProfiles(players);
      }
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
      quizSubmissionLockRef.current = true;
      setObstaclePending(null);
      setQuizQuestion(null);
      setQuizSelectedAnswer(null);
      setQuizSubmitting(false);
      setQuizHasAnswered(false);
      setQuizAnswerRejected(true);
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
    Animated.timing(entranceOpacity, {
      toValue: 1,
      duration: 260,
      useNativeDriver: true,
    }).start();
  }, [entranceOpacity]);

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
    if (!playerName.trim() || playerName.trim().length > 16) {
      setErrorMsg("O nome deve ter entre 1 e 16 caracteres.");
      return;
    }
    setErrorMsg("");
    socketRef.current?.emit("create_room", { name: playerName, avatarId });
  };

  const handleJoinRoom = () => {
    if (!playerName.trim() || playerName.trim().length > 16) {
      setErrorMsg("O nome deve ter entre 1 e 16 caracteres.");
    } else if (inputCode.trim().length > 0) {
      setErrorMsg("");
      socketRef.current?.emit("join_room", {
        roomCode: inputCode.trim().toUpperCase(),
        name: playerName,
        avatarId,
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
      quizSubmissionLockRef.current
    ) {
      return;
    }

    if (Date.now() >= quizQuestion.deadlineAt) {
      quizSubmissionLockRef.current = true;
      setQuizRemainingSeconds(0);
      setQuizSubmitting(false);
      setQuizAnswerRejected(true);
      setQuizError({
        quizId: quizQuestion.quizId,
        code: "DEADLINE_EXPIRED",
      });
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
    const isGameFinished = gameOver !== null || gameState.status === "finished";
    const isPaused =
      gameState.status === "paused" || obstaclePending !== null;
    const endReason =
      gameOver?.reason === "finish"
        ? "Um jogador alcançou a posição 20."
        : "O limite de 8 rodadas foi atingido.";
    const boardRows = Array.from({ length: 7 }, (_, row) => {
      const positions = [row * 3, row * 3 + 1, row * 3 + 2];
      return row % 2 === 0 ? positions : positions.reverse();
    });

    return (
      <ScrollView
        style={styles.gameScrollView}
        contentContainerStyle={styles.gameContainer}
      >
        <Animated.View style={[styles.mainCard, { opacity: entranceOpacity }]}>
        <View style={styles.header}>
          <Text style={styles.brandTitle}>🎲 LUDO EQUIDADE • UFRRJ</Text>
          <Text style={[styles.connectionStatus, isConnected ? styles.connected : styles.disconnected]}>
            {isConnected ? "🟢 Online" : "🔴 Desconectado"}
          </Text>
        </View>
        <Text style={styles.subtitle}>Sala: {roomCode}</Text>
        {errorMsg ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorBannerText}>⚠️ {errorMsg}</Text>
          </View>
        ) : null}

        <View style={styles.gameSummary}>
          <View style={styles.summaryHeader}>
            <Text style={styles.summaryEyebrow}>TABULEIRO DUO-EQUIDADE</Text>
            <Text style={styles.roundBadge}>RODADA {gameState.round}</Text>
          </View>
          <Text style={styles.gameSummaryText}>
            Turno atual:{" "}
            {gameState.currentPlayerId
              ? getPlayerLabel(gameState.currentPlayerId, playerIds, ownPlayerId, playerProfiles)
              : "partida encerrada"}
          </Text>
          <Text style={styles.gameSummaryText}>
            Último dado: {gameState.diceResult ?? "ainda não lançado"}
          </Text>
          <Text style={styles.turnStatus} accessibilityLiveRegion="polite">
            {isPaused
              ? "Movimento pausado no obstáculo"
              : isMyTurn
                ? "É a sua vez de jogar"
                : "Aguardando o próximo movimento"}
          </Text>
        </View>

        {!isGameFinished && !isPaused ? (
          <View style={[styles.turnPanel, isMyTurn && styles.myTurnPanel]}>
            <Text style={styles.diceFace}>
              {gameState.diceResult !== null
                ? DICE_FACES[gameState.diceResult] || "🎲"
                : "🎲"}
            </Text>
            <Text style={styles.gameSummaryText}>
              {gameState.diceResult !== null
                ? `Último dado: ${gameState.diceResult}`
                : "aguardando lançamento"}
            </Text>
            {isMyTurn ? (
              <>
                <Text style={styles.yourTurnBadge}>🎯 SUA VEZ DE JOGAR!</Text>
                <Pressable
                  style={({ pressed }) => [
                    styles.button,
                    pressed && styles.pressedButton,
                  ]}
                  onPress={handleRollDice}
                  accessibilityRole="button"
                >
                  <Text style={styles.buttonText}>Rolar dado</Text>
                </Pressable>
              </>
            ) : (
              <>
                <Text style={styles.gameNotice}>
                  ⏳ Aguardando o turno de{" "}
                  {gameState.currentPlayerId
                    ? getPlayerLabel(gameState.currentPlayerId, playerIds, ownPlayerId, playerProfiles)
                    : "outro jogador"}...
                </Text>
                <Pressable
                  style={({ pressed }) => [
                    styles.button,
                    styles.disabledButton,
                    pressed && styles.pressedButton,
                  ]}
                  disabled
                  accessibilityRole="button"
                  accessibilityState={{ disabled: true }}
                >
                  <Text style={styles.buttonText}>Rolar dado</Text>
                </Pressable>
              </>
            )}
          </View>
        ) : null}

        <View style={styles.board}>
          {boardRows.map((positions, row) => (
            <View key={row} style={styles.boardRow}>
              {positions.map((position, visualIndex) => {
                const playersAtPosition = playerIds.filter(
                  (playerId) => gameState.positions[playerId] === position,
                );
                const obstacle = OBSTACLE_META[position];
                const isStart = position === 0;
                const isFinish = position === 20;
                const isOwnPosition = gameState.positions[ownPlayerId || ""] === position;
                const isCurve = visualIndex === positions.length - 1 && !isFinish;

                return (
                  <View key={position} style={[
                    styles.boardCell,
                    obstacle && styles.obstacleCell,
                    isStart && styles.startCell,
                    isFinish && styles.finishCell,
                    isOwnPosition && styles.ownPositionCell,
                  ]}>
                    <Text style={styles.boardPosition}>
                      {isStart ? "INÍCIO 🏁" : isFinish ? "CHEGADA 🏆" : position}
                    </Text>
                    {obstacle ? (
                      <Text style={styles.obstacleLabel}>{obstacle.icon} {obstacle.title} · {obstacle.domain}</Text>
                    ) : null}
                    <Text style={styles.directionMarker}>
                      {isCurve ? "⤵" : row % 2 === 0 ? "➔" : "⬅"}
                    </Text>
                    <View style={styles.boardTokens}>
                      {playersAtPosition.map((playerId) => {
                        const profile = playerProfiles.find(
                          (candidate) => candidate.playerId === playerId,
                        );
                        const avatar = AVATAR_META[profile?.avatarId || "coelho"];
                        return (
                          <View
                            key={playerId}
                            style={[styles.playerBadge, { backgroundColor: avatar.color }]}
                          >
                            <Text style={styles.playerToken}>{avatar.emoji}</Text>
                            <Text style={styles.playerMarker}>
                              {getPlayerMarker(playerId, playerIds, ownPlayerId)}
                            </Text>
                          </View>
                        );
                      })}
                    </View>
                  </View>
                );
              })}
            </View>
          ))}
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
              {AVATAR_META[playerProfiles.find((profile) => profile.playerId === playerId)?.avatarId || "coelho"].emoji}{" "}
              {AVATAR_META[playerProfiles.find((profile) => profile.playerId === playerId)?.avatarId || "coelho"].label}{"  "}
              {getPlayerLabel(playerId, playerIds, ownPlayerId, playerProfiles)}:{" "}
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
                <View style={styles.quizProgressTrack} accessibilityLiveRegion="polite">
                  <View style={[
                    styles.quizProgressFill,
                    {
                      width: `${Math.min(100, (quizRemainingSeconds / 30) * 100)}%`,
                      backgroundColor: quizRemainingSeconds > 15 ? "#58CC02" : quizRemainingSeconds > 5 ? "#FFC800" : "#FF4B4B",
                    },
                  ]} />
                </View>
                <View accessibilityRole="radiogroup">
                  {QUIZ_ANSWERS.map((answer) => {
                    const isSelected = quizSelectedAnswer === answer;
                    const isDisabled =
                      quizSubmitting ||
                      quizHasAnswered ||
                      quizAnswerRejected ||
                      quizRemainingSeconds <= 0;
                    return (
                      <Pressable
                        key={answer}
                        style={({ pressed }) => [
                          styles.quizAnswerButton,
                          isSelected && styles.selectedQuizAnswerButton,
                          isDisabled && styles.disabledButton,
                          pressed && styles.pressedButton,
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
                      </Pressable>
                    );
                  })}
                </View>
                <Pressable
                  style={({ pressed }) => [
                    styles.quizSubmitButton,
                    (!quizSelectedAnswer ||
                      quizSubmitting ||
                      quizHasAnswered ||
                      quizAnswerRejected ||
                      quizRemainingSeconds <= 0) &&
                      styles.disabledButton,
                    pressed && styles.pressedButton,
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
                </Pressable>
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
                {getPlayerLabel(obstaclePending.playerId, playerIds, ownPlayerId, playerProfiles)}{" "}
                parou na posição {obstaclePending.position} na rodada{" "}
                {obstaclePending.round}.
              </Text>
            ) : null}
          </View>
        ) : null}

        {quizError ? (
          <View style={styles.quizErrorNotice} accessibilityLiveRegion="polite">
            <Text style={styles.quizErrorText}>
              ⚠️ {getQuizErrorMessage(quizError.code)}
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
            {quizResult.explicacao?.trim() ? (
              <Text style={styles.gameNotice}>
                Explicação: {quizResult.explicacao.trim()}
              </Text>
            ) : null}
          </View>
        ) : null}

        {gameOver ? (
          <View style={styles.gameOverNotice}>
            <Text style={styles.championBanner}>
              {gameOver.winners.length > 1 ? "Vencedores: " : "Campeão: "}
              {gameOver.winners
                .map((winnerId) =>
                  getPlayerLabel(winnerId, playerIds, ownPlayerId, playerProfiles),
                )
                .join(", ")}
            </Text>
            <Text style={styles.gameNotice}>{endReason}</Text>
            <Text style={styles.revealTitle}>Virada da Equidade: Quem era quem?</Text>
            {(gameOver.reveal || gameOver.roles.map((role) => ({
              ...role,
              name: getPlayerLabel(role.playerId, playerIds, ownPlayerId, playerProfiles),
              avatarId:
                playerProfiles.find((profile) => profile.playerId === role.playerId)
                  ?.avatarId || "coelho",
              position: gameState.positions[role.playerId] || 0,
              quizPoints: 0,
              summary: undefined,
            }))).map(({ playerId, name, avatarId: playerAvatar, condition, position, quizPoints, summary }) => {
              const avatar = AVATAR_META[playerAvatar] || AVATAR_META.coelho;
              const conditionMeta = CONDITION_META[condition] || { label: condition, personaIcon: "🧑", summary: "Perspectiva vivenciada durante a partida." };
              return (
              <View key={playerId} style={styles.revealCard}>
                <Text style={styles.revealTransition}>{name}</Text>
                <View style={styles.badgeRow}>
                  <Text style={styles.animalBadge}>
                    {avatar.emoji} {avatar.label}
                  </Text>
                  <Text style={styles.perspectiveBadge}>
                    {conditionMeta.personaIcon} {conditionMeta.label}
                  </Text>
                </View>
                <View style={styles.chipRow}>
                  <Text style={styles.chip}>Posição: {position}/20</Text>
                  <Text style={styles.chip}>Pontos no Quiz: {quizPoints}</Text>
                </View>
                <Text style={styles.supportText}>{summary || conditionMeta.summary}</Text>
              </View>
              );
            })}
            <View style={styles.reflectionCard}>
              <Text style={styles.sectionTitle}>Para Debater com o Grupo</Text>
              <Text style={styles.gameNotice}>• Como a sorte nos dados influenciou a caminhada de cada pessoa?</Text>
              <Text style={styles.gameNotice}>• Como o obstáculo encontrado e o tempo no quiz mudaram as decisões do grupo?</Text>
              <Text style={styles.gameNotice}>• O desempenho matemático explica sozinho o resultado? O que mais pesou?</Text>
              <Text style={styles.gameNotice}>• Que apoios tornariam o caminho mais equitativo para todas as pessoas?</Text>
            </View>
            <Pressable style={({ pressed }) => [styles.button, pressed && styles.pressedButton]} onPress={handleCreateRoom} accessibilityRole="button">
              <Text style={styles.buttonText}>Criar nova sala</Text>
            </Pressable>
          </View>
        ) : gameState.status === "finished" ? (
          <Text style={styles.gameNotice}>Finalizando a partida...</Text>
        ) : null}

        </Animated.View>
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
      <ScrollView style={styles.gameScrollView} contentContainerStyle={styles.gameContainer}>
        <Animated.View style={[styles.mainCard, { opacity: entranceOpacity }]}>
        <View style={styles.header}>
          <Text style={styles.brandTitle}>🎲 LUDO EQUIDADE • UFRRJ</Text>
          <Text style={[styles.connectionStatus, isConnected ? styles.connected : styles.disconnected]}>
            {isConnected ? "🟢 Online" : "🔴 Desconectado"}
          </Text>
        </View>
        <Text style={styles.title}>Sala: {roomCode}</Text>
        <Text style={styles.subtitle}>Jogadores: {playerCount} / 8</Text>
        <View style={styles.playerList}>
          <Text style={styles.sectionTitle}>Jogadores</Text>
          {playerProfiles.map((profile) => (
            <Text key={profile.playerId} style={styles.playerPosition}>
              {AVATAR_META[profile.avatarId]?.emoji} {AVATAR_META[profile.avatarId]?.label} — {profile.name}
            </Text>
          ))}
        </View>
        <Text style={styles.schoolStageText}>
          Etapa escolar: {schoolStage ?? "não selecionada"}
        </Text>

        {errorMsg ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorBannerText}>⚠️ {errorMsg}</Text>
          </View>
        ) : null}

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
                      <Pressable
                        key={stage}
                        style={({ pressed }) => [
                          styles.stageButton,
                          schoolStage === stage && styles.selectedStageButton,
                          pressed && styles.pressedButton,
                        ]}
                        onPress={() => handleSetSchoolStage(stage)}
                        accessibilityRole="button"
                      >
                        <Text
                          style={[
                            styles.stageButtonText,
                            schoolStage === stage && styles.selectedStageButtonText,
                          ]}
                        >
                          {stage}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                ) : null}
                {!isStarted ? (
                  <Pressable
                    style={({ pressed }) => [styles.button, !canStart && styles.disabledButton, pressed && styles.pressedButton]}
                    onPress={handleStartGame}
                    disabled={!canStart}
                    accessibilityRole="button"
                    accessibilityState={{ disabled: !canStart }}
                  >
                    <Text style={styles.buttonText}>Iniciar partida</Text>
                  </Pressable>
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
        </Animated.View>
      </ScrollView>
    );
  }

  // TELA INICIAL (LOBBY)
  return (
    <ScrollView style={styles.gameScrollView} contentContainerStyle={styles.gameContainer}>
      <Animated.View style={[styles.mainCard, { opacity: entranceOpacity }]}>
      <View style={styles.header}>
        <Text style={styles.brandTitle}>🎲 LUDO EQUIDADE • UFRRJ</Text>
        <Text style={[styles.connectionStatus, isConnected ? styles.connected : styles.disconnected]}>
          {isConnected ? "🟢 Online" : "🔴 Desconectado"}
        </Text>
      </View>
      <Text style={styles.title}>Ludo Equidade</Text>

      {errorMsg ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>⚠️ {errorMsg}</Text>
        </View>
      ) : null}

      <TextInput
        style={styles.input}
        placeholder="Seu nome (1 a 16 caracteres)"
        value={playerName}
        onChangeText={setPlayerName}
        maxLength={16}
        autoCorrect={false}
      />
      <Text style={styles.avatarLabel}>Escolha seu avatar</Text>
      <View style={styles.avatarSelector}>
        {AVATAR_IDS.map((avatar) => (
          <Pressable
            key={avatar}
            style={({ pressed }) => [
              styles.avatarButton,
              avatarId === avatar && styles.selectedAvatarButton,
              pressed && styles.pressedButton,
            ]}
            onPress={() => setAvatarId(avatar)}
            accessibilityRole="button"
          >
            <Text style={styles.avatarButtonText}>{AVATAR_META[avatar].emoji} {AVATAR_META[avatar].label}</Text>
          </Pressable>
        ))}
      </View>

      <Pressable style={({ pressed }) => [styles.button, pressed && styles.pressedButton]} onPress={handleCreateRoom} accessibilityRole="button">
        <Text style={styles.buttonText}>Criar Nova Sala</Text>
      </Pressable>

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

      <Pressable style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressedButton]} onPress={handleJoinRoom} accessibilityRole="button">
        <Text style={styles.buttonText}>Entrar na Sala</Text>
      </Pressable>
      </Animated.View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F7F9FA",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  gameScrollView: {
    flex: 1,
    backgroundColor: "#F7F9FA",
  },
  gameContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    paddingBottom: 36,
  },
  mainCard: {
    maxWidth: 460,
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    borderWidth: 2,
    borderBottomWidth: 6,
    borderColor: "#E5E5E5",
    padding: 24,
  },
  header: {
    alignItems: "center",
    marginBottom: 14,
  },
  brandTitle: {
    color: "#3C3C3C",
    fontSize: 16,
    fontWeight: "900",
    textAlign: "center",
    marginBottom: 8,
  },
  connectionStatus: {
    borderRadius: 12,
    fontSize: 14,
    fontWeight: "800",
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  connected: {
    backgroundColor: "#E8F8DC",
    color: "#46A302",
  },
  disconnected: {
    backgroundColor: "#FFEAEA",
    color: "#D92626",
  },
  title: {
    fontSize: 32,
    fontWeight: "800",
    color: "#3C3C3C",
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 18,
    color: "#777",
    fontWeight: "600",
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
    backgroundColor: "#FFFFFF",
    borderColor: "#E5E5E5",
    borderWidth: 2,
    borderBottomWidth: 5,
    borderRadius: 20,
    padding: 14,
    marginBottom: 16,
  },
  gameSummaryText: {
    color: "#3C3C3C",
    fontSize: 16,
    fontWeight: "600",
    marginVertical: 3,
  },
  summaryHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  summaryEyebrow: {
    color: "#1CB0F6",
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0.8,
  },
  roundBadge: {
    backgroundColor: "#E9F9DF",
    borderRadius: 10,
    color: "#46A302",
    fontSize: 11,
    fontWeight: "900",
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  turnStatus: {
    color: "#7B2CBF",
    fontSize: 14,
    fontWeight: "800",
    marginTop: 8,
  },
  turnPanel: {
    width: "100%",
    maxWidth: 420,
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderColor: "#E5E5E5",
    borderRadius: 20,
    borderWidth: 2,
    borderBottomWidth: 5,
    padding: 14,
    marginBottom: 16,
  },
  myTurnPanel: {
    borderColor: "#58CC02",
  },
  diceFace: {
    color: "#3C3C3C",
    fontSize: 42,
    marginBottom: 4,
  },
  yourTurnBadge: {
    backgroundColor: "#E8F8DC",
    color: "#46A302",
    borderRadius: 12,
    fontSize: 14,
    fontWeight: "900",
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginVertical: 8,
  },
  board: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: "#EAF7FC",
    borderColor: "#B8E6F7",
    borderRadius: 24,
    borderWidth: 2,
    padding: 8,
    marginBottom: 16,
  },
  boardRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  boardCell: {
    width: "32%",
    minHeight: 78,
    backgroundColor: "#FFFFFF",
    borderColor: "#E5E5E5",
    borderWidth: 2,
    borderBottomWidth: 5,
    borderRadius: 20,
    alignItems: "center",
    paddingVertical: 5,
    marginBottom: 6,
  },
  obstacleCell: {
    backgroundColor: "#FFF9DB",
    borderColor: "#FFC800",
  },
  startCell: {
    borderColor: "#1CB0F6",
  },
  finishCell: {
    backgroundColor: "#E9F9DF",
    borderColor: "#46A302",
  },
  ownPositionCell: {
    backgroundColor: "#EBF8FF",
    borderColor: "#1CB0F6",
  },
  directionMarker: {
    color: "#1CB0F6",
    fontSize: 15,
    fontWeight: "900",
  },
  obstacleLabel: {
    color: "#B28900",
    fontSize: 10,
    fontWeight: "800",
    textAlign: "center",
  },
  boardPosition: {
    color: "#3C3C3C",
    fontSize: 12,
    fontWeight: "700",
  },
  boardTokens: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
  },
  playerToken: {
    fontSize: 15,
  },
  playerBadge: {
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 3,
    margin: 1,
  },
  playerMarker: {
    color: "#FFFFFF",
    fontSize: 8,
    fontWeight: "800",
  },
  playerList: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: "#FFFFFF",
    borderColor: "#E5E5E5",
    borderWidth: 2,
    borderBottomWidth: 5,
    borderRadius: 20,
    padding: 14,
    marginBottom: 16,
  },
  sectionTitle: {
    color: "#3C3C3C",
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 8,
  },
  playerPosition: {
    color: "#777",
    fontWeight: "600",
    fontSize: 15,
    marginVertical: 3,
  },
  privateCondition: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: "#F8EEFF",
    borderColor: "#CE82FF",
    borderRadius: 16,
    borderWidth: 2,
    borderBottomWidth: 5,
    padding: 14,
    marginBottom: 16,
    alignItems: "center",
  },
  privateConditionLabel: {
    color: "#7B2CBF",
    fontSize: 15,
    marginBottom: 4,
  },
  privateConditionText: {
    color: "#7B2CBF",
    fontSize: 20,
    fontWeight: "900",
  },
  pausedNotice: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: "#FFF9DB",
    borderColor: "#FFC800",
    borderRadius: 20,
    borderWidth: 2,
    borderBottomWidth: 5,
    padding: 14,
    marginBottom: 16,
  },
  quizQuestionText: {
    color: "#3C3C3C",
    fontSize: 17,
    fontWeight: "600",
    lineHeight: 24,
    marginVertical: 12,
  },
  quizProgressTrack: {
    width: "100%",
    height: 10,
    backgroundColor: "#E5E5E5",
    borderRadius: 8,
    overflow: "hidden",
    marginBottom: 12,
  },
  quizProgressFill: {
    height: "100%",
    borderRadius: 8,
  },
  quizAnswerButton: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E5E5E5",
    borderRadius: 16,
    borderWidth: 2,
    borderBottomWidth: 5,
    marginBottom: 8,
    padding: 12,
  },
  selectedQuizAnswerButton: {
    backgroundColor: "#1CB0F6",
    borderColor: "#1899D6",
    borderWidth: 2,
  },
  quizAnswerText: {
    color: "#3C3C3C",
    fontSize: 15,
    lineHeight: 21,
  },
  selectedQuizAnswerText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  quizSubmitButton: {
    width: "100%",
    minHeight: 48,
    backgroundColor: "#58CC02",
    borderColor: "#46A302",
    borderRadius: 16,
    borderWidth: 2,
    borderBottomWidth: 5,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  quizStatusText: {
    color: "#777",
    fontSize: 15,
    fontWeight: "600",
    marginTop: 10,
  },
  quizErrorNotice: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: "#FFEAEA",
    borderColor: "#FF4B4B",
    borderRadius: 16,
    borderWidth: 2,
    borderBottomWidth: 5,
    padding: 14,
    marginBottom: 16,
  },
  quizErrorText: {
    color: "#D92626",
    fontSize: 15,
    lineHeight: 22,
  },
  quizResultNotice: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: "#FFFFFF",
    borderColor: "#E5E5E5",
    borderRadius: 20,
    borderWidth: 2,
    borderBottomWidth: 5,
    padding: 14,
    marginBottom: 16,
  },
  gameOverNotice: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: "#FFFFFF",
    borderColor: "#E5E5E5",
    borderRadius: 20,
    borderWidth: 2,
    borderBottomWidth: 5,
    padding: 14,
    marginBottom: 16,
  },
  championBanner: {
    backgroundColor: "#E9F9DF",
    borderColor: "#46A302",
    borderWidth: 2,
    borderBottomWidth: 5,
    borderRadius: 16,
    color: "#3C3C3C",
    fontSize: 20,
    fontWeight: "800",
    padding: 12,
    marginBottom: 10,
    textAlign: "center",
  },
  gameNotice: {
    color: "#777",
    fontWeight: "600",
    fontSize: 15,
    marginVertical: 3,
  },
  revealTitle: {
    color: "#3C3C3C",
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 10,
  },
  revealCard: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E5E5E5",
    borderWidth: 2,
    borderBottomWidth: 5,
    borderRadius: 20,
    padding: 14,
    marginBottom: 10,
  },
  revealTransition: {
    color: "#3C3C3C",
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 10,
  },
  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 8,
  },
  animalBadge: {
    backgroundColor: "#EAF7FC",
    borderColor: "#B8E6F7",
    borderRadius: 12,
    borderWidth: 1,
    color: "#1C6A8A",
    fontSize: 12,
    fontWeight: "800",
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  perspectiveBadge: {
    backgroundColor: "#F8EEFF",
    borderColor: "#CE82FF",
    borderRadius: 12,
    borderWidth: 1,
    color: "#7B2CBF",
    fontSize: 12,
    fontWeight: "800",
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 8,
  },
  chip: {
    backgroundColor: "#F8EEFF",
    color: "#7B2CBF",
    borderColor: "#CE82FF",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontSize: 12,
    fontWeight: "700",
  },
  supportText: {
    color: "#777777",
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 20,
  },
  reflectionCard: {
    backgroundColor: "#FFF9DB",
    borderColor: "#FFC800",
    borderWidth: 2,
    borderBottomWidth: 5,
    borderRadius: 20,
    padding: 14,
    marginBottom: 12,
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
    borderColor: "#1899D6",
    borderRadius: 16,
    borderWidth: 2,
    borderBottomWidth: 5,
    marginBottom: 8,
    padding: 12,
    alignItems: "center",
  },
  selectedStageButton: {
    backgroundColor: "#1CB0F6",
    borderColor: "#1899D6",
  },
  stageButtonText: {
    color: "#1CB0F6",
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
  avatarLabel: {
    color: "#333",
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
  },
  avatarSelector: {
    width: "100%",
    maxWidth: 320,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    marginBottom: 15,
  },
  avatarButton: {
    backgroundColor: "#FFF",
    borderColor: "#1899D6",
    borderRadius: 16,
    borderWidth: 2,
    borderBottomWidth: 5,
    margin: 3,
    padding: 8,
  },
  selectedAvatarButton: {
    backgroundColor: "#1CB0F6",
  },
  avatarButtonText: {
    color: "#333",
    fontSize: 13,
  },
  button: {
    width: "100%",
    maxWidth: 300,
    height: 50,
    backgroundColor: "#58CC02",
    borderColor: "#46A302",
    borderRadius: 16,
    borderWidth: 2,
    borderBottomWidth: 5,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 15,
  },
  secondaryButton: {
    width: "100%",
    maxWidth: 300,
    height: 50,
    backgroundColor: "#1CB0F6",
    borderColor: "#1899D6",
    borderRadius: 16,
    borderWidth: 2,
    borderBottomWidth: 5,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 15,
  },
  disabledButton: {
    opacity: 0.5,
  },
  pressedButton: {
    transform: [{ translateY: 2 }],
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
    color: "#D92626",
    marginBottom: 15,
    fontSize: 16,
    fontWeight: "500",
  },
  errorBanner: {
    width: "100%",
    backgroundColor: "#FFEAEA",
    borderColor: "#FF4B4B",
    borderWidth: 2,
    borderBottomWidth: 4,
    borderRadius: 14,
    padding: 12,
    marginBottom: 15,
  },
  errorBannerText: {
    color: "#D92626",
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
