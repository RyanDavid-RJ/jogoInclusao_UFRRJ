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
  4: { title: "Escada", domain: "Mobilidade", icon: "🪜", description: "Barreira arquitetônica no percurso." },
  8: { title: "Alerta Sonoro", domain: "Audição", icon: "🔔", description: "Aviso emitido apenas por sinal sonoro." },
  12: { title: "Multidão e Barulho", domain: "Sensorial", icon: "📢", description: "Ambiente com sobrecarga de estímulos." },
  16: { title: "Placa Ilegível", domain: "Visão", icon: "🪧", description: "Sinalização sem contraste ou leitura tátil." },
};

export const CONDITION_META: Record<string, { label: string; personaIcon: string; summary: string; color: string; bgTint: string }> = {
  cadeirante: { label: "Pessoa Cadeirante", personaIcon: "🧑‍🦽", summary: "Perspectiva de mobilidade física diante de barreiras arquitetônicas.", color: "#1CB0F6", bgTint: "#E6F6FE" },
  cego: { label: "Pessoa com Deficiência Visual", personaIcon: "🧑‍🦯", summary: "Perspectiva de orientação espacial e leitura diante de barreiras visuais.", color: "#A559D9", bgTint: "#F8EEFF" },
  surdo: { label: "Pessoa Surda", personaIcon: "🤟", summary: "Perspectiva de comunicação visual diante de barreiras sonoras.", color: "#FF9600", bgTint: "#FFF3E0" },
  neuroatipico: { label: "Pessoa Neuroatípica", personaIcon: "🧠", summary: "Perspectiva de processamento sensorial diante de ambientes sobrecarregados.", color: "#58CC02", bgTint: "#E9F9DF" },
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
  background: string; cardBg: string; cardBorder: string; surfaceAlt: string; textMain: string; textMuted: string; inputBg: string; inputBorder: string; primary: string; primaryBorder: string; secondary: string; secondaryBorder: string; warning: string; warningBg: string; warningBorder: string; danger: string; dangerBg: string; dangerBorder: string; purple: string; purpleBg: string; purpleBorder: string; boardBg: string; boardBorder: string;
}

export function getThemePalette(mode: ThemeMode, isDaltonico: boolean): ThemePalette {
  const palette: ThemePalette = {
    background: mode === "dark" ? "#1F2428" : "#F7F9FA",
    cardBg: mode === "dark" ? "#2B3137" : "#FFFFFF",
    cardBorder: mode === "dark" ? "#444D56" : "#E5E5E5",
    surfaceAlt: mode === "dark" ? "#3A424A" : "#F0F4F8",
    textMain: mode === "dark" ? "#E1E4E8" : "#3C3C3C",
    textMuted: mode === "dark" ? "#959DA5" : "#777777",
    inputBg: mode === "dark" ? "#24292E" : "#F0F0F0",
    inputBorder: mode === "dark" ? "#444D56" : "#DDDDDD",
    primary: "#58CC02", primaryBorder: "#46A302",
    secondary: "#1CB0F6", secondaryBorder: "#1899D6",
    warning: "#FFC800", warningBg: "#FFF9DB", warningBorder: "#E5B400",
    danger: "#FF4B4B", dangerBg: "#FFEAEA", dangerBorder: "#EA2B2B",
    purple: "#CE82FF", purpleBg: "#F8EEFF", purpleBorder: "#A559D9",
    boardBg: mode === "dark" ? "#1A2A3A" : "#EAF7FC",
    boardBorder: mode === "dark" ? "#2B4A6A" : "#B8E6F7",
  };
  if (isDaltonico) {
    palette.primary = "#1CB0F6"; palette.primaryBorder = "#1899D6";
    palette.danger = "#FF9600"; palette.dangerBorder = "#E08200";
    palette.dangerBg = "#FFF3E0";
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
