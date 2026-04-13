import { buildUrl, fetchWithSilentRefresh, parseJsonResponse } from "@/lib/services/http-client";
import type { ExerciseCatalogItem } from "@/types/exercise-catalog";

export async function getExerciseCatalog(params?: {
  query?: string;
  muscle?: string;
  limit?: number;
}): Promise<ExerciseCatalogItem[]> {
  const searchParams = new URLSearchParams();
  if (params?.query?.trim()) {
    searchParams.set("q", params.query.trim());
  }
  if (params?.muscle?.trim()) {
    searchParams.set("muscle", params.muscle.trim());
  }
  if (params?.limit && params.limit > 0) {
    searchParams.set("limit", String(params.limit));
  }
  const suffix = searchParams.size > 0 ? `?${searchParams.toString()}` : "";
  const response = await fetchWithSilentRefresh(buildUrl(`/exercise-catalog${suffix}`), {
    method: "GET",
    cache: "no-store",
  });
  return parseJsonResponse<ExerciseCatalogItem[]>(response);
}

export async function getExerciseCatalogMuscles(): Promise<string[]> {
  const response = await fetchWithSilentRefresh(buildUrl("/exercise-catalog/muscles"), {
    method: "GET",
    cache: "no-store",
  });
  return parseJsonResponse<string[]>(response);
}

