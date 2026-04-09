import type { CreateWorkoutInput, Workout } from "@/types/workout";
import { parseApiRequestError } from "@/lib/services/api-error";
import { buildUrl, fetchWithSilentRefresh, parseJsonResponse } from "@/lib/services/http-client";

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
