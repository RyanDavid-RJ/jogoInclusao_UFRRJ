import { createElement, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import type { ThemePalette } from "../../constants/duoTheme";
import { GOOGLE_WEB_CLIENT_ID } from "../../hooks/useAuth";

declare global {
  interface Window {
    google?: {
      accounts?: {
        id?: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential?: string }) => void;
          }) => void;
          renderButton: (
            parent: HTMLElement,
            options: {
              theme?: "outline" | "filled_blue" | "filled_black";
              size?: "large" | "medium" | "small";
              shape?: "rectangular" | "pill";
              text?: "signin_with" | "continue_with";
              locale?: string;
              width?: number;
            },
          ) => void;
        };
      };
    };
  }
}

export interface GoogleSignInButtonProps {
  onCredential: (idToken: string) => unknown;
  serverGoogleEnabled: boolean;
  googleClientId?: string;
  isLoading?: boolean;
  isCheckingStatus?: boolean;
  palette: ThemePalette;
}

const GIS_SCRIPT_ID = "google-identity-services-script";

export function GoogleSignInButton({
  onCredential,
  serverGoogleEnabled,
  googleClientId,
  isLoading = false,
  isCheckingStatus = false,
  palette,
}: GoogleSignInButtonProps) {
  const divRef = useRef<HTMLDivElement | null>(null);
  const onCredentialRef = useRef(onCredential);
  const [scriptFailed, setScriptFailed] = useState(false);
  const [buttonBlocked, setButtonBlocked] = useState(false);
  const [retryNonce, setRetryNonce] = useState(0);

  useEffect(() => {
    onCredentialRef.current = onCredential;
  }, [onCredential]);

  const effectiveClientId = (
    googleClientId ||
    GOOGLE_WEB_CLIENT_ID ||
    ""
  ).trim();
  const isConfigured =
    Platform.OS === "web" &&
    Boolean(effectiveClientId) &&
    serverGoogleEnabled;

  useEffect(() => {
    if (
      !isConfigured ||
      isLoading ||
      isCheckingStatus ||
      typeof window === "undefined" ||
      typeof document === "undefined"
    ) {
      return;
    }

    let cancelled = false;
    let rendered = false;
    setScriptFailed(false);
    setButtonBlocked(false);

    const renderButton = () => {
      if (cancelled || rendered) return;
      const gsi = window.google?.accounts?.id;
      const element = divRef.current;
      if (!gsi || !element) {
        return;
      }
      rendered = true;
      element.innerHTML = "";
      try {
        gsi.initialize({
          client_id: effectiveClientId,
          callback: (response) => {
            if (response.credential) {
              void Promise.resolve(
                onCredentialRef.current(response.credential),
              ).catch(() => {});
            }
          },
        });
        gsi.renderButton(element, {
          theme: palette.isDark ? "filled_black" : "outline",
          size: "large",
          shape: "pill",
          text: "continue_with",
          locale: "pt-BR",
          width: 280,
        });
      } catch {
        if (!cancelled) {
          setScriptFailed(true);
        }
      }
    };

    if (window.google?.accounts?.id) {
      renderButton();
      return () => {
        cancelled = true;
      };
    }

    let script = document.getElementById(
      GIS_SCRIPT_ID,
    ) as HTMLScriptElement | null;
    if (!script) {
      script = document.createElement("script");
      script.id = GIS_SCRIPT_ID;
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }

    const handleLoad = () => renderButton();
    const handleError = () => {
      if (!cancelled) setScriptFailed(true);
    };

    script.addEventListener("load", handleLoad);
    script.addEventListener("error", handleError);

    const retryTimer = window.setInterval(() => {
      if (window.google?.accounts?.id) {
        renderButton();
        window.clearInterval(retryTimer);
      }
    }, 250);

    const detectBlockTimer = window.setTimeout(() => {
      window.clearInterval(retryTimer);
      if (!cancelled && !rendered) {
        setButtonBlocked(true);
      }
    }, 4500);

    return () => {
      cancelled = true;
      script?.removeEventListener("load", handleLoad);
      script?.removeEventListener("error", handleError);
      window.clearInterval(retryTimer);
      window.clearTimeout(detectBlockTimer);
    };
  }, [
    isConfigured,
    isLoading,
    isCheckingStatus,
    effectiveClientId,
    palette.isDark,
    retryNonce,
  ]);

  if (isLoading) {
    return (
      <View
        style={[
          styles.loadingBox,
          {
            backgroundColor: palette.secondaryBg,
            borderColor: palette.secondaryBorder,
          },
        ]}
      >
        <ActivityIndicator size="small" color={palette.secondary} />
        <Text style={[styles.loadingText, { color: palette.textMain }]}>
          Autenticando com o Google...
        </Text>
      </View>
    );
  }

  if (Platform.OS === "web" && isCheckingStatus) {
    return (
      <View
        style={[
          styles.loadingBox,
          {
            backgroundColor: palette.surfaceAlt,
            borderColor: palette.cardBorder,
          },
        ]}
      >
        <ActivityIndicator size="small" color={palette.secondary} />
        <Text style={[styles.loadingText, { color: palette.textMuted }]}>
          Verificando Login com Google...
        </Text>
      </View>
    );
  }

  if (!isConfigured) {
    return (
      <View
        style={[
          styles.fallbackBox,
          {
            backgroundColor: palette.surfaceAlt,
            borderColor: palette.cardBorder,
          },
        ]}
      >
        <Text style={[styles.fallbackTitle, { color: palette.textMain }]}>
          👤 Jogando como Convidado
        </Text>
        <Text style={[styles.fallbackSubtitle, { color: palette.textMuted }]}>
          {serverGoogleEnabled && !effectiveClientId
            ? "O servidor está com Google OAuth ativo, mas o Client ID público ainda não foi carregado no navegador. Atualize a página após o deploy."
            : "Jogue imediatamente sem cadastro. Quando o Google OAuth estiver ativo no ambiente, o login com conta UFRRJ/Google aparecerá aqui."}
        </Text>
      </View>
    );
  }

  if (scriptFailed || buttonBlocked) {
    return (
      <View
        style={[
          styles.fallbackBox,
          {
            backgroundColor: palette.warningBg,
            borderColor: palette.warningBorder,
          },
        ]}
      >
        <Text style={[styles.fallbackTitle, { color: palette.textMain }]}>
          ⚠️ Botão do Google não carregou
        </Text>
        <Text style={[styles.fallbackSubtitle, { color: palette.textMain }]}>
          Bloqueadores de anúncios/rastreadores (ex.: Opera/Brave/extensões) ou
          VPN podem bloquear `accounts.google.com`. Você pode continuar como
          convidado ou tentar novamente.
        </Text>
        <Pressable
          onPress={() => {
            if (typeof document !== "undefined") {
              document.getElementById(GIS_SCRIPT_ID)?.remove();
            }
            setRetryNonce((n) => n + 1);
          }}
          accessibilityRole="button"
          style={[
            styles.retryBtn,
            {
              backgroundColor: palette.cardBg,
              borderColor: palette.warningBorder,
            },
          ]}
        >
          <Text style={[styles.retryText, { color: palette.textMain }]}>
            🔄 Tentar carregar botão Google novamente
          </Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.gisWrap}>
      {createElement("div", {
        ref: divRef,
        style: {
          minHeight: 44,
          minWidth: 220,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        },
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  gisWrap: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 46,
    width: "100%",
  },
  loadingBox: {
    borderRadius: 14,
    borderWidth: 2,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  loadingText: {
    fontSize: 13,
    fontWeight: "800",
  },
  fallbackBox: {
    borderRadius: 14,
    borderWidth: 2,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 6,
  },
  fallbackTitle: {
    fontSize: 13,
    fontWeight: "900",
  },
  fallbackSubtitle: {
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 17,
  },
  retryBtn: {
    alignSelf: "flex-start",
    borderRadius: 10,
    borderWidth: 2,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginTop: 2,
  },
  retryText: {
    fontSize: 12,
    fontWeight: "900",
  },
});
