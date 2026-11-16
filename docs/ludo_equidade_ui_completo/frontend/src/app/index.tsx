import { useState, useEffect, useRef } from "react";
import { SafeAreaView, useWindowDimensions, View } from "react-native";
import { io, Socket } from "socket.io-client";
import { getThemePalette, ThemeMode } from "../../constants/duoTheme";
import { TopHeader } from "../components/ui/DuoComponents";
import { SplashView } from "../components/lobby/SplashView";
import { HomeView } from "../components/lobby/HomeView";
import { RoomsView } from "../components/lobby/RoomsView";
import { DicePanel } from "../components/game/DicePanel";
import { BoardTrack } from "../components/game/BoardTrack";
import { PlayersSidebar } from "../components/game/PlayersSidebar";
import { QuizModal } from "../components/game/QuizModal";
import { GameOverModal } from "../components/game/GameOverModal";

const SERVER_URL = process.env.EXPO_PUBLIC_SERVER_URL || "http://localhost:3000";

export default function IndexScreen() {
  const { width } = useWindowDimensions();
  const isDesktop = width > 800;
  
  const [isLoaded, setIsLoaded] = useState(false);
  const [themeMode, setThemeMode] = useState<ThemeMode>("light");
  const [isDaltonico, setIsDaltonico] = useState(false);
  const palette = getThemePalette(themeMode, isDaltonico);

  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionWaitTime, setConnectionWaitTime] = useState(0);

  const [isInRoom, setIsInRoom] = useState(false);
  const [roomCode, setRoomCode] = useState("");
  const [playerName, setPlayerName] = useState("");
  const [avatarId, setAvatarId] = useState("coelho");
  const [playerProfiles, setPlayerProfiles] = useState<any[]>([]);
  const [hostId, setHostId] = useState("");
  const [schoolStage, setSchoolStage] = useState<any>(null);
  const [myCondition, setMyCondition] = useState<string | null>(null);

  const [gameState, setGameState] = useState<any>(null);
  const [gameOver, setGameOver] = useState<any>(null);
  const [obstaclePending, setObstaclePending] = useState<any>(null);
  const [quizQuestion, setQuizQuestion] = useState<any>(null);
  const [quizResult, setQuizResult] = useState<any>(null);
  const [quizError, setQuizError] = useState<any>(null);

  const [viewState, setViewState] = useState<"public_list" | "private_join" | "waiting_room">("waiting_room");

  useEffect(() => {
    const t = setInterval(() => setConnectionWaitTime(v => v + 1), 1000);
    setTimeout(() => { clearInterval(t); setIsLoaded(true); }, 2500);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    socketRef.current = io(SERVER_URL);
    socketRef.current.on("connect", () => setIsConnected(true));
    socketRef.current.on("disconnect", () => {
      setIsConnected(false); setIsInRoom(false); setGameState(null); setGameOver(null);
    });
    socketRef.current.on("room_created", (data: any) => {
      setIsInRoom(true); setRoomCode(data.roomCode); setHostId(data.hostId); setPlayerProfiles(data.players || []); setViewState("waiting_room");
    });
    socketRef.current.on("room_joined", (data: any) => {
      setIsInRoom(true); setRoomCode(data.roomCode); setHostId(data.hostId); setSchoolStage(data.schoolStage); setViewState("waiting_room");
    });
    socketRef.current.on("room_updated", (data: any) => {
      setHostId(data.hostId); setSchoolStage(data.schoolStage); setPlayerProfiles(data.players || []);
    });
    socketRef.current.on("game_started", (data: any) => setMyCondition(data.condition));
    socketRef.current.on("game_state_updated", (state: any) => { setGameState(state); setObstaclePending(null); });
    socketRef.current.on("obstacle_pending", (data: any) => setObstaclePending(data));
    socketRef.current.on("quiz_question", (data: any) => setQuizQuestion(data));
    socketRef.current.on("quiz_result", (data: any) => { setQuizQuestion(null); setQuizResult(data); });
    socketRef.current.on("quiz_round_ended", () => { setQuizQuestion(null); });
    socketRef.current.on("quiz_error", (data: any) => { setQuizQuestion(null); setQuizError(data); });
    socketRef.current.on("game_over", (data: any) => setGameOver(data));
    
    return () => { socketRef.current?.disconnect(); };
  }, []);

  if (!isLoaded) return <SplashView palette={palette} connectionWaitTime={connectionWaitTime} />;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: palette.background }}>
      <TopHeader isConnected={isConnected} roomCode={isInRoom ? roomCode : undefined} themeMode={themeMode} isDaltonico={isDaltonico} onToggleTheme={() => setThemeMode(m => m === "light" ? "dark" : "light")} onToggleDaltonico={() => setIsDaltonico(d => !d)} palette={palette} />

      {!isInRoom ? (
        <HomeView playerName={playerName} onChangeName={setPlayerName} avatarId={avatarId} onChangeAvatar={setAvatarId} onJoinPublicRoom={() => setViewState("public_list")} onJoinPrivateRoom={() => setViewState("private_join")} onCreateRoom={() => socketRef.current?.emit("create_room", { name: playerName, avatarId })} palette={palette} />
      ) : !gameState ? (
        <RoomsView viewState={viewState} publicRooms={[]} roomCode={roomCode} players={playerProfiles} hostId={hostId} ownPlayerId={socketRef.current?.id || ""} schoolStage={schoolStage} onSetSchoolStage={s => socketRef.current?.emit("set_school_stage", { roomCode, schoolStage: s })} onStartGame={() => socketRef.current?.emit("start_game", { roomCode })} onLeaveRoom={() => socketRef.current?.emit("leave_room")} onJoinSpecificRoom={c => socketRef.current?.emit("join_room", { roomCode: c, name: playerName, avatarId })} onBackToHome={() => setIsInRoom(false)} palette={palette} />
      ) : (
        <View style={{ flex: 1, flexDirection: isDesktop ? "row" : "column" }}>
          <View style={{ width: isDesktop ? 300 : "100%", height: isDesktop ? "100%" : 200 }}>
            <PlayersSidebar players={playerProfiles} positions={gameState.positions} quizPoints={gameState.quizPoints || {}} myCondition={myCondition} palette={palette} />
          </View>
          <View style={{ flex: 1, padding: 10 }}>
            <DicePanel diceResult={gameState.diceResult} isMyTurn={gameState.currentPlayerId === socketRef.current?.id} currentPlayerName={playerProfiles.find(p => p.playerId === gameState.currentPlayerId)?.name || ""} onRollDice={() => socketRef.current?.emit("roll_dice", { roomCode })} palette={palette} />
            <BoardTrack positions={gameState.positions} ownPlayerId={socketRef.current?.id} playerProfiles={playerProfiles} palette={palette} />
          </View>
          <QuizModal question={quizQuestion} result={quizResult} error={quizError} obstaclePending={obstaclePending} remainingSeconds={30} onSubmit={ans => socketRef.current?.emit("submit_quiz_answer", { quizId: quizQuestion.quizId, alternativa: ans }, () => {})} palette={palette} />
          {gameOver && <GameOverModal gameOver={gameOver} playerProfiles={playerProfiles} ownPlayerId={socketRef.current?.id || ""} onBackToHome={() => { setGameOver(null); setGameState(null); setIsInRoom(false); }} palette={palette} />}
        </View>
      )}
    </SafeAreaView>
  );
}
