"use client";

import { Navbar } from "@/components/navbar";
import { PageContainer } from "@/components/page-container";
import { Sidebar } from "@/components/sidebar";
import { getAuthUsername } from "@/lib/auth/token";
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

  useEffect(() => {
    queueMicrotask(() => {
      setWeeklyGoalState(getWeeklyGoal());
      setUsername(getAuthUsername());
    });
  }, []);

  useEffect(() => {
    return subscribeWeeklyGoalChanges(() => {
      queueMicrotask(() => {
        setWeeklyGoalState(getWeeklyGoal());
        setUsername(getAuthUsername());
      });
    });
  }, []);

  const handleGoalChange = (value: number) => {
    const saved = setWeeklyGoal(value);
    setWeeklyGoalState(saved);
    toast.success(`Weekly goal saved: ${saved} workouts/week.`);
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="flex min-h-screen min-w-0 flex-1 flex-col">
          <Navbar />
          <PageContainer>
            <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
              <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">Settings</h1>
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                Configure your training preferences.
              </p>

              <div className="mt-6 rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800/60">
                <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Weekly training goal</h2>
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                  Stored per user ({username ?? "anonymous"}). Used by dashboard adherence scoring.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {[2, 3, 4, 5, 6].map((goal) => (
                    <button
                      key={goal}
                      type="button"
                      onClick={() => handleGoalChange(goal)}
                      className={`rounded-md border px-3 py-2 text-sm font-medium transition ${
                        weeklyGoal === goal
                          ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
                          : "border-zinc-300 text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                      }`}
                    >
                      {goal} workouts/week
                    </button>
                  ))}
                </div>
                <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                  Default goal: {getDefaultWeeklyGoal()} workouts/week.
                </p>
              </div>
            </section>
          </PageContainer>
        </div>
      </div>
    </div>
  );
}
