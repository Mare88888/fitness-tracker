"use client";

import { Navbar } from "@/components/navbar";
import { PageContainer } from "@/components/page-container";
import { Sidebar } from "@/components/sidebar";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDateDDMMYYYY } from "@/lib/date-format";
import {
  deleteBodyMeasurement,
  getBodyMeasurements,
  upsertBodyMeasurement,
} from "@/lib/services/body-measurement-service";
import {
  createProgressPhoto,
  deleteProgressPhoto,
  getProgressPhotos,
  patchProgressPhotoLinkedMeasurement,
} from "@/lib/services/progress-photo-service";
import { getWorkouts } from "@/lib/services/workout-service";
import { getWeeklyGoal, subscribeWeeklyGoalChanges } from "@/lib/user-preferences";
import type { BodyMeasurement } from "@/types/body-measurement";
import type { ProgressPhoto } from "@/types/progress-photo";
import type { Workout } from "@/types/workout";
import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  ComposedChart,
  Line,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
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
  displayDate: string;
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

type MuscleDistributionTimeframe = "7d" | "30d" | "90d";
type MuscleBucket = "Back" | "Chest" | "Core" | "Shoulders" | "Arms" | "Legs";

type MuscleDistributionPoint = {
  muscle: MuscleBucket;
  current: number;
  previous: number;
};

type DistributionSummary = {
  workouts: number;
  durationMinutes: number;
  volumeKg: number;
  sets: number;
};

function weekKey(dateString: string): string {
  const d = new Date(dateString);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

function normalizeMuscle(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

function mapToMuscleBucket(muscleGroup: string): MuscleBucket {
  const key = normalizeMuscle(muscleGroup);
  if (key.includes("chest") || key.includes("pec")) return "Chest";
  if (key.includes("shoulder") || key.includes("delt")) return "Shoulders";
  if (key.includes("bicep") || key.includes("tricep") || key.includes("arm") || key.includes("forearm")) return "Arms";
  if (
    key.includes("quad") ||
    key.includes("hamstring") ||
    key.includes("glute") ||
    key.includes("calf") ||
    key.includes("leg")
  ) {
    return "Legs";
  }
  if (key.includes("core") || key.includes("ab") || key.includes("oblique")) return "Core";
  if (key.includes("back") || key.includes("lat") || key.includes("trap") || key.includes("rear")) return "Back";
  return "Back";
}

function inferMuscleFromExerciseName(exerciseName: string): MuscleBucket {
  const key = exerciseName.trim().toLowerCase();
  if (key.includes("bench") || key.includes("fly")) return "Chest";
  if (key.includes("row") || key.includes("pulldown") || key.includes("pull up")) return "Back";
  if (key.includes("curl") || key.includes("tricep") || key.includes("dip") || key.includes("skull")) return "Arms";
  if (key.includes("press")) return "Shoulders";
  if (key.includes("squat") || key.includes("lunge") || key.includes("leg extension")) return "Legs";
  if (key.includes("rdl") || key.includes("deadlift") || key.includes("leg curl")) return "Legs";
  if (key.includes("hip thrust") || key.includes("glute") || key.includes("calf")) return "Legs";
  if (key.includes("crunch") || key.includes("plank") || key.includes("sit up")) return "Core";
  return "Back";
}

function summarizeWorkouts(workouts: Workout[]): DistributionSummary {
  const summary: DistributionSummary = {
    workouts: workouts.length,
    durationMinutes: 0,
    volumeKg: 0,
    sets: 0,
  };
  for (const workout of workouts) {
    let workoutSets = 0;
    for (const exercise of workout.exercises) {
      for (const set of exercise.sets) {
        workoutSets += 1;
        summary.volumeKg += Math.max(0, set.weight) * Math.max(0, set.reps ?? 0);
      }
    }
    summary.sets += workoutSets;
    summary.durationMinutes += Math.max(15, workoutSets * 2);
  }
  return summary;
}

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) {
    return `${m}m`;
  }
  return `${h}h ${m}m`;
}

function formatDelta(value: number, suffix = ""): string {
  const rounded = Math.round(value);
  const sign = rounded > 0 ? "+" : "";
  return `${sign}${rounded}${suffix}`;
}

function toDateInputValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatBodyMeasurementSummary(entry: BodyMeasurement): string {
  const parts = [
    entry.weight != null ? `W ${entry.weight}kg` : null,
    entry.waist != null ? `Waist ${entry.waist}cm` : null,
    entry.chest != null ? `Chest ${entry.chest}cm` : null,
    entry.leftArm != null ? `L arm ${entry.leftArm}cm` : null,
    entry.rightArm != null ? `R arm ${entry.rightArm}cm` : null,
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(" | ") : "No values recorded";
}

export default function ProgressPage() {
  const [measurements, setMeasurements] = useState<BodyMeasurement[]>([]);
  const [photos, setPhotos] = useState<ProgressPhoto[]>([]);
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingPhoto, setIsSavingPhoto] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [metric, setMetric] = useState<MetricKey>("weight");
  const [timeframe, setTimeframe] = useState<Timeframe>("90d");
  const [muscleTimeframe, setMuscleTimeframe] = useState<MuscleDistributionTimeframe>("30d");
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
  const [photoCapturedAt, setPhotoCapturedAt] = useState(() => toDateInputValue(new Date()));
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const [photoNote, setPhotoNote] = useState("");
  const [photoLinkedMeasurementId, setPhotoLinkedMeasurementId] = useState("");
  const [expandedPhotoIds, setExpandedPhotoIds] = useState<Set<number>>(new Set());
  const [photoLinkDraftByPhotoId, setPhotoLinkDraftByPhotoId] = useState<Partial<Record<number, string>>>({});
  const [updatingPhotoLinkId, setUpdatingPhotoLinkId] = useState<number | null>(null);

  const measurementsSortedForPhotoLink = useMemo(
    () => [...measurements].sort((a, b) => b.date.localeCompare(a.date)),
    [measurements],
  );

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
        const [measurementData, workoutData, photoData] = await Promise.all([
          getBodyMeasurements(),
          getWorkouts(),
          getProgressPhotos(),
        ]);
        setMeasurements(measurementData);
        setWorkouts(workoutData);
        setPhotos(photoData);
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

  useEffect(() => {
    setIsMounted(true);
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
          displayDate: entry.formattedDate ?? formatDateDDMMYYYY(entry.date),
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

  const muscleDistribution = useMemo(() => {
    const periodDays = muscleTimeframe === "7d" ? 7 : muscleTimeframe === "30d" ? 30 : 90;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const currentStart = new Date(today);
    currentStart.setDate(today.getDate() - (periodDays - 1));
    const previousEnd = new Date(currentStart);
    previousEnd.setDate(currentStart.getDate() - 1);
    const previousStart = new Date(previousEnd);
    previousStart.setDate(previousEnd.getDate() - (periodDays - 1));

    const baseBuckets: Record<MuscleBucket, number> = {
      Back: 0,
      Chest: 0,
      Core: 0,
      Shoulders: 0,
      Arms: 0,
      Legs: 0,
    };
    const currentBuckets = { ...baseBuckets };
    const previousBuckets = { ...baseBuckets };
    const currentWindow: Workout[] = [];
    const previousWindow: Workout[] = [];

    for (const workout of workouts) {
      const workoutDate = new Date(workout.date);
      workoutDate.setHours(0, 0, 0, 0);
      const isCurrent = workoutDate >= currentStart && workoutDate <= today;
      const isPrevious = workoutDate >= previousStart && workoutDate <= previousEnd;
      if (!isCurrent && !isPrevious) continue;

      if (isCurrent) currentWindow.push(workout);
      if (isPrevious) previousWindow.push(workout);

      for (const exercise of workout.exercises) {
        const bucket = exercise.muscleGroup
          ? mapToMuscleBucket(exercise.muscleGroup)
          : inferMuscleFromExerciseName(exercise.name);
        const setCount = Math.max(1, exercise.sets.length);
        if (isCurrent) {
          currentBuckets[bucket] += setCount;
        }
        if (isPrevious) {
          previousBuckets[bucket] += setCount;
        }
      }
    }

    const points: MuscleDistributionPoint[] = (Object.keys(baseBuckets) as MuscleBucket[]).map((muscle) => ({
      muscle,
      current: currentBuckets[muscle],
      previous: previousBuckets[muscle],
    }));

    return {
      points,
      currentSummary: summarizeWorkouts(currentWindow),
      previousSummary: summarizeWorkouts(previousWindow),
    };
  }, [muscleTimeframe, workouts]);

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

  const resetChartPreferences = () => {
    setMetric("weight");
    setTimeframe("90d");
    setMetricGoals({
      weight: "",
      waist: "",
      chest: "",
      leftArm: "",
      rightArm: "",
    });
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(PROGRESS_PREFS_KEY);
    }
    toast.success("Chart preferences reset.");
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

  const handlePhotoFileChange = async (file: File | null) => {
    if (!file) {
      setPhotoDataUrl(null);
      return;
    }
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file.");
      return;
    }
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result ?? ""));
      reader.onerror = () => reject(new Error("Failed to read photo."));
      reader.readAsDataURL(file);
    });
    setPhotoDataUrl(dataUrl);
  };

  const handleSavePhoto = async () => {
    if (!photoDataUrl) {
      toast.error("Please select a photo.");
      return;
    }
    if (!photoCapturedAt) {
      toast.error("Photo date is required.");
      return;
    }
    setIsSavingPhoto(true);
    try {
      const linkedNumeric =
        photoLinkedMeasurementId.trim() === "" ? undefined : Number(photoLinkedMeasurementId);
      const saved = await createProgressPhoto({
        capturedAt: photoCapturedAt,
        imageDataUrl: photoDataUrl,
        note: photoNote.trim() || undefined,
        ...(linkedNumeric != null && !Number.isNaN(linkedNumeric)
          ? { bodyMeasurementId: linkedNumeric }
          : {}),
      });
      setPhotos((previous) => [saved, ...previous].sort((a, b) => b.capturedAt.localeCompare(a.capturedAt)));
      setExpandedPhotoIds((previous) => {
        const next = new Set(previous);
        next.add(saved.id);
        return next;
      });
      setPhotoDataUrl(null);
      setPhotoNote("");
      setPhotoLinkedMeasurementId("");
      setPhotoCapturedAt(toDateInputValue(new Date()));
      toast.success("Progress photo saved.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save progress photo.");
    } finally {
      setIsSavingPhoto(false);
    }
  };

  const handleDeletePhoto = async (id: number) => {
    try {
      await deleteProgressPhoto(id);
      setPhotos((previous) => previous.filter((entry) => entry.id !== id));
      setExpandedPhotoIds((previous) => {
        if (!previous.has(id)) {
          return previous;
        }
        const next = new Set(previous);
        next.delete(id);
        return next;
      });
      setPhotoLinkDraftByPhotoId((previous) => {
        const next = { ...previous };
        delete next[id];
        return next;
      });
      toast.success("Progress photo removed.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete progress photo.");
    }
  };

  const handleSavePhotoLinkedMeasurement = async (photo: ProgressPhoto) => {
    const savedId =
      photo.bodyMeasurementId != null && !Number.isNaN(photo.bodyMeasurementId)
        ? String(photo.bodyMeasurementId)
        : "";
    const draft =
      photoLinkDraftByPhotoId[photo.id] !== undefined ? photoLinkDraftByPhotoId[photo.id]! : savedId;
    const linkedNumeric = draft.trim() === "" ? null : Number(draft);
    if (linkedNumeric != null && Number.isNaN(linkedNumeric)) {
      toast.error("Invalid measurement selection.");
      return;
    }
    setUpdatingPhotoLinkId(photo.id);
    try {
      const updated = await patchProgressPhotoLinkedMeasurement(photo.id, {
        bodyMeasurementId: linkedNumeric,
      });
      setPhotos((previous) =>
        previous.map((entry) => (entry.id === photo.id ? updated : entry)),
      );
      setPhotoLinkDraftByPhotoId((previous) => {
        const next = { ...previous };
        delete next[photo.id];
        return next;
      });
      toast.success(linkedNumeric == null ? "Measurement link removed." : "Measurement link updated.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update measurement link.");
    } finally {
      setUpdatingPhotoLinkId(null);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="flex min-h-screen min-w-0 flex-1 flex-col">
          <Navbar />
          <PageContainer>
            <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
              <section className="surface-page">
                <h1 className="text-2xl font-semibold tracking-tight text-zinc-100">Body Progress</h1>
                <div className="mt-4 space-y-4">
                  <div className="surface-card">
                    <div className="space-y-3">
                      <h2 className="text-sm font-semibold text-zinc-100">Trend chart</h2>
                      <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-[minmax(220px,340px)_140px_110px_auto] xl:items-end">
                        <div>
                          <label className="mb-1 block text-xs font-medium text-zinc-300">Goal ({selectedMetric.unit})</label>
                          <input
                            type="number"
                            min={0}
                            step="0.1"
                            value={metricGoals[metric]}
                            onChange={(event) =>
                              setMetricGoals((previous) => ({ ...previous, [metric]: event.target.value }))
                            }
                            placeholder={`Target ${selectedMetric.label.toLowerCase()}`}
                            className="field"
                          />
                        </div>
                        <select
                          value={metric}
                          onChange={(event) => setMetric(event.target.value as MetricKey)}
                          className="field field-select"
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
                          className="field field-select"
                        >
                          <option value="30d">30d</option>
                          <option value="90d">90d</option>
                          <option value="all">All</option>
                        </select>
                        <button type="button" onClick={resetChartPreferences} className="btn btn-secondary whitespace-nowrap">
                          Reset preferences
                        </button>
                      </div>
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
                            <XAxis dataKey="displayDate" tick={{ fill: "#a1a1aa", fontSize: 12 }} />
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
                              labelFormatter={(_, payload) =>
                                formatDateDDMMYYYY(String(payload?.[0]?.payload?.date ?? ""))
                              }
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
                    <h2 className="text-sm font-semibold text-zinc-100">All measurements over time</h2>
                    {measurements.length === 0 ? (
                      <p className="mt-2 text-sm text-zinc-300">No saved entries.</p>
                    ) : (
                      <div className="surface-soft mt-3 overflow-x-auto">
                        <table className="min-w-full text-sm">
                          <thead>
                            <tr className="border-b border-zinc-800 text-left text-xs uppercase tracking-wide text-zinc-400">
                              <th className="px-3 py-2">Date</th>
                              <th className="px-3 py-2">Weight (kg)</th>
                              <th className="px-3 py-2">Waist (cm)</th>
                              <th className="px-3 py-2">Chest (cm)</th>
                              <th className="px-3 py-2">Left arm (cm)</th>
                              <th className="px-3 py-2">Right arm (cm)</th>
                            </tr>
                          </thead>
                          <tbody>
                            {[...measurements]
                              .sort((a, b) => a.date.localeCompare(b.date))
                              .map((entry) => (
                                <tr key={`all-${entry.id}`} className="border-b border-zinc-900/80 text-zinc-200">
                                  <td className="px-3 py-2 font-medium">{entry.formattedDate ?? formatDateDDMMYYYY(entry.date)}</td>
                                  <td className="px-3 py-2">{entry.weight ?? "-"}</td>
                                  <td className="px-3 py-2">{entry.waist ?? "-"}</td>
                                  <td className="px-3 py-2">{entry.chest ?? "-"}</td>
                                  <td className="px-3 py-2">{entry.leftArm ?? "-"}</td>
                                  <td className="px-3 py-2">{entry.rightArm ?? "-"}</td>
                                </tr>
                              ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  <div className="surface-card">
                    <div className="flex items-start justify-between gap-3">
                      <h2 className="text-sm font-semibold text-zinc-100">Muscle distribution</h2>
                      <select
                        value={muscleTimeframe}
                        onChange={(event) => setMuscleTimeframe(event.target.value as MuscleDistributionTimeframe)}
                        className="field field-select w-[140px]"
                      >
                        <option value="7d">Last 7 days</option>
                        <option value="30d">Last 30 days</option>
                        <option value="90d">Last 90 days</option>
                      </select>
                    </div>
                    <div className="surface-soft mt-3 h-72 p-3">
                      {isMounted ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <RadarChart data={muscleDistribution.points} margin={{ top: 8, right: 12, left: 12, bottom: 24 }}>
                            <PolarGrid stroke="#3f3f46" />
                            <PolarAngleAxis dataKey="muscle" tick={{ fill: "#a1a1aa", fontSize: 12 }} />
                            <PolarRadiusAxis tick={false} axisLine={false} />
                            <Tooltip
                              formatter={(value, name) => [value, name === "current" ? "Current" : "Previous"]}
                              contentStyle={{
                                borderRadius: 8,
                                border: "1px solid #3f3f46",
                                backgroundColor: "#18181b",
                                color: "#e4e4e7",
                              }}
                            />
                            <Radar
                              name="previous"
                              dataKey="previous"
                              stroke="#71717a"
                              fill="#52525b"
                              fillOpacity={0.2}
                              strokeWidth={1.5}
                            />
                            <Radar
                              name="current"
                              dataKey="current"
                              stroke="#3b82f6"
                              fill="#3b82f6"
                              fillOpacity={0.3}
                              strokeWidth={2}
                            />
                          </RadarChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="flex h-full items-center justify-center text-sm text-zinc-400">Loading chart...</div>
                      )}
                    </div>
                    <div className="mt-3 flex items-center justify-center gap-5 text-sm">
                      <span className="inline-flex items-center gap-2 text-blue-400">
                        <span className="h-3 w-3 bg-blue-500" />
                        Current
                      </span>
                      <span className="inline-flex items-center gap-2 text-zinc-400">
                        <span className="h-3 w-3 bg-zinc-500" />
                        Previous
                      </span>
                    </div>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                      <div className="surface-soft px-3 py-2">
                        <p className="text-xs text-zinc-400">Workouts</p>
                        <p className="text-xl font-semibold text-zinc-100">{muscleDistribution.currentSummary.workouts}</p>
                        <p className="text-xs text-emerald-400">
                          {formatDelta(muscleDistribution.currentSummary.workouts - muscleDistribution.previousSummary.workouts)}
                        </p>
                      </div>
                      <div className="surface-soft px-3 py-2">
                        <p className="text-xs text-zinc-400">Duration</p>
                        <p className="text-xl font-semibold text-zinc-100">
                          {formatDuration(muscleDistribution.currentSummary.durationMinutes)}
                        </p>
                        <p className="text-xs text-emerald-400">
                          {formatDelta(
                            muscleDistribution.currentSummary.durationMinutes -
                            muscleDistribution.previousSummary.durationMinutes,
                            "m"
                          )}
                        </p>
                      </div>
                      <div className="surface-soft px-3 py-2">
                        <p className="text-xs text-zinc-400">Volume</p>
                        <p className="text-xl font-semibold text-zinc-100">
                          {Math.round(muscleDistribution.currentSummary.volumeKg).toLocaleString()} kg
                        </p>
                        <p className="text-xs text-emerald-400">
                          {formatDelta(
                            muscleDistribution.currentSummary.volumeKg - muscleDistribution.previousSummary.volumeKg,
                            " kg"
                          )}
                        </p>
                      </div>
                      <div className="surface-soft px-3 py-2">
                        <p className="text-xs text-zinc-400">Sets</p>
                        <p className="text-xl font-semibold text-zinc-100">{muscleDistribution.currentSummary.sets}</p>
                        <p className="text-xs text-emerald-400">
                          {formatDelta(muscleDistribution.currentSummary.sets - muscleDistribution.previousSummary.sets)}
                        </p>
                      </div>
                    </div>
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
                                <p className="font-medium">{entry.formattedDate ?? formatDateDDMMYYYY(entry.date)}</p>
                                <p className="text-xs text-zinc-400">{formatBodyMeasurementSummary(entry)}</p>
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

                  <div className="surface-card">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h2 className="text-sm font-semibold text-zinc-100">Progress photos</h2>
                      <span className="text-xs text-zinc-400">{photos.length} total - click date to expand</span>
                    </div>
                    {photos.length === 0 ? (
                      <p className="mt-2 text-sm text-zinc-300">No photos yet. Add your first check-in on the right.</p>
                    ) : (
                      <ul className="mt-3 space-y-2">
                        {photos.map((photo) => {
                          const isExpanded = expandedPhotoIds.has(photo.id);
                          const savedMeasurementLink =
                            photo.bodyMeasurementId != null ? String(photo.bodyMeasurementId) : "";
                          const draftMeasurementLink =
                            photoLinkDraftByPhotoId[photo.id] !== undefined
                              ? photoLinkDraftByPhotoId[photo.id]
                              : savedMeasurementLink;
                          const measurementLinkUnchanged =
                            draftMeasurementLink === savedMeasurementLink;
                          return (
                            <li
                              key={photo.id}
                              className="surface-soft px-3 py-2 text-xs text-zinc-300"
                            >
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setExpandedPhotoIds((previous) => {
                                      const next = new Set(previous);
                                      if (next.has(photo.id)) {
                                        next.delete(photo.id);
                                      } else {
                                        next.add(photo.id);
                                      }
                                      return next;
                                    })
                                  }
                                  className="cursor-pointer text-left text-sm font-semibold text-emerald-300 hover:underline"
                                >
                                  {formatDateDDMMYYYY(photo.capturedAt)}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeletePhoto(photo.id)}
                                  className="btn btn-danger px-2 py-1 text-xs"
                                >
                                  Delete
                                </button>
                              </div>
                              {photo.note?.trim() ? (
                                <p className="mt-1 text-[13px] text-zinc-400">{photo.note}</p>
                              ) : null}
                              {isExpanded ? (
                                <>
                                  <img
                                    src={photo.imageDataUrl}
                                    alt={`Progress photo ${formatDateDDMMYYYY(photo.capturedAt)}`}
                                    className="mt-2 h-64 w-full rounded-md object-cover"
                                  />
                                  <div className="mt-2 space-y-2">
                                    <div className="flex flex-wrap items-end gap-2">
                                      <div className="min-w-[min(100%,220px)] flex-1">
                                        <label className="mb-1 block text-[11px] font-medium text-zinc-400">
                                          Linked measurement
                                        </label>
                                        <select
                                          value={draftMeasurementLink}
                                          onChange={(event) =>
                                            setPhotoLinkDraftByPhotoId((previous) => ({
                                              ...previous,
                                              [photo.id]: event.target.value,
                                            }))
                                          }
                                          className="field field-select text-xs"
                                        >
                                          <option value="">None</option>
                                          {measurementsSortedForPhotoLink.map((entry) => (
                                            <option key={entry.id} value={String(entry.id)}>
                                              {formatDateDDMMYYYY(entry.date)} —{" "}
                                              {formatBodyMeasurementSummary(entry)}
                                            </option>
                                          ))}
                                        </select>
                                      </div>
                                      <button
                                        type="button"
                                        disabled={
                                          measurementLinkUnchanged ||
                                          updatingPhotoLinkId === photo.id
                                        }
                                        onClick={() => void handleSavePhotoLinkedMeasurement(photo)}
                                        className="btn btn-secondary px-3 py-2 text-xs shrink-0"
                                      >
                                        {updatingPhotoLinkId === photo.id ? "Saving..." : "Save link"}
                                      </button>
                                    </div>
                                    {photo.linkedMeasurement ? (
                                      <div className="rounded-md border border-zinc-700/80 bg-zinc-900/40 px-3 py-2">
                                        <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                                          Saved measurements
                                        </p>
                                        <p className="mt-1 text-[13px] font-medium text-zinc-200">
                                          {photo.linkedMeasurement.formattedDate ??
                                            formatDateDDMMYYYY(photo.linkedMeasurement.date)}
                                        </p>
                                        <p className="mt-0.5 text-[13px] text-zinc-400">
                                          {formatBodyMeasurementSummary(photo.linkedMeasurement)}
                                        </p>
                                      </div>
                                    ) : (
                                      <p className="text-[12px] text-zinc-500">
                                        No measurement linked. Choose one above and click Save link.
                                      </p>
                                    )}
                                  </div>
                                </>
                              ) : null}
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>

                </div>
              </section>

              <div className="space-y-4 xl:sticky xl:top-6">
                <section className="surface-card">
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

                <section className="surface-card">
                  <h3 className="text-sm font-semibold text-zinc-100">Add progress photo</h3>
                  <div className="mt-3 space-y-3">
                    <input type="date" value={photoCapturedAt} onChange={(event) => setPhotoCapturedAt(event.target.value)} className="field" />
                    <div>
                      <label className="mb-1 block text-xs font-medium text-zinc-300">
                        Link measurement (optional)
                      </label>
                      <select
                        value={photoLinkedMeasurementId}
                        onChange={(event) => setPhotoLinkedMeasurementId(event.target.value)}
                        className="field field-select"
                      >
                        <option value="">None</option>
                        {measurementsSortedForPhotoLink.map((entry) => (
                          <option key={entry.id} value={String(entry.id)}>
                            {formatDateDDMMYYYY(entry.date)} — {formatBodyMeasurementSummary(entry)}
                          </option>
                        ))}
                      </select>
                    </div>
                    <textarea
                      value={photoNote}
                      onChange={(event) => setPhotoNote(event.target.value)}
                      placeholder="Optional note (lighting, weight, mood...)"
                      className="field min-h-[72px]"
                    />
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(event) => void handlePhotoFileChange(event.target.files?.[0] ?? null)}
                      className="field file:mr-3 file:rounded-md file:border-0 file:bg-zinc-700 file:px-3 file:py-1 file:text-xs file:font-medium file:text-zinc-100"
                    />
                    {photoDataUrl && (
                      <img
                        src={photoDataUrl}
                        alt="Selected progress preview"
                        className="h-40 w-full rounded-md object-cover"
                      />
                    )}
                    <button
                      type="button"
                      onClick={handleSavePhoto}
                      disabled={isSavingPhoto}
                      className="btn btn-primary w-full"
                    >
                      {isSavingPhoto ? "Saving photo..." : "Save photo"}
                    </button>
                  </div>
                </section>
              </div>
            </div>
          </PageContainer>
        </div>
      </div>
    </div>
  );
}
