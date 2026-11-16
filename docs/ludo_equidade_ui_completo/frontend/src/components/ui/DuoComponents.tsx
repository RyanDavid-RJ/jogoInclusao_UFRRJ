// frontend/src/components/ui/DuoComponents.tsx
// Design System tátil do "Ludo Equidade (UFRRJ)".
// Sem shadow* (deprecados no RN Web) — profundidade via borderBottomWidth.

import type { ReactNode } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";

import {
  getAvatarMeta,
  type ThemeMode,
  type ThemePalette,
} from "../../constants/duoTheme";

/* ================================================================== */
/* 1. DuoButton                                                        */
/* ================================================================== */

export type DuoButtonVariant =
  | "primary"
  | "secondary"
  | "warning"
  | "danger"
  | "purple"
  | "ghost";

export type DuoButtonSize = "sm" | "md" | "lg";

export interface DuoButtonProps {
  title: string;
  subtitle?: string;
  icon?: string;
  onPress?: () => void;
  variant?: DuoButtonVariant;
  size?: DuoButtonSize;
  disabled?: boolean;
  fullWidth?: boolean;
  palette: ThemePalette;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
}

interface ButtonColors {
  bg: string;
  border: string;
  text: string;
}

function resolveButtonColors(
  variant: DuoButtonVariant,
  palette: ThemePalette
): ButtonColors {
  switch (variant) {
    case "secondary":
      return {
        bg: palette.secondary,
        border: palette.secondaryBorder,
        text: "#FFFFFF",
      };
    case "warning":
      return {
        bg: palette.warning,
        border: palette.warningBorder,
        text: "#3C3C3C",
      };
    case "danger":
      return {
        bg: palette.danger,
        border: palette.dangerBorder,
        text: "#FFFFFF",
      };
    case "purple":
      return {
        bg: palette.purple,
        border: palette.purpleBorder,
        text: "#FFFFFF",
      };
    case "ghost":
      return {
        bg: "transparent",
        border: palette.cardBorder,
        text: palette.textMain,
      };
    case "primary":
    default:
      return {
        bg: palette.primary,
        border: palette.primaryBorder,
        text: "#FFFFFF",
      };
  }
}

interface ButtonSizeConfig {
  paddingVertical: number;
  paddingHorizontal: number;
  fontSize: number;
  subtitleSize: number;
  iconSize: number;
  borderRadius: number;
  borderBottomWidth: number;
  minHeight: number;
}

const BUTTON_SIZES: Record<DuoButtonSize, ButtonSizeConfig> = {
  sm: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    fontSize: 13,
    subtitleSize: 11,
    iconSize: 16,
    borderRadius: 12,
    borderBottomWidth: 4,
    minHeight: 40,
  },
  md: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    fontSize: 15,
    subtitleSize: 12,
    iconSize: 18,
    borderRadius: 16,
    borderBottomWidth: 5,
    minHeight: 50,
  },
  lg: {
    paddingVertical: 16,
    paddingHorizontal: 26,
    fontSize: 17,
    subtitleSize: 13,
    iconSize: 22,
    borderRadius: 18,
    borderBottomWidth: 6,
    minHeight: 60,
  },
};

export function DuoButton({
  title,
  subtitle,
  icon,
  onPress,
  variant = "primary",
  size = "md",
  disabled = false,
  fullWidth = true,
  palette,
  accessibilityLabel,
  accessibilityHint,
  style,
}: DuoButtonProps) {
  const colors = resolveButtonColors(variant, palette);
  const sizeConfig = BUTTON_SIZES[size];

  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: !!disabled }}
      style={({ pressed }) => [
        styles.buttonBase,
        {
          backgroundColor: colors.bg,
          borderColor: colors.border,
          borderBottomWidth: sizeConfig.borderBottomWidth,
          borderRadius: sizeConfig.borderRadius,
          paddingVertical: sizeConfig.paddingVertical,
          paddingHorizontal: sizeConfig.paddingHorizontal,
          minHeight: sizeConfig.minHeight,
        },
        fullWidth && styles.fullWidth,
        pressed && !disabled && styles.buttonPressed,
        disabled && styles.buttonDisabled,
        style,
      ]}
    >
      <View style={styles.buttonContent}>
        {icon ? (
          <Text
            style={[styles.buttonIcon, { fontSize: sizeConfig.iconSize }]}
            accessibilityElementsHidden
            importantForAccessibility="no"
          >
            {icon}
          </Text>
        ) : null}
        <View style={styles.buttonTextWrap}>
          <Text
            style={[
              styles.buttonTitle,
              { color: colors.text, fontSize: sizeConfig.fontSize },
            ]}
            numberOfLines={1}
          >
            {title}
          </Text>
          {subtitle ? (
            <Text
              style={[
                styles.buttonSubtitle,
                { color: colors.text, fontSize: sizeConfig.subtitleSize },
              ]}
              numberOfLines={1}
            >
              {subtitle}
            </Text>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

/* ================================================================== */
/* 2. DuoCard                                                          */
/* ================================================================== */

export type DuoCardVariant = "default" | "highlight" | "warning" | "purple" | "danger";

export interface DuoCardProps {
  children: ReactNode;
  palette: ThemePalette;
  variant?: DuoCardVariant;
  padding?: number;
  style?: StyleProp<ViewStyle>;
}

interface CardColors {
  bg: string;
  border: string;
}

function resolveCardColors(
  variant: DuoCardVariant,
  palette: ThemePalette
): CardColors {
  switch (variant) {
    case "highlight":
      return { bg: palette.surfaceAlt, border: palette.secondaryBorder };
    case "warning":
      return { bg: palette.warningBg, border: palette.warningBorder };
    case "purple":
      return { bg: palette.purpleBg, border: palette.purpleBorder };
    case "danger":
      return { bg: palette.dangerBg, border: palette.dangerBorder };
    case "default":
    default:
      return { bg: palette.cardBg, border: palette.cardBorder };
  }
}

export function DuoCard({
  children,
  palette,
  variant = "default",
  padding = 16,
  style,
}: DuoCardProps) {
  const colors = resolveCardColors(variant, palette);

  return (
    <View
      style={[
        styles.cardBase,
        {
          backgroundColor: colors.bg,
          borderColor: colors.border,
          padding,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

/* ================================================================== */
/* 3. AvatarMedallion                                                  */
/* ================================================================== */

export type AvatarMedallionSize = "sm" | "md" | "lg";

export interface AvatarMedallionProps {
  avatarId?: string;
  size?: AvatarMedallionSize;
  selected?: boolean;
  isHost?: boolean;
  markerText?: string;
  showLabel?: boolean;
  onPress?: () => void;
  palette: ThemePalette;
}

interface AvatarSizeConfig {
  circleSize: number;
  emojiSize: number;
  labelSize: number;
}

const AVATAR_SIZES: Record<AvatarMedallionSize, AvatarSizeConfig> = {
  sm: { circleSize: 48, emojiSize: 24, labelSize: 11 },
  md: { circleSize: 64, emojiSize: 32, labelSize: 12 },
  lg: { circleSize: 88, emojiSize: 44, labelSize: 14 },
};

export function AvatarMedallion({
  avatarId,
  size = "md",
  selected = false,
  isHost = false,
  markerText,
  showLabel = false,
  onPress,
  palette,
}: AvatarMedallionProps) {
  const meta = getAvatarMeta(avatarId);
  const config = AVATAR_SIZES[size];

  const circleBorder = selected ? palette.secondary : meta.borderColor;
  const circleBackground = selected ? palette.surfaceAlt : meta.bgTint;

  const inner = (
    <View style={styles.avatarWrap}>
      <View
        style={[
          styles.avatarCircle,
          {
            width: config.circleSize,
            height: config.circleSize,
            borderRadius: config.circleSize / 2,
            backgroundColor: circleBackground,
            borderColor: circleBorder,
            borderBottomWidth: selected ? 6 : 4,
          },
        ]}
      >
        <Text style={{ fontSize: config.emojiSize }}>{meta.emoji}</Text>
      </View>

      {isHost ? (
        <View style={styles.hostBadge}>
          <Text style={styles.hostBadgeText}>👑</Text>
        </View>
      ) : null}

      {markerText ? (
        <View
          style={[
            styles.markerPill,
            {
              backgroundColor: palette.secondary,
              borderColor: palette.secondaryBorder,
            },
          ]}
        >
          <Text style={styles.markerPillText}>{markerText}</Text>
        </View>
      ) : null}

      {showLabel ? (
        <Text
          style={[
            styles.avatarLabel,
            { color: palette.textMain, fontSize: config.labelSize },
          ]}
          numberOfLines={1}
        >
          {meta.label}
        </Text>
      ) : null}
    </View>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`Avatar ${meta.label}`}
        accessibilityState={{ selected }}
        style={({ pressed }) => [pressed && styles.avatarPressed]}
      >
        {inner}
      </Pressable>
    );
  }

  return inner;
}

/* ================================================================== */
/* 4. ErrorBanner                                                      */
/* ================================================================== */

export interface ErrorBannerProps {
  message: string;
  palette: ThemePalette;
  onDismiss?: () => void;
}

export function ErrorBanner({ message, palette, onDismiss }: ErrorBannerProps) {
  if (!message) {
    return null;
  }

  return (
    <View
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      style={[
        styles.errorBanner,
        {
          backgroundColor: palette.dangerBg,
          borderColor: palette.dangerBorder,
        },
      ]}
    >
      <Text style={[styles.errorText, { color: palette.textMain }]}>
        {"⚠️ "}
        {message}
      </Text>
      {onDismiss ? (
        <Pressable
          onPress={onDismiss}
          accessibilityRole="button"
          accessibilityLabel="Fechar aviso"
          style={({ pressed }) => [
            styles.dismissBtn,
            pressed && styles.dismissBtnPressed,
          ]}
        >
          <Text style={[styles.dismissBtnText, { color: palette.dangerBorder }]}>
            ✕
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

/* ================================================================== */
/* 5. TopHeader                                                        */
/* ================================================================== */

export interface TopHeaderProps {
  isConnected: boolean;
  roomCode?: string;
  themeMode: ThemeMode;
  isDaltonico: boolean;
  onToggleTheme: () => void;
  onToggleDaltonico: () => void;
  palette: ThemePalette;
}

export function TopHeader({
  isConnected,
  roomCode,
  themeMode,
  isDaltonico,
  onToggleTheme,
  onToggleDaltonico,
  palette,
}: TopHeaderProps) {
  const connectionBg = isConnected ? palette.surfaceAlt : palette.dangerBg;
  const connectionBorder = isConnected
    ? palette.primaryBorder
    : palette.dangerBorder;
  const connectionText = isConnected
    ? palette.primaryBorder
    : palette.dangerBorder;
  const connectionLabel = isConnected ? "🟢 Online" : "🔴 Desconectado";

  return (
    <View
      style={[
        styles.headerWrap,
        {
          backgroundColor: palette.cardBg,
          borderColor: palette.cardBorder,
        },
      ]}
    >
      <View style={styles.headerRow}>
        <View
          style={[
            styles.titleBadge,
            {
              backgroundColor: palette.surfaceAlt,
              borderColor: palette.cardBorder,
            },
          ]}
        >
          <Text
            style={[styles.titleText, { color: palette.textMain }]}
            numberOfLines={1}
          >
            🎲 LUDO EQUIDADE • UFRRJ
          </Text>
        </View>
      </View>

      <View style={styles.statusRow}>
        <View
          style={[
            styles.statusPill,
            {
              backgroundColor: connectionBg,
              borderColor: connectionBorder,
            },
          ]}
        >
          <Text style={[styles.statusText, { color: connectionText }]}>
            {connectionLabel}
          </Text>
        </View>

        {roomCode ? (
          <View
            style={[
              styles.statusPill,
              {
                backgroundColor: palette.surfaceAlt,
                borderColor: palette.cardBorder,
              },
            ]}
          >
            <Text style={[styles.statusText, { color: palette.textMain }]}>
              Sala: {roomCode}
            </Text>
          </View>
        ) : null}

        <Pressable
          onPress={onToggleTheme}
          accessibilityRole="button"
          accessibilityLabel={
            themeMode === "dark" ? "Ativar modo claro" : "Ativar modo escuro"
          }
          style={({ pressed }) => [
            styles.iconToggle,
            {
              backgroundColor: palette.surfaceAlt,
              borderColor: palette.cardBorder,
            },
            pressed && styles.togglePressed,
          ]}
        >
          <Text style={styles.iconToggleText}>
            {themeMode === "dark" ? "☀️" : "🌙"}
          </Text>
        </Pressable>

        <Pressable
          onPress={onToggleDaltonico}
          accessibilityRole="button"
          accessibilityLabel={
            isDaltonico ? "Desativar modo daltônico" : "Ativar modo daltônico"
          }
          accessibilityState={{ selected: isDaltonico }}
          style={({ pressed }) => [
            styles.daltonicoToggle,
            {
              backgroundColor: isDaltonico
                ? palette.secondary
                : palette.surfaceAlt,
              borderColor: isDaltonico
                ? palette.secondaryBorder
                : palette.cardBorder,
            },
            pressed && styles.togglePressed,
          ]}
        >
          <Text
            style={[
              styles.daltonicoText,
              { color: isDaltonico ? "#FFFFFF" : palette.textMain },
            ]}
            numberOfLines={1}
          >
            👁️ Daltônico
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

/* ================================================================== */
/* 6. StyleSheet estático (sem shadow*, sem strings mágicas)           */
/* ================================================================== */

const styles = StyleSheet.create({
  /* ---- DuoButton ---- */
  buttonBase: {
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  fullWidth: {
    width: "100%",
  },
  buttonPressed: {
    transform: [{ translateY: 3 }],
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 2,
  },
  buttonIcon: {
    fontWeight: "900",
  },
  buttonTextWrap: {
    alignItems: "center",
    flexShrink: 1,
  },
  buttonTitle: {
    fontWeight: "900",
    letterSpacing: 0.3,
    textAlign: "center",
  },
  buttonSubtitle: {
    fontWeight: "600",
    opacity: 0.9,
    marginTop: 2,
    textAlign: "center",
  },

  /* ---- DuoCard ---- */
  cardBase: {
    borderRadius: 22,
    borderWidth: 2,
    borderBottomWidth: 6,
  },

  /* ---- AvatarMedallion ---- */
  avatarWrap: {
    alignItems: "center",
    position: "relative",
  },
  avatarCircle: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
  },
  avatarPressed: {
    transform: [{ translateY: 2 }],
  },
  hostBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    backgroundColor: "#FFFFFF",
    borderRadius: 999,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  hostBadgeText: {
    fontSize: 14,
  },
  markerPill: {
    position: "absolute",
    bottom: -6,
    right: -4,
    borderRadius: 999,
    borderWidth: 2,
    paddingHorizontal: 6,
    paddingVertical: 1,
    minWidth: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  markerPillText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.4,
  },
  avatarLabel: {
    marginTop: 10,
    fontWeight: "800",
    textAlign: "center",
  },

  /* ---- ErrorBanner ---- */
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 2,
    borderBottomWidth: 4,
    padding: 12,
    gap: 8,
  },
  errorText: {
    flex: 1,
    fontWeight: "700",
    fontSize: 14,
    lineHeight: 20,
  },
  dismissBtn: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  dismissBtnPressed: {
    opacity: 0.6,
  },
  dismissBtnText: {
    fontSize: 16,
    fontWeight: "900",
  },

  /* ---- TopHeader ---- */
  headerWrap: {
    borderWidth: 2,
    borderBottomWidth: 4,
    borderRadius: 16,
    padding: 12,
    gap: 10,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 8,
  },
  titleBadge: {
    borderRadius: 10,
    borderWidth: 2,
    paddingHorizontal: 10,
    paddingVertical: 6,
    flexShrink: 1,
  },
  titleText: {
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: 0.4,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
  },
  statusPill: {
    borderRadius: 999,
    borderWidth: 2,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
  iconToggle: {
    borderRadius: 10,
    borderWidth: 2,
    paddingHorizontal: 10,
    paddingVertical: 6,
    minWidth: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  iconToggleText: {
    fontSize: 14,
  },
  daltonicoToggle: {
    borderRadius: 10,
    borderWidth: 2,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  daltonicoText: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
  togglePressed: {
    transform: [{ translateY: 2 }],
  },
});
