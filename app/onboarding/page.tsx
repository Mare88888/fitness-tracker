"use client";

import { Navbar } from "@/components/navbar";
import { PageContainer } from "@/components/page-container";
import { Sidebar } from "@/components/sidebar";
import { APP_NAME } from "@/lib/constants";
import {
  completeOnboarding,
  getSuggestedWeeklyTarget,
  type OnboardingGoal,
  type OnboardingSplit,
  type PreferredUnitSystem,
} from "@/lib/onboarding-preferences";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

const GOAL_OPTIONS: Array<{ value: OnboardingGoal; label: string }> = [
  { value: "general_fitness", label: "General fitness" },
  { value: "muscle_gain", label: "Build muscle" },
  { value: "strength", label: "Build strength" },
  { value: "fat_loss", label: "Lose fat" },
];

const SPLIT_OPTIONS: Array<{ value: OnboardingSplit; label: string }> = [
  { value: "full_body", label: "Full body" },
  { value: "upper_lower", label: "Upper / lower" },
  { value: "push_pull_legs", label: "Push / pull / legs" },
  { value: "custom", label: "Custom" },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [goal, setGoal] = useState<OnboardingGoal>("general_fitness");
  const [split, setSplit] = useState<OnboardingSplit>("full_body");
  const [weeklyTarget, setWeeklyTarget] = useState<number>(() => getSuggestedWeeklyTarget());
  const [preferredUnits, setPreferredUnits] = useState<PreferredUnitSystem>("metric");

  const handleComplete = () => {
    completeOnboarding({
      goal,
      split,
      weeklyTarget,
      preferredUnits,
    });
    toast.success("Setup complete.");
    router.replace("/");
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="flex min-h-screen min-w-0 flex-1 flex-col">
          <Navbar />
          <PageContainer>
            <section className="surface-page">
              <p className="text-xs font-medium uppercase tracking-wider text-emerald-400/90">{APP_NAME}</p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight text-zinc-100 sm:text-3xl">Quick setup</h1>
              <p className="mt-2 text-sm text-zinc-400">Set your training defaults. You can edit these later.</p>

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-zinc-300">Primary goal</span>
                  <select
                    value={goal}
                    onChange={(event) => setGoal(event.target.value as OnboardingGoal)}
                    className="field field-select"
                  >
                    {GOAL_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-zinc-300">Training split</span>
                  <select
                    value={split}
                    onChange={(event) => setSplit(event.target.value as OnboardingSplit)}
                    className="field field-select"
                  >
                    {SPLIT_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-zinc-300">Weekly target</span>
                  <input
                    type="number"
                    min={2}
                    max={6}
                    value={weeklyTarget}
                    onChange={(event) => setWeeklyTarget(Number(event.target.value) || 4)}
                    className="field"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-zinc-300">Preferred units</span>
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

              <div className="mt-6">
                <button type="button" onClick={handleComplete} className="btn btn-primary">
                  Finish setup
                </button>
              </div>
            </section>
          </PageContainer>
        </div>
      </div>
    </div>
  );
}
