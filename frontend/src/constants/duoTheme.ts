export type SchoolStage = "Fundamental" | "Médio" | "Superior";
export const SCHOOL_STAGES: SchoolStage[] = ["Fundamental", "Médio", "Superior"];

export type QuizAnswer = "A" | "B" | "C" | "D";
export const QUIZ_ANSWERS: QuizAnswer[] = ["A", "B", "C", "D"];

export type ThemeMode = "light" | "dark";

export const QUIZ_DURATIONS = [30, 45, 60] as const;
export type QuizDurationSec = (typeof QUIZ_DURATIONS)[number];

export const MAX_ROUNDS_OPTIONS = [6, 8] as const;
export type MaxRoundsOption = (typeof MAX_ROUNDS_OPTIONS)[number];

export const REVIEW_STATUSES = [
  "rascunho",
  "em_revisao",
  "aprovada",
  "arquivada",
] as const;
export type ReviewStatus = (typeof REVIEW_STATUSES)[number];

export const SYSTEM_ROLES = ["jogador", "professor", "admin"] as const;
export type SystemRole = (typeof SYSTEM_ROLES)[number];

export const ALL_CONDITIONS = [
  "cadeirante",
  "cego",
  "surdo",
  "neuroatipico",
] as const;
export type ConditionKey = (typeof ALL_CONDITIONS)[number];

export const AVATAR_IDS = [
  "coelho",
  "gato",
  "urso",
  "raposa",
  "pinguim",
  "coruja",
  "sapo",
  "leao",
] as const;
export type AvatarId = (typeof AVATAR_IDS)[number];

export const PLAYER_COLORS = [
  "#1CB0F6",
  "#FF9600",
  "#A559D9",
  "#58CC02",
  "#FF4B4B",
  "#2B70C9",
  "#FFC800",
  "#00CD9C",
];

export const DICE_FACES: Record<number, string> = {
  1: "⚀",
  2: "⚁",
  3: "⚂",
  4: "⚃",
  5: "⚄",
  6: "⚅",
};

export const AVATAR_META: Record<
  string,
  { label: string; emoji: string; color: string; bgTint: string; borderColor: string }
> = {
  coelho: {
    label: "Coelho",
    emoji: "🐰",
    color: "#1CB0F6",
    bgTint: "#E6F6FE",
    borderColor: "#1899D6",
  },
  gato: {
    label: "Gato",
    emoji: "🐱",
    color: "#FF9600",
    bgTint: "#FFF3E0",
    borderColor: "#E08200",
  },
  urso: {
    label: "Urso",
    emoji: "🐻",
    color: "#A559D9",
    bgTint: "#F8EEFF",
    borderColor: "#8A3CB8",
  },
  raposa: {
    label: "Raposa",
    emoji: "🦊",
    color: "#FF4B4B",
    bgTint: "#FFEAEA",
    borderColor: "#EA2B2B",
  },
  pinguim: {
    label: "Pinguim",
    emoji: "🐧",
    color: "#2B70C9",
    bgTint: "#EBF3FC",
    borderColor: "#1F569E",
  },
  coruja: {
    label: "Coruja",
    emoji: "🦉",
    color: "#58CC02",
    bgTint: "#E9F9DF",
    borderColor: "#46A302",
  },
  sapo: {
    label: "Sapo",
    emoji: "🐸",
    color: "#00A37B",
    bgTint: "#E5FBF5",
    borderColor: "#008766",
  },
  leao: {
    label: "Leão",
    emoji: "🦁",
    color: "#E5A000",
    bgTint: "#FFF9DB",
    borderColor: "#C98B00",
  },
};

export const OBSTACLE_META: Record<
  number,
  { title: string; key: string; domain: string; icon: string; description: string }
> = {
  7: {
    title: "Escada",
    key: "escada",
    domain: "Mobilidade",
    icon: "🪜",
    description: "Barreira arquitetônica no percurso.",
  },
  14: {
    title: "Alerta Sonoro",
    key: "alerta_sonoro",
    domain: "Audição",
    icon: "🔔",
    description: "Aviso emitido apenas por sinal sonoro.",
  },
  21: {
    title: "Multidão e Barulho",
    key: "multidao_barulho",
    domain: "Sensorial",
    icon: "📢",
    description: "Ambiente com sobrecarga de estímulos.",
  },
  28: {
    title: "Placa Ilegível",
    key: "placa_ilegivel",
    domain: "Visão",
    icon: "🪧",
    description: "Sinalização sem contraste ou leitura tátil.",
  },
};

export const OBSTACLE_LABELS_BY_KEY: Record<string, string> = {
  escada: "🪜 Escada",
  alerta_sonoro: "🔔 Alerta Sonoro",
  multidao_barulho: "📢 Multidão e Barulho",
  placa_ilegivel: "🪧 Placa Ilegível",
};

export const BONUS_META: Record<number, { title: string; icon: string }> = {
  5: { title: "Impulso +2", icon: "🚀" },
  10: { title: "Impulso +2", icon: "🚀" },
  15: { title: "Impulso +2", icon: "🚀" },
  20: { title: "Impulso +2", icon: "🚀" },
  25: { title: "Impulso +2", icon: "🚀" },
};

export const CONDITION_META: Record<
  string,
  {
    label: string;
    shortLabel: string;
    personaIcon: string;
    summary: string;
    color: string;
    bgTint: string;
    darkBgTint: string;
  }
> = {
  cadeirante: {
    label: "Pessoa Cadeirante",
    shortLabel: "Cadeirante",
    personaIcon: "🧑‍🦽",
    summary: "Perspectiva de mobilidade física diante de barreiras arquitetônicas.",
    color: "#1899D6",
    bgTint: "#E6F6FE",
    darkBgTint: "#163042",
  },
  cego: {
    label: "Pessoa com Deficiência Visual",
    shortLabel: "Def. Visual",
    personaIcon: "🧑‍🦯",
    summary: "Perspectiva de orientação espacial e leitura diante de barreiras visuais.",
    color: "#9B4DCA",
    bgTint: "#F8EEFF",
    darkBgTint: "#2D1F3D",
  },
  surdo: {
    label: "Pessoa Surda",
    shortLabel: "Surda",
    personaIcon: "🤟",
    summary: "Perspectiva de comunicação visual diante de barreiras sonoras.",
    color: "#D97706",
    bgTint: "#FFF3E0",
    darkBgTint: "#3D2912",
  },
  neuroatipico: {
    label: "Pessoa Neuroatípica",
    shortLabel: "Neuroatípica",
    personaIcon: "🧠",
    summary: "Perspectiva de processamento sensorial diante de ambientes sobrecarregados.",
    color: "#3F9A00",
    bgTint: "#E9F9DF",
    darkBgTint: "#1D3514",
  },
};

export const REVIEW_STATUS_META: Record<
  ReviewStatus,
  { label: string; icon: string }
> = {
  rascunho: { label: "Rascunho", icon: "📝" },
  em_revisao: { label: "Em revisão", icon: "🔎" },
  aprovada: { label: "Aprovada", icon: "✅" },
  arquivada: { label: "Arquivada", icon: "📦" },
};

/* ================================================================== */
/* Contratos v2.0 (Realtime & REST)                                    */
/* ================================================================== */

export interface AuthUser {
  id: number;
  uuid: string;
  email: string;
  nome: string;
  apelidoPadrao: string;
  avatarPadrao: string;
  fotoUrl: string | null;
  role: SystemRole;
  consentimentoPesquisa: boolean;
  consentimentoEm: string | null;
  ativo: boolean;
  ultimoLoginEm: string | null;
  criadoEm: string | null;
}

export interface PlayerMatchStats {
  diceRolls: number;
  diceTotal: number;
  bonusTriggered: number;
  obstaclesTriggered: number;
  quizAnswered: number;
  quizCorrect: number;
  quizBonusMoves?: number;
  quizLevels: Record<1 | 2 | 3, number>;
}

export interface PlayerProfile {
  playerId: string;
  name: string;
  avatarId: string;
}

export interface PublicRoomSummary {
  roomCode: string;
  playerCount: number;
  maxPlayers?: number;
  hostId: string;
  hostName: string;
  hostAvatarId: string;
  schoolStage: SchoolStage | null;
  isPrivate?: boolean;
  quizDurationSec?: QuizDurationSec;
  maxRounds?: MaxRoundsOption;
  turmaCodigo?: string | null;
}

export interface TurnEvent {
  type: "roll" | "bonus" | "obstacle" | "quiz_bonus" | "finish";
  playerId: string;
  diceResult: number | null;
  fromPosition: number;
  landedPosition: number;
  toPosition: number;
  bonusTriggered: boolean;
  obstaclePosition: number | null;
  obstacleName: string | null;
  round: number;
}

export interface PublicGameState {
  positions: Record<string, number>;
  currentPlayerId: string | null;
  round: number;
  maxRounds?: number;
  diceResult: number | null;
  status: "active" | "paused" | "finished";
  quizPoints?: Record<string, number>;
  lastEvent?: TurnEvent | null;
}

export interface ObstaclePending {
  playerId: string;
  position: number;
  round: number;
}

export interface GameOverRevealItem {
  playerId: string;
  name: string;
  avatarId: string;
  condition: string;
  position: number;
  quizPoints: number;
  destaqueQuiz?: boolean;
  summary?: string;
  stats?: PlayerMatchStats;
}

export interface GameOver {
  winners: string[];
  quizHighlights?: string[];
  reason: "finish" | "round_limit";
  roles: { playerId: string; condition: string }[];
  reveal?: GameOverRevealItem[];
}

export interface QuizQuestion {
  quizId: string;
  enunciado: string;
  alternativas: Record<QuizAnswer, string>;
  deadlineAt: number;
  durationSec?: number;
}

export interface QuizResult {
  quizId: string;
  alternativa: QuizAnswer | null;
  correta: boolean;
  pontos: number;
  bonusMove?: number;
  tempoRespostaMs?: number;
  respostaCorreta: QuizAnswer;
  explicacao?: string;
}

export interface QuizRoundEnded {
  quizId: string;
  placar: Record<string, number>;
  motivo: string;
  fastestCorrectPlayerId?: string | null;
}

export interface QuizError {
  quizId: string;
  code: string;
}

export interface QuizAnswerAcknowledgement {
  success: boolean;
  code?: string;
}

/* ---- REST: Perfil, Histórico, Docente & Analytics ---- */

export interface ApiStatusResponse {
  ok: boolean;
  db: string;
  googleAuthEnabled?: boolean;
}

export interface UserMatchHistoryItem {
  partida_uuid: string;
  etapa_escolar: SchoolStage;
  total_jogadores: number;
  rodadas_jogadas: number;
  motivo_fim: string;
  duracao_seg: number | null;
  finalizada_em: string | null;
  turma_codigo: string | null;
  condicao: ConditionKey;
  posicao_final: number;
  pontos_quiz: number;
  vencedor: number;
  destaque_quiz: number;
  media_dado: number | null;
  impulsos_ativados: number;
  quizzes_respondidos: number;
  quizzes_corretos: number;
  nivel1_enfrentados: number;
  nivel2_enfrentados: number;
  nivel3_enfrentados: number;
}

export interface UserMatchHistoryResponse {
  summary: {
    totalPartidas: number;
    totalVitorias: number;
    totalDestaquesQuiz: number;
    totalRespondidos: number;
    totalCorretos: number;
    perspectivasVivenciadas: string[];
  };
  matches: UserMatchHistoryItem[];
}

export interface QuestionAdminItem {
  id: number;
  etapa_escolar: SchoolStage;
  nivel_estrutural: 1 | 2 | 3;
  enunciado: string;
  opcao_a: string;
  opcao_b: string;
  opcao_c: string;
  opcao_d: string;
  resposta_correta?: QuizAnswer;
  explicacao?: string | null;
  tags?: string[] | string | null;
  area_tematica?: string | null;
  codigo_bncc?: string | null;
  status_revisao?: ReviewStatus;
  ativa?: number | boolean;
  criado_em?: string | null;
  atualizado_em?: string | null;
}

export interface QuestionPayloadInput {
  etapa_escolar: SchoolStage;
  nivel_estrutural: 1 | 2 | 3;
  enunciado: string;
  opcao_a: string;
  opcao_b: string;
  opcao_c: string;
  opcao_d: string;
  resposta_correta: QuizAnswer;
  explicacao?: string | null;
  area_tematica?: string | null;
  codigo_bncc?: string | null;
  status_revisao?: ReviewStatus;
  tags?: string[] | null;
}

export interface TurmaSummary {
  id: number;
  professor_id: number;
  codigo: string;
  nome: string;
  instituicao: string | null;
  etapa_padrao: SchoolStage;
  ativa: number;
  criado_em?: string | null;
  total_partidas?: number;
}

export interface AnalyticsOverviewResponse {
  partidas: {
    total_partidas?: number;
    total_participacoes?: number;
    total_obstaculos?: number;
    total_impulsos?: number;
    duracao_media_seg?: number | null;
    rodadas_media?: number | null;
  };
  quiz: {
    total_respostas?: number;
    total_acertos?: number;
    taxa_acerto_global?: number | null;
    tempo_medio_ms?: number | null;
  };
  porEtapa: { etapa_escolar: SchoolStage; quantidade: number }[];
}

export interface QuestionPerformanceItem {
  pergunta_id: number;
  etapa_escolar: SchoolStage;
  nivel_estrutural: 1 | 2 | 3;
  area_tematica: string | null;
  status_revisao: ReviewStatus;
  ativa: number;
  enunciado: string;
  total_aplicacoes: number;
  total_respondidas: number;
  total_acertos: number;
  taxa_acerto_respondidas: number | null;
  indice_facilidade_global: number | null;
  taxa_sem_resposta: number | null;
  tempo_medio_ms: number | null;
  escolhas_a: number;
  escolhas_b: number;
  escolhas_c: number;
  escolhas_d: number;
}

export interface EquityByConditionItem {
  etapa_escolar: SchoolStage;
  matriz_codigo: string;
  condicao: ConditionKey;
  total_participacoes: number;
  total_vitorias: number;
  taxa_vitoria: number | null;
  posicao_media: number | null;
  media_dado_geral: number | null;
  media_pontos_quiz: number | null;
  taxa_acerto_quiz: number | null;
  total_nivel1: number;
  total_nivel2: number;
  total_nivel3: number;
}

export interface EmpiricalMatrixItem {
  etapa_escolar: SchoolStage;
  matriz_codigo: string;
  obstaculo_nome: string;
  condicao: ConditionKey;
  nivel_estrutural: 1 | 2 | 3;
  total_observacoes: number;
  total_respondidas: number;
  total_acertos: number;
  taxa_acerto_global: number | null;
  taxa_acerto_respondidas: number | null;
  taxa_timeout_ou_saida: number | null;
  tempo_medio_ms: number | null;
  media_pontos: number | null;
}

export interface EquityAnalyticsResponse {
  porCondicao: EquityByConditionItem[];
  matrizEmpirica: EmpiricalMatrixItem[];
}

/* ================================================================== */
/* Paleta de Cores (WCAG 2.1 AA em Claro, Escuro e Daltônico)          */
/* ================================================================== */

export interface ThemePalette {
  isDark: boolean;
  background: string;
  cardBg: string;
  cardBorder: string;
  surfaceAlt: string;
  textMain: string;
  textMuted: string;
  inputBg: string;
  inputBorder: string;
  primary: string;
  primaryBorder: string;
  primaryBg: string;
  primaryText: string;
  secondary: string;
  secondaryBorder: string;
  secondaryBg: string;
  warning: string;
  warningBg: string;
  warningBorder: string;
  danger: string;
  dangerBg: string;
  dangerBorder: string;
  purple: string;
  purpleBg: string;
  purpleBorder: string;
  boardBg: string;
  boardBorder: string;
}

export function getThemePalette(
  mode: ThemeMode,
  isDaltonico: boolean,
): ThemePalette {
  const isDark = mode === "dark";
  const palette: ThemePalette = {
    isDark,
    background: isDark ? "#181D23" : "#F4F7FA",
    cardBg: isDark ? "#232A33" : "#FFFFFF",
    cardBorder: isDark ? "#384352" : "#DCE3EC",
    surfaceAlt: isDark ? "#2D3642" : "#EDF2F7",
    textMain: isDark ? "#F0F4F8" : "#1F2937",
    textMuted: isDark ? "#A6B2C1" : "#526071",
    inputBg: isDark ? "#1B2129" : "#F8FAFC",
    inputBorder: isDark ? "#435061" : "#CBD5E1",
    primary: "#58CC02",
    primaryBorder: "#46A302",
    primaryBg: isDark ? "#1B3312" : "#EAF9DC",
    primaryText: isDark ? "#7EE22E" : "#2D7000",
    secondary: "#1CB0F6",
    secondaryBorder: "#1489C4",
    secondaryBg: isDark ? "#132D3F" : "#E5F5FE",
    warning: "#FFC800",
    warningBg: isDark ? "#3A2F12" : "#FFF8DB",
    warningBorder: "#D99B00",
    danger: "#EF4444",
    dangerBg: isDark ? "#3D1D22" : "#FEECEC",
    dangerBorder: "#DC2626",
    purple: "#A559D9",
    purpleBg: isDark ? "#2F1E3F" : "#F5ECFF",
    purpleBorder: "#8A3CB8",
    boardBg: isDark ? "#172534" : "#E6F4FB",
    boardBorder: isDark ? "#2A435E" : "#B6DFF5",
  };

  if (isDaltonico) {
    palette.primary = "#1CB0F6";
    palette.primaryBorder = "#1489C4";
    palette.primaryBg = isDark ? "#132D3F" : "#E5F5FE";
    palette.primaryText = isDark ? "#5CCBFF" : "#0E6BA0";
    palette.danger = "#EA7B00";
    palette.dangerBorder = "#C26400";
    palette.dangerBg = isDark ? "#3F2912" : "#FFF1DE";
  }

  return palette;
}

/* ================================================================== */
/* Helpers                                                             */
/* ================================================================== */

export function getAvatarMeta(avatarId?: string) {
  return AVATAR_META[avatarId as keyof typeof AVATAR_META] || AVATAR_META.coelho;
}

export function getConditionMeta(condition?: string | null) {
  return (
    CONDITION_META[condition as keyof typeof CONDITION_META] ||
    CONDITION_META.cadeirante
  );
}

export function getPlayerLabel(
  playerId: string,
  playerIds: string[],
  ownPlayerId: string | undefined,
  profiles: PlayerProfile[] = [],
): string {
  if (playerId === ownPlayerId) {
    return "Você";
  }
  const p = profiles.find((x) => x.playerId === playerId);
  return p ? p.name : `Jogador ${playerIds.indexOf(playerId) + 1}`;
}

export function getPlayerMarker(
  playerId: string,
  playerIds: string[],
  ownPlayerId: string | undefined,
): string {
  return playerId === ownPlayerId ? "V" : `J${playerIds.indexOf(playerId) + 1}`;
}

export function getQuizErrorMessage(code: string): string {
  const msgs: Record<string, string> = {
    QUIZ_UNAVAILABLE: "Não foi possível carregar o quiz.",
    QUESTIONS_UNAVAILABLE: "Nenhuma pergunta disponível para esta etapa.",
    DEADLINE_EXPIRED: "O tempo esgotou.",
    INVALID_QUIZ: "Quiz inválido.",
    NOT_PARTICIPANT: "Você não participa desta rodada.",
    INVALID_ANSWER: "Resposta inválida.",
    ALREADY_ANSWERED: "Você já respondeu.",
    RATE_LIMITED: "Muitas tentativas. Aguarde um instante.",
  };
  return msgs[code] || "Erro desconhecido.";
}

export function formatTurnEvent(
  event: TurnEvent | null | undefined,
  playerIds: string[],
  ownPlayerId: string | undefined,
  profiles: PlayerProfile[] = [],
): { icon: string; text: string; tone: "neutral" | "success" | "warning" | "purple" } | null {
  if (!event) {
    return null;
  }
  const actor = getPlayerLabel(event.playerId, playerIds, ownPlayerId, profiles);

  switch (event.type) {
    case "finish":
      return {
        icon: "🏆",
        text: `${actor} cruzou a linha de chegada (casa 30)!`,
        tone: "success",
      };
    case "quiz_bonus":
      return {
        icon: "⚡",
        text: `Avanço por Equidade: ${actor} foi o 1º a acertar o quiz e avançou +1 casa (casa ${event.toPosition})!`,
        tone: "purple",
      };
    case "obstacle": {
      const obs = event.obstaclePosition
        ? OBSTACLE_META[event.obstaclePosition]
        : null;
      return {
        icon: obs?.icon ?? "🚧",
        text: `${actor} tirou ${event.diceResult} e encontrou o obstáculo ${obs?.title ?? "da casa " + event.landedPosition}!`,
        tone: "warning",
      };
    }
    case "bonus":
      return {
        icon: "🚀",
        text: `${actor} tirou ${event.diceResult}, ativou Impulso na casa ${event.landedPosition} e avançou até a casa ${event.toPosition}!`,
        tone: "success",
      };
    case "roll":
    default:
      return {
        icon: "🎲",
        text: `${actor} tirou ${event.diceResult ?? "?"} e avançou da casa ${event.fromPosition} para a casa ${event.toPosition}.`,
        tone: "neutral",
      };
  }
}

export function formatPercent(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === "") {
    return "—";
  }
  const num = Number(value);
  if (!Number.isFinite(num)) {
    return "—";
  }
  return `${(num * 100).toFixed(1).replace(".", ",")}%`;
}

export function formatDecimal(
  value: number | string | null | undefined,
  digits = 1,
): string {
  if (value === null || value === undefined || value === "") {
    return "—";
  }
  const num = Number(value);
  if (!Number.isFinite(num)) {
    return "—";
  }
  return num.toFixed(digits).replace(".", ",");
}

export function formatSecondsFromMs(
  ms: number | string | null | undefined,
): string {
  if (ms === null || ms === undefined || ms === "") {
    return "—";
  }
  const num = Number(ms);
  if (!Number.isFinite(num)) {
    return "—";
  }
  return `${(num / 1000).toFixed(1).replace(".", ",")}s`;
}
