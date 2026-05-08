"use client";

import { Navbar } from "@/components/navbar";
import { PageContainer } from "@/components/page-container";
import { Sidebar } from "@/components/sidebar";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { APP_NAME } from "@/lib/constants";
import { formatDateDDMMYYYY } from "@/lib/date-format";
import {
  resolveMuscleFromCatalogCache,
  writeExerciseCatalogCache,
} from "@/lib/exercise-catalog-cache";
import { getExerciseCatalog } from "@/lib/services/exercise-catalog-service";
import { isOnboardingComplete } from "@/lib/onboarding-preferences";
import { getWeeklyGoal, subscribeWeeklyGoalChanges } from "@/lib/user-preferences";
import { getWorkouts } from "@/lib/services/workout-service";
import type { Workout } from "@/types/workout";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
  const router = useRouter();
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [onboardingChecked, setOnboardingChecked] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [timeframe, setTimeframe] = useState<Timeframe>("30d");
  const [trendMetric, setTrendMetric] = useState<TrendMetric>("volume");
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [catalogMuscleByName, setCatalogMuscleByName] = useState<Record<string, string>>({});
  const [weeklyGoalTarget, setWeeklyGoalTarget] = useState<number>(() => getWeeklyGoal());

  useEffect(() => {
    if (!isOnboardingComplete()) {
      router.replace("/onboarding");
      return;
    }
    setOnboardingChecked(true);
  }, [router]);

  useEffect(() => {
    if (!onboardingChecked) {
      return;
    }
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
  }, [onboardingChecked]);

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
          const repsValue = Math.max(0, set.reps ?? 0);
          const volume = Math.max(0, set.weight) * repsValue;
          totalVolume += volume;
          totalSets += 1;
          volumeByDate.set(workoutDate, (volumeByDate.get(workoutDate) ?? 0) + volume);
          volumeByMuscleGroup.set(group, (volumeByMuscleGroup.get(group) ?? 0) + volume);

          const oneRepMax = estimateOneRepMax(set.weight, repsValue);
          oneRepMaxByDate.set(workoutDate, Math.max(oneRepMaxByDate.get(workoutDate) ?? 0, oneRepMax));

          const history = sessionHistoryByExercise.get(normalizedName) ?? [];
          history.push({
            date: workoutDate,
            weight: set.weight,
            reps: repsValue,
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
        shortDate: formatDateDDMMYYYY(date),
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
      workoutCount: workouts.length,
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
      ? "border-emerald-500/35 bg-emerald-500/10 text-emerald-200"
      : analytics.trendPct < 0
        ? "border-rose-500/35 bg-rose-500/10 text-rose-200"
        : "border-zinc-600 bg-zinc-800/60 text-zinc-300";

  const adherenceToneClass =
    analytics.adherenceScore >= 100
      ? "text-emerald-300"
      : analytics.adherenceScore >= 60
        ? "text-amber-300"
        : "text-rose-300";

  const adherenceBarClass =
    analytics.adherenceScore >= 100
      ? "bg-emerald-500"
      : analytics.adherenceScore >= 60
        ? "bg-amber-500"
        : "bg-rose-500";

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="flex min-h-screen min-w-0 flex-1 flex-col">
          <Navbar />
          <PageContainer>
            <section className="surface-page">
              <div className="pointer-events-none absolute -right-24 -top-24 h-56 w-56 rounded-full bg-emerald-500/10 blur-3xl" />
              <div className="pointer-events-none absolute -bottom-24 -left-20 h-56 w-56 rounded-full bg-emerald-400/10 blur-3xl" />

              <div className="relative">
                <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="text-xs font-medium uppercase tracking-wider text-emerald-400/90">{APP_NAME}</p>
                    <h1 className="text-2xl font-semibold tracking-tight text-zinc-100 sm:text-3xl">Dashboard</h1>
                    <p className="max-w-xl text-sm text-zinc-400">Volume, streaks, and PRs at a glance.</p>
                  </div>
                  <div className="flex shrink-0 flex-col items-stretch gap-2 sm:items-end">
                    <div
                      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold tabular-nums ${trendToneClass}`}
                      title="Trend compares recent sessions to previous window."
                    >
                      <span className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">Momentum</span>
                      <span>{trendLabel}</span>
                    </div>
                  </div>
                </div>
              </div>

              {!onboardingChecked || isLoading ? (
                <div className="mt-6 space-y-4">
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    {[0, 1, 2, 3].map((key) => (
                      <Skeleton key={key} className="h-22 w-full rounded-xl border border-zinc-800/80 bg-zinc-900/50" />
                    ))}
                  </div>
                  <div className="grid gap-3 lg:grid-cols-2">
                    <Skeleton className="h-48 w-full rounded-xl border border-zinc-800/80 bg-zinc-900/50" />
                    <Skeleton className="h-48 w-full rounded-xl border border-zinc-800/80 bg-zinc-900/50" />
                  </div>
                </div>
              ) : workouts.length === 0 ? (
                <div className="mt-6">
                  <EmptyState
                    title="No workouts yet"
                    description="Log workouts to see this page fill in."
                    actionLabel="Start workout"
                    actionHref="/workouts/start"
                  />
                </div>
              ) : (
                <div className="mt-6 space-y-6">
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <div className="surface-card group transition-colors hover:border-zinc-500/60">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Total volume</p>
                      <p className="mt-1.5 text-2xl font-semibold tabular-nums tracking-tight text-zinc-100">
                        {Math.round(analytics.totalVolume).toLocaleString()}
                        <span className="ml-1 text-base font-medium text-zinc-500">kg</span>
                      </p>
                      <p className="mt-2 text-xs text-zinc-500">
                        {analytics.workoutCount} workout{analytics.workoutCount === 1 ? "" : "s"} ·{" "}
                        {analytics.totalSets.toLocaleString()} sets logged
                      </p>
                    </div>
                    <div className="surface-card group transition-colors hover:border-zinc-500/60">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Current streak</p>
                      <p className="mt-1.5 text-2xl font-semibold tabular-nums tracking-tight text-zinc-100">
                        {analytics.currentStreak}
                        <span className="ml-1.5 text-base font-medium text-zinc-500">
                          day{analytics.currentStreak === 1 ? "" : "s"}
                        </span>
                      </p>
                      <p className="mt-2 text-xs text-zinc-500">Days in a row with a workout.</p>
                    </div>
                    <div className="surface-card group transition-colors hover:border-zinc-500/60">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Avg volume / workout</p>
                      <p className="mt-1.5 text-2xl font-semibold tabular-nums tracking-tight text-zinc-100">
                        {Math.round(analytics.avgVolumePerWorkout).toLocaleString()}
                        <span className="ml-1 text-base font-medium text-zinc-500">kg</span>
                      </p>
                      <p className="mt-2 text-xs text-zinc-500">Per logged session.</p>
                    </div>
                    <div className="surface-card group transition-colors hover:border-zinc-500/60">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Weekly adherence</p>
                        <p className={`text-lg font-semibold tabular-nums leading-none ${adherenceToneClass}`}>
                          {analytics.adherenceScore}%
                        </p>
                      </div>
                      <p className="mt-1.5 text-xs text-zinc-400">
                        {analytics.workoutsThisWeek} of {analytics.weeklyTarget} workouts this week
                      </p>
                      <div className="mt-3 h-2 overflow-hidden rounded-full bg-zinc-800">
                        <div
                          className={`h-full rounded-full transition-all ${adherenceBarClass}`}
                          style={{ width: `${Math.min(100, analytics.adherenceScore)}%` }}
                        />
                      </div>
                      <p className="mt-2 text-[11px] leading-snug text-zinc-500">
                        Last 4 weeks on goal: {analytics.weeksHitTarget}/4
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-4 lg:grid-cols-2">
                    <div className="surface-card">
                      <h2 className="text-sm font-semibold text-zinc-100">Next best set</h2>
                      <p className="mt-1 text-xs text-zinc-400">From your latest sets - rough targets only.</p>
                      {analytics.nextBestSetSuggestions.length === 0 ? (
                        <p className="mt-4 text-sm text-zinc-400">Log more sets to see suggestions.</p>
                      ) : (
                        <ul className="mt-4 max-h-[min(28rem,55vh)] space-y-2 overflow-y-auto pr-1 text-sm">
                          {analytics.nextBestSetSuggestions.map((item) => (
                            <li
                              key={item.exercise}
                              className="surface-soft border-zinc-700/50 p-3 transition-colors hover:border-emerald-900/40 hover:bg-zinc-900/90"
                            >
                              <p className="font-medium text-zinc-100">{item.exercise}</p>
                              <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-zinc-400">
                                <span className="rounded-md bg-zinc-800/80 px-2 py-0.5 font-medium text-zinc-300">
                                  Last {item.basedOnWeight} kg × {item.basedOnReps}
                                </span>
                                <span className="text-zinc-600" aria-hidden>
                                  →
                                </span>
                                <span className="rounded-md border border-emerald-800/50 bg-emerald-950/30 px-2 py-0.5 font-medium text-emerald-200/95">
                                  Next {item.suggestedWeight} kg × {item.suggestedReps}
                                </span>
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>

                    <div className="surface-card">
                      <h2 className="text-sm font-semibold text-zinc-100">Plateau watch</h2>
                      <p className="mt-1 text-xs text-zinc-400">5+ sessions with no est. 1RM bump.</p>
                      {analytics.plateauAlerts.length === 0 ? (
                        <p className="mt-4 text-sm text-zinc-400">No flags right now.</p>
                      ) : (
                        <ul className="mt-4 max-h-[min(28rem,55vh)] space-y-2 overflow-y-auto pr-1 text-sm">
                          {analytics.plateauAlerts.map((item) => (
                            <li
                              key={item.exercise}
                              className="rounded-lg border border-amber-800/40 bg-amber-950/20 p-3 transition-colors hover:border-amber-700/50"
                            >
                              <p className="font-medium text-zinc-100">{item.exercise}</p>
                              <p className="mt-1 text-xs text-amber-100/80">
                                {item.sessionsWithoutPr} sessions without PR · best est. 1RM{" "}
                                <span className="tabular-nums font-medium text-zinc-200">
                                  {item.currentBest.toFixed(1)} kg
                                </span>
                              </p>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>

                  <div className="grid gap-4 lg:grid-cols-2">
                    <div className="surface-card">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <h2 className="text-sm font-semibold text-zinc-100">PR tracking</h2>
                          <p className="mt-0.5 text-xs text-zinc-400">By est. 1RM.</p>
                        </div>
                        <Link href="/history" className="btn btn-ghost shrink-0 px-3 py-1.5 text-xs">
                          View history →
                        </Link>
                      </div>
                      {analytics.topPrs.length === 0 ? (
                        <p className="mt-4 text-sm text-zinc-400">No PR data yet.</p>
                      ) : (
                        <ul className="mt-4 space-y-2 text-sm">
                          {analytics.topPrs.map((record) => (
                            <li
                              key={record.exercise}
                              className="surface-soft border-zinc-700/50 p-3 transition-colors hover:border-zinc-600"
                            >
                              <p className="font-medium text-zinc-100">{record.exercise}</p>
                              <p className="mt-1 text-xs text-zinc-400">
                                <span className="font-medium text-emerald-300/90">
                                  Est. 1RM {record.maxEstimatedOneRepMax.toFixed(1)} kg
                                </span>
                                <span className="text-zinc-600"> · </span>
                                Top set {record.maxWeight} kg
                                <span className="text-zinc-600"> · </span>
                                {formatDateDDMMYYYY(record.achievedOn)}
                              </p>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>

                    <div className="surface-card">
                      <h2 className="text-sm font-semibold text-zinc-100">Muscle group volume</h2>
                      <p className="mt-1 text-xs text-zinc-400">Volume share by group.</p>
                      {analytics.muscleSummary.length === 0 ? (
                        <p className="mt-4 text-sm text-zinc-400">No muscle-group data yet.</p>
                      ) : (
                        <div className="surface-soft mt-4 h-72 rounded-lg p-2 sm:h-80">
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
                                formatter={(value) => [
                                  `${Number(value ?? 0).toLocaleString()} kg`,
                                  "Session volume",
                                ]}
                              />
                              <Bar dataKey="volumeRounded" name="Volume" fill={chartTheme.bar} radius={[6, 6, 0, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="surface-card">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0">
                        <h2 className="text-sm font-semibold text-zinc-100">
                          {trendMetric === "volume" ? "Volume over time" : "Estimated 1RM over time"}
                        </h2>
                        <p className="mt-1 text-xs text-zinc-400">Up to 10 recent days in range.</p>
                      </div>
                      <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center">
                        <label className="sr-only" htmlFor="dashboard-timeframe">
                          Timeframe
                        </label>
                        <select
                          id="dashboard-timeframe"
                          value={timeframe}
                          onChange={(event) => setTimeframe(event.target.value as Timeframe)}
                          className="field field-select w-full min-w-30 py-2 text-xs font-medium sm:w-auto"
                        >
                          <option value="7d">Last 7 days</option>
                          <option value="30d">Last 30 days</option>
                          <option value="90d">Last 90 days</option>
                          <option value="all">All time</option>
                        </select>
                        <div
                          className="inline-flex rounded-lg border border-zinc-700/80 bg-zinc-950/80 p-0.5 shadow-inner"
                          role="group"
                          aria-label="Trend metric"
                        >
                          <button
                            type="button"
                            onClick={() => setTrendMetric("volume")}
                            className={`rounded-md px-3 py-2 text-xs font-semibold transition-colors ${
                              trendMetric === "volume"
                                ? "bg-emerald-600 text-white shadow-sm"
                                : "text-zinc-400 hover:text-zinc-200"
                            }`}
                          >
                            Volume
                          </button>
                          <button
                            type="button"
                            onClick={() => setTrendMetric("estimated1rm")}
                            className={`rounded-md px-3 py-2 text-xs font-semibold transition-colors ${
                              trendMetric === "estimated1rm"
                                ? "bg-emerald-600 text-white shadow-sm"
                                : "text-zinc-400 hover:text-zinc-200"
                            }`}
                          >
                            Est. 1RM
                          </button>
                        </div>
                      </div>
                    </div>
                    {analytics.latestVolumePoints.length === 0 ? (
                      <p className="mt-4 text-sm text-zinc-400">No trend data in this range yet.</p>
                    ) : (
                      <div className="surface-soft mt-4 h-72 rounded-lg p-2 sm:h-80">
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
                              labelFormatter={(_, payload) =>
                                formatDateDDMMYYYY(String(payload?.[0]?.payload?.date ?? ""))
                              }
                              contentStyle={{
                                borderRadius: 8,
                                border: `1px solid ${chartTheme.tooltipBorder}`,
                                backgroundColor: chartTheme.tooltipBg,
                                color: chartTheme.text,
                              }}
                              formatter={(value) => [
                                trendMetric === "volume"
                                  ? `${Number(value ?? 0).toLocaleString()} kg`
                                  : `${Number(value ?? 0).toLocaleString()} kg`,
                                trendMetric === "volume" ? "Day volume" : "Est. 1RM (peak)",
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
