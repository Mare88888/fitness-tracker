import { getAuthUsername } from "@/lib/auth/token";

const WEEKLY_GOAL_EVENT = "fitness-weekly-goal-changed";
const DEFAULT_WEEKLY_GOAL = 4;

function keyForUser(): string {
  const user = getAuthUsername() ?? "anonymous";
  return `fitness_weekly_goal_${user}`;
}

export function getDefaultWeeklyGoal(): number {
  return DEFAULT_WEEKLY_GOAL;
}

export function getWeeklyGoal(): number {
  if (typeof window === "undefined") {
    return DEFAULT_WEEKLY_GOAL;
  }
  const raw = window.localStorage.getItem(keyForUser());
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) {
    return DEFAULT_WEEKLY_GOAL;
  }
  return Math.min(7, Math.max(1, Math.round(parsed)));
}

export function setWeeklyGoal(goal: number): number {
  const next = Math.min(7, Math.max(1, Math.round(goal)));
  if (typeof window === "undefined") {
    return next;
  }
  window.localStorage.setItem(keyForUser(), String(next));
  window.dispatchEvent(new Event(WEEKLY_GOAL_EVENT));
  return next;
}

export function subscribeWeeklyGoalChanges(callback: () => void): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }
  const handler = () => callback();
  window.addEventListener("storage", handler);
  window.addEventListener(WEEKLY_GOAL_EVENT, handler);
  window.addEventListener("fitness-auth-changed", handler);
  return () => {
    window.removeEventListener("storage", handler);
    window.removeEventListener(WEEKLY_GOAL_EVENT, handler);
    window.removeEventListener("fitness-auth-changed", handler);
  };
}
