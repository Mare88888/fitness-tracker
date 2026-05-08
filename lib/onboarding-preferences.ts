import { getAuthUsername } from "@/lib/auth/token";
import { getWeeklyGoal, setWeeklyGoal } from "@/lib/user-preferences";

export type OnboardingGoal = "fat_loss" | "muscle_gain" | "strength" | "general_fitness";
export type OnboardingSplit = "full_body" | "upper_lower" | "push_pull_legs" | "custom";
export type PreferredUnitSystem = "metric" | "imperial";

export type OnboardingPreferences = {
  goal: OnboardingGoal;
  split: OnboardingSplit;
  weeklyTarget: number;
  preferredUnits: PreferredUnitSystem;
  completedAt: number;
};

const ONBOARDING_EVENT = "fitness-onboarding-changed";

function keyForUser(): string {
  const user = getAuthUsername() ?? "anonymous";
  return `fitness_onboarding_${user}`;
}

export function isOnboardingComplete(): boolean {
  if (typeof window === "undefined") {
    return true;
  }
  return Boolean(window.localStorage.getItem(keyForUser()));
}

export function getOnboardingPreferences(): OnboardingPreferences | null {
  if (typeof window === "undefined") {
    return null;
  }
  const raw = window.localStorage.getItem(keyForUser());
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as OnboardingPreferences;
  } catch {
    return null;
  }
}

export function completeOnboarding(input: Omit<OnboardingPreferences, "completedAt">): OnboardingPreferences {
  const normalizedWeeklyTarget = Math.min(7, Math.max(1, Math.round(input.weeklyTarget)));
  const payload: OnboardingPreferences = {
    ...input,
    weeklyTarget: normalizedWeeklyTarget,
    completedAt: Date.now(),
  };

  if (typeof window !== "undefined") {
    window.localStorage.setItem(keyForUser(), JSON.stringify(payload));
    setWeeklyGoal(normalizedWeeklyTarget);
    window.dispatchEvent(new Event(ONBOARDING_EVENT));
  }
  return payload;
}

export function resetOnboarding(): void {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.removeItem(keyForUser());
  window.dispatchEvent(new Event(ONBOARDING_EVENT));
}

export function subscribeOnboardingChanges(callback: () => void): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }
  const handler = () => callback();
  window.addEventListener("storage", handler);
  window.addEventListener(ONBOARDING_EVENT, handler);
  window.addEventListener("fitness-auth-changed", handler);
  return () => {
    window.removeEventListener("storage", handler);
    window.removeEventListener(ONBOARDING_EVENT, handler);
    window.removeEventListener("fitness-auth-changed", handler);
  };
}

export function getSuggestedWeeklyTarget(): number {
  return getWeeklyGoal();
}
