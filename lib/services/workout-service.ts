import type { CreateWorkoutInput, Workout } from "@/types/workout";
import { formatDateDDMMYYYY } from "@/lib/date-format";
import { parseApiRequestError } from "@/lib/services/api-error";
import { buildUrl, fetchWithSilentRefresh, parseJsonResponse } from "@/lib/services/http-client";

function mapWorkoutDates(workout: Workout): Workout {
  return {
    ...workout,
    formattedDate: formatDateDDMMYYYY(workout.date),
  };
}

export async function getWorkouts(): Promise<Workout[]> {
  const response = await fetchWithSilentRefresh(buildUrl("/workouts"), {
    method: "GET",
    cache: "no-store",
  });

  const workouts = await parseJsonResponse<Workout[]>(response);
  return workouts.map(mapWorkoutDates);
}

export async function getWorkoutById(id: number): Promise<Workout> {
  const response = await fetchWithSilentRefresh(buildUrl(`/workouts/${id}`), {
    method: "GET",
    cache: "no-store",
  });

  const workout = await parseJsonResponse<Workout>(response);
  return mapWorkoutDates(workout);
}

export async function createWorkout(payload: CreateWorkoutInput): Promise<Workout> {
  const response = await fetchWithSilentRefresh(buildUrl("/workouts"), {
    method: "POST",
    body: JSON.stringify(payload),
  });

  const workout = await parseJsonResponse<Workout>(response);
  return mapWorkoutDates(workout);
}

export async function updateWorkout(id: number, payload: CreateWorkoutInput): Promise<Workout> {
  const response = await fetchWithSilentRefresh(buildUrl(`/workouts/${id}`), {
    method: "PUT",
    body: JSON.stringify(payload),
  });

  const workout = await parseJsonResponse<Workout>(response);
  return mapWorkoutDates(workout);
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
