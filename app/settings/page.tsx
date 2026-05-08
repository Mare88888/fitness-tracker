"use client";

import { Navbar } from "@/components/navbar";
import { PageContainer } from "@/components/page-container";
import { Sidebar } from "@/components/sidebar";
import { getAuthUsername } from "@/lib/auth/token";
import { APP_NAME } from "@/lib/constants";
import {
  completeOnboarding,
  getOnboardingPreferences,
  resetOnboarding,
  subscribeOnboardingChanges,
  type OnboardingGoal,
  type OnboardingSplit,
  type PreferredUnitSystem,
} from "@/lib/onboarding-preferences";
import {
  getDefaultWeeklyGoal,
  getWeeklyGoal,
  setWeeklyGoal,
  subscribeWeeklyGoalChanges,
} from "@/lib/user-preferences";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export default function SettingsPage() {
  const [weeklyGoal, setWeeklyGoalState] = useState<number>(getDefaultWeeklyGoal());
  const [username, setUsername] = useState<string | null>(null);
  const [goal, setGoal] = useState<OnboardingGoal>("general_fitness");
  const [split, setSplit] = useState<OnboardingSplit>("full_body");
  const [preferredUnits, setPreferredUnits] = useState<PreferredUnitSystem>("metric");

  const syncFromStorage = () => {
    setWeeklyGoalState(getWeeklyGoal());
    setUsername(getAuthUsername());
    const preferences = getOnboardingPreferences();
    if (preferences) {
      setGoal(preferences.goal);
      setSplit(preferences.split);
      setPreferredUnits(preferences.preferredUnits);
    }
  };

  useEffect(() => {
    queueMicrotask(syncFromStorage);
  }, []);

  useEffect(() => {
    return subscribeWeeklyGoalChanges(() => {
      queueMicrotask(syncFromStorage);
    });
  }, []);

  useEffect(() => {
    return subscribeOnboardingChanges(() => {
      queueMicrotask(syncFromStorage);
    });
  }, []);

  const handleGoalChange = (value: number) => {
    const saved = setWeeklyGoal(value);
    setWeeklyGoalState(saved);
    toast.success(`Weekly goal saved: ${saved} workouts/week.`);
  };

  const handleSaveOnboardingPrefs = () => {
    completeOnboarding({
      goal,
      split,
      weeklyTarget: weeklyGoal,
      preferredUnits,
    });
    toast.success("Onboarding preferences saved.");
  };

  const handleResetOnboarding = () => {
    resetOnboarding();
    toast.success("Onboarding reset. You will see setup on dashboard.");
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="flex min-h-screen min-w-0 flex-1 flex-col">
          <Navbar />
          <PageContainer>
            <section className="surface-page">
              <div className="pointer-events-none absolute -right-24 -top-24 h-52 w-52 rounded-full bg-emerald-500/10 blur-3xl" />
              <div className="pointer-events-none absolute -bottom-20 -left-16 h-44 w-44 rounded-full bg-emerald-400/10 blur-3xl" />

              <div className="relative space-y-1">
                <p className="text-xs font-medium uppercase tracking-wider text-emerald-400/90">{APP_NAME}</p>
                <h1 className="text-2xl font-semibold tracking-tight text-zinc-100 sm:text-3xl">Settings</h1>
                <p className="max-w-xl text-sm text-zinc-400">Weekly goal feeds dashboard and calendar.</p>
              </div>

              <div className="surface-card mt-6">
                <h2 className="text-sm font-semibold text-zinc-100">Weekly training goal</h2>
                <p className="mt-1 text-xs text-zinc-500">
                  For {username ?? "anonymous"} - drives adherence bars.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {[1, 2, 3, 4, 5, 6, 7].map((goal) => (
                    <button
                      key={goal}
                      type="button"
                      onClick={() => handleGoalChange(goal)}
                      className={`btn px-3 py-2 text-sm transition-colors ${
                        weeklyGoal === goal
                          ? "btn-primary"
                          : "btn-secondary border-zinc-700 hover:border-zinc-500"
                      }`}
                    >
                      {goal} workouts/week
                    </button>
                  ))}
                </div>
                <p className="mt-3 text-xs text-zinc-500">
                  Default goal: {getDefaultWeeklyGoal()} workouts/week.
                </p>
              </div>

              <div className="surface-card mt-4">
                <h2 className="text-sm font-semibold text-zinc-100">Onboarding preferences</h2>
                <p className="mt-1 text-xs text-zinc-500">Goal, split, and units used for your setup profile.</p>

                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  <label className="block">
                    <span className="mb-1 block text-xs font-medium text-zinc-400">Goal</span>
                    <select
                      value={goal}
                      onChange={(event) => setGoal(event.target.value as OnboardingGoal)}
                      className="field field-select"
                    >
                      <option value="general_fitness">General fitness</option>
                      <option value="muscle_gain">Build muscle</option>
                      <option value="strength">Build strength</option>
                      <option value="fat_loss">Lose fat</option>
                    </select>
                  </label>

                  <label className="block">
                    <span className="mb-1 block text-xs font-medium text-zinc-400">Split</span>
                    <select
                      value={split}
                      onChange={(event) => setSplit(event.target.value as OnboardingSplit)}
                      className="field field-select"
                    >
                      <option value="full_body">Full body</option>
                      <option value="upper_lower">Upper / lower</option>
                      <option value="push_pull_legs">Push / pull / legs</option>
                      <option value="custom">Custom</option>
                    </select>
                  </label>

                  <label className="block">
                    <span className="mb-1 block text-xs font-medium text-zinc-400">Units</span>
                    <select
                      value={preferredUnits}
                      onChange={(event) => setPreferredUnits(event.target.value as PreferredUnitSystem)}
                      className="field field-select"
                    >
                      <option value="metric">Metric (kg, cm)</option>
                      <option value="imperial">Imperial (lb, in)</option>
                    </select>
                  </label>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <button type="button" onClick={handleSaveOnboardingPrefs} className="btn btn-primary">
                    Save onboarding prefs
                  </button>
                  <button type="button" onClick={handleResetOnboarding} className="btn btn-secondary">
                    Reset onboarding
                  </button>
                </div>
              </div>
            </section>
          </PageContainer>
        </div>
      </div>
    </div>
  );
}
