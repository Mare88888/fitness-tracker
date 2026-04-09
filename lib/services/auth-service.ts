import type { AuthRequest, AuthResponse } from "@/types/auth";
import { setAuthToken, setAuthUsername } from "@/lib/auth/token";
import { parseApiRequestError } from "@/lib/services/api-error";

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
  const response = await fetch(buildUrl("/auth/register"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  const data = await parseAuthResponse(response);
  setAuthToken(data.token);
  setAuthUsername(data.username);
  return data;
}

export async function login(payload: AuthRequest): Promise<AuthResponse> {
  const response = await fetch(buildUrl("/auth/login"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  const data = await parseAuthResponse(response);
  setAuthToken(data.token);
  setAuthUsername(data.username);
  return data;
}
