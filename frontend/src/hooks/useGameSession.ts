import { useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import { io, Socket } from "socket.io-client";

import type {
  GameOver,
  ObstaclePending,
  PlayerProfile,
  PublicGameState,
  PublicRoomSummary,
  QuizAnswer,
  QuizError,
  QuizQuestion,
  QuizResult,
  SchoolStage,
} from "../constants/duoTheme";

const SERVER_URL =
  process.env.EXPO_PUBLIC_SERVER_URL || "http://localhost:3000";

export type ViewState = "home" | "public_list" | "private_join" | "waiting_room";

type RoomEvent = {
  roomCode: string;
  hostId: string;
  isPrivate?: boolean;
  schoolStage: SchoolStage | null;
  sessionToken?: string;
  condition?: string | null;
  started?: boolean;
  players?: PlayerProfile[];
};

const createSessionToken = () =>
  globalThis.crypto?.randomUUID?.() ??
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;

export function useGameSession() {
  const socketRef = useRef<Socket | null>(null);
  const quizLockRef = useRef(false);
  const roomCodeRef = useRef("");
  const sessionTokenRef = useRef<string>(createSessionToken());
  const resumeRequestedRef = useRef(false);

  const [isLoaded, setIsLoaded] = useState(false);
  const [connectionWaitTime, setConnectionWaitTime] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const [ownPlayerId, setOwnPlayerId] = useState("");

  const [isInRoom, setIsInRoom] = useState(false);
  const [viewState, setViewState] = useState<ViewState>("home");
  const [roomCode, setRoomCode] = useState("");
  const [isPrivateRoom, setIsPrivateRoom] = useState(false);
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

    const clearRoom = () => {
      resumeRequestedRef.current = false;
      roomCodeRef.current = "";
      setIsInRoom(false);
      setViewState("home");
      setRoomCode("");
      setIsPrivateRoom(false);
      setHostId("");
      setSchoolStage(null);
      setPlayers([]);
      clearGame();
    };

    socket.on("connect", () => {
      setIsConnected(true);
      setOwnPlayerId(socket.id ?? "");
      setErrorMessage("");
      if (roomCodeRef.current) {
        resumeRequestedRef.current = true;
        socket.emit("resume_room", {
          roomCode: roomCodeRef.current,
          sessionToken: sessionTokenRef.current,
        });
      } else {
        socket.emit("list_rooms");
      }
    });
    socket.on("disconnect", () => {
      setIsConnected(false);
      setErrorMessage(
        roomCodeRef.current
          ? "Conexão perdida. Tentando retomar sua sessão..."
          : "Conexão perdida com o servidor. Tente novamente.",
      );
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
      roomCodeRef.current = data.roomCode;
      if (data.sessionToken) sessionTokenRef.current = data.sessionToken;
      setRoomCode(data.roomCode);
      setIsPrivateRoom(data.isPrivate === true);
      setHostId(data.hostId);
      setSchoolStage(data.schoolStage);
      setPlayers(data.players ?? []);
      clearGame();
    });
    socket.on("room_joined", (data: RoomEvent) => {
      setIsInRoom(true);
      setViewState("waiting_room");
      roomCodeRef.current = data.roomCode;
      if (data.sessionToken) sessionTokenRef.current = data.sessionToken;
      setRoomCode(data.roomCode);
      setIsPrivateRoom(data.isPrivate === true);
      setHostId(data.hostId);
      setSchoolStage(data.schoolStage);
      if (data.players) setPlayers(data.players);
      clearGame();
    });
    socket.on("room_resumed", (data: RoomEvent) => {
      resumeRequestedRef.current = false;
      setIsInRoom(true);
      setViewState("waiting_room");
      roomCodeRef.current = data.roomCode;
      setRoomCode(data.roomCode);
      if (typeof data.isPrivate === "boolean") setIsPrivateRoom(data.isPrivate);
      setHostId(data.hostId);
      setSchoolStage(data.schoolStage);
      if (data.players) setPlayers(data.players);
      if (data.condition) setMyCondition(data.condition);
      setErrorMessage("");
    });
    socket.on("room_updated", (data: RoomEvent) => {
      setHostId(data.hostId);
      if (typeof data.isPrivate === "boolean") setIsPrivateRoom(data.isPrivate);
      setSchoolStage(data.schoolStage);
      if (data.players) setPlayers(data.players);
    });
    socket.on("room_left", () => {
      clearRoom();
      setErrorMessage("");
    });
    socket.on("room_closed", () => {
      clearRoom();
      setErrorMessage("A sala foi encerrada pelo anfitrião.");
    });
    socket.on("room_error", ({ message }: { message: string }) => {
      if (resumeRequestedRef.current) {
        clearRoom();
      }
      setErrorMessage(message || "Não foi possível concluir a operação da sala.");
    });
    socket.on("game_started", ({ condition }: { condition: string }) => {
      setMyCondition(condition);
    });
    socket.on("game_state_updated", (state: PublicGameState) => {
      setGameState(state);
      if (state.status !== "paused") setObstaclePending(null);
    });
    socket.on("obstacle_pending", (data: ObstaclePending) => {
      setObstaclePending(data);
      setQuizResult(null);
      setQuizError(null);
    });
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
    const subscription = AppState.addEventListener("change", (nextAppState) => {
      if (nextAppState === "active" && socketRef.current?.disconnected) {
        socketRef.current.connect();
      }
    });

    return () => subscription.remove();
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

  const emit = (event: string, payload?: object) =>
    socketRef.current?.emit(event, payload);
  const validName = playerName.trim().length >= 2 && playerName.trim().length <= 16;

  const leaveAndResetSession = () => {
    if (roomCodeRef.current) {
      socketRef.current?.emit("leave_room");
    }
    resumeRequestedRef.current = false;
    roomCodeRef.current = "";
    quizLockRef.current = false;
    setIsInRoom(false);
    setViewState("home");
    setRoomCode("");
    setIsPrivateRoom(false);
    setHostId("");
    setSchoolStage(null);
    setPlayers([]);
    setErrorMessage("");
    setMyCondition(null);
    setGameState(null);
    setObstaclePending(null);
    setGameOver(null);
    setQuizQuestion(null);
    setQuizResult(null);
    setQuizError(null);
    emit("list_rooms");
  };

  const createRoom = (isPrivate: boolean) => {
    if (!validName) {
      setErrorMessage("O apelido deve ter entre 2 e 16 caracteres.");
      return;
    }
    setErrorMessage("");
    emit("create_room", {
      name: playerName.trim(),
      avatarId,
      isPrivate,
      sessionToken: sessionTokenRef.current,
    });
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
      sessionToken: sessionTokenRef.current,
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
          setQuizError({
            quizId: quizQuestion.quizId,
            code: ack?.code ?? "INVALID_ANSWER",
          });
        }
      },
    );
  };

  const openPublicRooms = () => {
    emit("list_rooms");
    setViewState("public_list");
  };

  const openPrivateJoin = () => setViewState("private_join");

  const selectSchoolStage = (stage: SchoolStage) =>
    emit("set_school_stage", { roomCode, schoolStage: stage });

  const startGame = () => emit("start_game", { roomCode });

  const closeRoom = () => emit("close_room", { roomCode });

  const rollDice = () => emit("roll_dice", { roomCode });

  const dismissQuizFeedback = () => {
    setQuizResult(null);
    setQuizError(null);
  };

  const dismissError = () => setErrorMessage("");

  return {
    isLoaded,
    connectionWaitTime,
    isConnected,
    ownPlayerId,
    isInRoom,
    viewState,
    roomCode,
    isPrivateRoom,
    playerName,
    setPlayerName,
    avatarId,
    setAvatarId,
    players,
    hostId,
    schoolStage,
    publicRooms,
    errorMessage,
    dismissError,
    myCondition,
    gameState,
    obstaclePending,
    gameOver,
    quizQuestion,
    quizResult,
    quizError,
    quizRemainingSeconds,
    createRoom,
    joinRoom,
    submitQuiz,
    openPublicRooms,
    openPrivateJoin,
    selectSchoolStage,
    startGame,
    closeRoom,
    rollDice,
    dismissQuizFeedback,
    leaveAndResetSession,
  };
}
