const PENDING_WORKOUT_EXERCISES_KEY = "fitness_pending_workout_exercises";

export function queueExercisesForStartWorkout(names: string[]): void {
  if (typeof window === "undefined") {
    return;
  }
  const trimmed = names.map((n) => n.trim()).filter(Boolean);
  if (trimmed.length === 0) {
    return;
  }
  let existing: string[] = [];
  try {
    const raw = sessionStorage.getItem(PENDING_WORKOUT_EXERCISES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as unknown;
      if (Array.isArray(parsed)) {
        existing = parsed.filter((item): item is string => typeof item === "string");
      }
    }
  } catch {
    existing = [];
  }
  sessionStorage.setItem(PENDING_WORKOUT_EXERCISES_KEY, JSON.stringify([...existing, ...trimmed]));
}

export function takePendingExercisesForStartWorkout(): string[] {
  if (typeof window === "undefined") {
    return [];
  }
  const raw = sessionStorage.getItem(PENDING_WORKOUT_EXERCISES_KEY);
  sessionStorage.removeItem(PENDING_WORKOUT_EXERCISES_KEY);
  if (!raw) {
    return [];
  }
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter((item): item is string => typeof item === "string").map((s) => s.trim()).filter(Boolean);
  } catch {
    return [];
  }
}
