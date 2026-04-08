import type { CreateWorkoutInput, Workout } from "@/types/workout";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

function buildUrl(path: string): string {
  if (!API_BASE_URL) {
    throw new Error("NEXT_PUBLIC_API_BASE_URL is not configured.");
  }

  return `${API_BASE_URL}${path}`;
}

async function parseJsonResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`API request failed (${response.status}): ${errorBody}`);
  }

  return (await response.json()) as T;
}

export async function getWorkouts(): Promise<Workout[]> {
  const response = await fetch(buildUrl("/workouts"), {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  return parseJsonResponse<Workout[]>(response);
}

export async function getWorkoutById(id: number): Promise<Workout> {
  const response = await fetch(buildUrl(`/workouts/${id}`), {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  return parseJsonResponse<Workout>(response);
}

export async function createWorkout(payload: CreateWorkoutInput): Promise<Workout> {
  const response = await fetch(buildUrl("/workouts"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  return parseJsonResponse<Workout>(response);
}
