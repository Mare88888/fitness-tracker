"use client";

import { Navbar } from "@/components/navbar";
import { PageContainer } from "@/components/page-container";
import { Sidebar } from "@/components/sidebar";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { APP_NAME } from "@/lib/constants";
import { resolveExerciseMuscle } from "@/lib/exercise-library";
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

export default function Home() {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [timeframe, setTimeframe] = useState<Timeframe>("30d");
  const [trendMetric, setTrendMetric] = useState<TrendMetric>("volume");
  const [isDarkMode, setIsDarkMode] = useState(false);

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

  const analytics = useMemo(() => {
    let totalVolume = 0;
    let totalSets = 0;
    const prByExercise = new Map<string, PersonalRecord>();
    const volumeByDate = new Map<string, number>();
    const oneRepMaxByDate = new Map<string, number>();
    const volumeByMuscleGroup = new Map<string, number>();

    for (const workout of workouts) {
      const workoutDate = workout.date;
      for (const exercise of workout.exercises) {
        const normalizedName = normalizeExerciseName(exercise.name);
        const displayName = exercise.name.trim() || "Unnamed exercise";
        const group = resolveExerciseMuscle(displayName);

        for (const set of exercise.sets) {
          const volume = Math.max(0, set.weight) * Math.max(0, set.reps);
          totalVolume += volume;
          totalSets += 1;
          volumeByDate.set(workoutDate, (volumeByDate.get(workoutDate) ?? 0) + volume);
          volumeByMuscleGroup.set(group, (volumeByMuscleGroup.get(group) ?? 0) + volume);

          const oneRepMax = estimateOneRepMax(set.weight, set.reps);
          oneRepMaxByDate.set(workoutDate, Math.max(oneRepMaxByDate.get(workoutDate) ?? 0, oneRepMax));
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
    };
  }, [timeframe, trendMetric, workouts]);

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

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="flex min-h-screen min-w-0 flex-1 flex-col">
          <Navbar />
          <PageContainer>
            <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
              <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
                {APP_NAME} Analytics Dashboard
              </h1>
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                Track PRs, workout volume trends, streaks, and muscle-group focus.
              </p>

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
                    <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800/60">
                      <p className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Total volume</p>
                      <p className="mt-1 text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
                        {Math.round(analytics.totalVolume).toLocaleString()}
                      </p>
                    </div>
                    <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800/60">
                      <p className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Current streak</p>
                      <p className="mt-1 text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
                        {analytics.currentStreak} day{analytics.currentStreak === 1 ? "" : "s"}
                      </p>
                    </div>
                    <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800/60">
                      <p className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Avg volume / workout</p>
                      <p className="mt-1 text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
                        {Math.round(analytics.avgVolumePerWorkout).toLocaleString()}
                      </p>
                    </div>
                    <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800/60">
                      <p className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Volume trend</p>
                      <p className="mt-1 text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
                        {analytics.trendPct >= 0 ? "+" : ""}
                        {analytics.trendPct.toFixed(1)}%
                      </p>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        Recent 5 sessions vs previous ({trendMetric === "volume" ? "volume" : "estimated 1RM"})
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-4 lg:grid-cols-2">
                    <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800/60">
                      <div className="flex items-center justify-between">
                        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">PR tracking</h2>
                        <Link href="/history" className="text-xs text-zinc-600 underline-offset-4 hover:underline dark:text-zinc-400">
                          View history
                        </Link>
                      </div>
                      {analytics.topPrs.length === 0 ? (
                        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">No PR data yet.</p>
                      ) : (
                        <ul className="mt-2 space-y-2 text-sm">
                          {analytics.topPrs.map((record) => (
                            <li key={record.exercise} className="rounded-md border border-zinc-200 bg-white p-3 dark:border-zinc-700 dark:bg-zinc-900">
                              <p className="font-medium text-zinc-900 dark:text-zinc-100">{record.exercise}</p>
                              <p className="text-zinc-600 dark:text-zinc-400">
                                Est. 1RM {record.maxEstimatedOneRepMax.toFixed(1)} | Top set {record.maxWeight} kg | {record.achievedOn}
                              </p>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>

                    <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800/60">
                      <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Muscle-group summary</h2>
                      {analytics.muscleSummary.length === 0 ? (
                        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">No muscle-group data yet.</p>
                      ) : (
                        <div className="mt-2 h-72 rounded-md border border-zinc-200 bg-white p-2 dark:border-zinc-700 dark:bg-zinc-900">
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
                                formatter={(value: number) => [`${value.toLocaleString()} volume`, "Volume"]}
                              />
                              <Bar dataKey="volumeRounded" name="Volume" fill={chartTheme.bar} radius={[6, 6, 0, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800/60">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                        {trendMetric === "volume" ? "Volume over time" : "Estimated 1RM over time"}
                      </h2>
                      <div className="flex flex-wrap items-center gap-2">
                        <select
                          value={timeframe}
                          onChange={(event) => setTimeframe(event.target.value as Timeframe)}
                          className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs text-zinc-800 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
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
                            className={`px-2 py-1 text-xs ${
                              trendMetric === "volume"
                                ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                                : "bg-white text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
                            }`}
                          >
                            Volume
                          </button>
                          <button
                            type="button"
                            onClick={() => setTrendMetric("estimated1rm")}
                            className={`px-2 py-1 text-xs ${
                              trendMetric === "estimated1rm"
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
                      <div className="mt-2 h-80 rounded-md border border-zinc-200 bg-white p-2 dark:border-zinc-700 dark:bg-zinc-900">
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
                              formatter={(value: number) => [
                                trendMetric === "volume"
                                  ? `${value.toLocaleString()} volume`
                                  : `${value.toLocaleString()} est. 1RM`,
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
