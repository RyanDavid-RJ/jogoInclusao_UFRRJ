import { useState } from "react";
import { ScrollView, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { getThemePalette, type ThemeMode } from "../constants/duoTheme";
import { BoardTrack } from "../components/game/BoardTrack";
import { DicePanel } from "../components/game/DicePanel";
import { GameOverModal } from "../components/game/GameOverModal";
import { PlayersSidebar } from "../components/game/PlayersSidebar";
import { QuizModal } from "../components/game/QuizModal";
import { HomeView } from "../components/lobby/HomeView";
import { RoomsView } from "../components/lobby/RoomsView";
import { SplashView } from "../components/lobby/SplashView";
import { ErrorBanner, TopHeader } from "../components/ui/DuoComponents";
import { useGameSession } from "../hooks/useGameSession";

export default function IndexScreen() {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isDesktop = width >= 900;

  const [themeMode, setThemeMode] = useState<ThemeMode>("light");
  const [isDaltonico, setIsDaltonico] = useState(false);
  const palette = getThemePalette(themeMode, isDaltonico);

  const session = useGameSession();

  if (!session.isLoaded) {
    return (
      <SplashView
        palette={palette}
        connectionWaitTime={session.connectionWaitTime}
      />
    );
  }

  const gameContent = session.gameState ? (
    <>
      <View
        style={{
          width: isDesktop ? 300 : "100%",
          height: isDesktop ? "100%" : undefined,
        }}
      >
        <PlayersSidebar
          players={session.players}
          positions={session.gameState.positions}
          quizPoints={session.gameState.quizPoints ?? {}}
          myCondition={session.myCondition}
          palette={palette}
          scrollable={isDesktop}
        />
      </View>
      <View style={{ flex: 1, padding: 10 }}>
        <DicePanel
          diceResult={session.gameState.diceResult}
          round={session.gameState.round}
          status={session.gameState.status}
          isMyTurn={
            session.gameState.status === "active" &&
            session.gameState.currentPlayerId === session.ownPlayerId
          }
          currentPlayerName={
            session.players.find(
              (player) =>
                player.playerId === session.gameState?.currentPlayerId,
            )?.name ?? ""
          }
          onRollDice={session.rollDice}
          palette={palette}
        />
        <BoardTrack
          positions={session.gameState.positions}
          ownPlayerId={session.ownPlayerId}
          playerProfiles={session.players}
          palette={palette}
        />
      </View>
    </>
  ) : null;

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: palette.background,
        paddingTop: insets.top + 8,
        paddingBottom: insets.bottom + 8,
      }}
    >
      <TopHeader
        isConnected={session.isConnected}
        roomCode={session.isInRoom ? session.roomCode : undefined}
        themeMode={themeMode}
        isDaltonico={isDaltonico}
        onToggleTheme={() =>
          setThemeMode((mode) => (mode === "light" ? "dark" : "light"))
        }
        onToggleDaltonico={() => setIsDaltonico((value) => !value)}
        palette={palette}
      />
      {session.errorMessage ? (
        <ErrorBanner
          message={session.errorMessage}
          palette={palette}
          onDismiss={session.dismissError}
        />
      ) : null}
      {!session.isInRoom && session.viewState === "home" ? (
        <HomeView
          playerName={session.playerName}
          onChangeName={session.setPlayerName}
          avatarId={session.avatarId}
          onChangeAvatar={session.setAvatarId}
          onJoinPublicRoom={session.openPublicRooms}
          onJoinPrivateRoom={session.openPrivateJoin}
          onCreateRoom={session.createRoom}
          palette={palette}
        />
      ) : !session.gameState ? (
        <RoomsView
          viewState={
            session.viewState === "home" ? "waiting_room" : session.viewState
          }
          publicRooms={session.publicRooms}
          roomCode={session.roomCode}
          isPrivateRoom={session.isPrivateRoom}
          players={session.players}
          hostId={session.hostId}
          ownPlayerId={session.ownPlayerId}
          schoolStage={session.schoolStage}
          onSetSchoolStage={session.selectSchoolStage}
          onStartGame={session.startGame}
          onLeaveRoom={session.leaveAndResetSession}
          onCloseRoom={session.closeRoom}
          onJoinSpecificRoom={session.joinRoom}
          onBackToHome={session.leaveAndResetSession}
          palette={palette}
        />
      ) : (
        <View style={{ flex: 1 }}>
          {isDesktop ? (
            <View style={{ flex: 1, flexDirection: "row" }}>
              {gameContent}
            </View>
          ) : (
            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={{ paddingBottom: 24 }}
            >
              {gameContent}
            </ScrollView>
          )}
          <QuizModal
            question={session.quizQuestion}
            result={session.quizResult}
            error={session.quizError}
            obstaclePending={session.obstaclePending}
            remainingSeconds={session.quizRemainingSeconds}
            onSubmit={session.submitQuiz}
            onDismiss={session.dismissQuizFeedback}
            palette={palette}
          />
          {session.gameOver ? (
            <GameOverModal
              gameOver={session.gameOver}
              playerProfiles={session.players}
              ownPlayerId={session.ownPlayerId}
              onBackToHome={session.leaveAndResetSession}
              palette={palette}
            />
          ) : null}
        </View>
      )}
    </View>
  );
}
