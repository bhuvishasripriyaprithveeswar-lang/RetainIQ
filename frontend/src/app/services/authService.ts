import { apiClient as client } from "./client";

export interface AuthUser {
  id: number;
  full_name: string;
  email: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  user: AuthUser;
}

interface JwtPayload {
  exp?: number;
}

export const SESSION_EXPIRED_MESSAGE = "Your session has expired. Please sign in again.";

export async function login(email: string, password: string): Promise<LoginResponse> {
  const res = await client.post<LoginResponse>("/auth/login", { email, password });
  return res.data;
}

export async function register(full_name: string, email: string, password: string): Promise<void> {
  await client.post("/auth/register", { full_name, email, password });
}

export function saveSession(data: LoginResponse): void {
  localStorage.setItem("retainiq_token", data.access_token);
  localStorage.setItem("retainiq_user", JSON.stringify(data.user));
}

export function getStoredUser(): AuthUser | null {
  const raw = localStorage.getItem("retainiq_user");
  if (!raw) return null;

  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function getStoredToken(): string | null {
  return localStorage.getItem("retainiq_token");
}

export function clearSession(): void {
  localStorage.removeItem("retainiq_token");
  localStorage.removeItem("retainiq_user");
}

function parseJwtPayload(token: string): JwtPayload | null {
  const payload = token.split(".")[1];
  if (!payload) return null;

  try {
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
    return JSON.parse(atob(padded)) as JwtPayload;
  } catch {
    return null;
  }
}

export function isTokenValid(token: string | null): boolean {
  if (!token) return false;

  const payload = parseJwtPayload(token);
  if (!payload?.exp) return false;

  return Date.now() < payload.exp * 1000;
}

export function getValidStoredUser(): AuthUser | null {
  const token = getStoredToken();
  const user = getStoredUser();

  if (!token || !user) return null;
  if (!isTokenValid(token)) {
    clearSession();
    return null;
  }

  return user;
}
