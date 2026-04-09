import type { AuthRequest, AuthResponse } from "@/types/auth";
import { clearAuthToken, setAuthUsername } from "@/lib/auth/token";
import { parseApiRequestError } from "@/lib/services/api-error";
import { ensureCsrfToken } from "@/lib/services/csrf";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

function buildUrl(path: string): string {
  if (!API_BASE_URL) {
    throw new Error("NEXT_PUBLIC_API_BASE_URL is not configured.");
  }
  return `${API_BASE_URL}${path}`;
}

async function parseAuthResponse(response: Response): Promise<AuthResponse> {
  if (!response.ok) {
    return parseApiRequestError(response, "Authentication failed.");
  }
  return (await response.json()) as AuthResponse;
}

export async function register(payload: AuthRequest): Promise<AuthResponse> {
  const csrfToken = await ensureCsrfToken();
  const response = await fetch(buildUrl("/auth/register"), {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "X-XSRF-TOKEN": csrfToken,
    },
    body: JSON.stringify(payload),
  });
  const data = await parseAuthResponse(response);
  setAuthUsername(data.username);
  return data;
}

export async function login(payload: AuthRequest): Promise<AuthResponse> {
  const csrfToken = await ensureCsrfToken();
  const response = await fetch(buildUrl("/auth/login"), {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "X-XSRF-TOKEN": csrfToken,
    },
    body: JSON.stringify(payload),
  });
  const data = await parseAuthResponse(response);
  setAuthUsername(data.username);
  return data;
}

export async function logout(): Promise<void> {
  const csrfToken = await ensureCsrfToken();
  const response = await fetch(buildUrl("/auth/logout"), {
    method: "POST",
    credentials: "include",
    headers: {
      "X-XSRF-TOKEN": csrfToken,
    },
  });
  if (!response.ok) {
    await parseApiRequestError(response, "Logout failed.");
  }
  clearAuthToken();
}
