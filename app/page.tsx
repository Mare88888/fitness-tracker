"use client";

import { Navbar } from "@/components/navbar";
import { PageContainer } from "@/components/page-container";
import { Sidebar } from "@/components/sidebar";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { APP_NAME } from "@/lib/constants";
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

type PersonalRecord = {
  exercise: string;
  maxWeight: number;
  maxEstimatedOneRepMax: number;
  achievedOn: string;
};

type VolumePoint = {
  date: string;
  totalVolume: number;
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

function mapExerciseToMuscleGroup(exerciseName: string): string {
  const name = exerciseName.toLowerCase();
  if (/(bench|chest|incline|fly|pec|push up)/.test(name)) return "Chest";
  if (/(row|pull up|lat|deadlift|back|pulldown)/.test(name)) return "Back";
  if (/(squat|lunge|leg press|hamstring|quad|calf)/.test(name)) return "Legs";
  if (/(press|shoulder|lateral raise|rear delt|overhead)/.test(name)) return "Shoulders";
  if (/(curl|bicep)/.test(name)) return "Biceps";
  if (/(tricep|skull|dip|pushdown)/.test(name)) return "Triceps";
  if (/(core|abs|plank|crunch)/.test(name)) return "Core";
  return "Other";
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

  const analytics = useMemo(() => {
    let totalVolume = 0;
    let totalSets = 0;
    const prByExercise = new Map<string, PersonalRecord>();
    const volumeByDate = new Map<string, number>();
    const volumeByMuscleGroup = new Map<string, number>();

    for (const workout of workouts) {
      const workoutDate = workout.date;
      for (const exercise of workout.exercises) {
        const normalizedName = normalizeExerciseName(exercise.name);
        const displayName = exercise.name.trim() || "Unnamed exercise";
        const group = mapExerciseToMuscleGroup(displayName);

        for (const set of exercise.sets) {
          const volume = Math.max(0, set.weight) * Math.max(0, set.reps);
          totalVolume += volume;
          totalSets += 1;
          volumeByDate.set(workoutDate, (volumeByDate.get(workoutDate) ?? 0) + volume);
          volumeByMuscleGroup.set(group, (volumeByMuscleGroup.get(group) ?? 0) + volume);

          const oneRepMax = estimateOneRepMax(set.weight, set.reps);
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
        shortDate: date.slice(5),
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const latestVolumePoints = sortedVolumeTrend.slice(-10);

    const previousWindow = latestVolumePoints.slice(0, Math.max(0, latestVolumePoints.length - 5));
    const recentWindow = latestVolumePoints.slice(-5);

    const previousAvg =
      previousWindow.length === 0
        ? 0
        : previousWindow.reduce((sum, point) => sum + point.totalVolume, 0) / previousWindow.length;
    const recentAvg =
      recentWindow.length === 0
        ? 0
        : recentWindow.reduce((sum, point) => sum + point.totalVolume, 0) / recentWindow.length;
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
  }, [workouts]);

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
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">Recent 5 sessions vs previous</p>
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
                              <CartesianGrid strokeDasharray="3 3" stroke="#d4d4d8" />
                              <XAxis dataKey="group" tick={{ fill: "#71717a", fontSize: 12 }} interval={0} angle={-20} textAnchor="end" height={50} />
                              <YAxis tick={{ fill: "#71717a", fontSize: 12 }} />
                              <Tooltip
                                contentStyle={{ borderRadius: 8, border: "1px solid #d4d4d8" }}
                                formatter={(value: number) => [`${value.toLocaleString()} volume`, "Volume"]}
                              />
                              <Bar dataKey="volumeRounded" name="Volume" fill="#2563eb" radius={[6, 6, 0, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800/60">
                    <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Volume over time</h2>
                    {analytics.latestVolumePoints.length === 0 ? (
                      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">No volume trend yet.</p>
                    ) : (
                      <div className="mt-2 h-80 rounded-md border border-zinc-200 bg-white p-2 dark:border-zinc-700 dark:bg-zinc-900">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart
                            data={analytics.latestVolumePoints.map((point) => ({
                              ...point,
                              totalVolumeRounded: Math.round(point.totalVolume),
                            }))}
                            margin={{ top: 8, right: 8, left: 8, bottom: 8 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" stroke="#d4d4d8" />
                            <XAxis dataKey="shortDate" tick={{ fill: "#71717a", fontSize: 12 }} />
                            <YAxis tick={{ fill: "#71717a", fontSize: 12 }} />
                            <Tooltip
                              labelFormatter={(_, payload) => payload?.[0]?.payload?.date ?? ""}
                              contentStyle={{ borderRadius: 8, border: "1px solid #d4d4d8" }}
                              formatter={(value: number) => [`${value.toLocaleString()} volume`, "Volume"]}
                            />
                            <Line
                              type="monotone"
                              dataKey="totalVolumeRounded"
                              stroke="#16a34a"
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
