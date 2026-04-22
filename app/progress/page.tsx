"use client";

import { Navbar } from "@/components/navbar";
import { PageContainer } from "@/components/page-container";
import { Sidebar } from "@/components/sidebar";
import { EmptyState } from "@/components/ui/empty-state";
import {
  deleteBodyMeasurement,
  getBodyMeasurements,
  upsertBodyMeasurement,
} from "@/lib/services/body-measurement-service";
import { getWorkouts } from "@/lib/services/workout-service";
import { getWeeklyGoal, subscribeWeeklyGoalChanges } from "@/lib/user-preferences";
import type { BodyMeasurement } from "@/types/body-measurement";
import type { Workout } from "@/types/workout";
import { useEffect, useMemo, useState } from "react";
import { Bar, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { toast } from "sonner";

type MetricKey = "weight" | "waist" | "chest" | "leftArm" | "rightArm";
type Timeframe = "30d" | "90d" | "all";

const metricOptions: { value: MetricKey; label: string; unit: string }[] = [
  { value: "weight", label: "Weight", unit: "kg" },
  { value: "waist", label: "Waist", unit: "cm" },
  { value: "chest", label: "Chest", unit: "cm" },
  { value: "leftArm", label: "Left arm", unit: "cm" },
  { value: "rightArm", label: "Right arm", unit: "cm" },
];

type ProgressPoint = {
  date: string;
  shortDate: string;
  metricValue: number;
  adherencePct: number;
  goalValue: number | null;
};

const PROGRESS_PREFS_KEY = "fitness_progress_prefs_v1";

type ProgressPrefs = {
  metric: MetricKey;
  timeframe: Timeframe;
  metricGoals: Record<MetricKey, string>;
};

function weekKey(dateString: string): string {
  const d = new Date(dateString);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

export default function ProgressPage() {
  const [measurements, setMeasurements] = useState<BodyMeasurement[]>([]);
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [metric, setMetric] = useState<MetricKey>("weight");
  const [timeframe, setTimeframe] = useState<Timeframe>("90d");
  const [weeklyGoal, setWeeklyGoal] = useState<number>(() => getWeeklyGoal());
  const [metricGoals, setMetricGoals] = useState<Record<MetricKey, string>>({
    weight: "",
    waist: "",
    chest: "",
    leftArm: "",
    rightArm: "",
  });
  const [editingEntryId, setEditingEntryId] = useState<number | null>(null);

  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [weight, setWeight] = useState("");
  const [waist, setWaist] = useState("");
  const [chest, setChest] = useState("");
  const [leftArm, setLeftArm] = useState("");
  const [rightArm, setRightArm] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    try {
      const raw = window.localStorage.getItem(PROGRESS_PREFS_KEY);
      if (!raw) {
        return;
      }
      const parsed = JSON.parse(raw) as Partial<ProgressPrefs>;
      if (
        parsed.metric &&
        ["weight", "waist", "chest", "leftArm", "rightArm"].includes(parsed.metric)
      ) {
        setMetric(parsed.metric as MetricKey);
      }
      if (parsed.timeframe && ["30d", "90d", "all"].includes(parsed.timeframe)) {
        setTimeframe(parsed.timeframe as Timeframe);
      }
      if (parsed.metricGoals) {
        setMetricGoals((previous) => ({
          ...previous,
          ...parsed.metricGoals,
        }));
      }
    } catch {
      // Ignore malformed local storage data.
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const prefs: ProgressPrefs = {
      metric,
      timeframe,
      metricGoals,
    };
    window.localStorage.setItem(PROGRESS_PREFS_KEY, JSON.stringify(prefs));
  }, [metric, timeframe, metricGoals]);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      try {
        const [measurementData, workoutData] = await Promise.all([
          getBodyMeasurements(),
          getWorkouts(),
        ]);
        setMeasurements(measurementData);
        setWorkouts(workoutData);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to load progress data.";
        toast.error(message);
      } finally {
        setIsLoading(false);
      }
    };
    void load();
  }, []);

  useEffect(() => {
    return subscribeWeeklyGoalChanges(() => {
      queueMicrotask(() => setWeeklyGoal(getWeeklyGoal()));
    });
  }, []);

  const fillFormFromEntry = (entry: BodyMeasurement) => {
    setDate(entry.date);
    setWeight(entry.weight != null ? String(entry.weight) : "");
    setWaist(entry.waist != null ? String(entry.waist) : "");
    setChest(entry.chest != null ? String(entry.chest) : "");
    setLeftArm(entry.leftArm != null ? String(entry.leftArm) : "");
    setRightArm(entry.rightArm != null ? String(entry.rightArm) : "");
  };

  const resetForm = () => {
    setDate(new Date().toISOString().slice(0, 10));
    setWeight("");
    setWaist("");
    setChest("");
    setLeftArm("");
    setRightArm("");
    setEditingEntryId(null);
  };

  const chartData = useMemo<ProgressPoint[]>(() => {
    const byWeek = workouts.reduce<Record<string, number>>((acc, workout) => {
      const key = weekKey(workout.date);
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    }, {});

    const selectedGoalRaw = metricGoals[metric]?.trim() ?? "";
    const selectedGoal = selectedGoalRaw ? Number(selectedGoalRaw) : null;

    const base = [...measurements]
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((entry) => {
        const value = entry[metric];
        if (value == null) {
          return null;
        }
        const week = weekKey(entry.date);
        const workoutsDone = byWeek[week] ?? 0;
        const adherencePct = Math.min(100, Math.round((workoutsDone / Math.max(1, weeklyGoal)) * 100));
        return {
          date: entry.date,
          shortDate: entry.date.slice(5),
          metricValue: Number(value),
          adherencePct,
          goalValue: selectedGoal != null && Number.isFinite(selectedGoal) && selectedGoal > 0 ? selectedGoal : null,
        };
      })
      .filter((point): point is ProgressPoint => Boolean(point));
    if (timeframe === "all" || base.length === 0) {
      return base;
    }
    const latest = new Date(base[base.length - 1].date);
    const maxDays = timeframe === "30d" ? 30 : 90;
    return base.filter((point) => {
      const pointDate = new Date(point.date);
      const diffMs = latest.getTime() - pointDate.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      return diffDays <= maxDays;
    });
  }, [measurements, metric, workouts, weeklyGoal, timeframe, metricGoals]);

  const selectedMetric = metricOptions.find((option) => option.value === metric) ?? metricOptions[0];

  const parseOptionalNumber = (value: string): number | undefined => {
    const trimmed = value.trim();
    if (!trimmed) {
      return undefined;
    }
    const parsed = Number(trimmed);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      throw new Error("Measurements must be positive numbers.");
    }
    return parsed;
  };

  const handleSave = async () => {
    if (!date) {
      toast.error("Date is required.");
      return;
    }
    let payload;
    try {
      payload = {
        date,
        weight: parseOptionalNumber(weight),
        waist: parseOptionalNumber(waist),
        chest: parseOptionalNumber(chest),
        leftArm: parseOptionalNumber(leftArm),
        rightArm: parseOptionalNumber(rightArm),
      };
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Invalid values.");
      return;
    }

    if (
      payload.weight == null &&
      payload.waist == null &&
      payload.chest == null &&
      payload.leftArm == null &&
      payload.rightArm == null
    ) {
      toast.error("Enter at least one measurement.");
      return;
    }

    setIsSaving(true);
    try {
      const saved = await upsertBodyMeasurement(payload);
      setMeasurements((previous) => {
        const withoutSameDate = previous.filter((entry) => entry.date !== saved.date);
        return [...withoutSameDate, saved].sort((a, b) => a.date.localeCompare(b.date));
      });
      toast.success(editingEntryId ? "Measurement updated." : "Measurement saved.");
      resetForm();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save measurement.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteBodyMeasurement(id);
      setMeasurements((previous) => previous.filter((entry) => entry.id !== id));
      toast.success("Measurement removed.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete measurement.");
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="flex min-h-screen min-w-0 flex-1 flex-col">
          <Navbar />
          <PageContainer>
            <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
              <section className="surface-page">
                <h1 className="text-2xl font-semibold tracking-tight text-zinc-100">Body Progress</h1>
                <div className="mt-4 space-y-4">
                  <div className="surface-card">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <h2 className="text-sm font-semibold text-zinc-100">Trend chart</h2>
                      <div className="flex flex-wrap items-center gap-2">
                        <select
                          value={metric}
                          onChange={(event) => setMetric(event.target.value as MetricKey)}
                          className="field field-select w-auto"
                        >
                          {metricOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                        <select
                          value={timeframe}
                          onChange={(event) => setTimeframe(event.target.value as Timeframe)}
                          className="field field-select w-auto"
                        >
                          <option value="30d">30d</option>
                          <option value="90d">90d</option>
                          <option value="all">All</option>
                        </select>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center gap-2">
                      <label className="text-xs text-zinc-300">Goal ({selectedMetric.unit})</label>
                      <input
                        type="number"
                        min={0}
                        step="0.1"
                        value={metricGoals[metric]}
                        onChange={(event) =>
                          setMetricGoals((previous) => ({ ...previous, [metric]: event.target.value }))
                        }
                        placeholder={`Target ${selectedMetric.label.toLowerCase()}`}
                        className="field w-44"
                      />
                    </div>
                    {isLoading ? (
                      <p className="mt-3 text-sm text-zinc-300">Loading chart...</p>
                    ) : chartData.length === 0 ? (
                      <div className="mt-3">
                        <EmptyState
                          title="No measurements yet"
                          description="Add your first entry to see trend and adherence overlays."
                        />
                      </div>
                    ) : (
                      <div className="surface-soft mt-3 h-80 p-2">
                        <ResponsiveContainer width="100%" height="100%">
                          <ComposedChart data={chartData} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                            <XAxis dataKey="shortDate" tick={{ fill: "#a1a1aa", fontSize: 12 }} />
                            <YAxis
                              yAxisId="metric"
                              tick={{ fill: "#a1a1aa", fontSize: 12 }}
                              label={{
                                value: selectedMetric.unit,
                                angle: -90,
                                position: "insideLeft",
                                fill: "#a1a1aa",
                                fontSize: 11,
                              }}
                            />
                            <YAxis
                              yAxisId="adherence"
                              orientation="right"
                              domain={[0, 100]}
                              tick={{ fill: "#a1a1aa", fontSize: 12 }}
                            />
                            <Tooltip
                              labelFormatter={(_, payload) => payload?.[0]?.payload?.date ?? ""}
                              formatter={(value, name) => {
                                if (name === "adherencePct") {
                                  return [`${value}%`, "Adherence"];
                                }
                                if (name === "goalValue") {
                                  return [`${value} ${selectedMetric.unit}`, `${selectedMetric.label} goal`];
                                }
                                return [`${value} ${selectedMetric.unit}`, selectedMetric.label];
                              }}
                              contentStyle={{
                                borderRadius: 8,
                                border: "1px solid #3f3f46",
                                backgroundColor: "#18181b",
                                color: "#e4e4e7",
                              }}
                            />
                            <Bar
                              yAxisId="adherence"
                              dataKey="adherencePct"
                              fill="#166534"
                              name="adherencePct"
                              radius={[4, 4, 0, 0]}
                            />
                            <Line
                              yAxisId="metric"
                              type="monotone"
                              dataKey="metricValue"
                              stroke="#22c55e"
                              strokeWidth={2}
                              dot={{ r: 3 }}
                              activeDot={{ r: 5 }}
                              name="metricValue"
                            />
                            <Line
                              yAxisId="metric"
                              type="monotone"
                              dataKey="goalValue"
                              stroke="#f59e0b"
                              strokeWidth={2}
                              strokeDasharray="6 4"
                              dot={false}
                              name="goalValue"
                            />
                          </ComposedChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </div>

                  <div className="surface-card">
                    <h2 className="text-sm font-semibold text-zinc-100">Recent entries</h2>
                    {measurements.length === 0 ? (
                      <p className="mt-2 text-sm text-zinc-300">No saved entries.</p>
                    ) : (
                      <ul className="mt-2 space-y-2">
                        {[...measurements]
                          .sort((a, b) => b.date.localeCompare(a.date))
                          .slice(0, 8)
                          .map((entry) => (
                            <li key={entry.id} className="surface-soft flex items-center justify-between gap-3 px-3 py-2 text-sm">
                              <div className="text-zinc-200">
                                <p className="font-medium">{entry.date}</p>
                                <p className="text-xs text-zinc-400">
                                  {[
                                    entry.weight != null ? `W ${entry.weight}kg` : null,
                                    entry.waist != null ? `Waist ${entry.waist}cm` : null,
                                    entry.chest != null ? `Chest ${entry.chest}cm` : null,
                                    entry.leftArm != null ? `L arm ${entry.leftArm}cm` : null,
                                    entry.rightArm != null ? `R arm ${entry.rightArm}cm` : null,
                                  ]
                                    .filter(Boolean)
                                    .join(" | ")}
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingEntryId(entry.id);
                                  fillFormFromEntry(entry);
                                }}
                                className="btn btn-secondary px-2 py-1 text-xs"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDelete(entry.id)}
                                className="btn btn-danger px-2 py-1 text-xs"
                              >
                                Delete
                              </button>
                            </li>
                          ))}
                      </ul>
                    )}
                  </div>
                </div>
              </section>

              <section className="surface-card xl:sticky xl:top-6">
                <h2 className="text-sm font-semibold text-zinc-100">
                  {editingEntryId ? "Edit measurement" : "Add measurement"}
                </h2>
                <div className="mt-3 space-y-3">
                  <input type="date" value={date} onChange={(event) => setDate(event.target.value)} className="field" />
                  <input
                    type="number"
                    step="0.1"
                    min={0}
                    value={weight}
                    onChange={(event) => setWeight(event.target.value)}
                    className="field"
                    placeholder="Weight (kg)"
                  />
                  <input
                    type="number"
                    step="0.1"
                    min={0}
                    value={waist}
                    onChange={(event) => setWaist(event.target.value)}
                    className="field"
                    placeholder="Waist (cm)"
                  />
                  <input
                    type="number"
                    step="0.1"
                    min={0}
                    value={chest}
                    onChange={(event) => setChest(event.target.value)}
                    className="field"
                    placeholder="Chest (cm)"
                  />
                  <input
                    type="number"
                    step="0.1"
                    min={0}
                    value={leftArm}
                    onChange={(event) => setLeftArm(event.target.value)}
                    className="field"
                    placeholder="Left arm (cm)"
                  />
                  <input
                    type="number"
                    step="0.1"
                    min={0}
                    value={rightArm}
                    onChange={(event) => setRightArm(event.target.value)}
                    className="field"
                    placeholder="Right arm (cm)"
                  />
                  <button type="button" onClick={handleSave} disabled={isSaving} className="btn btn-primary w-full">
                    {isSaving ? "Saving..." : editingEntryId ? "Update entry" : "Save entry"}
                  </button>
                  {editingEntryId && (
                    <button type="button" onClick={resetForm} className="btn btn-secondary w-full">
                      Cancel edit
                    </button>
                  )}
                </div>
              </section>
            </div>
          </PageContainer>
        </div>
      </div>
    </div>
  );
}
