import { useCallback, useEffect, useState } from "react";
import { Platform } from "react-native";

import type { AuthUser } from "../constants/duoTheme";
import { ApiRequestError, apiClient } from "../services/apiClient";

const STORAGE_TOKEN_KEY = "ludo_equidade_jwt_v2";
const STORAGE_GUEST_CONSENT_KEY = "ludo_equidade_guest_consent_v2";

export const GOOGLE_WEB_CLIENT_ID = (
  process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || ""
).trim();

function readWebStorage(key: string): string | null {
  if (Platform.OS !== "web" || typeof window === "undefined") {
    return null;
  }
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeWebStorage(key: string, value: string | null) {
  if (Platform.OS !== "web" || typeof window === "undefined") {
    return;
  }
  try {
    if (value === null) {
      window.localStorage.removeItem(key);
    } else {
      window.localStorage.setItem(key, value);
    }
  } catch {
    // ignore private browsing quota errors
  }
}

export function useAuth() {
  const [authToken, setAuthToken] = useState<string | null>(() =>
    readWebStorage(STORAGE_TOKEN_KEY),
  );
  const [user, setUser] = useState<AuthUser | null>(null);
  const [adminToken, setAdminToken] = useState<string>("");
  const [isLoadingUser, setIsLoadingUser] = useState<boolean>(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState<boolean>(
    Platform.OS === "web",
  );
  const [authError, setAuthError] = useState<string>("");
  const [serverGoogleEnabled, setServerGoogleEnabled] = useState<boolean>(false);
  const [serverGoogleClientId, setServerGoogleClientId] = useState<string>("");
  const [guestConsentResearch, setGuestConsentResearchState] = useState<boolean>(
    () => readWebStorage(STORAGE_GUEST_CONSENT_KEY) === "1",
  );

  const checkServerStatus = useCallback(async () => {
    try {
      const status = await apiClient.getServerStatus();
      setServerGoogleEnabled(Boolean(status.googleAuthEnabled));
      if (typeof status.googleClientId === "string" && status.googleClientId.trim()) {
        setServerGoogleClientId(status.googleClientId.trim());
      }
    } catch {
      // server might still be waking up on Render; retried on socket connect
    } finally {
      setIsCheckingStatus(false);
    }
  }, []);

  const hydrateUserFromToken = useCallback(async (token: string) => {
    setIsLoadingUser(true);
    try {
      const { user: fetched } = await apiClient.getCurrentUser(token);
      setUser(fetched);
      setAuthError("");
    } catch (error) {
      if (error instanceof ApiRequestError && error.status === 401) {
        writeWebStorage(STORAGE_TOKEN_KEY, null);
        setAuthToken(null);
        setUser(null);
      }
    } finally {
      setIsLoadingUser(false);
    }
  }, []);

  useEffect(() => {
    void checkServerStatus();
  }, [checkServerStatus]);

  useEffect(() => {
    if (!authToken) {
      setUser(null);
      return;
    }
    void hydrateUserFromToken(authToken);
  }, [authToken, hydrateUserFromToken]);

  // Recarrega /api/status e sessão salva automaticamente após acordar o Render (cold start)
  const refreshOnReconnect = useCallback(() => {
    if (!serverGoogleEnabled || !serverGoogleClientId) {
      void checkServerStatus();
    }
    if (authToken && !user && !isLoadingUser) {
      void hydrateUserFromToken(authToken);
    }
  }, [
    serverGoogleEnabled,
    serverGoogleClientId,
    checkServerStatus,
    authToken,
    user,
    isLoadingUser,
    hydrateUserFromToken,
  ]);

  const setGuestConsentResearch = useCallback((value: boolean) => {
    setGuestConsentResearchState(value);
    writeWebStorage(STORAGE_GUEST_CONSENT_KEY, value ? "1" : "0");
  }, []);

  const signInWithGoogleCredential = useCallback(async (idToken: string) => {
    setAuthError("");
    setIsLoadingUser(true);
    try {
      const { token, user: signedInUser } =
        await apiClient.loginWithGoogleIdToken(idToken);
      writeWebStorage(STORAGE_TOKEN_KEY, token);
      setAuthToken(token);
      setUser(signedInUser);
      return signedInUser;
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Não foi possível entrar com o Google.";
      setAuthError(message);
      throw error;
    } finally {
      setIsLoadingUser(false);
    }
  }, []);

  const updateUserPreferences = useCallback(
    async (patch: {
      apelidoPadrao?: string;
      avatarPadrao?: string;
      consentimentoPesquisa?: boolean;
    }) => {
      if (!authToken) {
        throw new Error("Faça login para salvar suas preferências.");
      }
      const { user: updated } = await apiClient.updatePreferences(
        authToken,
        patch,
      );
      setUser(updated);
      return updated;
    },
    [authToken],
  );

  const toggleResearchConsent = useCallback(
    async (nextValue: boolean) => {
      if (user && authToken) {
        try {
          await updateUserPreferences({ consentimentoPesquisa: nextValue });
          setAuthError("");
        } catch (error) {
          setAuthError(
            error instanceof Error
              ? error.message
              : "Não foi possível atualizar o consentimento de pesquisa.",
          );
        }
      } else {
        setGuestConsentResearch(nextValue);
      }
    },
    [user, authToken, updateUserPreferences, setGuestConsentResearch],
  );

  const unlockWithAdminToken = useCallback(async (rawToken: string) => {
    const trimmed = rawToken.trim();
    if (!trimmed) {
      throw new Error("Informe o token administrativo docente.");
    }
    await apiClient.getAnalyticsOverview({ adminToken: trimmed });
    setAdminToken(trimmed);
  }, []);

  const clearAdminToken = useCallback(() => {
    setAdminToken("");
  }, []);

  const signOut = useCallback(() => {
    writeWebStorage(STORAGE_TOKEN_KEY, null);
    setAuthToken(null);
    setUser(null);
    setAdminToken("");
    setAuthError("");
  }, []);

  const googleClientId = GOOGLE_WEB_CLIENT_ID || serverGoogleClientId;
  const isTeacherAccess =
    Boolean(adminToken.trim()) ||
    user?.role === "professor" ||
    user?.role === "admin";

  const isAdmin = user?.role === "admin";
  const effectiveConsentResearch = user
    ? user.consentimentoPesquisa
    : guestConsentResearch;
  const googleSignInReady =
    Platform.OS === "web" && Boolean(googleClientId) && serverGoogleEnabled;

  return {
    authToken,
    user,
    adminToken,
    isLoadingUser,
    isCheckingStatus,
    authError,
    dismissAuthError: () => setAuthError(""),
    serverGoogleEnabled,
    googleClientId,
    googleSignInReady,
    guestConsentResearch,
    effectiveConsentResearch,
    isTeacherAccess,
    isAdmin,
    refreshOnReconnect,
    signInWithGoogleCredential,
    updateUserPreferences,
    toggleResearchConsent,
    unlockWithAdminToken,
    clearAdminToken,
    signOut,
  };
}
