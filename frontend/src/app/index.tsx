import { useEffect, useState } from "react";
import { Platform, ScrollView, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BoardTrack } from "../components/game/BoardTrack";
import { DicePanel } from "../components/game/DicePanel";
import { GameOverModal } from "../components/game/GameOverModal";
import { PlayersSidebar } from "../components/game/PlayersSidebar";
import { QuizModal } from "../components/game/QuizModal";
import { HomeView } from "../components/lobby/HomeView";
import { RoomsView } from "../components/lobby/RoomsView";
import { SplashView } from "../components/lobby/SplashView";
import { ProfileView } from "../components/profile/ProfileView";
import { TeacherPanelView } from "../components/teacher/TeacherPanelView";
import {
  ErrorBanner,
  TopHeader,
  type AppSection,
} from "../components/ui/DuoComponents";
import { getThemePalette, type ThemeMode } from "../constants/duoTheme";
import { useAuth } from "../hooks/useAuth";
import { useGameSession } from "../hooks/useGameSession";

export default function IndexScreen() {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isDesktop = width >= 920;

  const [themeMode, setThemeMode] = useState<ThemeMode>("light");
  const [isDaltonico, setIsDaltonico] = useState(false);
  const [activeSection, setActiveSection] = useState<AppSection>("play");
  const palette = getThemePalette(themeMode, isDaltonico);

  const auth = useAuth();
  const session = useGameSession({
    authToken: auth.authToken,
    consentResearch: auth.effectiveConsentResearch,
    preferredName: auth.user?.apelidoPadrao,
    preferredAvatar: auth.user?.avatarPadrao,
  });

  // Sincroniza classes CSS no <body> na Web para padrão de fundo e anel de foco WCAG
  useEffect(() => {
    if (Platform.OS !== "web" || typeof document === "undefined") {
      return;
    }
    document.body.classList.toggle("dark-mode", themeMode === "dark");
    document.body.classList.toggle("daltonico-mode", isDaltonico);
  }, [themeMode, isDaltonico]);

  // Recarrega /api/status e sessão Google salva assim que o servidor acorda (cold start no Render)
  const { refreshOnReconnect } = auth;
  useEffect(() => {
    if (session.isConnected) {
      refreshOnReconnect();
    }
  }, [session.isConnected, refreshOnReconnect]);

  // Se o usuário entra em uma sala ou partida, volta automaticamente para a aba "Jogar"
  const effectiveSection: AppSection =
    session.isInRoom || session.gameState
      ? "play"
      : activeSection === "profile" && !auth.user
        ? "play"
        : activeSection;

  if (!session.isLoaded) {
    return (
      <SplashView
        palette={palette}
        connectionWaitTime={session.connectionWaitTime}
      />
    );
  }

  const combinedError = session.errorMessage || auth.authError;
  const dismissCombinedError = () => {
    session.dismissError();
    auth.dismissAuthError();
  };

  const handleCreateRoomForClass = (turmaCodigo: string) => {
    if (!session.playerName.trim() && auth.user?.apelidoPadrao) {
      session.setPlayerName(auth.user.apelidoPadrao);
    }
    setActiveSection("play");
    session.createRoom(false, { turmaCodigo });
  };

  const gameContent = session.gameState ? (
    <>
      <View
        style={{
          width: isDesktop ? 310 : "100%",
          height: isDesktop ? "100%" : undefined,
        }}
      >
        <PlayersSidebar
          players={session.players}
          positions={session.gameState.positions}
          quizPoints={session.gameState.quizPoints ?? {}}
          myCondition={session.myCondition}
          ownPlayerId={session.ownPlayerId}
          currentPlayerId={session.gameState.currentPlayerId}
          palette={palette}
          scrollable={isDesktop}
        />
      </View>
      <View style={{ flex: 1, padding: 10 }}>
        <DicePanel
          diceResult={session.gameState.diceResult}
          round={session.gameState.round}
          maxRounds={session.gameState.maxRounds ?? session.maxRounds}
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
          lastEvent={session.gameState.lastEvent}
          players={session.players}
          ownPlayerId={session.ownPlayerId}
          onRollDice={session.rollDice}
          palette={palette}
        />
        <BoardTrack
          positions={session.gameState.positions}
          ownPlayerId={session.ownPlayerId}
          currentPlayerId={session.gameState.currentPlayerId}
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
        inActiveMatch={Boolean(session.gameState)}
        activeSection={effectiveSection}
        onChangeSection={setActiveSection}
        authUser={auth.user}
        isTeacherAccess={auth.isTeacherAccess}
        themeMode={themeMode}
        isDaltonico={isDaltonico}
        onToggleTheme={() =>
          setThemeMode((mode) => (mode === "light" ? "dark" : "light"))
        }
        onToggleDaltonico={() => setIsDaltonico((value) => !value)}
        palette={palette}
      />

      {combinedError ? (
        <ErrorBanner
          message={combinedError}
          palette={palette}
          onDismiss={dismissCombinedError}
        />
      ) : null}

      {effectiveSection === "profile" && auth.user && auth.authToken ? (
        <ProfileView
          user={auth.user}
          authToken={auth.authToken}
          onUpdatePreferences={async (patch) => {
            const updated = await auth.updateUserPreferences(patch);
            if (patch.apelidoPadrao) session.setPlayerName(updated.apelidoPadrao);
            if (patch.avatarPadrao) session.setAvatarId(updated.avatarPadrao);
            return updated;
          }}
          onSignOut={() => {
            auth.signOut();
            setActiveSection("play");
          }}
          onBackToPlay={() => setActiveSection("play")}
          palette={palette}
        />
      ) : effectiveSection === "teacher" ? (
        <TeacherPanelView
          authUser={auth.user}
          authToken={auth.authToken}
          adminToken={auth.adminToken}
          isTeacherAccess={auth.isTeacherAccess}
          isAdmin={auth.isAdmin}
          serverGoogleEnabled={auth.serverGoogleEnabled}
          isLoadingAuth={auth.isLoadingUser}
          isCheckingAuthStatus={auth.isCheckingStatus}
          onGoogleCredential={auth.signInWithGoogleCredential}
          onUnlockWithAdminToken={auth.unlockWithAdminToken}
          onClearAdminToken={auth.clearAdminToken}
          onCreateRoomForClass={handleCreateRoomForClass}
          onBackToPlay={() => setActiveSection("play")}
          palette={palette}
        />
      ) : !session.isInRoom && session.viewState === "home" ? (
        <HomeView
          playerName={session.playerName}
          onChangeName={session.setPlayerName}
          avatarId={session.avatarId}
          onChangeAvatar={session.setAvatarId}
          publicRoomsCount={session.publicRooms.length}
          authUser={auth.user}
          serverGoogleEnabled={auth.serverGoogleEnabled}
          isLoadingAuth={auth.isLoadingUser}
          isCheckingAuthStatus={auth.isCheckingStatus}
          consentResearch={auth.effectiveConsentResearch}
          onToggleConsentResearch={(next) => {
            void auth.toggleResearchConsent(next);
          }}
          onGoogleCredential={auth.signInWithGoogleCredential}
          onOpenProfile={() => setActiveSection("profile")}
          onSignOut={auth.signOut}
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
          quizDurationSec={session.quizDurationSec}
          maxRounds={session.maxRounds}
          turmaCodigo={session.turmaCodigo}
          onSetSchoolStage={session.selectSchoolStage}
          onUpdateRoomSettings={session.updateRoomSettings}
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
              hostId={session.hostId}
              onPlayAgain={session.playAgain}
              onBackToHome={session.leaveAndResetSession}
              palette={palette}
            />
          ) : null}
        </View>
      )}
    </View>
  );
}
