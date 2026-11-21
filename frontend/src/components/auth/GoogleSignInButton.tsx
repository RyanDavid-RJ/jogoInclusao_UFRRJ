import { useEffect, useRef, useState } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";

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
  palette: ThemePalette;
}

const GIS_SCRIPT_ID = "google-identity-services-script";

export function GoogleSignInButton({
  onCredential,
  serverGoogleEnabled,
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
    if (!isConfigured || typeof window === "undefined" || typeof document === "undefined") {
      return;
    }

    let cancelled = false;

    const renderButton = () => {
      if (cancelled) return;
      const gsi = window.google?.accounts?.id;
      const element = containerRef.current as unknown as HTMLElement | null;
      if (!gsi || !element) {
        return;
      }
      element.innerHTML = "";
      gsi.initialize({
        client_id: GOOGLE_WEB_CLIENT_ID,
        callback: (response) => {
          if (response.credential) {
            void onCredentialRef.current(response.credential);
          }
        },
      });
      gsi.renderButton(element, {
        theme: palette.isDark ? "filled_black" : "outline",
        size: "large",
        shape: "pill",
        text: "continue_with",
        locale: "pt-BR",
      });
    };

    if (window.google?.accounts?.id) {
      renderButton();
      return () => {
        cancelled = true;
      };
    }

    let script = document.getElementById(GIS_SCRIPT_ID) as HTMLScriptElement | null;
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

    return () => {
      cancelled = true;
      script?.removeEventListener("load", handleLoad);
      script?.removeEventListener("error", handleError);
    };
  }, [isConfigured, palette.isDark]);

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
    minHeight: 44,
  },
  gisMount: {
    minHeight: 42,
    alignItems: "center",
    justifyContent: "center",
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
