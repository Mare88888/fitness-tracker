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
            <section className="surface-page">
              <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">Settings</h1>
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
                Configure your training preferences.
              </p>

              <div className="surface-card mt-6">
                <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Weekly training goal</h2>
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-300">
                  Stored per user ({username ?? "anonymous"}). Used by dashboard adherence scoring.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {[2, 3, 4, 5, 6].map((goal) => (
                    <button
                      key={goal}
                      type="button"
                      onClick={() => handleGoalChange(goal)}
                      className={`btn px-3 py-2 text-sm ${
                        weeklyGoal === goal
                          ? "btn-primary"
                          : "btn-secondary"
                      }`}
                    >
                      {goal} workouts/week
                    </button>
                  ))}
                </div>
                <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-300">
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
