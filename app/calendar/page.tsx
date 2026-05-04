"use client";

import { Navbar } from "@/components/navbar";
import { PageContainer } from "@/components/page-container";
import { Sidebar } from "@/components/sidebar";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { APP_NAME } from "@/lib/constants";
import { formatDateDDMMYYYY } from "@/lib/date-format";
import { getWorkouts } from "@/lib/services/workout-service";
import { getWeeklyPlan } from "@/lib/services/template-service";
import { getWeeklyGoal } from "@/lib/user-preferences";
import type { WeeklyPlan } from "@/types/weekly-plan";
import type { Workout } from "@/types/workout";
import Link from "next/link";
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
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);
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

  const workoutsByDateList = useMemo(() => {
    return workouts.reduce<Record<string, Workout[]>>((acc, workout) => {
      if (!acc[workout.date]) {
        acc[workout.date] = [];
      }
      acc[workout.date].push(workout);
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

  const selectedDayWorkouts = selectedDateKey ? workoutsByDateList[selectedDateKey] ?? [] : [];

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

              <div className="relative flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="text-xs font-medium uppercase tracking-wider text-emerald-400/90">{APP_NAME}</p>
                  <h1 className="text-2xl font-semibold tracking-tight text-zinc-100 sm:text-3xl">Calendar</h1>
                  <p className="max-w-xl text-sm leading-relaxed text-zinc-400">
                    See training days, routine plan coverage, and streaks. Tap a highlighted day to jump to that
                    session.
                  </p>
                </div>
                <div
                  className="inline-flex shrink-0 rounded-lg border border-zinc-700/80 bg-zinc-950/80 p-0.5 shadow-inner"
                  role="group"
                  aria-label="Calendar view"
                >
                  <button
                    type="button"
                    onClick={() => setView("month")}
                    className={`rounded-md px-4 py-2 text-xs font-semibold transition-colors ${
                      view === "month"
                        ? "bg-emerald-600 text-white shadow-sm"
                        : "text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    Month
                  </button>
                  <button
                    type="button"
                    onClick={() => setView("week")}
                    className={`rounded-md px-4 py-2 text-xs font-semibold transition-colors ${
                      view === "week"
                        ? "bg-emerald-600 text-white shadow-sm"
                        : "text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    Week
                  </button>
                </div>
              </div>

              {isLoading ? (
                <div className="mt-6 space-y-4">
                  <div className="surface-card flex flex-wrap items-center justify-between gap-3">
                    <Skeleton className="h-9 w-24 rounded-md" />
                    <Skeleton className="h-5 w-40 max-w-full" />
                    <Skeleton className="h-9 w-24 rounded-md" />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    {[0, 1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-22 w-full rounded-xl border border-zinc-800/80" />
                    ))}
                  </div>
                  <Skeleton className="h-72 w-full rounded-xl border border-zinc-800/80" />
                </div>
              ) : workouts.length === 0 ? (
                <div className="mt-6">
                  <EmptyState
                    title="No workouts logged yet"
                    description="Log sessions to see your calendar heatmap, streak strip, and planned-day hints."
                    actionLabel="Start workout"
                    actionHref="/workouts/start"
                  />
                </div>
              ) : (
                <div className="mt-6 space-y-6">
                  <div className="flex flex-wrap gap-2 rounded-xl border border-zinc-700/60 bg-zinc-900/30 px-3 py-3 sm:items-center sm:justify-between">
                    <p className="w-full text-xs font-medium text-zinc-500 sm:w-auto">Quick links</p>
                    <div className="flex flex-wrap gap-2">
                      <Link href="/workouts/start" className="btn btn-primary text-xs">
                        Start workout
                      </Link>
                      <Link href="/" className="btn btn-secondary text-xs">
                        Dashboard
                      </Link>
                      <Link href="/history" className="btn btn-secondary text-xs">
                        History
                      </Link>
                    </div>
                  </div>

                  <div className="surface-card">
                    <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <button
                        type="button"
                        onClick={goPrev}
                        className="btn btn-secondary order-2 px-3 py-2 text-xs sm:order-1"
                        aria-label={view === "month" ? "Previous month" : "Previous week"}
                      >
                        ← Previous
                      </button>
                      <p className="order-1 text-center text-sm font-semibold text-zinc-100 sm:order-2 sm:px-4">
                        {titleLabel}
                      </p>
                      <button
                        type="button"
                        onClick={goNext}
                        className="btn btn-secondary order-3 px-3 py-2 text-xs"
                        aria-label={view === "month" ? "Next month" : "Next week"}
                      >
                        Next →
                      </button>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <div className="surface-card transition-colors hover:border-zinc-500/60">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Planned days</p>
                      <p className="mt-1.5 text-2xl font-semibold tabular-nums text-zinc-100">
                        {periodStats.plannedDays}
                      </p>
                      <p className="mt-2 text-xs text-zinc-500">Days in view with a routine template.</p>
                    </div>
                    <div className="surface-card transition-colors hover:border-zinc-500/60">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                        Completed planned
                      </p>
                      <p className="mt-1.5 text-2xl font-semibold tabular-nums text-emerald-300">
                        {periodStats.completedPlannedDays}
                      </p>
                      <p className="mt-2 text-xs text-zinc-500">You logged at least one workout.</p>
                    </div>
                    <div className="surface-card transition-colors hover:border-zinc-500/60">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Missed planned</p>
                      <p className="mt-1.5 text-2xl font-semibold tabular-nums text-rose-300">
                        {periodStats.missed}
                      </p>
                      <p className="mt-2 text-xs text-zinc-500">Past planned days with no session.</p>
                    </div>
                    <div className="surface-card transition-colors hover:border-zinc-500/60">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                        Current streak
                      </p>
                      <p className="mt-1.5 text-2xl font-semibold tabular-nums text-zinc-100">
                        {streak}
                        <span className="ml-1 text-base font-medium text-zinc-500">
                          day{streak === 1 ? "" : "s"}
                        </span>
                      </p>
                      <p className="mt-2 text-[11px] text-zinc-500">Weekly goal: {weeklyGoal} sessions.</p>
                    </div>
                  </div>

                  <div className="surface-card">
                    <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
                      <div>
                        <h2 className="text-sm font-semibold text-zinc-100">
                          {view === "month" ? "Month view" : "Week view"}
                        </h2>
                        <p className="mt-0.5 text-xs text-zinc-400">
                          Green = logged · Outline = today · Red tint = missed plan
                        </p>
                      </div>
                    </div>
                    <div className="mb-2 grid grid-cols-7 gap-1 text-center text-[11px] font-semibold uppercase tracking-wide text-zinc-500 sm:gap-2">
                      {dayLabels.map((label) => (
                        <span key={label}>{label}</span>
                      ))}
                    </div>
                    <div className="grid grid-cols-7 gap-y-2 text-center sm:gap-y-3">
                      {days.map((day) => (
                        <div
                          key={day.dateKey}
                          className={`flex min-h-11 items-center justify-center text-sm ${
                            day.inCurrentMonth ? "text-zinc-200" : "text-zinc-600"
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => day.workoutCount > 0 && setSelectedDateKey(day.dateKey)}
                            title={[
                              formatDateDDMMYYYY(day.dateKey),
                              day.workoutCount > 0 ? `${day.workoutCount} workout(s)` : "",
                              day.plannedTemplateName ? `Planned: ${day.plannedTemplateName}` : "",
                              day.isMissedPlannedDay ? "Missed planned session" : "",
                            ]
                              .filter(Boolean)
                              .join(" | ")}
                            className={`inline-flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold transition focus-visible:ring-2 focus-visible:ring-emerald-500 ${
                              day.workoutCount > 0
                                ? "cursor-pointer bg-emerald-500 text-zinc-950 hover:bg-emerald-400"
                                : day.isToday
                                  ? "border-2 border-emerald-500/80 text-emerald-200"
                                  : "text-zinc-400 hover:bg-zinc-800/80"
                            } ${day.isMissedPlannedDay && day.workoutCount === 0 ? "text-rose-300" : ""} ${
                              selectedDateKey === day.dateKey
                                ? "ring-2 ring-emerald-400 ring-offset-2 ring-offset-zinc-950"
                                : ""
                            }`}
                          >
                            {day.date.getDate()}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {selectedDateKey ? (
                    <div className="surface-card">
                      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <h2 className="text-sm font-semibold text-zinc-100">
                            {formatDateDDMMYYYY(selectedDateKey)}
                          </h2>
                          <p className="text-xs text-zinc-400">Sessions you logged on this day.</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setSelectedDateKey(null)}
                          className="btn btn-ghost px-3 py-1.5 text-xs"
                        >
                          Clear selection
                        </button>
                      </div>
                      {selectedDayWorkouts.length === 0 ? (
                        <p className="text-sm text-zinc-400">No workouts logged for this day.</p>
                      ) : (
                        <ul className="space-y-2">
                          {selectedDayWorkouts.map((workout) => (
                            <li
                              key={workout.id}
                              className="surface-soft flex flex-wrap items-center justify-between gap-3 border-zinc-700/50 px-3 py-3 text-sm transition-colors hover:border-zinc-600"
                            >
                              <div className="min-w-0">
                                <p className="font-semibold text-zinc-100">{workout.name}</p>
                                <p className="text-xs text-zinc-400">
                                  {workout.exercises.length} exercise{workout.exercises.length === 1 ? "" : "s"}
                                </p>
                              </div>
                              <Link
                                href={`/history/${workout.id}`}
                                className="btn btn-secondary shrink-0 px-3 py-1.5 text-xs"
                              >
                                View
                              </Link>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ) : null}

                  <div className="surface-card">
                    <h2 className="text-sm font-semibold text-zinc-100">Last 21 days</h2>
                    <p className="mt-1 text-xs text-zinc-400">One square per day - left is oldest, right is today.</p>
                    <div className="mt-3 flex flex-wrap items-center gap-3">
                      <div className="flex flex-wrap gap-1" role="img" aria-label="Workout days in the last 21 days">
                        {recentStreakStrip.map((day) => (
                          <span
                            key={day.key}
                            title={formatDateDDMMYYYY(day.key)}
                            className={`h-3.5 w-3.5 rounded-sm sm:h-4 sm:w-4 ${
                              day.hasWorkout ? "bg-emerald-500" : "bg-zinc-700"
                            }`}
                          />
                        ))}
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-zinc-500">
                        <span className="inline-flex items-center gap-1.5">
                          <span className="h-2.5 w-2.5 rounded-sm bg-emerald-500" /> Workout
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <span className="h-2.5 w-2.5 rounded-sm bg-zinc-700" /> Rest
                        </span>
                      </div>
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
