import type { AuthRequest, AuthResponse } from "@/types/auth";
import { setAuthToken } from "@/lib/auth/token";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

function buildUrl(path: string): string {
  if (!API_BASE_URL) {
    throw new Error("NEXT_PUBLIC_API_BASE_URL is not configured.");
  }
  return `${API_BASE_URL}${path}`;
}

async function parseAuthResponse(response: Response): Promise<AuthResponse> {
  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Auth request failed (${response.status}): ${errorBody}`);
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
  return data;
}
