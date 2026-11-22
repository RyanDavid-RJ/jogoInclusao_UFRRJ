import { useEffect, useRef, useState } from "react";
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
import { HowToPlayModal } from "../components/ui/HowToPlayModal";
import { getThemePalette, type ThemeMode } from "../constants/duoTheme";
import { useAuth } from "../hooks/useAuth";
import { useGameSession } from "../hooks/useGameSession";
import { playSound, setSoundMuted } from "../utils/soundEffects";

const STORAGE_SOUND_KEY = "ludo_equidade_sound_v2";

function readInitialInviteCode(): string | null {
  if (Platform.OS !== "web" || typeof window === "undefined") {
    return null;
  }
  try {
    const params = new URLSearchParams(window.location.search);
    const raw = params.get("sala")?.trim().toUpperCase() ?? "";
    return /^[A-Z0-9]{4}$/.test(raw) ? raw : null;
  } catch {
    return null;
  }
}

function clearInviteQueryParam() {
  if (Platform.OS !== "web" || typeof window === "undefined") {
    return;
  }
  try {
    const url = new URL(window.location.href);
    if (url.searchParams.has("sala")) {
      url.searchParams.delete("sala");
      window.history.replaceState({}, "", url.pathname + url.search + url.hash);
    }
  } catch {
    // ignore history errors
  }
}

function readInitialSoundEnabled(): boolean {
  if (Platform.OS !== "web" || typeof window === "undefined") {
    return true;
  }
  try {
    return window.localStorage.getItem(STORAGE_SOUND_KEY) !== "0";
  } catch {
    return true;
  }
}

export default function IndexScreen() {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isDesktop = width >= 920;

  const [themeMode, setThemeMode] = useState<ThemeMode>("light");
  const [isDaltonico, setIsDaltonico] = useState(false);
  const [isSoundEnabled, setIsSoundEnabled] = useState<boolean>(
    readInitialSoundEnabled,
  );
  const [showHelp, setShowHelp] = useState(false);
  const [pendingInviteCode, setPendingInviteCode] = useState<string | null>(
    readInitialInviteCode,
  );
  const [activeSection, setActiveSection] = useState<AppSection>("play");
  const palette = getThemePalette(themeMode, isDaltonico);

  const auth = useAuth();
  const session = useGameSession({
    authToken: auth.authToken,
    consentResearch: auth.effectiveConsentResearch,
    preferredName: auth.user?.apelidoPadrao,
    preferredAvatar: auth.user?.avatarPadrao,
  });

  const lastEventKeyRef = useRef<string>("");
  const lastTurnIdRef = useRef<string | null>(null);

  // Sincroniza classes CSS no <body> na Web para padrão de fundo e anel de foco WCAG
  useEffect(() => {
    if (Platform.OS !== "web" || typeof document === "undefined") {
      return;
    }
    document.body.classList.toggle("dark-mode", themeMode === "dark");
    document.body.classList.toggle("daltonico-mode", isDaltonico);
  }, [themeMode, isDaltonico]);

  // Sincroniza mudo dos efeitos sonoros sintetizados
  useEffect(() => {
    setSoundMuted(!isSoundEnabled);
    if (Platform.OS === "web" && typeof window !== "undefined") {
      try {
        window.localStorage.setItem(
          STORAGE_SOUND_KEY,
          isSoundEnabled ? "1" : "0",
        );
      } catch {
        // ignore storage error
      }
    }
  }, [isSoundEnabled]);

  // Feedback sonoro sutil em eventos do tabuleiro
  const lastEvent = session.gameState?.lastEvent ?? null;
  useEffect(() => {
    if (!lastEvent) return;
    const key = `${lastEvent.round}-${lastEvent.playerId}-${lastEvent.type}-${lastEvent.toPosition}-${lastEvent.diceResult ?? "x"}`;
    if (key === lastEventKeyRef.current) return;
    lastEventKeyRef.current = key;

    if (lastEvent.type === "obstacle") {
      playSound("obstacle");
    } else if (lastEvent.type === "bonus" || lastEvent.type === "quiz_bonus") {
      playSound("boost");
    } else if (lastEvent.type === "roll") {
      playSound("dice");
    }
  }, [lastEvent]);

  // Alerta sonoro suave quando chega a vez do jogador
  const currentTurnPlayerId = session.gameState?.currentPlayerId ?? null;
  const gameStatus = session.gameState?.status ?? null;
  useEffect(() => {
    if (
      gameStatus === "active" &&
      currentTurnPlayerId &&
      currentTurnPlayerId === session.ownPlayerId &&
      lastTurnIdRef.current !== currentTurnPlayerId
    ) {
      playSound("turn");
    }
    lastTurnIdRef.current = currentTurnPlayerId;
  }, [currentTurnPlayerId, gameStatus, session.ownPlayerId]);

  // Limpa ?sala=XXXX assim que o usuário entra na sala
  useEffect(() => {
    if (session.isInRoom && pendingInviteCode) {
      setPendingInviteCode(null);
      clearInviteQueryParam();
    }
  }, [session.isInRoom, pendingInviteCode]);

  // Recarrega /api/status e sessão Google salva assim que o servidor acorda (cold start no Render)
  const { refreshOnReconnect } = auth;
  useEffect(() => {
    if (session.isConnected) {
      refreshOnReconnect();
    }
  }, [session.isConnected, refreshOnReconnect]);

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

  const handleJoinInvitedRoom = (code: string) => {
    session.joinRoom(code);
  };

  const handleDismissInvite = () => {
    setPendingInviteCode(null);
    clearInviteQueryParam();
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
          reconnectingPlayers={session.reconnectingPlayers}
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
          currentPlayerId={session.gameState.currentPlayerId}
          currentPlayerName={
            session.players.find(
              (player) =>
                player.playerId === session.gameState?.currentPlayerId,
            )?.name ?? ""
          }
          reconnectingPlayers={session.reconnectingPlayers}
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
          lastEvent={session.gameState.lastEvent}
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
        isSoundEnabled={isSoundEnabled}
        onToggleTheme={() =>
          setThemeMode((mode) => (mode === "light" ? "dark" : "light"))
        }
        onToggleDaltonico={() => setIsDaltonico((value) => !value)}
        onToggleSound={() => setIsSoundEnabled((value) => !value)}
        onOpenHelp={() => setShowHelp(true)}
        onLeaveMatch={session.leaveAndResetSession}
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
          googleClientId={auth.googleClientId}
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
          googleClientId={auth.googleClientId}
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
          pendingInviteCode={pendingInviteCode}
          onJoinInvitedRoom={handleJoinInvitedRoom}
          onDismissInvite={handleDismissInvite}
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

      <HowToPlayModal
        visible={showHelp}
        onClose={() => setShowHelp(false)}
        palette={palette}
      />
    </View>
  );
}
