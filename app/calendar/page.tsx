"use client";

import { Navbar } from "@/components/navbar";
import { PageContainer } from "@/components/page-container";
import { Sidebar } from "@/components/sidebar";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDateDDMMYYYY } from "@/lib/date-format";
import { getWorkouts } from "@/lib/services/workout-service";
import { getWeeklyPlan } from "@/lib/services/template-service";
import { getWeeklyGoal } from "@/lib/user-preferences";
import type { WeeklyPlan } from "@/types/weekly-plan";
import type { Workout } from "@/types/workout";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

type CalendarView = "month" | "week";

type CalendarDay = {
  dateKey: string;
  date: Date;
  inCurrentMonth: boolean;
  isToday: boolean;
  workoutCount: number;
  plannedTemplateName?: string;
  isMissedPlannedDay: boolean;
};

const dayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function toDateKey(date: Date): string {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy.toISOString().slice(0, 10);
}

function getStartOfWeek(date: Date): Date {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  const day = copy.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  copy.setDate(copy.getDate() + diff);
  return copy;
}

function addDays(date: Date, days: number): Date {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function dayOfWeekMonFirst(date: Date): number {
  const js = date.getDay();
  return js === 0 ? 7 : js;
}

function getCurrentStreak(workouts: Workout[]): number {
  const workoutDays = new Set(workouts.map((w) => w.date));
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const cursor = new Date(today);
  if (!workoutDays.has(toDateKey(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
  }
  let streak = 0;
  while (workoutDays.has(toDateKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export default function CalendarPage() {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [weeklyPlan, setWeeklyPlan] = useState<WeeklyPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [view, setView] = useState<CalendarView>("month");
  const [anchorDate, setAnchorDate] = useState(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return now;
  });
  const [weeklyGoal] = useState<number>(() => getWeeklyGoal());

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      try {
        const [workoutData, weeklyPlanData] = await Promise.all([getWorkouts(), getWeeklyPlan()]);
        setWorkouts(workoutData);
        setWeeklyPlan(weeklyPlanData);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to load calendar data.";
        toast.error(message);
      } finally {
        setIsLoading(false);
      }
    };
    void load();
  }, []);

  const workoutsByDate = useMemo(() => {
    return workouts.reduce<Record<string, number>>((acc, workout) => {
      acc[workout.date] = (acc[workout.date] ?? 0) + 1;
      return acc;
    }, {});
  }, [workouts]);

  const weeklyPlanByDay = useMemo(() => {
    const map: Record<number, WeeklyPlan | undefined> = {};
    weeklyPlan.forEach((entry) => {
      map[entry.dayOfWeek] = entry;
    });
    return map;
  }, [weeklyPlan]);

  const days = useMemo<CalendarDay[]>(() => {
    const todayKey = toDateKey(new Date());
    const monthStart = new Date(anchorDate.getFullYear(), anchorDate.getMonth(), 1);
    const monthEnd = new Date(anchorDate.getFullYear(), anchorDate.getMonth() + 1, 0);
    const rangeStart =
      view === "month" ? getStartOfWeek(monthStart) : getStartOfWeek(anchorDate);
    const rangeLength = view === "month" ? 42 : 7;
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    return Array.from({ length: rangeLength }, (_, index) => {
      const date = addDays(rangeStart, index);
      date.setHours(0, 0, 0, 0);
      const dateKey = toDateKey(date);
      const dow = dayOfWeekMonFirst(date);
      const planned = weeklyPlanByDay[dow];
      const workoutCount = workoutsByDate[dateKey] ?? 0;
      const isMissedPlannedDay = Boolean(planned && date < now && workoutCount === 0);

      return {
        dateKey,
        date,
        inCurrentMonth: view === "week" ? true : date >= monthStart && date <= monthEnd,
        isToday: dateKey === todayKey,
        workoutCount,
        plannedTemplateName: planned?.templateName,
        isMissedPlannedDay,
      };
    });
  }, [anchorDate, view, weeklyPlanByDay, workoutsByDate]);

  const periodStats = useMemo(() => {
    const plannedDays = days.filter((day) => Boolean(day.plannedTemplateName)).length;
    const completedPlannedDays = days.filter(
      (day) => Boolean(day.plannedTemplateName) && day.workoutCount > 0
    ).length;
    const missed = days.filter((day) => day.isMissedPlannedDay).length;
    return { plannedDays, completedPlannedDays, missed };
  }, [days]);

  const streak = useMemo(() => getCurrentStreak(workouts), [workouts]);

  const recentStreakStrip = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return Array.from({ length: 21 }, (_, idx) => {
      const date = addDays(today, -(20 - idx));
      const key = toDateKey(date);
      return {
        key,
        hasWorkout: (workoutsByDate[key] ?? 0) > 0,
      };
    });
  }, [workoutsByDate]);

  const goPrev = () => {
    setAnchorDate((previous) =>
      view === "month"
        ? new Date(previous.getFullYear(), previous.getMonth() - 1, 1)
        : addDays(previous, -7)
    );
  };

  const goNext = () => {
    setAnchorDate((previous) =>
      view === "month"
        ? new Date(previous.getFullYear(), previous.getMonth() + 1, 1)
        : addDays(previous, 7)
    );
  };

  const titleLabel =
    view === "month"
      ? anchorDate.toLocaleString("en-GB", { month: "long", year: "numeric" })
      : `${formatDateDDMMYYYY(getStartOfWeek(anchorDate))} - ${formatDateDDMMYYYY(
          addDays(getStartOfWeek(anchorDate), 6)
        )}`;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="flex min-h-screen min-w-0 flex-1 flex-col">
          <Navbar />
          <PageContainer>
            <section className="surface-page">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h1 className="text-2xl font-semibold tracking-tight text-zinc-100">Calendar</h1>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setView("month")}
                    className={`btn ${view === "month" ? "btn-primary" : "btn-secondary"}`}
                  >
                    Month
                  </button>
                  <button
                    type="button"
                    onClick={() => setView("week")}
                    className={`btn ${view === "week" ? "btn-primary" : "btn-secondary"}`}
                  >
                    Week
                  </button>
                </div>
              </div>

              {isLoading ? (
                <p className="mt-4 text-sm text-zinc-300">Loading calendar...</p>
              ) : workouts.length === 0 ? (
                <div className="mt-4">
                  <EmptyState
                    title="No workouts logged yet"
                    description="Log workouts to see completion, missed plan days, and streaks."
                  />
                </div>
              ) : (
                <div className="mt-4 space-y-4">
                  <div className="surface-card flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={goPrev} className="btn btn-secondary px-2 py-1">
                        Prev
                      </button>
                      <button type="button" onClick={goNext} className="btn btn-secondary px-2 py-1">
                        Next
                      </button>
                    </div>
                    <p className="text-sm font-semibold text-zinc-100">{titleLabel}</p>
                  </div>

                  <div className="surface-card grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <div className="surface-soft px-3 py-2">
                      <p className="text-xs text-zinc-400">Planned days</p>
                      <p className="text-xl font-semibold text-zinc-100">{periodStats.plannedDays}</p>
                    </div>
                    <div className="surface-soft px-3 py-2">
                      <p className="text-xs text-zinc-400">Completed planned</p>
                      <p className="text-xl font-semibold text-emerald-300">{periodStats.completedPlannedDays}</p>
                    </div>
                    <div className="surface-soft px-3 py-2">
                      <p className="text-xs text-zinc-400">Missed planned</p>
                      <p className="text-xl font-semibold text-rose-300">{periodStats.missed}</p>
                    </div>
                    <div className="surface-soft px-3 py-2">
                      <p className="text-xs text-zinc-400">Current streak</p>
                      <p className="text-xl font-semibold text-zinc-100">
                        {streak} day{streak === 1 ? "" : "s"}
                      </p>
                      <p className="text-[11px] text-zinc-500">Goal: {weeklyGoal}/week</p>
                    </div>
                  </div>

                  <div className="surface-card">
                    <div className="mb-2 grid grid-cols-7 gap-2 text-center text-xs font-semibold uppercase tracking-wide text-zinc-500">
                      {dayLabels.map((label) => (
                        <span key={label}>{label}</span>
                      ))}
                    </div>
                    <div className="grid grid-cols-7 gap-y-3 text-center">
                      {days.map((day) => (
                        <div
                          key={day.dateKey}
                          className={`flex min-h-[40px] items-center justify-center text-sm ${
                            day.inCurrentMonth ? "text-zinc-200" : "text-zinc-600"
                          }`}
                        >
                          <span
                            title={[
                              formatDateDDMMYYYY(day.dateKey),
                              day.workoutCount > 0 ? `${day.workoutCount} workout(s)` : "",
                              day.plannedTemplateName ? `Planned: ${day.plannedTemplateName}` : "",
                              day.isMissedPlannedDay ? "Missed planned session" : "",
                            ]
                              .filter(Boolean)
                              .join(" | ")}
                            className={`inline-flex h-8 w-8 items-center justify-center rounded-full font-semibold ${
                              day.workoutCount > 0
                                ? "bg-blue-500 text-white"
                                : day.isToday
                                  ? "border border-emerald-500 text-emerald-300"
                                  : ""
                            } ${day.isMissedPlannedDay && day.workoutCount === 0 ? "text-rose-300" : ""}`}
                          >
                            {day.date.getDate()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="surface-card">
                    <h2 className="text-sm font-semibold text-zinc-100">Streak visualization (last 21 days)</h2>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {recentStreakStrip.map((day) => (
                        <span
                          key={day.key}
                          title={formatDateDDMMYYYY(day.key)}
                          className={`h-3 w-3 rounded-sm ${day.hasWorkout ? "bg-emerald-500" : "bg-zinc-700"}`}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </section>
          </PageContainer>
        </div>
      </div>
    </div>
  );
}
