export type SchoolStage = "Fundamental" | "Médio" | "Superior";
export const SCHOOL_STAGES: SchoolStage[] = ["Fundamental", "Médio", "Superior"];
export type QuizAnswer = "A" | "B" | "C" | "D";
export const QUIZ_ANSWERS: QuizAnswer[] = ["A", "B", "C", "D"];
export type ThemeMode = "light" | "dark";
export const AVATAR_IDS = ["coelho", "gato", "urso", "raposa", "pinguim", "coruja", "sapo", "leao"] as const;
export type AvatarId = (typeof AVATAR_IDS)[number];
export const PLAYER_COLORS = ["#1CB0F6", "#FF9600", "#CE82FF", "#58CC02", "#FF4B4B", "#2B70C9", "#FFC800", "#00CD9C"];
export const DICE_FACES: Record<number, string> = { 1: "⚀", 2: "⚁", 3: "⚂", 4: "⚃", 5: "⚄", 6: "⚅" };

export const AVATAR_META: Record<string, { label: string; emoji: string; color: string; bgTint: string; borderColor: string }> = {
  coelho: { label: "Coelho", emoji: "🐰", color: "#1CB0F6", bgTint: "#E6F6FE", borderColor: "#1899D6" },
  gato: { label: "Gato", emoji: "🐱", color: "#FF9600", bgTint: "#FFF3E0", borderColor: "#E08200" },
  urso: { label: "Urso", emoji: "🐻", color: "#A559D9", bgTint: "#F8EEFF", borderColor: "#8A3CB8" },
  raposa: { label: "Raposa", emoji: "🦊", color: "#FF4B4B", bgTint: "#FFEAEA", borderColor: "#EA2B2B" },
  pinguim: { label: "Pinguim", emoji: "🐧", color: "#2B70C9", bgTint: "#EBF3FC", borderColor: "#1F569E" },
  coruja: { label: "Coruja", emoji: "🦉", color: "#58CC02", bgTint: "#E9F9DF", borderColor: "#46A302" },
  sapo: { label: "Sapo", emoji: "🐸", color: "#00CD9C", bgTint: "#E5FBF5", borderColor: "#00A37B" },
  leao: { label: "Leão", emoji: "🦁", color: "#FFC800", bgTint: "#FFF9DB", borderColor: "#E5B400" },
};

export const OBSTACLE_META: Record<number, { title: string; domain: string; icon: string; description: string }> = {
  7: { title: "Escada", domain: "Mobilidade", icon: "🪜", description: "Barreira arquitetônica no percurso." },
  14: { title: "Alerta Sonoro", domain: "Audição", icon: "🔔", description: "Aviso emitido apenas por sinal sonoro." },
  21: { title: "Multidão e Barulho", domain: "Sensorial", icon: "📢", description: "Ambiente com sobrecarga de estímulos." },
  28: { title: "Placa Ilegível", domain: "Visão", icon: "🪧", description: "Sinalização sem contraste ou leitura tátil." },
};

export const BONUS_META: Record<number, { title: string; icon: string }> = {
  5: { title: "Impulso", icon: "🚀" },
  10: { title: "Impulso", icon: "🚀" },
  15: { title: "Impulso", icon: "🚀" },
  20: { title: "Impulso", icon: "🚀" },
  25: { title: "Impulso", icon: "🚀" },
};

export const CONDITION_META: Record<string, { label: string; personaIcon: string; summary: string; color: string; bgTint: string; darkBgTint: string }> = {
  cadeirante: { label: "Pessoa Cadeirante", personaIcon: "🧑‍🦽", summary: "Perspectiva de mobilidade física diante de barreiras arquitetônicas.", color: "#1CB0F6", bgTint: "#E6F6FE", darkBgTint: "#163042" },
  cego: { label: "Pessoa com Deficiência Visual", personaIcon: "🧑‍🦯", summary: "Perspectiva de orientação espacial e leitura diante de barreiras visuais.", color: "#A559D9", bgTint: "#F8EEFF", darkBgTint: "#2D1F3D" },
  surdo: { label: "Pessoa Surda", personaIcon: "🤟", summary: "Perspectiva de comunicação visual diante de barreiras sonoras.", color: "#FF9600", bgTint: "#FFF3E0", darkBgTint: "#3D2912" },
  neuroatipico: { label: "Pessoa Neuroatípica", personaIcon: "🧠", summary: "Perspectiva de processamento sensorial diante de ambientes sobrecarregados.", color: "#58CC02", bgTint: "#E9F9DF", darkBgTint: "#1D3514" },
};

export interface PlayerProfile { playerId: string; name: string; avatarId: string; }
export interface PublicRoomSummary { roomCode: string; playerCount: number; maxPlayers?: number; hostId: string; hostName: string; hostAvatarId: string; schoolStage: SchoolStage | null; isPrivate?: boolean; }
export interface PublicGameState { positions: Record<string, number>; currentPlayerId: string | null; round: number; diceResult: number | null; status: "active" | "paused" | "finished"; quizPoints?: Record<string, number>; }
export interface ObstaclePending { playerId: string; position: number; round: number; }
export interface GameOver { winners: string[]; reason: "finish" | "round_limit"; roles: { playerId: string; condition: string }[]; reveal?: { playerId: string; name: string; avatarId: string; condition: string; position: number; quizPoints: number; summary?: string }[]; }
export interface QuizQuestion { quizId: string; enunciado: string; alternativas: Record<QuizAnswer, string>; deadlineAt: number; }
export interface QuizResult { quizId: string; alternativa: QuizAnswer | null; correta: boolean; pontos: number; respostaCorreta: QuizAnswer; explicacao?: string; }
export interface QuizError { quizId: string; code: string; }
export interface QuizAnswerAcknowledgement { success: boolean; code?: string; }

export interface ThemePalette {
  isDark: boolean; background: string; cardBg: string; cardBorder: string; surfaceAlt: string; textMain: string; textMuted: string; inputBg: string; inputBorder: string; primary: string; primaryBorder: string; secondary: string; secondaryBorder: string; warning: string; warningBg: string; warningBorder: string; danger: string; dangerBg: string; dangerBorder: string; purple: string; purpleBg: string; purpleBorder: string; boardBg: string; boardBorder: string;
}

export function getThemePalette(mode: ThemeMode, isDaltonico: boolean): ThemePalette {
  const isDark = mode === "dark";
  const palette: ThemePalette = {
    isDark,
    background: isDark ? "#1F2428" : "#F7F9FA",
    cardBg: isDark ? "#2B3137" : "#FFFFFF",
    cardBorder: isDark ? "#444D56" : "#E5E5E5",
    surfaceAlt: isDark ? "#3A424A" : "#F0F4F8",
    textMain: isDark ? "#E1E4E8" : "#3C3C3C",
    textMuted: isDark ? "#959DA5" : "#777777",
    inputBg: isDark ? "#24292E" : "#F0F0F0",
    inputBorder: isDark ? "#444D56" : "#DDDDDD",
    primary: "#58CC02", primaryBorder: "#46A302",
    secondary: "#1CB0F6", secondaryBorder: "#1899D6",
    warning: "#FFC800", warningBg: isDark ? "#3D3214" : "#FFF9DB", warningBorder: "#E5B400",
    danger: "#FF4B4B", dangerBg: isDark ? "#3F1E22" : "#FFEAEA", dangerBorder: "#EA2B2B",
    purple: "#CE82FF", purpleBg: isDark ? "#322242" : "#F8EEFF", purpleBorder: "#A559D9",
    boardBg: isDark ? "#1A2A3A" : "#EAF7FC",
    boardBorder: isDark ? "#2B4A6A" : "#B8E6F7",
  };
  if (isDaltonico) {
    palette.primary = "#1CB0F6"; palette.primaryBorder = "#1899D6";
    palette.danger = "#FF9600"; palette.dangerBorder = "#E08200";
    palette.dangerBg = isDark ? "#3F2B14" : "#FFF3E0";
  }
  return palette;
}

export function getAvatarMeta(avatarId?: string) { return AVATAR_META[avatarId as keyof typeof AVATAR_META] || AVATAR_META.coelho; }
export function getConditionMeta(condition?: string | null) { return CONDITION_META[condition as keyof typeof CONDITION_META] || CONDITION_META.cadeirante; }
export function getPlayerLabel(playerId: string, playerIds: string[], ownPlayerId: string | undefined, profiles: PlayerProfile[] = []): string { if (playerId === ownPlayerId) return "Você"; const p = profiles.find(x => x.playerId === playerId); return p ? p.name : `Jogador ${playerIds.indexOf(playerId) + 1}`; }
export function getPlayerMarker(playerId: string, playerIds: string[], ownPlayerId: string | undefined): string { return playerId === ownPlayerId ? "V" : `J${playerIds.indexOf(playerId) + 1}`; }
export function getQuizErrorMessage(code: string): string {
  const msgs: Record<string, string> = {
    QUIZ_UNAVAILABLE: "Não foi possível carregar o quiz.",
    QUESTIONS_UNAVAILABLE: "Nenhuma pergunta disponível.",
    DEADLINE_EXPIRED: "O tempo esgotou.",
    INVALID_QUIZ: "Quiz inválido.",
    NOT_PARTICIPANT: "Você não participa desta rodada.",
    INVALID_ANSWER: "Resposta inválida.",
    ALREADY_ANSWERED: "Você já respondeu."
  };
  return msgs[code] || "Erro desconhecido.";
}
