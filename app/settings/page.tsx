"use client";

import { Navbar } from "@/components/navbar";
import { PageContainer } from "@/components/page-container";
import { Sidebar } from "@/components/sidebar";
import { getAuthUsername } from "@/lib/auth/token";
import { APP_NAME } from "@/lib/constants";
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
                  {[2, 3, 4, 5, 6].map((goal) => (
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
            </section>
          </PageContainer>
        </div>
      </div>
    </div>
  );
}
