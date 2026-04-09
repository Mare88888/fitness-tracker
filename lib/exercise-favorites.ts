import { getAuthUsername } from "@/lib/auth/token";

const FAVORITES_CHANGED = "fitness-exercise-favorites-changed";

function storageKey(): string {
  const user = getAuthUsername() ?? "anonymous";
  return `fitness_exercise_favorites_${user}`;
}

export function subscribeExerciseFavorites(callback: () => void): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }
  const handler = () => callback();
  window.addEventListener("storage", handler);
  window.addEventListener(FAVORITES_CHANGED, handler);
  return () => {
    window.removeEventListener("storage", handler);
    window.removeEventListener(FAVORITES_CHANGED, handler);
  };
}

export function getFavoriteExerciseNamesSnapshot(): Set<string> {
  if (typeof window === "undefined") {
    return new Set();
  }
  try {
    const raw = window.localStorage.getItem(storageKey());
    if (!raw) {
      return new Set();
    }
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return new Set();
    }
    return new Set(parsed.filter((item): item is string => typeof item === "string").map((s) => s.trim()));
  } catch {
    return new Set();
  }
}

export function isExerciseFavorite(name: string): boolean {
  return getFavoriteExerciseNamesSnapshot().has(name.trim());
}

export function toggleExerciseFavorite(name: string): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  const key = name.trim();
  if (!key) {
    return false;
  }
  const next = getFavoriteExerciseNamesSnapshot();
  if (next.has(key)) {
    next.delete(key);
  } else {
    next.add(key);
  }
  window.localStorage.setItem(storageKey(), JSON.stringify([...next]));
  window.dispatchEvent(new Event(FAVORITES_CHANGED));
  return next.has(key);
}
