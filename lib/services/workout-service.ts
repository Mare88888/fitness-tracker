import type { CreateWorkoutInput, Workout } from "@/types/workout";
import { clearAuthToken } from "@/lib/auth/token";
import { parseApiRequestError } from "@/lib/services/api-error";
import { ensureCsrfToken } from "@/lib/services/csrf";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

function buildUrl(path: string): string {
  if (!API_BASE_URL) {
    throw new Error("NEXT_PUBLIC_API_BASE_URL is not configured.");
  }

  return `${API_BASE_URL}${path}`;
}

async function parseJsonResponse<T>(response: Response): Promise<T> {
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

async function fetchWithSilentRefresh(input: string, init: RequestInit = {}): Promise<Response> {
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

export async function getWorkouts(): Promise<Workout[]> {
  const response = await fetchWithSilentRefresh(buildUrl("/workouts"), {
    method: "GET",
    cache: "no-store",
  });

  return parseJsonResponse<Workout[]>(response);
}

export async function getWorkoutById(id: number): Promise<Workout> {
  const response = await fetchWithSilentRefresh(buildUrl(`/workouts/${id}`), {
    method: "GET",
    cache: "no-store",
  });

  return parseJsonResponse<Workout>(response);
}

export async function createWorkout(payload: CreateWorkoutInput): Promise<Workout> {
  const response = await fetchWithSilentRefresh(buildUrl("/workouts"), {
    method: "POST",
    body: JSON.stringify(payload),
  });

  return parseJsonResponse<Workout>(response);
}

export async function updateWorkout(id: number, payload: CreateWorkoutInput): Promise<Workout> {
  const response = await fetchWithSilentRefresh(buildUrl(`/workouts/${id}`), {
    method: "PUT",
    body: JSON.stringify(payload),
  });

  return parseJsonResponse<Workout>(response);
}

export async function deleteWorkout(id: number): Promise<void> {
  const response = await fetchWithSilentRefresh(buildUrl(`/workouts/${id}`), {
    method: "DELETE",
  });

  if (response.status === 204) {
    return;
  }
  if (!response.ok) {
    await parseApiRequestError(response, "Failed to delete workout.");
  }
}
