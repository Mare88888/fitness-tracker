import { buildUrl, fetchWithSilentRefresh, parseJsonResponse } from "@/lib/services/http-client";
import type { CreateWorkoutTemplateInput, WorkoutTemplate } from "@/types/template";
import type { WeeklyPlan } from "@/types/weekly-plan";

export async function getTemplates(): Promise<WorkoutTemplate[]> {
  const response = await fetchWithSilentRefresh(buildUrl("/templates"), {
    method: "GET",
    cache: "no-store",
  });
  return parseJsonResponse<WorkoutTemplate[]>(response);
}

export async function getTemplateById(templateId: number): Promise<WorkoutTemplate> {
  const response = await fetchWithSilentRefresh(buildUrl(`/templates/${templateId}`), {
    method: "GET",
    cache: "no-store",
  });
  return parseJsonResponse<WorkoutTemplate>(response);
}

export async function createTemplate(payload: CreateWorkoutTemplateInput): Promise<WorkoutTemplate> {
  const response = await fetchWithSilentRefresh(buildUrl("/templates"), {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return parseJsonResponse<WorkoutTemplate>(response);
}

export async function updateTemplate(templateId: number, payload: CreateWorkoutTemplateInput): Promise<WorkoutTemplate> {
  const response = await fetchWithSilentRefresh(buildUrl(`/templates/${templateId}`), {
    method: "PUT",
    body: JSON.stringify(payload),
  });
  return parseJsonResponse<WorkoutTemplate>(response);
}

export async function createTemplateFromWorkout(workoutId: number, name?: string): Promise<WorkoutTemplate> {
  const query = name ? `?name=${encodeURIComponent(name)}` : "";
  const response = await fetchWithSilentRefresh(buildUrl(`/templates/from-workout/${workoutId}${query}`), {
    method: "POST",
  });
  return parseJsonResponse<WorkoutTemplate>(response);
}

export async function deleteTemplate(templateId: number): Promise<void> {
  const response = await fetchWithSilentRefresh(buildUrl(`/templates/${templateId}`), {
    method: "DELETE",
  });
  if (!response.ok && response.status !== 204) {
    throw new Error("Failed to delete template.");
  }
}

export async function getWeeklyPlan(): Promise<WeeklyPlan[]> {
  const response = await fetchWithSilentRefresh(buildUrl("/weekly-plans"), {
    method: "GET",
    cache: "no-store",
  });
  return parseJsonResponse<WeeklyPlan[]>(response);
}

export async function assignWeeklyPlan(dayOfWeek: number, templateId: number): Promise<WeeklyPlan> {
  const response = await fetchWithSilentRefresh(buildUrl(`/weekly-plans/${dayOfWeek}`), {
    method: "PUT",
    body: JSON.stringify({ templateId }),
  });
  return parseJsonResponse<WeeklyPlan>(response);
}
