import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Platform, StyleSheet, Text, View } from "react-native";

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
  isLoading?: boolean;
  isCheckingStatus?: boolean;
  palette: ThemePalette;
}

const GIS_SCRIPT_ID = "google-identity-services-script";

export function GoogleSignInButton({
  onCredential,
  serverGoogleEnabled,
  isLoading = false,
  isCheckingStatus = false,
  palette,
}: GoogleSignInButtonProps) {
  const containerRef = useRef<View | null>(null);
  const onCredentialRef = useRef(onCredential);
  const [scriptFailed, setScriptFailed] = useState(false);

  useEffect(() => {
    onCredentialRef.current = onCredential;
  }, [onCredential]);

  const isConfigured =
    Platform.OS === "web" &&
    Boolean(GOOGLE_WEB_CLIENT_ID) &&
    serverGoogleEnabled;

  useEffect(() => {
    if (
      !isConfigured ||
      isLoading ||
      typeof window === "undefined" ||
      typeof document === "undefined"
    ) {
      return;
    }

    let cancelled = false;
    let rendered = false;

    const renderButton = () => {
      if (cancelled || rendered) return;
      const gsi = window.google?.accounts?.id;
      const element = containerRef.current as unknown as HTMLElement | null;
      if (!gsi || !element) {
        return;
      }
      rendered = true;
      element.innerHTML = "";
      gsi.initialize({
        client_id: GOOGLE_WEB_CLIENT_ID,
        callback: (response) => {
          if (response.credential) {
            void Promise.resolve(onCredentialRef.current(response.credential)).catch(
              () => {},
            );
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

    // Fallback caso o script tenha concluído logo antes de anexar o listener
    const retryTimer = window.setInterval(() => {
      if (window.google?.accounts?.id) {
        renderButton();
        window.clearInterval(retryTimer);
      }
    }, 250);
    const stopTimer = window.setTimeout(() => {
      window.clearInterval(retryTimer);
    }, 5000);

    return () => {
      cancelled = true;
      script?.removeEventListener("load", handleLoad);
      script?.removeEventListener("error", handleError);
      window.clearInterval(retryTimer);
      window.clearTimeout(stopTimer);
    };
  }, [isConfigured, isLoading, palette.isDark]);

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

  if (Platform.OS === "web" && Boolean(GOOGLE_WEB_CLIENT_ID) && isCheckingStatus) {
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
          Jogue imediatamente sem cadastro. Quando o Google OAuth estiver ativo
          no ambiente, o login com conta UFRRJ/Google aparecerá aqui.
        </Text>
      </View>
    );
  }

  if (scriptFailed) {
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
        <Text style={[styles.fallbackSubtitle, { color: palette.textMain }]}>
          Não foi possível carregar o botão do Google agora. Você pode continuar
          normalmente como convidado.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.gisWrap}>
      <View ref={containerRef} style={styles.gisMount} />
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
  gisMount: {
    minHeight: 44,
    minWidth: 220,
    alignItems: "center",
    justifyContent: "center",
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
    gap: 4,
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
});
