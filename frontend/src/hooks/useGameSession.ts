import { useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import { io, Socket } from "socket.io-client";

import type {
  GameOver,
  MaxRoundsOption,
  ObstaclePending,
  PlayerProfile,
  PublicGameState,
  PublicRoomSummary,
  QuizAnswer,
  QuizDurationSec,
  QuizError,
  QuizQuestion,
  QuizResult,
  QuizRoundEnded,
  SchoolStage,
} from "../constants/duoTheme";
import { SERVER_URL } from "../services/apiClient";

export type ViewState = "home" | "public_list" | "private_join" | "waiting_room";

type RoomEvent = {
  roomCode: string;
  hostId: string;
  isPrivate?: boolean;
  schoolStage: SchoolStage | null;
  quizDurationSec?: QuizDurationSec;
  maxRounds?: MaxRoundsOption;
  turmaCodigo?: string | null;
  sessionToken?: string;
  condition?: string | null;
  started?: boolean;
  players?: PlayerProfile[];
};

export interface UseGameSessionOptions {
  authToken?: string | null;
  consentResearch?: boolean;
  preferredName?: string;
  preferredAvatar?: string;
}

export interface CreateRoomOptions {
  quizDurationSec?: QuizDurationSec;
  maxRounds?: MaxRoundsOption;
  turmaCodigo?: string;
}

const createSessionToken = () =>
  globalThis.crypto?.randomUUID?.() ??
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;

export function useGameSession(options: UseGameSessionOptions = {}) {
  const {
    authToken = null,
    consentResearch = false,
    preferredName,
    preferredAvatar,
  } = options;

  const socketRef = useRef<Socket | null>(null);
  const quizLockRef = useRef(false);
  const roomCodeRef = useRef("");
  const sessionTokenRef = useRef<string>(createSessionToken());
  const resumeRequestedRef = useRef(false);
  const authTokenRef = useRef<string | null>(authToken);
  const consentResearchRef = useRef<boolean>(consentResearch);
  const userEditedProfileRef = useRef(false);

  const [isLoaded, setIsLoaded] = useState(false);
  const [connectionWaitTime, setConnectionWaitTime] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const [ownPlayerId, setOwnPlayerId] = useState("");

  const [isInRoom, setIsInRoom] = useState(false);
  const [viewState, setViewState] = useState<ViewState>("home");
  const [roomCode, setRoomCode] = useState("");
  const [isPrivateRoom, setIsPrivateRoom] = useState(false);
  const [playerName, setPlayerNameState] = useState("");
  const [avatarId, setAvatarIdState] = useState("coelho");
  const [players, setPlayers] = useState<PlayerProfile[]>([]);
  const [hostId, setHostId] = useState("");
  const [schoolStage, setSchoolStage] = useState<SchoolStage | null>(null);
  const [quizDurationSec, setQuizDurationSec] = useState<QuizDurationSec>(30);
  const [maxRounds, setMaxRounds] = useState<MaxRoundsOption>(8);
  const [turmaCodigo, setTurmaCodigo] = useState<string | null>(null);
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
  const [fastestCorrectPlayerId, setFastestCorrectPlayerId] = useState<
    string | null
  >(null);

  useEffect(() => {
    consentResearchRef.current = consentResearch;
  }, [consentResearch]);

  useEffect(() => {
    if (!userEditedProfileRef.current && preferredName) {
      setPlayerNameState(preferredName.slice(0, 16));
    }
  }, [preferredName]);

  useEffect(() => {
    if (!userEditedProfileRef.current && preferredAvatar) {
      setAvatarIdState(preferredAvatar);
    }
  }, [preferredAvatar]);

  const setPlayerName = (name: string) => {
    userEditedProfileRef.current = true;
    setPlayerNameState(name);
  };

  const setAvatarId = (id: string) => {
    userEditedProfileRef.current = true;
    setAvatarIdState(id);
  };

  useEffect(() => {
    const interval = setInterval(
      () => setConnectionWaitTime((value) => value + 1),
      1000,
    );
    const timeout = setTimeout(() => setIsLoaded(true), 800);
    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, []);

  useEffect(() => {
    const socket = io(SERVER_URL, {
      transports: ["websocket", "polling"],
      auth: (cb) => {
        cb(authTokenRef.current ? { token: authTokenRef.current } : {});
      },
    });
    socketRef.current = socket;

    const clearGame = () => {
      setMyCondition(null);
      setGameState(null);
      setObstaclePending(null);
      setGameOver(null);
      setQuizQuestion(null);
      setQuizResult(null);
      setQuizError(null);
      setFastestCorrectPlayerId(null);
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
      setQuizDurationSec(30);
      setMaxRounds(8);
      setTurmaCodigo(null);
      setPlayers([]);
      clearGame();
    };

    const applyRoomSettings = (data: RoomEvent) => {
      if (data.quizDurationSec === 30 || data.quizDurationSec === 45 || data.quizDurationSec === 60) {
        setQuizDurationSec(data.quizDurationSec);
      }
      if (data.maxRounds === 6 || data.maxRounds === 8) {
        setMaxRounds(data.maxRounds);
      }
      if (data.turmaCodigo !== undefined) {
        setTurmaCodigo(data.turmaCodigo ?? null);
      }
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
          : "Conexão perdida com o servidor. Tentando reconectar...",
      );
    });
    socket.on(
      "rooms_updated",
      ({
        rooms,
      }: {
        rooms: (Omit<PublicRoomSummary, "hostName" | "hostAvatarId"> & {
          hostProfile?: { name: string; avatarId: string };
        })[];
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
      applyRoomSettings(data);
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
      applyRoomSettings(data);
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
      applyRoomSettings(data);
      if (data.players) setPlayers(data.players);
      if (data.condition) setMyCondition(data.condition);
      setErrorMessage("");
    });
    socket.on("room_updated", (data: RoomEvent) => {
      setHostId(data.hostId);
      if (typeof data.isPrivate === "boolean") setIsPrivateRoom(data.isPrivate);
      setSchoolStage(data.schoolStage);
      applyRoomSettings(data);
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
      setErrorMessage(
        message || "Não foi possível concluir a operação da sala.",
      );
    });
    socket.on("game_started", ({ condition }: { condition: string }) => {
      setMyCondition(condition);
      setGameOver(null);
      setObstaclePending(null);
      setQuizQuestion(null);
      setQuizResult(null);
      setQuizError(null);
      setFastestCorrectPlayerId(null);
      quizLockRef.current = false;
    });
    socket.on("game_state_updated", (state: PublicGameState) => {
      setGameState(state);
      if (state.status !== "paused") setObstaclePending(null);
      if (state.status === "active") setGameOver(null);
    });
    socket.on("obstacle_pending", (data: ObstaclePending) => {
      setObstaclePending(data);
      setQuizResult(null);
      setQuizError(null);
      setFastestCorrectPlayerId(null);
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
    socket.on("quiz_round_ended", (payload: QuizRoundEnded) => {
      quizLockRef.current = false;
      setQuizQuestion(null);
      setFastestCorrectPlayerId(payload?.fastestCorrectPlayerId ?? null);
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

  // Re-authenticate socket handshake smoothly when user signs in/out while outside a room
  useEffect(() => {
    const previousToken = authTokenRef.current;
    authTokenRef.current = authToken;
    if (previousToken !== authToken && !roomCodeRef.current && socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current.connect();
    }
  }, [authToken]);

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
    const timer = setInterval(update, 500);
    return () => clearInterval(timer);
  }, [quizQuestion]);

  const emit = (event: string, payload?: object) =>
    socketRef.current?.emit(event, payload);
  const validName =
    playerName.trim().length >= 2 && playerName.trim().length <= 16;

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
    setQuizDurationSec(30);
    setMaxRounds(8);
    setTurmaCodigo(null);
    setPlayers([]);
    setErrorMessage("");
    setMyCondition(null);
    setGameState(null);
    setObstaclePending(null);
    setGameOver(null);
    setQuizQuestion(null);
    setQuizResult(null);
    setQuizError(null);
    setFastestCorrectPlayerId(null);
    emit("list_rooms");
  };

  const createRoom = (isPrivate: boolean, roomOpts: CreateRoomOptions = {}) => {
    if (!validName) {
      setErrorMessage("O apelido deve ter entre 2 e 16 caracteres.");
      return;
    }
    setErrorMessage("");
    emit("create_room", {
      name: playerName.trim(),
      avatarId,
      isPrivate,
      quizDurationSec: roomOpts.quizDurationSec ?? 30,
      maxRounds: roomOpts.maxRounds ?? 8,
      turmaCodigo: roomOpts.turmaCodigo?.trim()
        ? roomOpts.turmaCodigo.trim().toUpperCase()
        : undefined,
      consentResearch: consentResearchRef.current,
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
      consentResearch: consentResearchRef.current,
      sessionToken: sessionTokenRef.current,
    });
  };

  const submitQuiz = (answer: QuizAnswer) => {
    if (!quizQuestion || quizLockRef.current || quizRemainingSeconds <= 0) {
      return;
    }
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

  const updateRoomSettings = (settings: {
    quizDurationSec?: QuizDurationSec;
    maxRounds?: MaxRoundsOption;
    turmaCodigo?: string;
  }) => {
    if (!roomCode) return;
    emit("update_room_settings", {
      roomCode,
      ...settings,
    });
  };

  const startGame = () => emit("start_game", { roomCode });

  const playAgain = () => emit("play_again", { roomCode });

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
    quizDurationSec,
    maxRounds,
    turmaCodigo,
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
    fastestCorrectPlayerId,
    createRoom,
    joinRoom,
    submitQuiz,
    openPublicRooms,
    openPrivateJoin,
    selectSchoolStage,
    updateRoomSettings,
    startGame,
    playAgain,
    closeRoom,
    rollDice,
    dismissQuizFeedback,
    leaveAndResetSession,
  };
}
