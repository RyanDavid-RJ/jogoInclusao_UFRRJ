import { useEffect, useRef, useState } from "react";
import { SafeAreaView, useWindowDimensions, View } from "react-native";
import { io, Socket } from "socket.io-client";

import {
  getThemePalette,
  type GameOver,
  type ObstaclePending,
  type PlayerProfile,
  type PublicGameState,
  type PublicRoomSummary,
  type QuizAnswer,
  type QuizError,
  type QuizQuestion,
  type QuizResult,
  type SchoolStage,
  type ThemeMode,
} from "../constants/duoTheme";
import { BoardTrack } from "../components/game/BoardTrack";
import { DicePanel } from "../components/game/DicePanel";
import { GameOverModal } from "../components/game/GameOverModal";
import { PlayersSidebar } from "../components/game/PlayersSidebar";
import { QuizModal } from "../components/game/QuizModal";
import { HomeView } from "../components/lobby/HomeView";
import { RoomsView } from "../components/lobby/RoomsView";
import { SplashView } from "../components/lobby/SplashView";
import { ErrorBanner, TopHeader } from "../components/ui/DuoComponents";

const SERVER_URL =
  process.env.EXPO_PUBLIC_SERVER_URL || "http://localhost:3000";

type ViewState = "home" | "public_list" | "private_join" | "waiting_room";
type RoomEvent = {
  roomCode: string;
  hostId: string;
  schoolStage: SchoolStage | null;
  players?: PlayerProfile[];
};

export default function IndexScreen() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 900;
  const socketRef = useRef<Socket | null>(null);
  const quizLockRef = useRef(false);

  const [isLoaded, setIsLoaded] = useState(false);
  const [connectionWaitTime, setConnectionWaitTime] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const [themeMode, setThemeMode] = useState<ThemeMode>("light");
  const [isDaltonico, setIsDaltonico] = useState(false);
  const palette = getThemePalette(themeMode, isDaltonico);

  const [isInRoom, setIsInRoom] = useState(false);
  const [viewState, setViewState] = useState<ViewState>("home");
  const [roomCode, setRoomCode] = useState("");
  const [playerName, setPlayerName] = useState("");
  const [avatarId, setAvatarId] = useState("coelho");
  const [players, setPlayers] = useState<PlayerProfile[]>([]);
  const [hostId, setHostId] = useState("");
  const [schoolStage, setSchoolStage] = useState<SchoolStage | null>(null);
  const [publicRooms, setPublicRooms] = useState<PublicRoomSummary[]>([]);
  const [errorMessage, setErrorMessage] = useState("");

  const [myCondition, setMyCondition] = useState<string | null>(null);
  const [gameState, setGameState] = useState<PublicGameState | null>(null);
  const [obstaclePending, setObstaclePending] =
    useState<ObstaclePending | null>(null);
  const [gameOver, setGameOver] = useState<GameOver | null>(null);
  const [quizQuestion, setQuizQuestion] = useState<QuizQuestion | null>(null);
  const [quizResult, setQuizResult] = useState<QuizResult | null>(null);
  const [quizError, setQuizError] = useState<QuizError | null>(null);
  const [quizRemainingSeconds, setQuizRemainingSeconds] = useState(0);

  useEffect(() => {
    const interval = setInterval(
      () => setConnectionWaitTime((value) => value + 1),
      1000,
    );
    const timeout = setTimeout(() => setIsLoaded(true), 900);
    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, []);

  useEffect(() => {
    const socket = io(SERVER_URL, { transports: ["websocket", "polling"] });
    socketRef.current = socket;

    const clearGame = () => {
      setMyCondition(null);
      setGameState(null);
      setObstaclePending(null);
      setGameOver(null);
      setQuizQuestion(null);
      setQuizResult(null);
      setQuizError(null);
      quizLockRef.current = false;
    };

    socket.on("connect", () => {
      setIsConnected(true);
      setErrorMessage("");
      socket.emit("list_rooms");
    });
    socket.on("disconnect", () => {
      setIsConnected(false);
      setIsInRoom(false);
      setRoomCode("");
      setPlayers([]);
      setErrorMessage("Conexão perdida com o servidor. Tente novamente.");
      clearGame();
    });
    socket.on(
      "rooms_updated",
      ({
        rooms,
      }: {
        rooms: (
          Omit<PublicRoomSummary, "hostName" | "hostAvatarId"> & {
            hostProfile?: { name: string; avatarId: string };
          }
        )[];
      }) => {
        setPublicRooms(
          Array.isArray(rooms)
            ? rooms.map((room) => ({
                ...room,
                hostName: room.hostProfile?.name ?? "Anfitrião",
                hostAvatarId: room.hostProfile?.avatarId ?? "coelho",
              }))
            : [],
        );
      },
    );
    socket.on("room_created", (data: RoomEvent) => {
      setIsInRoom(true);
      setViewState("waiting_room");
      setRoomCode(data.roomCode);
      setHostId(data.hostId);
      setSchoolStage(data.schoolStage);
      setPlayers(data.players ?? []);
      clearGame();
    });
    socket.on("room_joined", (data: RoomEvent) => {
      setIsInRoom(true);
      setViewState("waiting_room");
      setRoomCode(data.roomCode);
      setHostId(data.hostId);
      setSchoolStage(data.schoolStage);
      if (data.players) setPlayers(data.players);
      clearGame();
    });
    socket.on("room_updated", (data: RoomEvent) => {
      setHostId(data.hostId);
      setSchoolStage(data.schoolStage);
      if (data.players) setPlayers(data.players);
    });
    socket.on("room_left", () => {
      setIsInRoom(false);
      setViewState("home");
      setRoomCode("");
      setPlayers([]);
      setErrorMessage("");
      clearGame();
    });
    socket.on("room_closed", () => {
      setIsInRoom(false);
      setViewState("home");
      setRoomCode("");
      setPlayers([]);
      setErrorMessage("A sala foi encerrada pelo anfitrião.");
      clearGame();
    });
    socket.on("room_error", ({ message }: { message: string }) => {
      setErrorMessage(message || "Não foi possível concluir a operação da sala.");
    });
    socket.on("game_started", ({ condition }: { condition: string }) => {
      setMyCondition(condition);
    });
    socket.on("game_state_updated", (state: PublicGameState) => {
      setGameState(state);
      if (state.status !== "paused") setObstaclePending(null);
    });
    socket.on("obstacle_pending", (data: ObstaclePending) =>
      setObstaclePending(data),
    );
    socket.on("quiz_question", (question: QuizQuestion) => {
      quizLockRef.current = false;
      setQuizQuestion(question);
      setQuizResult(null);
      setQuizError(null);
    });
    socket.on("quiz_result", (result: QuizResult) => {
      quizLockRef.current = true;
      setQuizQuestion(null);
      setQuizResult(result);
    });
    socket.on("quiz_error", (error: QuizError) => {
      quizLockRef.current = true;
      setQuizQuestion(null);
      setQuizError(error);
    });
    socket.on("quiz_round_ended", () => {
      quizLockRef.current = false;
      setQuizQuestion(null);
      setQuizResult(null);
      setQuizError(null);
    });
    socket.on("game_over", (result: GameOver) => {
      setObstaclePending(null);
      setQuizQuestion(null);
      setQuizResult(null);
      setQuizError(null);
      quizLockRef.current = true;
      setGameOver(result);
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
    const update = () =>
      setQuizRemainingSeconds(
        Math.max(0, Math.ceil((quizQuestion.deadlineAt - Date.now()) / 1000)),
      );
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [quizQuestion]);

  const ownPlayerId = socketRef.current?.id ?? "";
  const emit = (event: string, payload?: object) =>
    socketRef.current?.emit(event, payload);
  const validName = playerName.trim().length >= 2 && playerName.trim().length <= 16;

  const createRoom = () => {
    if (!validName) {
      setErrorMessage("O apelido deve ter entre 2 e 16 caracteres.");
      return;
    }
    setErrorMessage("");
    emit("create_room", { name: playerName.trim(), avatarId, isPrivate: false });
  };
  const joinRoom = (code: string) => {
    if (!validName) {
      setErrorMessage("O apelido deve ter entre 2 e 16 caracteres.");
      return;
    }
    if (code.trim().length !== 4) {
      setErrorMessage("Digite um código de sala com 4 caracteres.");
      return;
    }
    setErrorMessage("");
    emit("join_room", {
      roomCode: code.trim().toUpperCase(),
      name: playerName.trim(),
      avatarId,
    });
  };
  const submitQuiz = (answer: QuizAnswer) => {
    if (!quizQuestion || quizLockRef.current || quizRemainingSeconds <= 0) return;
    quizLockRef.current = true;
    socketRef.current?.emit(
      "submit_quiz_answer",
      { quizId: quizQuestion.quizId, alternativa: answer },
      (ack: { success: boolean; code?: string }) => {
        if (!ack?.success) {
          quizLockRef.current = false;
          setQuizError({ quizId: quizQuestion.quizId, code: ack?.code ?? "INVALID_ANSWER" });
        }
      },
    );
  };

  if (!isLoaded) {
    return <SplashView palette={palette} connectionWaitTime={connectionWaitTime} />;
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: palette.background }}>
      <TopHeader
        isConnected={isConnected}
        roomCode={isInRoom ? roomCode : undefined}
        themeMode={themeMode}
        isDaltonico={isDaltonico}
        onToggleTheme={() =>
          setThemeMode((mode) => (mode === "light" ? "dark" : "light"))
        }
        onToggleDaltonico={() => setIsDaltonico((value) => !value)}
        palette={palette}
      />
      {errorMessage ? (
        <ErrorBanner
          message={errorMessage}
          palette={palette}
          onDismiss={() => setErrorMessage("")}
        />
      ) : null}
      {!isInRoom && viewState === "home" ? (
        <HomeView
          playerName={playerName}
          onChangeName={setPlayerName}
          avatarId={avatarId}
          onChangeAvatar={setAvatarId}
          onJoinPublicRoom={() => setViewState("public_list")}
          onJoinPrivateRoom={() => setViewState("private_join")}
          onCreateRoom={createRoom}
          palette={palette}
        />
      ) : !gameState ? (
        <RoomsView
          viewState={viewState === "home" ? "waiting_room" : viewState}
          publicRooms={publicRooms}
          roomCode={roomCode}
          players={players}
          hostId={hostId}
          ownPlayerId={ownPlayerId}
          schoolStage={schoolStage}
          onSetSchoolStage={(stage) => emit("set_school_stage", { roomCode, schoolStage: stage })}
          onStartGame={() => emit("start_game", { roomCode })}
          onLeaveRoom={() => emit("leave_room")}
          onJoinSpecificRoom={joinRoom}
          onBackToHome={() => {
            if (isInRoom) emit("leave_room");
            setIsInRoom(false);
            setViewState("home");
          }}
          palette={palette}
        />
      ) : (
        <View style={{ flex: 1, flexDirection: isDesktop ? "row" : "column" }}>
          <View style={{ width: isDesktop ? 320 : "100%", height: isDesktop ? "100%" : 220 }}>
            <PlayersSidebar
              players={players}
              positions={gameState.positions}
              quizPoints={gameState.quizPoints ?? {}}
              myCondition={myCondition}
              palette={palette}
            />
          </View>
          <View style={{ flex: 1, padding: 10 }}>
            <DicePanel
              diceResult={gameState.diceResult}
              isMyTurn={gameState.status === "active" && gameState.currentPlayerId === ownPlayerId}
              currentPlayerName={
                players.find((player) => player.playerId === gameState.currentPlayerId)?.name ?? ""
              }
              onRollDice={() => emit("roll_dice", { roomCode })}
              palette={palette}
            />
            <BoardTrack
              positions={gameState.positions}
              ownPlayerId={ownPlayerId}
              playerProfiles={players}
              palette={palette}
            />
          </View>
          <QuizModal
            question={quizQuestion}
            result={quizResult}
            error={quizError}
            obstaclePending={obstaclePending}
            remainingSeconds={quizRemainingSeconds}
            onSubmit={submitQuiz}
            palette={palette}
          />
          {gameOver ? (
            <GameOverModal
              gameOver={gameOver}
              playerProfiles={players}
              ownPlayerId={ownPlayerId}
              onBackToHome={() => {
                setGameOver(null);
                setIsInRoom(false);
                setRoomCode("");
                setPlayers([]);
              }}
              palette={palette}
            />
          ) : null}
        </View>
      )}
    </SafeAreaView>
  );
}
