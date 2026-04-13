import type { ExerciseCatalogItem } from "@/types/exercise-catalog";

const EXERCISE_CATALOG_CACHE_KEY = "fitness_exercise_catalog_cache_v1";

function normalizeName(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export function readExerciseCatalogCache(): ExerciseCatalogItem[] {
  if (typeof window === "undefined") {
    return [];
  }
  const raw = window.localStorage.getItem(EXERCISE_CATALOG_CACHE_KEY);
  if (!raw) {
    return [];
  }
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter(
      (item): item is ExerciseCatalogItem =>
        typeof item === "object" &&
        item !== null &&
        typeof (item as { id?: unknown }).id === "number" &&
        typeof (item as { name?: unknown }).name === "string" &&
        typeof (item as { muscleGroup?: unknown }).muscleGroup === "string"
    );
  } catch {
    return [];
  }
}

export function writeExerciseCatalogCache(items: ExerciseCatalogItem[]): void {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(EXERCISE_CATALOG_CACHE_KEY, JSON.stringify(items));
}

export function resolveMuscleFromCatalogCache(name: string): string | null {
  const normalized = normalizeName(name);
  if (!normalized) {
    return null;
  }
  const cached = readExerciseCatalogCache();
  const matched = cached.find((item) => normalizeName(item.name) === normalized);
  return matched?.muscleGroup ?? null;
}

