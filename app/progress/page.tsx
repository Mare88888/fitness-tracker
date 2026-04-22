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
  const [weeklyGoal, setWeeklyGoal] = useState<number>(() => getWeeklyGoal());

  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [weight, setWeight] = useState("");
  const [waist, setWaist] = useState("");
  const [chest, setChest] = useState("");
  const [leftArm, setLeftArm] = useState("");
  const [rightArm, setRightArm] = useState("");

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

  const chartData = useMemo<ProgressPoint[]>(() => {
    const byWeek = workouts.reduce<Record<string, number>>((acc, workout) => {
      const key = weekKey(workout.date);
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    }, {});

    return [...measurements]
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
        };
      })
      .filter((point): point is ProgressPoint => Boolean(point));
  }, [measurements, metric, workouts, weeklyGoal]);

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
      toast.success("Measurement saved.");
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
                <h2 className="text-sm font-semibold text-zinc-100">Add measurement</h2>
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
                    {isSaving ? "Saving..." : "Save entry"}
                  </button>
                </div>
              </section>
            </div>
          </PageContainer>
        </div>
      </div>
    </div>
  );
}
