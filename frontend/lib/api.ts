import { Idea, Bet, MarketItem, User } from "./types";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("innoyield_token");
}

function authHeaders(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
      ...(options.headers ?? {}),
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const detail = Array.isArray(body.detail)
      ? body.detail.map((e: { msg?: string }) => e.msg ?? JSON.stringify(e)).join(", ")
      : body.detail;
    throw new Error(detail ?? `HTTP ${res.status}`);
  }

  return res.json() as Promise<T>;
}

// ── Auth ──────────────────────────────────────────────────────────────────────

export interface TokenResponse {
  access_token: string;
  token_type: string;
}

export async function register(username: string, email: string, password: string): Promise<TokenResponse> {
  return request("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ username, email, password }),
  });
}

export async function login(email: string, password: string): Promise<TokenResponse> {
  return request("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export async function getMe(): Promise<User> {
  return request("/api/auth/me");
}

// ── Ideas ─────────────────────────────────────────────────────────────────────

export async function getIdeas(sort = "hottest", category?: string): Promise<Idea[]> {
  const params = new URLSearchParams({ sort });
  if (category && category !== "Wszystkie") params.set("category", category);
  return request(`/api/ideas?${params}`);
}

export async function getIdea(id: string): Promise<Idea> {
  return request(`/api/ideas/${id}`);
}

export async function submitIdea(data: {
  title: string;
  description: string;
  category: string;
}): Promise<{ idea_id: string; status: string }> {
  return request("/api/ideas", { method: "POST", body: JSON.stringify(data) });
}

export async function getValidationStatus(
  ideaId: string
): Promise<{ status: string; validation_score: number; hat_scores: Idea["hat_scores"] }> {
  return request(`/api/ideas/${ideaId}/validation`);
}

// ── Bets ──────────────────────────────────────────────────────────────────────

export async function placeBet(
  idea_id: string,
  position: "YES" | "NO",
  amount: number
): Promise<Bet> {
  return request("/api/bets", {
    method: "POST",
    body: JSON.stringify({ idea_id, position, amount }),
  });
}

export async function getMyBets(): Promise<Bet[]> {
  return request("/api/bets/me");
}

export async function getIdeaBetStats(
  ideaId: string
): Promise<{ yes_pool: number; no_pool: number; probability: number }> {
  return request(`/api/bets/idea/${ideaId}`);
}

// ── Profile ───────────────────────────────────────────────────────────────────

export async function getProfile(): Promise<User> {
  return request("/api/profile");
}

export async function getMyIdeas(): Promise<Idea[]> {
  return request("/api/profile/ideas");
}

// ── Marketplace ───────────────────────────────────────────────────────────────

export async function getMarketCatalog(): Promise<MarketItem[]> {
  return request("/api/redemptions/catalog");
}

export async function buyItem(reward_type: string): Promise<{ id: string; cost: number }> {
  return request("/api/redemptions", {
    method: "POST",
    body: JSON.stringify({ reward_type }),
  });
}
