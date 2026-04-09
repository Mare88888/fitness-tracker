import type { CreateWorkoutInput, Workout } from "@/types/workout";
import { clearAuthToken, getAuthToken } from "@/lib/auth/token";
import { parseApiRequestError } from "@/lib/services/api-error";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

function buildUrl(path: string): string {
  if (!API_BASE_URL) {
    throw new Error("NEXT_PUBLIC_API_BASE_URL is not configured.");
  }

  return `${API_BASE_URL}${path}`;
}

async function parseJsonResponse<T>(response: Response): Promise<T> {
  if (response.status === 401) {
    clearAuthToken();
    if (typeof window !== "undefined") {
      window.location.assign("/auth");
    }
    throw new Error("Session expired. Please login again.");
  }

  if (!response.ok) {
    return parseApiRequestError(response, "Request failed.");
  }

  return (await response.json()) as T;
}

function buildAuthHeaders(): HeadersInit {
  const token = getAuthToken();
  if (!token) {
    if (typeof window !== "undefined") {
      window.location.assign("/auth");
    }
    throw new Error("You are not authenticated. Please login first.");
  }
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

export async function getWorkouts(): Promise<Workout[]> {
  const response = await fetch(buildUrl("/workouts"), {
    method: "GET",
    headers: buildAuthHeaders(),
    cache: "no-store",
  });

  return parseJsonResponse<Workout[]>(response);
}

export async function getWorkoutById(id: number): Promise<Workout> {
  const response = await fetch(buildUrl(`/workouts/${id}`), {
    method: "GET",
    headers: buildAuthHeaders(),
    cache: "no-store",
  });

  return parseJsonResponse<Workout>(response);
}

export async function createWorkout(payload: CreateWorkoutInput): Promise<Workout> {
  const response = await fetch(buildUrl("/workouts"), {
    method: "POST",
    headers: buildAuthHeaders(),
    body: JSON.stringify(payload),
  });

  return parseJsonResponse<Workout>(response);
}
