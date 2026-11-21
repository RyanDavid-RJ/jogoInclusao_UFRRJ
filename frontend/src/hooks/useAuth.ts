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
  const [authError, setAuthError] = useState<string>("");
  const [serverGoogleEnabled, setServerGoogleEnabled] = useState<boolean>(false);
  const [guestConsentResearch, setGuestConsentResearchState] = useState<boolean>(
    () => readWebStorage(STORAGE_GUEST_CONSENT_KEY) === "1",
  );

  useEffect(() => {
    let active = true;
    apiClient
      .getServerStatus()
      .then((status) => {
        if (active) {
          setServerGoogleEnabled(Boolean(status.googleAuthEnabled));
        }
      })
      .catch(() => {
        // server might still be waking up on Render
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!authToken) {
      setUser(null);
      return;
    }

    let active = true;
    setIsLoadingUser(true);
    apiClient
      .getCurrentUser(authToken)
      .then(({ user: fetched }) => {
        if (active) {
          setUser(fetched);
          setAuthError("");
        }
      })
      .catch((error) => {
        if (!active) return;
        if (error instanceof ApiRequestError && error.status === 401) {
          writeWebStorage(STORAGE_TOKEN_KEY, null);
          setAuthToken(null);
          setUser(null);
        }
      })
      .finally(() => {
        if (active) {
          setIsLoadingUser(false);
        }
      });

    return () => {
      active = false;
    };
  }, [authToken]);

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
        await updateUserPreferences({ consentimentoPesquisa: nextValue });
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

  const isTeacherAccess =
    Boolean(adminToken.trim()) ||
    user?.role === "professor" ||
    user?.role === "admin";

  const isAdmin = user?.role === "admin";
  const effectiveConsentResearch = user
    ? user.consentimentoPesquisa
    : guestConsentResearch;
  const googleSignInReady =
    Platform.OS === "web" &&
    Boolean(GOOGLE_WEB_CLIENT_ID) &&
    serverGoogleEnabled;

  return {
    authToken,
    user,
    adminToken,
    isLoadingUser,
    authError,
    dismissAuthError: () => setAuthError(""),
    serverGoogleEnabled,
    googleSignInReady,
    guestConsentResearch,
    effectiveConsentResearch,
    isTeacherAccess,
    isAdmin,
    signInWithGoogleCredential,
    updateUserPreferences,
    toggleResearchConsent,
    unlockWithAdminToken,
    clearAdminToken,
    signOut,
  };
}
