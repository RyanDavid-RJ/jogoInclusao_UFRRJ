import { Platform } from "react-native";

import type {
  AnalyticsOverviewResponse,
  ApiStatusResponse,
  AuthUser,
  EquityAnalyticsResponse,
  QuestionAdminItem,
  QuestionPayloadInput,
  QuestionPerformanceItem,
  ReviewStatus,
  SchoolStage,
  SystemRole,
  TurmaSummary,
  UserMatchHistoryResponse,
} from "../constants/duoTheme";

export const SERVER_URL = (
  process.env.EXPO_PUBLIC_SERVER_URL || "http://localhost:3000"
).replace(/\/+$/, "");

export class ApiRequestError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "ApiRequestError";
    this.status = status;
    this.code = code;
  }
}

export interface ApiAuthCredentials {
  authToken?: string | null;
  adminToken?: string | null;
}

function buildHeaders(
  auth?: ApiAuthCredentials,
  extra: Record<string, string> = {},
): Record<string, string> {
  const headers: Record<string, string> = { ...extra };
  if (auth?.authToken) {
    headers.Authorization = `Bearer ${auth.authToken}`;
  }
  if (auth?.adminToken && auth.adminToken.trim()) {
    headers["X-Question-Admin-Token"] = auth.adminToken.trim();
  }
  return headers;
}

function buildQuery(params: Record<string, string | number | boolean | undefined | null>) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      search.set(key, String(value));
    }
  }
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

async function requestJson<T>(
  path: string,
  {
    method = "GET",
    body,
    auth,
  }: {
    method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
    body?: unknown;
    auth?: ApiAuthCredentials;
  } = {},
): Promise<T> {
  const headers = buildHeaders(
    auth,
    body !== undefined ? { "Content-Type": "application/json" } : {},
  );

  const response = await fetch(`${SERVER_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const text = await response.text();
  let parsed: unknown = null;
  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = null;
    }
  }

  if (!response.ok) {
    const errObj = parsed as { error?: string; message?: string; code?: string } | null;
    throw new ApiRequestError(
      errObj?.error || errObj?.message || `Erro HTTP ${response.status}.`,
      response.status,
      errObj?.code,
    );
  }

  return parsed as T;
}

export const apiClient = {
  getServerStatus: () => requestJson<ApiStatusResponse>("/api/status"),

  loginWithGoogleIdToken: (idToken: string) =>
    requestJson<{ token: string; user: AuthUser }>("/api/auth/google", {
      method: "POST",
      body: { idToken },
    }),

  getCurrentUser: (authToken: string) =>
    requestJson<{ user: AuthUser }>("/api/auth/me", {
      auth: { authToken },
    }),

  updatePreferences: (
    authToken: string,
    payload: {
      apelidoPadrao?: string;
      avatarPadrao?: string;
      consentimentoPesquisa?: boolean;
    },
  ) =>
    requestJson<{ user: AuthUser }>("/api/auth/me", {
      method: "PATCH",
      auth: { authToken },
      body: payload,
    }),

  getMyMatchHistory: (
    authToken: string,
    { limit = 20, offset = 0 }: { limit?: number; offset?: number } = {},
  ) =>
    requestJson<UserMatchHistoryResponse>(
      `/api/me/partidas${buildQuery({ limit, offset })}`,
      { auth: { authToken } },
    ),

  listQuestions: (
    auth: ApiAuthCredentials,
    filters: {
      etapa?: SchoolStage | "";
      nivel?: number | "";
      area?: string;
      status?: ReviewStatus | "";
      ativa?: boolean;
      q?: string;
      includeAnswer?: boolean;
    } = {},
  ) =>
    requestJson<QuestionAdminItem[]>(
      `/api/perguntas${buildQuery({
        etapa: filters.etapa || undefined,
        nivel: filters.nivel || undefined,
        area: filters.area || undefined,
        status: filters.status || undefined,
        ativa:
          typeof filters.ativa === "boolean" ? String(filters.ativa) : undefined,
        q: filters.q || undefined,
        includeAnswer: filters.includeAnswer ? "true" : undefined,
      })}`,
      { auth },
    ),

  createQuestion: (auth: ApiAuthCredentials, payload: QuestionPayloadInput) =>
    requestJson<{ id: number }>("/api/perguntas", {
      method: "POST",
      auth,
      body: payload,
    }),

  updateQuestion: (
    auth: ApiAuthCredentials,
    id: number,
    payload: QuestionPayloadInput,
  ) =>
    requestJson<{ id: number; updated: boolean }>(`/api/perguntas/${id}`, {
      method: "PUT",
      auth,
      body: payload,
    }),

  updateQuestionStatus: (
    auth: ApiAuthCredentials,
    id: number,
    payload: { status_revisao?: ReviewStatus; ativa?: boolean },
  ) =>
    requestJson<{ id: number; updated: boolean }>(
      `/api/perguntas/${id}/status`,
      {
        method: "PATCH",
        auth,
        body: payload,
      },
    ),

  listClasses: (authToken: string) =>
    requestJson<{ turmas: TurmaSummary[] }>("/api/turmas", {
      auth: { authToken },
    }),

  createClass: (
    authToken: string,
    payload: {
      codigo: string;
      nome: string;
      instituicao?: string;
      etapa_padrao: SchoolStage;
    },
  ) =>
    requestJson<{ turma: TurmaSummary }>("/api/turmas", {
      method: "POST",
      auth: { authToken },
      body: payload,
    }),

  updateClass: (
    authToken: string,
    id: number,
    payload: {
      nome?: string;
      instituicao?: string;
      etapa_padrao?: SchoolStage;
      ativa?: boolean;
    },
  ) =>
    requestJson<{ id: number; updated: boolean }>(`/api/turmas/${id}`, {
      method: "PATCH",
      auth: { authToken },
      body: payload,
    }),

  getAnalyticsOverview: (
    auth: ApiAuthCredentials,
    filters: { etapa?: SchoolStage | ""; turma?: string; matriz?: string } = {},
  ) =>
    requestJson<AnalyticsOverviewResponse>(
      `/api/analytics/overview${buildQuery({
        etapa: filters.etapa || undefined,
        turma: filters.turma || undefined,
        matriz: filters.matriz || undefined,
      })}`,
      { auth },
    ),

  getQuestionsAnalytics: (
    auth: ApiAuthCredentials,
    filters: {
      etapa?: SchoolStage | "";
      nivel?: number | "";
      area?: string;
      status?: ReviewStatus | "";
    } = {},
  ) =>
    requestJson<{ perguntas: QuestionPerformanceItem[] }>(
      `/api/analytics/perguntas${buildQuery({
        etapa: filters.etapa || undefined,
        nivel: filters.nivel || undefined,
        area: filters.area || undefined,
        status: filters.status || undefined,
      })}`,
      { auth },
    ),

  getEquityAnalytics: (
    auth: ApiAuthCredentials,
    filters: { etapa?: SchoolStage | ""; matriz?: string } = {},
  ) =>
    requestJson<EquityAnalyticsResponse>(
      `/api/analytics/equidade${buildQuery({
        etapa: filters.etapa || undefined,
        matriz: filters.matriz || undefined,
      })}`,
      { auth },
    ),

  downloadAnonymousDataset: async (
    auth: ApiAuthCredentials,
    {
      dataset,
      format,
      etapa,
      turma,
    }: {
      dataset: "participacoes" | "respostas";
      format: "csv" | "json";
      etapa?: SchoolStage | "";
      turma?: string;
    },
  ): Promise<{ filename: string; content: string; recordCount?: number }> => {
    const qs = buildQuery({
      dataset,
      format,
      etapa: etapa || undefined,
      turma: turma || undefined,
    });
    const response = await fetch(`${SERVER_URL}/api/analytics/export${qs}`, {
      method: "GET",
      headers: buildHeaders(auth),
    });

    const content = await response.text();
    if (!response.ok) {
      let message = `Erro HTTP ${response.status} ao exportar dataset.`;
      try {
        const parsed = JSON.parse(content) as { error?: string };
        if (parsed.error) message = parsed.error;
      } catch {
        // keep default message
      }
      throw new ApiRequestError(message, response.status);
    }

    const ext = format === "csv" ? "csv" : "json";
    const filename = `ludo-equidade-${dataset}.${ext}`;
    let recordCount: number | undefined;
    if (format === "json") {
      try {
        const parsed = JSON.parse(content) as { totalRegistros?: number };
        recordCount = parsed.totalRegistros;
      } catch {
        // ignore
      }
    }

    if (Platform.OS === "web" && typeof document !== "undefined") {
      const mime =
        format === "csv"
          ? "text/csv;charset=utf-8;"
          : "application/json;charset=utf-8;";
      const blob = new Blob([content], { type: mime });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }

    return { filename, content, recordCount };
  },

  listAdminUsers: (authToken: string) =>
    requestJson<{ usuarios: AuthUser[] }>("/api/admin/usuarios", {
      auth: { authToken },
    }),

  updateAdminUserRole: (authToken: string, userId: number, role: SystemRole) =>
    requestJson<{ user: AuthUser }>(`/api/admin/usuarios/${userId}/papel`, {
      method: "PATCH",
      auth: { authToken },
      body: { papel_sistema: role },
    }),
};
