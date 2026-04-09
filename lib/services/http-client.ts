import { clearAuthToken } from "@/lib/auth/token";
import { parseApiRequestError } from "@/lib/services/api-error";
import { ensureCsrfToken } from "@/lib/services/csrf";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

export function buildUrl(path: string): string {
  if (!API_BASE_URL) {
    throw new Error("NEXT_PUBLIC_API_BASE_URL is not configured.");
  }
  return `${API_BASE_URL}${path}`;
}

export async function parseJsonResponse<T>(response: Response): Promise<T> {
  if (response.status === 401) {
    throw new Error("SESSION_EXPIRED");
  }

  if (!response.ok) {
    return parseApiRequestError(response, "Request failed.");
  }

  return (await response.json()) as T;
}

async function refreshAccessToken(): Promise<boolean> {
  const csrfToken = await ensureCsrfToken();
  const response = await fetch(buildUrl("/auth/refresh"), {
    method: "POST",
    credentials: "include",
    headers: {
      "X-XSRF-TOKEN": csrfToken,
    },
  });
  return response.ok;
}

export async function fetchWithSilentRefresh(input: string, init: RequestInit = {}): Promise<Response> {
  const method = (init.method ?? "GET").toUpperCase();
  const requiresCsrf = method !== "GET" && method !== "HEAD" && method !== "OPTIONS";
  const csrfToken = requiresCsrf ? await ensureCsrfToken() : null;
  const requestInit: RequestInit = {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(csrfToken ? { "X-XSRF-TOKEN": csrfToken } : {}),
      ...(init.headers ?? {}),
    },
  };

  let response = await fetch(input, requestInit);
  if (response.status === 403 && requiresCsrf) {
    const refreshedCsrfToken = await ensureCsrfToken();
    response = await fetch(input, {
      ...requestInit,
      headers: {
        "Content-Type": "application/json",
        "X-XSRF-TOKEN": refreshedCsrfToken,
        ...(init.headers ?? {}),
      },
    });
  }
  if (response.status !== 401) {
    return response;
  }

  const refreshed = await refreshAccessToken();
  if (!refreshed) {
    clearAuthToken();
    if (typeof window !== "undefined") {
      window.location.assign("/auth/login");
    }
    return response;
  }

  response = await fetch(input, requestInit);
  return response;
}
