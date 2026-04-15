"use client";

import { Navbar } from "@/components/navbar";
import { PageContainer } from "@/components/page-container";
import { Sidebar } from "@/components/sidebar";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { APP_NAME } from "@/lib/constants";
import {
  resolveMuscleFromCatalogCache,
  writeExerciseCatalogCache,
} from "@/lib/exercise-catalog-cache";
import { getExerciseCatalog } from "@/lib/services/exercise-catalog-service";
import { getWeeklyGoal, subscribeWeeklyGoalChanges } from "@/lib/user-preferences";
import { getWorkouts } from "@/lib/services/workout-service";
import type { Workout } from "@/types/workout";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";

type Timeframe = "7d" | "30d" | "90d" | "all";
type TrendMetric = "volume" | "estimated1rm";

type PersonalRecord = {
  exercise: string;
  maxWeight: number;
  maxEstimatedOneRepMax: number;
  achievedOn: string;
};

type VolumePoint = {
  date: string;
  totalVolume: number;
  estimatedOneRepMax: number;
  shortDate: string;
};

type MuscleGroupVolume = {
  group: string;
  volume: number;
};

type ExerciseSessionSnapshot = {
  date: string;
  weight: number;
  reps: number;
  estimatedOneRepMax: number;
};

type NextBestSetSuggestion = {
  exercise: string;
  suggestedWeight: number;
  suggestedReps: number;
  basedOnWeight: number;
  basedOnReps: number;
  rationale: string;
};

type PlateauAlert = {
  exercise: string;
  sessionsWithoutPr: number;
  currentBest: number;
};

function normalizeExerciseName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

function estimateOneRepMax(weight: number, reps: number): number {
  if (weight <= 0 || reps <= 0) {
    return 0;
  }
  return weight * (1 + reps / 30);
}

function getCurrentStreakDays(workouts: Workout[]): number {
  if (workouts.length === 0) {
    return 0;
  }
  const daySet = new Set(workouts.map((workout) => workout.date));
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const cursor = new Date(today);
  if (!daySet.has(cursor.toISOString().slice(0, 10))) {
    cursor.setDate(cursor.getDate() - 1);
  }

  let streak = 0;
  while (daySet.has(cursor.toISOString().slice(0, 10))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

function getStartOfWeek(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

export default function Home() {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [timeframe, setTimeframe] = useState<Timeframe>("30d");
  const [trendMetric, setTrendMetric] = useState<TrendMetric>("volume");
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [catalogMuscleByName, setCatalogMuscleByName] = useState<Record<string, string>>({});
  const [weeklyGoalTarget, setWeeklyGoalTarget] = useState<number>(() => getWeeklyGoal());

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      try {
        const data = await getWorkouts();
        setWorkouts(data);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to load analytics.";
        toast.error(message);
      } finally {
        setIsLoading(false);
      }
    };
    void load();
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    const syncTheme = () => setIsDarkMode(root.classList.contains("dark"));
    syncTheme();

    const observer = new MutationObserver(syncTheme);
    observer.observe(root, { attributes: true, attributeFilter: ["class"] });

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let cancelled = false;
    const syncCatalogCache = async () => {
      try {
        const items = await getExerciseCatalog({ limit: 500 });
        if (!cancelled) {
          writeExerciseCatalogCache(items);
          setCatalogMuscleByName(
            items.reduce<Record<string, string>>((acc, item) => {
              acc[normalizeExerciseName(item.name)] = item.muscleGroup;
              return acc;
            }, {})
          );
        }
      } catch {
        // Keep analytics working with whatever cache already exists.
      }
    };
    void syncCatalogCache();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    return subscribeWeeklyGoalChanges(() => {
      queueMicrotask(() => setWeeklyGoalTarget(getWeeklyGoal()));
    });
  }, []);

  const analytics = useMemo(() => {
    let totalVolume = 0;
    let totalSets = 0;
    const prByExercise = new Map<string, PersonalRecord>();
    const sessionHistoryByExercise = new Map<string, ExerciseSessionSnapshot[]>();
    const volumeByDate = new Map<string, number>();
    const oneRepMaxByDate = new Map<string, number>();
    const volumeByMuscleGroup = new Map<string, number>();

    for (const workout of workouts) {
      const workoutDate = workout.date;
      for (const exercise of workout.exercises) {
        const normalizedName = normalizeExerciseName(exercise.name);
        const displayName = exercise.name.trim() || "Unnamed exercise";
        const group =
          exercise.muscleGroup?.trim() ||
          catalogMuscleByName[normalizeExerciseName(displayName)] ||
          resolveMuscleFromCatalogCache(displayName) ||
          "Other";

        for (const set of exercise.sets) {
          const volume = Math.max(0, set.weight) * Math.max(0, set.reps);
          totalVolume += volume;
          totalSets += 1;
          volumeByDate.set(workoutDate, (volumeByDate.get(workoutDate) ?? 0) + volume);
          volumeByMuscleGroup.set(group, (volumeByMuscleGroup.get(group) ?? 0) + volume);

          const oneRepMax = estimateOneRepMax(set.weight, set.reps);
          oneRepMaxByDate.set(workoutDate, Math.max(oneRepMaxByDate.get(workoutDate) ?? 0, oneRepMax));

          const history = sessionHistoryByExercise.get(normalizedName) ?? [];
          history.push({
            date: workoutDate,
            weight: set.weight,
            reps: set.reps,
            estimatedOneRepMax: oneRepMax,
          });
          sessionHistoryByExercise.set(normalizedName, history);

          const currentPr = prByExercise.get(normalizedName);
          if (!currentPr || oneRepMax > currentPr.maxEstimatedOneRepMax) {
            prByExercise.set(normalizedName, {
              exercise: displayName,
              maxWeight: set.weight,
              maxEstimatedOneRepMax: oneRepMax,
              achievedOn: workoutDate,
            });
          }
        }
      }
    }

    const sortedVolumeTrend: VolumePoint[] = [...volumeByDate.entries()]
      .map(([date, volume]) => ({
        date,
        totalVolume: volume,
        estimatedOneRepMax: oneRepMaxByDate.get(date) ?? 0,
        shortDate: date.slice(5),
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const latestDate = sortedVolumeTrend.at(-1)?.date;
    const latestDateObj = latestDate ? new Date(latestDate) : null;
    const timeframeDays: Record<Exclude<Timeframe, "all">, number> = {
      "7d": 7,
      "30d": 30,
      "90d": 90,
    };
    const filteredByTimeframe = sortedVolumeTrend.filter((point) => {
      if (timeframe === "all" || !latestDateObj) {
        return true;
      }
      const pointDate = new Date(point.date);
      const diffMs = latestDateObj.getTime() - pointDate.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      return diffDays <= timeframeDays[timeframe];
    });
    const latestVolumePoints = filteredByTimeframe.slice(-10);

    const previousWindow = latestVolumePoints.slice(0, Math.max(0, latestVolumePoints.length - 5));
    const recentWindow = latestVolumePoints.slice(-5);

    const metricKey = trendMetric === "volume" ? "totalVolume" : "estimatedOneRepMax";
    const previousAvg =
      previousWindow.length === 0
        ? 0
        : previousWindow.reduce((sum, point) => sum + point[metricKey], 0) / previousWindow.length;
    const recentAvg =
      recentWindow.length === 0
        ? 0
        : recentWindow.reduce((sum, point) => sum + point[metricKey], 0) / recentWindow.length;
    const trendPct = previousAvg === 0 ? 0 : ((recentAvg - previousAvg) / previousAvg) * 100;

    const topPrs = [...prByExercise.values()]
      .sort((a, b) => b.maxEstimatedOneRepMax - a.maxEstimatedOneRepMax)
      .slice(0, 8);

    const muscleSummary: MuscleGroupVolume[] = [...volumeByMuscleGroup.entries()]
      .map(([group, volume]) => ({ group, volume }))
      .sort((a, b) => b.volume - a.volume);

    const nextBestSetSuggestions: NextBestSetSuggestion[] = [...sessionHistoryByExercise.entries()]
      .map(([key, sessions]) => {
        const sorted = [...sessions].sort((a, b) => a.date.localeCompare(b.date));
        const latest = sorted.at(-1);
        if (!latest) {
          return null;
        }
        const exerciseName = prByExercise.get(key)?.exercise ?? key;
        let suggestedWeight = latest.weight;
        let suggestedReps = latest.reps;
        let rationale = "Keep the same load and add one rep to drive progression.";

        if (latest.reps >= 12) {
          suggestedWeight = latest.weight + 2.5;
          suggestedReps = 8;
          rationale = "High reps achieved; increase weight and restart in lower rep range.";
        } else if (latest.reps >= 8) {
          suggestedWeight = latest.weight + 1.25;
          suggestedReps = latest.reps;
          rationale = "Solid performance; small load increase for progressive overload.";
        } else if (latest.reps <= 5) {
          suggestedWeight = latest.weight;
          suggestedReps = latest.reps + 1;
          rationale = "Keep load and build reps before adding more weight.";
        }

        return {
          exercise: exerciseName,
          suggestedWeight: Number(suggestedWeight.toFixed(2)),
          suggestedReps,
          basedOnWeight: latest.weight,
          basedOnReps: latest.reps,
          rationale,
        };
      })
      .filter((item): item is NextBestSetSuggestion => Boolean(item))
      .sort((a, b) => a.exercise.localeCompare(b.exercise))
      .slice(0, 8);

    const plateauAlerts: PlateauAlert[] = [...sessionHistoryByExercise.entries()]
      .map(([key, sessions]) => {
        const sorted = [...sessions].sort((a, b) => a.date.localeCompare(b.date));
        if (sorted.length < 5) {
          return null;
        }
        let best = 0;
        let sessionsWithoutPr = 0;
        for (const session of sorted) {
          if (session.estimatedOneRepMax > best + 0.05) {
            best = session.estimatedOneRepMax;
            sessionsWithoutPr = 0;
          } else {
            sessionsWithoutPr += 1;
          }
        }
        if (sessionsWithoutPr < 5) {
          return null;
        }
        return {
          exercise: prByExercise.get(key)?.exercise ?? key,
          sessionsWithoutPr,
          currentBest: best,
        };
      })
      .filter((item): item is PlateauAlert => Boolean(item))
      .sort((a, b) => b.sessionsWithoutPr - a.sessionsWithoutPr)
      .slice(0, 6);

    const weeklyTarget = weeklyGoalTarget;
    const now = new Date();
    const weekStart = getStartOfWeek(now);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);
    const workoutsThisWeek = workouts.filter((workout) => {
      const d = new Date(workout.date);
      return d >= weekStart && d < weekEnd;
    }).length;
    const adherenceScore = Math.round(Math.min(100, (workoutsThisWeek / weeklyTarget) * 100));

    const lastFourWeeks = Array.from({ length: 4 }, (_, i) => {
      const start = new Date(weekStart);
      start.setDate(start.getDate() - i * 7);
      const end = new Date(start);
      end.setDate(end.getDate() + 7);
      const count = workouts.filter((workout) => {
        const d = new Date(workout.date);
        return d >= start && d < end;
      }).length;
      return { start, count };
    });
    const weeksHitTarget = lastFourWeeks.filter((week) => week.count >= weeklyTarget).length;

    const currentStreak = getCurrentStreakDays(workouts);
    const avgVolumePerWorkout = workouts.length === 0 ? 0 : totalVolume / workouts.length;

    return {
      totalVolume,
      totalSets,
      currentStreak,
      avgVolumePerWorkout,
      trendPct,
      topPrs,
      muscleSummary,
      latestVolumePoints,
      nextBestSetSuggestions,
      plateauAlerts,
      weeklyTarget,
      workoutsThisWeek,
      adherenceScore,
      weeksHitTarget,
    };
  }, [catalogMuscleByName, timeframe, trendMetric, weeklyGoalTarget, workouts]);

  const chartTheme = useMemo(
    () => ({
      grid: isDarkMode ? "#3f3f46" : "#d4d4d8",
      axis: isDarkMode ? "#a1a1aa" : "#71717a",
      tooltipBg: isDarkMode ? "#18181b" : "#ffffff",
      tooltipBorder: isDarkMode ? "#3f3f46" : "#d4d4d8",
      line: isDarkMode ? "#4ade80" : "#16a34a",
      bar: isDarkMode ? "#60a5fa" : "#2563eb",
      text: isDarkMode ? "#e4e4e7" : "#18181b",
    }),
    [isDarkMode]
  );

  const trendLabel = `${analytics.trendPct >= 0 ? "+" : ""}${analytics.trendPct.toFixed(1)}%`;
  const trendToneClass =
    analytics.trendPct > 0
      ? "border-emerald-300/70 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300"
      : analytics.trendPct < 0
        ? "border-rose-300/70 bg-rose-50 text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300"
        : "border-zinc-300 bg-zinc-50 text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800/70 dark:text-zinc-300";

  const adherenceToneClass =
    analytics.adherenceScore >= 100
      ? "text-emerald-600 dark:text-emerald-400"
      : analytics.adherenceScore >= 60
        ? "text-amber-600 dark:text-amber-400"
        : "text-rose-600 dark:text-rose-400";

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="flex min-h-screen min-w-0 flex-1 flex-col">
          <Navbar />
          <PageContainer>
            <section className="relative overflow-hidden rounded-2xl border border-zinc-200/80 bg-linear-to-b from-white to-zinc-50 p-6 shadow-sm shadow-zinc-200/60 dark:border-zinc-800 dark:from-zinc-900 dark:to-zinc-950 dark:shadow-black/30">
              <div className="pointer-events-none absolute -right-24 -top-24 h-56 w-56 rounded-full bg-blue-400/10 blur-3xl dark:bg-blue-500/10" />
              <div className="pointer-events-none absolute -bottom-24 -left-20 h-56 w-56 rounded-full bg-emerald-400/10 blur-3xl dark:bg-emerald-500/10" />

              <div className="relative">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="inline-flex items-center rounded-full border border-zinc-300/80 bg-white/80 px-3 py-1 text-[11px] font-medium uppercase tracking-wide text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900/70 dark:text-zinc-300">
                      Performance overview
                    </p>
                    <h1 className="mt-3 text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-3xl">
                      {APP_NAME} Analytics Dashboard
                    </h1>
                    <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
                      Track PRs, workout volume trends, streaks, and muscle-group focus.
                    </p>
                  </div>
                  <div
                    className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${trendToneClass}`}
                    title="Trend compares recent sessions to previous window."
                  >
                    Trend {trendLabel}
                  </div>
                </div>
              </div>

              {isLoading ? (
                <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <Skeleton className="h-24 w-full" />
                  <Skeleton className="h-24 w-full" />
                  <Skeleton className="h-24 w-full" />
                  <Skeleton className="h-24 w-full" />
                </div>
              ) : workouts.length === 0 ? (
                <div className="mt-4">
                  <EmptyState
                    title="No workouts yet"
                    description="Start logging workouts to unlock analytics."
                    actionLabel="Start workout"
                    actionHref="/workouts/start"
                  />
                </div>
              ) : (
                <div className="mt-4 space-y-4">
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <div className="rounded-xl border border-zinc-200/90 bg-white/90 p-4 shadow-sm dark:border-zinc-700/70 dark:bg-zinc-900/70">
                      <p className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Total volume</p>
                      <p className="mt-1 text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
                        {Math.round(analytics.totalVolume).toLocaleString()}
                      </p>
                    </div>
                    <div className="rounded-xl border border-zinc-200/90 bg-white/90 p-4 shadow-sm dark:border-zinc-700/70 dark:bg-zinc-900/70">
                      <p className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Current streak</p>
                      <p className="mt-1 text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
                        {analytics.currentStreak} day{analytics.currentStreak === 1 ? "" : "s"}
                      </p>
                    </div>
                    <div className="rounded-xl border border-zinc-200/90 bg-white/90 p-4 shadow-sm dark:border-zinc-700/70 dark:bg-zinc-900/70">
                      <p className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Avg volume / workout</p>
                      <p className="mt-1 text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
                        {Math.round(analytics.avgVolumePerWorkout).toLocaleString()}
                      </p>
                    </div>
                    <div className="rounded-xl border border-zinc-200/90 bg-white/90 p-4 shadow-sm dark:border-zinc-700/70 dark:bg-zinc-900/70">
                      <p className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Weekly adherence</p>
                      <p className={`mt-1 text-2xl font-semibold ${adherenceToneClass}`}>
                        {analytics.adherenceScore}%
                      </p>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        {analytics.workoutsThisWeek}/{analytics.weeklyTarget} workouts this week
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-4 lg:grid-cols-2">
                    <div className="rounded-xl border border-zinc-200/90 bg-white/90 p-4 shadow-sm dark:border-zinc-700/70 dark:bg-zinc-900/70">
                      <h2 className="text-sm font-semibold tracking-wide text-zinc-900 dark:text-zinc-100">Next best set suggestions</h2>
                      <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                        Auto-suggested overload targets from your latest top sets.
                      </p>
                      {analytics.nextBestSetSuggestions.length === 0 ? (
                        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">Not enough data yet.</p>
                      ) : (
                        <ul className="mt-2 space-y-2 text-sm">
                          {analytics.nextBestSetSuggestions.map((item) => (
                            <li key={item.exercise} className="rounded-lg border border-zinc-200/80 bg-zinc-50/80 p-3 dark:border-zinc-700/70 dark:bg-zinc-950/80">
                              <p className="font-medium text-zinc-900 dark:text-zinc-100">{item.exercise}</p>
                              <p className="text-zinc-600 dark:text-zinc-400">
                                Last: {item.basedOnWeight} kg x {item.basedOnReps} reps {"->"} Next: {item.suggestedWeight} kg x {item.suggestedReps} reps
                              </p>
                              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{item.rationale}</p>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>

                    <div className="rounded-xl border border-zinc-200/90 bg-white/90 p-4 shadow-sm dark:border-zinc-700/70 dark:bg-zinc-900/70">
                      <h2 className="text-sm font-semibold tracking-wide text-zinc-900 dark:text-zinc-100">Plateau detection</h2>
                      <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                        Flags exercises with no estimated 1RM PR in 5+ sessions.
                      </p>
                      {analytics.plateauAlerts.length === 0 ? (
                        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                          No current plateau alerts. Great momentum.
                        </p>
                      ) : (
                        <ul className="mt-2 space-y-2 text-sm">
                          {analytics.plateauAlerts.map((item) => (
                            <li key={item.exercise} className="rounded-lg border border-amber-200/90 bg-amber-50/80 p-3 dark:border-amber-900/50 dark:bg-amber-950/25">
                              <p className="font-medium text-zinc-900 dark:text-zinc-100">{item.exercise}</p>
                              <p className="text-zinc-600 dark:text-zinc-400">
                                {item.sessionsWithoutPr} sessions without PR (best est. 1RM {item.currentBest.toFixed(1)})
                              </p>
                            </li>
                          ))}
                        </ul>
                      )}
                      <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
                        Weekly target hit in {analytics.weeksHitTarget}/4 recent weeks.
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-4 lg:grid-cols-2">
                    <div className="rounded-xl border border-zinc-200/90 bg-white/90 p-4 shadow-sm dark:border-zinc-700/70 dark:bg-zinc-900/70">
                      <div className="flex items-center justify-between">
                        <h2 className="text-sm font-semibold tracking-wide text-zinc-900 dark:text-zinc-100">PR tracking</h2>
                        <Link href="/history" className="text-xs font-medium text-zinc-600 underline-offset-4 hover:text-zinc-900 hover:underline dark:text-zinc-400 dark:hover:text-zinc-100">
                          View history
                        </Link>
                      </div>
                      {analytics.topPrs.length === 0 ? (
                        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">No PR data yet.</p>
                      ) : (
                        <ul className="mt-2 space-y-2 text-sm">
                          {analytics.topPrs.map((record) => (
                            <li key={record.exercise} className="rounded-lg border border-zinc-200/80 bg-zinc-50/80 p-3 dark:border-zinc-700/70 dark:bg-zinc-950/80">
                              <p className="font-medium text-zinc-900 dark:text-zinc-100">{record.exercise}</p>
                              <p className="text-zinc-600 dark:text-zinc-400">
                                Est. 1RM {record.maxEstimatedOneRepMax.toFixed(1)} | Top set {record.maxWeight} kg | {record.achievedOn}
                              </p>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>

                    <div className="rounded-xl border border-zinc-200/90 bg-white/90 p-4 shadow-sm dark:border-zinc-700/70 dark:bg-zinc-900/70">
                      <h2 className="text-sm font-semibold tracking-wide text-zinc-900 dark:text-zinc-100">Muscle-group summary</h2>
                      {analytics.muscleSummary.length === 0 ? (
                        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">No muscle-group data yet.</p>
                      ) : (
                        <div className="mt-2 h-72 rounded-lg border border-zinc-200/80 bg-zinc-50/80 p-2 dark:border-zinc-700/70 dark:bg-zinc-950/80">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                              data={analytics.muscleSummary.map((item) => ({
                                ...item,
                                volumeRounded: Math.round(item.volume),
                              }))}
                              margin={{ top: 8, right: 8, left: 8, bottom: 8 }}
                            >
                              <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} />
                              <XAxis
                                dataKey="group"
                                tick={{ fill: chartTheme.axis, fontSize: 12 }}
                                interval={0}
                                angle={-20}
                                textAnchor="end"
                                height={50}
                              />
                              <YAxis tick={{ fill: chartTheme.axis, fontSize: 12 }} />
                              <Tooltip
                                contentStyle={{
                                  borderRadius: 8,
                                  border: `1px solid ${chartTheme.tooltipBorder}`,
                                  backgroundColor: chartTheme.tooltipBg,
                                  color: chartTheme.text,
                                }}
                                formatter={(value) => [`${Number(value ?? 0).toLocaleString()} volume`, "Volume"]}
                              />
                              <Bar dataKey="volumeRounded" name="Volume" fill={chartTheme.bar} radius={[6, 6, 0, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="rounded-xl border border-zinc-200/90 bg-white/90 p-4 shadow-sm dark:border-zinc-700/70 dark:bg-zinc-900/70">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h2 className="text-sm font-semibold tracking-wide text-zinc-900 dark:text-zinc-100">
                        {trendMetric === "volume" ? "Volume over time" : "Estimated 1RM over time"}
                      </h2>
                      <div className="flex flex-wrap items-center gap-2">
                        <select
                          value={timeframe}
                          onChange={(event) => setTimeframe(event.target.value as Timeframe)}
                          className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs font-medium text-zinc-800 shadow-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                        >
                          <option value="7d">7d</option>
                          <option value="30d">30d</option>
                          <option value="90d">90d</option>
                          <option value="all">All</option>
                        </select>
                        <div className="flex overflow-hidden rounded-md border border-zinc-300 dark:border-zinc-700">
                          <button
                            type="button"
                            onClick={() => setTrendMetric("volume")}
                            className={`px-2 py-1 text-xs ${trendMetric === "volume"
                              ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                              : "bg-white text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
                              }`}
                          >
                            Volume
                          </button>
                          <button
                            type="button"
                            onClick={() => setTrendMetric("estimated1rm")}
                            className={`px-2 py-1 text-xs ${trendMetric === "estimated1rm"
                              ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                              : "bg-white text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
                              }`}
                          >
                            Est. 1RM
                          </button>
                        </div>
                      </div>
                    </div>
                    {analytics.latestVolumePoints.length === 0 ? (
                      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">No volume trend yet.</p>
                    ) : (
                      <div className="mt-2 h-80 rounded-lg border border-zinc-200/80 bg-zinc-50/80 p-2 dark:border-zinc-700/70 dark:bg-zinc-950/80">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart
                            data={analytics.latestVolumePoints.map((point) => ({
                              ...point,
                              totalVolumeRounded: Math.round(point.totalVolume),
                              estimatedOneRepMaxRounded: Number(point.estimatedOneRepMax.toFixed(1)),
                            }))}
                            margin={{ top: 8, right: 8, left: 8, bottom: 8 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} />
                            <XAxis dataKey="shortDate" tick={{ fill: chartTheme.axis, fontSize: 12 }} />
                            <YAxis tick={{ fill: chartTheme.axis, fontSize: 12 }} />
                            <Tooltip
                              labelFormatter={(_, payload) => payload?.[0]?.payload?.date ?? ""}
                              contentStyle={{
                                borderRadius: 8,
                                border: `1px solid ${chartTheme.tooltipBorder}`,
                                backgroundColor: chartTheme.tooltipBg,
                                color: chartTheme.text,
                              }}
                              formatter={(value) => [
                                trendMetric === "volume"
                                  ? `${Number(value ?? 0).toLocaleString()} volume`
                                  : `${Number(value ?? 0).toLocaleString()} est. 1RM`,
                                trendMetric === "volume" ? "Volume" : "Estimated 1RM",
                              ]}
                            />
                            <Line
                              type="monotone"
                              dataKey={trendMetric === "volume" ? "totalVolumeRounded" : "estimatedOneRepMaxRounded"}
                              stroke={chartTheme.line}
                              strokeWidth={2}
                              dot={{ r: 3 }}
                              activeDot={{ r: 5 }}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    )}
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
