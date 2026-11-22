// frontend/src/components/ui/DuoComponents.tsx
// Design System tátil do "Ludo Equidade (UFRRJ)" v2.0.
// Sem shadow* (deprecados no RN Web) — profundidade via borderBottomWidth.

import { useState, type ReactNode } from "react";
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
  type AuthUser,
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
  selected?: boolean;
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
  palette: ThemePalette,
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
        text: "#1F2937",
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
        bg: palette.cardBg,
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
    iconSize: 15,
    borderRadius: 12,
    borderBottomWidth: 4,
    minHeight: 40,
  },
  md: {
    paddingVertical: 12,
    paddingHorizontal: 18,
    fontSize: 15,
    subtitleSize: 12,
    iconSize: 18,
    borderRadius: 16,
    borderBottomWidth: 5,
    minHeight: 48,
  },
  lg: {
    paddingVertical: 15,
    paddingHorizontal: 24,
    fontSize: 16,
    subtitleSize: 12,
    iconSize: 20,
    borderRadius: 18,
    borderBottomWidth: 6,
    minHeight: 56,
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
  selected,
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
      accessibilityState={{
        disabled: !!disabled,
        ...(selected === undefined ? {} : { selected }),
      }}
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
            numberOfLines={2}
          >
            {title}
          </Text>
          {subtitle ? (
            <Text
              style={[
                styles.buttonSubtitle,
                { color: colors.text, fontSize: sizeConfig.subtitleSize },
              ]}
              numberOfLines={2}
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

export type DuoCardVariant =
  | "default"
  | "highlight"
  | "warning"
  | "purple"
  | "danger"
  | "success";

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
  palette: ThemePalette,
): CardColors {
  switch (variant) {
    case "highlight":
      return { bg: palette.secondaryBg, border: palette.secondaryBorder };
    case "success":
      return { bg: palette.primaryBg, border: palette.primaryBorder };
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
/* 3. StatKpiCard & InfoPill                                           */
/* ================================================================== */

export interface StatKpiCardProps {
  label: string;
  value: string;
  hint?: string;
  icon?: string;
  accentColor?: string;
  palette: ThemePalette;
}

export function StatKpiCard({
  label,
  value,
  hint,
  icon,
  accentColor,
  palette,
}: StatKpiCardProps) {
  return (
    <View
      style={[
        styles.kpiCard,
        {
          backgroundColor: palette.cardBg,
          borderColor: accentColor ?? palette.cardBorder,
        },
      ]}
    >
      <View style={styles.kpiTopRow}>
        <Text style={[styles.kpiLabel, { color: palette.textMuted }]} numberOfLines={2}>
          {label}
        </Text>
        {icon ? <Text style={styles.kpiIcon}>{icon}</Text> : null}
      </View>
      <Text
        style={[
          styles.kpiValue,
          { color: accentColor ?? palette.textMain },
        ]}
        numberOfLines={1}
      >
        {value}
      </Text>
      {hint ? (
        <Text style={[styles.kpiHint, { color: palette.textMuted }]} numberOfLines={2}>
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

export interface InfoPillProps {
  text: string;
  tone?: "neutral" | "primary" | "secondary" | "warning" | "danger" | "purple";
  palette: ThemePalette;
}

export function InfoPill({ text, tone = "neutral", palette }: InfoPillProps) {
  let bg = palette.surfaceAlt;
  let border = palette.cardBorder;
  let color = palette.textMain;

  if (tone === "primary") {
    bg = palette.primaryBg;
    border = palette.primaryBorder;
    color = palette.primaryText;
  } else if (tone === "secondary") {
    bg = palette.secondaryBg;
    border = palette.secondaryBorder;
    color = palette.isDark ? "#7DD3FC" : palette.secondaryBorder;
  } else if (tone === "warning") {
    bg = palette.warningBg;
    border = palette.warningBorder;
    color = palette.textMain;
  } else if (tone === "danger") {
    bg = palette.dangerBg;
    border = palette.dangerBorder;
    color = palette.isDark ? "#FCA5A5" : palette.dangerBorder;
  } else if (tone === "purple") {
    bg = palette.purpleBg;
    border = palette.purpleBorder;
    color = palette.isDark ? "#E9D5FF" : palette.purpleBorder;
  }

  return (
    <View
      style={[
        styles.infoPill,
        { backgroundColor: bg, borderColor: border },
      ]}
    >
      <Text style={[styles.infoPillText, { color }]} numberOfLines={1}>
        {text}
      </Text>
    </View>
  );
}

/* ================================================================== */
/* 4. AvatarMedallion                                                  */
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
  sm: { circleSize: 44, emojiSize: 22, labelSize: 11 },
  md: { circleSize: 60, emojiSize: 30, labelSize: 12 },
  lg: { circleSize: 84, emojiSize: 42, labelSize: 14 },
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
  const circleBackground = selected
    ? palette.secondaryBg
    : palette.isDark
      ? palette.surfaceAlt
      : meta.bgTint;

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
            borderWidth: selected ? 3 : 2,
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
            {
              color: selected ? palette.secondaryBorder : palette.textMain,
              fontSize: config.labelSize,
            },
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
/* 5. ErrorBanner                                                      */
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
/* 6. TopHeader                                                        */
/* ================================================================== */

export type AppSection = "play" | "profile" | "teacher";

export interface TopHeaderProps {
  isConnected: boolean;
  roomCode?: string;
  inActiveMatch?: boolean;
  activeSection?: AppSection;
  onChangeSection?: (section: AppSection) => void;
  authUser?: AuthUser | null;
  isTeacherAccess?: boolean;
  themeMode: ThemeMode;
  isDaltonico: boolean;
  isSoundEnabled?: boolean;
  onToggleTheme: () => void;
  onToggleDaltonico: () => void;
  onToggleSound?: () => void;
  onOpenHelp?: () => void;
  onLeaveMatch?: () => void;
  palette: ThemePalette;
}

export function TopHeader({
  isConnected,
  roomCode,
  inActiveMatch = false,
  activeSection = "play",
  onChangeSection,
  authUser,
  isTeacherAccess = false,
  themeMode,
  isDaltonico,
  isSoundEnabled = true,
  onToggleTheme,
  onToggleDaltonico,
  onToggleSound,
  onOpenHelp,
  onLeaveMatch,
  palette,
}: TopHeaderProps) {
  const [confirmingLeave, setConfirmingLeave] = useState(false);
  const connectionBg = isConnected ? palette.primaryBg : palette.dangerBg;
  const connectionBorder = isConnected
    ? palette.primaryBorder
    : palette.dangerBorder;
  const connectionText = isConnected
    ? palette.primaryText
    : palette.dangerBorder;
  const connectionLabel = isConnected ? "● Online" : "● Offline";

  const showNav = Boolean(onChangeSection) && !inActiveMatch;

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
      <View style={styles.headerTopLine}>
        <Pressable
          onPress={showNav ? () => onChangeSection?.("play") : undefined}
          accessibilityRole={showNav ? "button" : "header"}
          accessibilityLabel="Ludo Equidade ICE UFRRJ"
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
            🎲 LUDO EQUIDADE
          </Text>
          <View
            style={[
              styles.instBadge,
              {
                backgroundColor: palette.secondaryBg,
                borderColor: palette.secondaryBorder,
              },
            ]}
          >
            <Text
              style={[
                styles.instBadgeText,
                { color: palette.isDark ? "#7DD3FC" : palette.secondaryBorder },
              ]}
            >
              ICE • UFRRJ
            </Text>
          </View>
        </Pressable>

        {showNav ? (
          <View style={styles.navRow} accessibilityRole="tablist">
            <Pressable
              onPress={() => onChangeSection?.("play")}
              accessibilityRole="tab"
              accessibilityState={{ selected: activeSection === "play" }}
              style={({ pressed }) => [
                styles.navPill,
                {
                  backgroundColor:
                    activeSection === "play"
                      ? palette.primary
                      : palette.surfaceAlt,
                  borderColor:
                    activeSection === "play"
                      ? palette.primaryBorder
                      : palette.cardBorder,
                },
                pressed && styles.togglePressed,
              ]}
            >
              <Text
                style={[
                  styles.navPillText,
                  {
                    color:
                      activeSection === "play" ? "#FFFFFF" : palette.textMain,
                  },
                ]}
              >
                🎮 Jogar
              </Text>
            </Pressable>

            {authUser ? (
              <Pressable
                onPress={() => onChangeSection?.("profile")}
                accessibilityRole="tab"
                accessibilityState={{ selected: activeSection === "profile" }}
                style={({ pressed }) => [
                  styles.navPill,
                  {
                    backgroundColor:
                      activeSection === "profile"
                        ? palette.secondary
                        : palette.surfaceAlt,
                    borderColor:
                      activeSection === "profile"
                        ? palette.secondaryBorder
                        : palette.cardBorder,
                  },
                  pressed && styles.togglePressed,
                ]}
              >
                <Text
                  style={[
                    styles.navPillText,
                    {
                      color:
                        activeSection === "profile"
                          ? "#FFFFFF"
                          : palette.textMain,
                    },
                  ]}
                  numberOfLines={1}
                >
                  {getAvatarMeta(authUser.avatarPadrao).emoji}{" "}
                  {authUser.apelidoPadrao}
                </Text>
              </Pressable>
            ) : null}

            <Pressable
              onPress={() => onChangeSection?.("teacher")}
              accessibilityRole="tab"
              accessibilityState={{ selected: activeSection === "teacher" }}
              style={({ pressed }) => [
                styles.navPill,
                {
                  backgroundColor:
                    activeSection === "teacher"
                      ? palette.purple
                      : palette.surfaceAlt,
                  borderColor:
                    activeSection === "teacher"
                      ? palette.purpleBorder
                      : isTeacherAccess
                        ? palette.purpleBorder
                        : palette.cardBorder,
                },
                pressed && styles.togglePressed,
              ]}
            >
              <Text
                style={[
                  styles.navPillText,
                  {
                    color:
                      activeSection === "teacher"
                        ? "#FFFFFF"
                        : palette.textMain,
                  },
                ]}
              >
                📊 Painel Docente
              </Text>
            </Pressable>
          </View>
        ) : null}

        <View style={styles.statusRow}>
          <View
            style={[
              styles.statusPill,
              {
                backgroundColor: connectionBg,
                borderColor: connectionBorder,
              },
            ]}
            accessibilityLiveRegion="polite"
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
                  backgroundColor: palette.secondaryBg,
                  borderColor: palette.secondaryBorder,
                },
              ]}
            >
              <Text style={[styles.statusText, { color: palette.textMain }]}>
                Sala {roomCode}
              </Text>
            </View>
          ) : null}

          {inActiveMatch && onLeaveMatch ? (
            confirmingLeave ? (
              <View style={styles.confirmLeaveRow}>
                <Pressable
                  onPress={() => setConfirmingLeave(false)}
                  accessibilityRole="button"
                  style={[
                    styles.daltonicoToggle,
                    {
                      backgroundColor: palette.surfaceAlt,
                      borderColor: palette.cardBorder,
                    },
                  ]}
                >
                  <Text
                    style={[styles.daltonicoText, { color: palette.textMain }]}
                  >
                    Cancelar
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    setConfirmingLeave(false);
                    onLeaveMatch();
                  }}
                  accessibilityRole="button"
                  accessibilityLabel="Confirmar saída da partida"
                  style={[
                    styles.daltonicoToggle,
                    {
                      backgroundColor: palette.danger,
                      borderColor: palette.dangerBorder,
                    },
                  ]}
                >
                  <Text style={[styles.daltonicoText, { color: "#FFFFFF" }]}>
                    Confirmar saída
                  </Text>
                </Pressable>
              </View>
            ) : (
              <Pressable
                onPress={() => setConfirmingLeave(true)}
                accessibilityRole="button"
                accessibilityLabel="Sair da partida atual"
                style={({ pressed }) => [
                  styles.daltonicoToggle,
                  {
                    backgroundColor: palette.dangerBg,
                    borderColor: palette.dangerBorder,
                  },
                  pressed && styles.togglePressed,
                ]}
              >
                <Text
                  style={[
                    styles.daltonicoText,
                    { color: palette.isDark ? "#FCA5A5" : palette.dangerBorder },
                  ]}
                >
                  🚪 Sair
                </Text>
              </Pressable>
            )
          ) : null}

          {onOpenHelp ? (
            <Pressable
              onPress={onOpenHelp}
              accessibilityRole="button"
              accessibilityLabel="Abrir guia rápido de regras"
              style={({ pressed }) => [
                styles.daltonicoToggle,
                {
                  backgroundColor: palette.surfaceAlt,
                  borderColor: palette.cardBorder,
                },
                pressed && styles.togglePressed,
              ]}
            >
              <Text
                style={[styles.daltonicoText, { color: palette.textMain }]}
                numberOfLines={1}
              >
                ❓ Regras
              </Text>
            </Pressable>
          ) : null}

          {onToggleSound ? (
            <Pressable
              onPress={onToggleSound}
              accessibilityRole="button"
              accessibilityLabel={
                isSoundEnabled ? "Silenciar efeitos sonoros" : "Ativar efeitos sonoros"
              }
              accessibilityState={{ selected: isSoundEnabled }}
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
                {isSoundEnabled ? "🔊" : "🔇"}
              </Text>
            </Pressable>
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
    </View>
  );
}

/* ================================================================== */
/* 7. StyleSheet estático (sem shadow*)                                */
/* ================================================================== */

const styles = StyleSheet.create({
  buttonBase: {
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  fullWidth: {
    width: "100%",
  },
  buttonPressed: {
    transform: [{ translateY: 2 }],
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
    letterSpacing: 0.2,
    textAlign: "center",
  },
  buttonSubtitle: {
    fontWeight: "600",
    opacity: 0.92,
    marginTop: 2,
    textAlign: "center",
  },

  cardBase: {
    borderRadius: 20,
    borderWidth: 2,
    borderBottomWidth: 5,
  },

  kpiCard: {
    flexGrow: 1,
    flexBasis: 148,
    borderRadius: 16,
    borderWidth: 2,
    borderBottomWidth: 4,
    padding: 12,
    gap: 4,
  },
  kpiTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 6,
  },
  kpiLabel: {
    flex: 1,
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  kpiIcon: {
    fontSize: 16,
  },
  kpiValue: {
    fontSize: 22,
    fontWeight: "900",
    letterSpacing: 0.2,
  },
  kpiHint: {
    fontSize: 11,
    fontWeight: "700",
    lineHeight: 15,
  },

  infoPill: {
    borderRadius: 999,
    borderWidth: 1.5,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  infoPillText: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.2,
  },

  avatarWrap: {
    alignItems: "center",
    position: "relative",
  },
  avatarCircle: {
    alignItems: "center",
    justifyContent: "center",
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
    paddingVertical: 1,
  },
  hostBadgeText: {
    fontSize: 13,
  },
  markerPill: {
    position: "absolute",
    bottom: -6,
    right: -4,
    borderRadius: 999,
    borderWidth: 2,
    paddingHorizontal: 5,
    paddingVertical: 1,
    minWidth: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  markerPillText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.3,
  },
  avatarLabel: {
    marginTop: 7,
    fontWeight: "800",
    textAlign: "center",
  },

  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 2,
    borderBottomWidth: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginHorizontal: 12,
    marginTop: 8,
    gap: 8,
  },
  errorText: {
    flex: 1,
    fontWeight: "700",
    fontSize: 13,
    lineHeight: 19,
  },
  dismissBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  dismissBtnPressed: {
    opacity: 0.6,
  },
  dismissBtnText: {
    fontSize: 15,
    fontWeight: "900",
  },

  headerWrap: {
    borderWidth: 2,
    borderBottomWidth: 4,
    borderRadius: 18,
    marginHorizontal: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  headerTopLine: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 8,
  },
  titleBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 12,
    borderWidth: 2,
    paddingHorizontal: 10,
    paddingVertical: 5,
    flexShrink: 1,
  },
  titleText: {
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: 0.4,
  },
  instBadge: {
    borderRadius: 999,
    borderWidth: 1.5,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  instBadgeText: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.4,
  },
  navRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
  },
  navPill: {
    borderRadius: 12,
    borderWidth: 2,
    borderBottomWidth: 3,
    paddingHorizontal: 11,
    paddingVertical: 6,
    maxWidth: 180,
  },
  navPillText: {
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0.2,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
  },
  statusPill: {
    borderRadius: 999,
    borderWidth: 2,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.2,
  },
  iconToggle: {
    borderRadius: 10,
    borderWidth: 2,
    borderBottomWidth: 3,
    paddingHorizontal: 9,
    paddingVertical: 5,
    minWidth: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  iconToggleText: {
    fontSize: 14,
  },
  daltonicoToggle: {
    borderRadius: 10,
    borderWidth: 2,
    borderBottomWidth: 3,
    paddingHorizontal: 10,
    paddingVertical: 5,
    alignItems: "center",
    justifyContent: "center",
  },
  daltonicoText: {
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.2,
  },
  togglePressed: {
    transform: [{ translateY: 1 }],
    opacity: 0.9,
  },
  confirmLeaveRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
});
