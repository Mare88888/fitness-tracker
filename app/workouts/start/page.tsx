"use client";

import { Navbar } from "@/components/navbar";
import { PageContainer } from "@/components/page-container";
import { RestTimer } from "@/components/rest-timer";
import { Sidebar } from "@/components/sidebar";
import { EmptyState } from "@/components/ui/empty-state";
import { getAuthUsername } from "@/lib/auth/token";
import { writeExerciseCatalogCache } from "@/lib/exercise-catalog-cache";
import { takePendingExercisesForStartWorkout } from "@/lib/exercise-insert-queue";
import { ApiRequestError } from "@/lib/services/api-error";
import { getExerciseCatalog } from "@/lib/services/exercise-catalog-service";
import { createWorkout, getWorkouts } from "@/lib/services/workout-service";
import {
  assignWeeklyPlan,
  createTemplate,
  getTemplates,
  getWeeklyPlan,
} from "@/lib/services/template-service";
import type { ApiFieldValidationError } from "@/types/api-error";
import type { ExerciseCatalogItem } from "@/types/exercise-catalog";
import type { WorkoutTemplate } from "@/types/template";
import type { CreateWorkoutInput, Workout } from "@/types/workout";
import type { WeeklyPlan } from "@/types/weekly-plan";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

type WorkoutSet = {
  id: string;
  reps: string;
  weight: string;
};

type WorkoutExercise = {
  id: string;
  name: string;
  sets: WorkoutSet[];
};

type SetFieldError = {
  reps?: string;
  weight?: string;
};

type WorkoutDraft = {
  workoutName: string;
  exercises: WorkoutExercise[];
  updatedAt: number;
};

type DraftSaveStatus = "idle" | "saving" | "saved";

const TRAINING_DAYS = [
  { dayOfWeek: 1, label: "Monday" },
  { dayOfWeek: 2, label: "Tuesday" },
  { dayOfWeek: 3, label: "Wednesday" },
  { dayOfWeek: 4, label: "Thursday" },
  { dayOfWeek: 5, label: "Friday" },
  { dayOfWeek: 6, label: "Saturday" },
  { dayOfWeek: 7, label: "Sunday" },
];
const EXERCISE_DATALIST_ID = "exercise-library-options";
const START_WORKOUT_BOOTSTRAP_KEY = "fitness_start_workout_bootstrap";

function getDraftStorageKey(): string {
  const username = getAuthUsername() ?? "anonymous";
  return `fitness_workout_draft_${username}`;
}

function createSet(): WorkoutSet {
  return {
    id: crypto.randomUUID(),
    reps: "",
    weight: "",
  };
}

function createExercise(): WorkoutExercise {
  return {
    id: crypto.randomUUID(),
    name: "",
    sets: [createSet()],
  };
}

export default function StartWorkoutPage() {
  const [sessionStartedAt] = useState(() => Date.now());
  const [workoutName, setWorkoutName] = useState("");
  const [exercises, setExercises] = useState<WorkoutExercise[]>([createExercise()]);
  const [completedSetIds, setCompletedSetIds] = useState<Set<string>>(new Set());
  const [restTimerStartSignal, setRestTimerStartSignal] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingWorkouts, setIsLoadingWorkouts] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);
  const [workoutNameError, setWorkoutNameError] = useState<string | null>(null);
  const [exerciseNameErrors, setExerciseNameErrors] = useState<Record<string, string>>({});
  const [setFieldErrors, setSetFieldErrors] = useState<Record<string, SetFieldError>>({});
  const [validationMessages, setValidationMessages] = useState<string[]>([]);
  const [loadedWorkouts, setLoadedWorkouts] = useState<Workout[]>([]);
  const [hasRecoveredDraft, setHasRecoveredDraft] = useState(false);
  const [draftTimestamp, setDraftTimestamp] = useState<number | null>(null);
  const [draftSaveStatus, setDraftSaveStatus] = useState<DraftSaveStatus>("idle");
  const [templates, setTemplates] = useState<WorkoutTemplate[]>([]);
  const [weeklyPlan, setWeeklyPlan] = useState<WeeklyPlan[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);
  const [isUpdatingPlanDay, setIsUpdatingPlanDay] = useState<number | null>(null);
  const [isStartingTodaysPlan, setIsStartingTodaysPlan] = useState(false);
  const [catalogItems, setCatalogItems] = useState<ExerciseCatalogItem[]>([]);
  const autosaveTimeoutRef = useRef<number | null>(null);

  const resolveMuscleGroup = (exerciseName: string): string => {
    const normalized = exerciseName.trim().toLowerCase();
    const match = catalogItems.find((item) => item.name.trim().toLowerCase() === normalized);
    return match?.muscleGroup ?? "Other";
  };

  const addExercise = () => {
    setExercises((previous) => [...previous, createExercise()]);
  };

  const removeExercise = (exerciseId: string) => {
    setExercises((previous) => {
      const removedExercise = previous.find((exercise) => exercise.id === exerciseId);
      if (removedExercise) {
        setCompletedSetIds((prev) => {
          const next = new Set(prev);
          removedExercise.sets.forEach((set) => next.delete(set.id));
          return next;
        });
      }
      return previous.filter((exercise) => exercise.id !== exerciseId);
    });
  };

  const updateExerciseName = (exerciseId: string, name: string) => {
    setExerciseNameErrors((previous) => {
      if (!previous[exerciseId]) {
        return previous;
      }
      const next = { ...previous };
      delete next[exerciseId];
      return next;
    });
    setExercises((previous) =>
      previous.map((exercise) => (exercise.id === exerciseId ? { ...exercise, name } : exercise))
    );
  };

  const addSet = (exerciseId: string) => {
    setExercises((previous) =>
      previous.map((exercise) =>
        exercise.id === exerciseId ? { ...exercise, sets: [...exercise.sets, createSet()] } : exercise
      )
    );
  };

  const removeSet = (exerciseId: string, setId: string) => {
    setCompletedSetIds((previous) => {
      if (!previous.has(setId)) {
        return previous;
      }
      const next = new Set(previous);
      next.delete(setId);
      return next;
    });
    setExercises((previous) =>
      previous.map((exercise) => {
        if (exercise.id !== exerciseId) {
          return exercise;
        }

        return {
          ...exercise,
          sets: exercise.sets.filter((set) => set.id !== setId),
        };
      })
    );
  };

  const markSetCompleted = (setId: string) => {
    let shouldStartRest = false;
    setCompletedSetIds((previous) => {
      if (previous.has(setId)) {
        return previous;
      }
      const next = new Set(previous);
      next.add(setId);
      shouldStartRest = true;
      return next;
    });
    if (shouldStartRest) {
      setRestTimerStartSignal((previous) => previous + 1);
    }
  };

  const updateSetField = (
    exerciseId: string,
    setId: string,
    field: "reps" | "weight",
    value: string
  ) => {
    setSetFieldErrors((previous) => {
      const current = previous[setId];
      if (!current || !current[field]) {
        return previous;
      }
      const nextForSet = { ...current, [field]: undefined };
      return { ...previous, [setId]: nextForSet };
    });
    setExercises((previous) =>
      previous.map((exercise) => {
        if (exercise.id !== exerciseId) {
          return exercise;
        }

        return {
          ...exercise,
          sets: exercise.sets.map((set) => (set.id === setId ? { ...set, [field]: value } : set)),
        };
      })
    );
  };

  const buildCreateWorkoutPayload = (): CreateWorkoutInput => {
    return {
      name: workoutName.trim(),
      date: new Date().toISOString().slice(0, 10),
      exercises: exercises.map((exercise) => ({
        name: exercise.name.trim(),
        sets: exercise.sets.map((set) => ({
          reps: Number(set.reps) || 0,
          weight: Number(set.weight) || 0,
        })),
      })),
    };
  };

  const getValidationError = (): string | null => {
    if (!workoutName.trim()) {
      return "Workout name is required.";
    }

    if (exercises.some((exercise) => !exercise.name.trim())) {
      return "Each exercise must have a name.";
    }

    const invalidSet = exercises.some((exercise) =>
      exercise.sets.some((set) => {
        const reps = Number(set.reps);
        const weight = Number(set.weight);

        return Number.isNaN(reps) || Number.isNaN(weight) || reps <= 0 || weight < 0;
      })
    );

    if (invalidSet) {
      return "Each set needs valid values: reps > 0 and weight >= 0.";
    }

    return null;
  };

  const formValidationError = getValidationError();
  const canSaveWorkout = !isSaving && !formValidationError;
  const sessionDurationLabel = useMemo(() => {
    const totalSeconds = Math.max(0, Math.floor((Date.now() - sessionStartedAt) / 1000));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}m ${seconds}s`;
  }, [sessionStartedAt]);
  const liveTotalSets = useMemo(
    () => exercises.reduce((sum, exercise) => sum + exercise.sets.length, 0),
    [exercises]
  );
  const liveTotalVolume = useMemo(() => {
    const volume = exercises.reduce((sum, exercise) => {
      return (
        sum +
        exercise.sets.reduce((exerciseSum, set) => {
          const reps = Number(set.reps);
          const weight = Number(set.weight);
          if (!Number.isFinite(reps) || !Number.isFinite(weight)) {
            return exerciseSum;
          }
          return exerciseSum + Math.max(0, reps) * Math.max(0, weight);
        }, 0)
      );
    }, 0);
    return Math.round(volume);
  }, [exercises]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const bootstrapRaw = sessionStorage.getItem(START_WORKOUT_BOOTSTRAP_KEY);
    if (bootstrapRaw) {
      try {
        const parsed = JSON.parse(bootstrapRaw) as {
          workoutName?: string;
          exercises?: WorkoutExercise[];
          hasRecoveredDraft?: boolean;
          draftTimestamp?: number | null;
        };
        setWorkoutName(parsed.workoutName ?? "");
        setExercises(parsed.exercises?.length ? parsed.exercises : [createExercise()]);
        if (parsed.hasRecoveredDraft) {
          setHasRecoveredDraft(true);
        }
        if (parsed.draftTimestamp != null) {
          setDraftTimestamp(parsed.draftTimestamp);
        }
      } catch {
        /* ignore */
      }
      sessionStorage.removeItem(START_WORKOUT_BOOTSTRAP_KEY);
      return;
    }

    const draftStorageKey = getDraftStorageKey();
    const rawDraft = window.localStorage.getItem(draftStorageKey);
    const pendingNames = takePendingExercisesForStartWorkout();

    let initialName = "";
    let initialExercises: WorkoutExercise[] = [createExercise()];
    let recoveredDraft = false;
    let draftTs: number | null = null;

    if (rawDraft) {
      try {
        const parsed = JSON.parse(rawDraft) as WorkoutDraft;
        if (parsed.workoutName || (parsed.exercises && parsed.exercises.length > 0)) {
          initialName = parsed.workoutName ?? "";
          initialExercises = parsed.exercises?.length ? parsed.exercises : [createExercise()];
          recoveredDraft = true;
          draftTs = parsed.updatedAt ?? null;
        }
      } catch {
        window.localStorage.removeItem(draftStorageKey);
      }
    }

    if (pendingNames.length > 0) {
      const rows: WorkoutExercise[] = pendingNames.map((name) => ({
        id: crypto.randomUUID(),
        name,
        sets: [createSet()],
      }));
      const onlyOne = initialExercises.length === 1;
      const first = initialExercises[0];
      const firstSet = first?.sets[0];
      const singleEmptyStarter =
        onlyOne &&
        !first.name.trim() &&
        first.sets.length === 1 &&
        !(firstSet?.reps ?? "").trim() &&
        !(firstSet?.weight ?? "").trim();
      if (singleEmptyStarter && !recoveredDraft) {
        initialExercises = rows;
      } else {
        initialExercises = [...initialExercises, ...rows];
      }
      toast.success(`Added ${pendingNames.length} exercise(s) from the library.`);
    }

    if (recoveredDraft || pendingNames.length > 0) {
      sessionStorage.setItem(
        START_WORKOUT_BOOTSTRAP_KEY,
        JSON.stringify({
          workoutName: initialName,
          exercises: initialExercises,
          hasRecoveredDraft: recoveredDraft,
          draftTimestamp: draftTs,
        })
      );
    }

    if (recoveredDraft) {
      setWorkoutName(initialName);
      setExercises(initialExercises);
      setHasRecoveredDraft(true);
      setDraftTimestamp(draftTs);
      toast.info("Recovered your unsaved workout draft.");
    } else if (pendingNames.length > 0) {
      setWorkoutName(initialName);
      setExercises(initialExercises);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const loadCatalog = async () => {
      try {
        const items = await getExerciseCatalog({ limit: 300 });
        if (!cancelled) {
          writeExerciseCatalogCache(items);
          setCatalogItems(items);
        }
      } catch {
        if (!cancelled) {
          setCatalogItems([]);
        }
      }
    };
    void loadCatalog();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const loadTemplateData = async () => {
      setIsLoadingTemplates(true);
      try {
        const [templateData, weeklyPlanData] = await Promise.all([getTemplates(), getWeeklyPlan()]);
        setTemplates(templateData);
        setWeeklyPlan(weeklyPlanData);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to load templates.";
        toast.error(message);
      } finally {
        setIsLoadingTemplates(false);
      }
    };
    void loadTemplateData();
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const hasAnyFormContent =
      workoutName.trim().length > 0 ||
      exercises.some((exercise) => exercise.name.trim().length > 0 || exercise.sets.some((set) => set.reps || set.weight));

    if (autosaveTimeoutRef.current) {
      window.clearTimeout(autosaveTimeoutRef.current);
    }

    if (hasAnyFormContent) {
      setDraftSaveStatus("saving");
    } else {
      setDraftSaveStatus("idle");
    }

    autosaveTimeoutRef.current = window.setTimeout(() => {
      const draftStorageKey = getDraftStorageKey();
      if (!hasAnyFormContent) {
        window.localStorage.removeItem(draftStorageKey);
        return;
      }
      const draft: WorkoutDraft = {
        workoutName,
        exercises,
        updatedAt: Date.now(),
      };
      window.localStorage.setItem(draftStorageKey, JSON.stringify(draft));
      setDraftTimestamp(draft.updatedAt);
      setDraftSaveStatus("saved");
    }, 400);

    return () => {
      if (autosaveTimeoutRef.current) {
        window.clearTimeout(autosaveTimeoutRef.current);
      }
    };
  }, [exercises, workoutName]);

  const clearDraft = () => {
    if (typeof window === "undefined") {
      return;
    }
    window.localStorage.removeItem(getDraftStorageKey());
    setDraftTimestamp(null);
    setDraftSaveStatus("idle");
  };

  const getDraftStatusLabel = (): string | null => {
    if (draftSaveStatus === "idle") {
      return null;
    }
    if (draftSaveStatus === "saving") {
      return "Saving draft...";
    }
    if (!draftTimestamp) {
      return "Saved just now";
    }

    const secondsAgo = Math.max(0, Math.floor((Date.now() - draftTimestamp) / 1000));
    if (secondsAgo < 5) {
      return "Saved just now";
    }
    if (secondsAgo < 60) {
      return `Saved ${secondsAgo}s ago`;
    }
    const minutesAgo = Math.floor(secondsAgo / 60);
    return `Saved ${minutesAgo}m ago`;
  };

  const discardRecoveredDraft = () => {
    clearDraft();
    setWorkoutName("");
    setExercises([createExercise()]);
    setHasRecoveredDraft(false);
    toast.success("Draft discarded.");
  };

  const applyTemplateById = (templateId: number, options?: { forceWorkoutName?: boolean }) => {
    const template = templates.find((item) => item.id === templateId);
    if (!template) {
      return false;
    }
    setWorkoutName((previous) => (options?.forceWorkoutName ? template.name : previous || template.name));
    setExercises(
      template.exercises.map((exercise) => ({
        id: crypto.randomUUID(),
        name: exercise.name,
        sets: exercise.sets.map((set) => ({
          id: crypto.randomUUID(),
          reps: String(set.reps),
          weight: String(set.weight),
        })),
      }))
    );
    toast.success(`Template "${template.name}" applied.`);
    return true;
  };

  const applyTemplate = () => {
    const parsedTemplateId = Number(selectedTemplateId);
    if (!parsedTemplateId) {
      return;
    }
    applyTemplateById(parsedTemplateId);
  };

  const handleStartTodaysPlannedWorkout = () => {
    setIsStartingTodaysPlan(true);
    try {
      const jsDay = new Date().getDay();
      const dayOfWeek = ((jsDay + 6) % 7) + 1;
      const todayPlan = weeklyPlan.find((plan) => plan.dayOfWeek === dayOfWeek);
      if (!todayPlan) {
        const dayLabel = TRAINING_DAYS.find((day) => day.dayOfWeek === dayOfWeek)?.label ?? "today";
        toast.error(`No template assigned for ${dayLabel}.`);
        return;
      }
      const applied = applyTemplateById(todayPlan.templateId, { forceWorkoutName: true });
      if (!applied) {
        toast.error("Assigned template was not found. Refresh templates and try again.");
        return;
      }
      setSelectedTemplateId(String(todayPlan.templateId));
    } finally {
      setIsStartingTodaysPlan(false);
    }
  };

  const handleSaveTemplate = async () => {
    const validationError = getValidationError();
    if (validationError) {
      toast.error(validationError);
      return;
    }
    const suggestedName = workoutName.trim() ? `${workoutName.trim()} Template` : "New Template";
    const templateName = window.prompt("Template name", suggestedName);
    if (!templateName) {
      return;
    }
    setIsSavingTemplate(true);
    try {
      const payload = buildCreateWorkoutPayload();
      const createdTemplate = await createTemplate({
        name: templateName.trim(),
        exercises: payload.exercises,
      });
      setTemplates((previous) => [...previous, createdTemplate].sort((a, b) => a.name.localeCompare(b.name)));
      toast.success(`Template "${createdTemplate.name}" saved.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to save template.";
      toast.error(message);
    } finally {
      setIsSavingTemplate(false);
    }
  };

  const handleAssignPlanDay = async (dayOfWeek: number, templateId: number) => {
    if (!templateId) {
      return;
    }
    setIsUpdatingPlanDay(dayOfWeek);
    try {
      const updated = await assignWeeklyPlan(dayOfWeek, templateId);
      setWeeklyPlan((previous) => {
        const withoutCurrentDay = previous.filter((item) => item.dayOfWeek !== dayOfWeek);
        return [...withoutCurrentDay, updated].sort((a, b) => a.dayOfWeek - b.dayOfWeek);
      });
      toast.success("Weekly plan updated.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to update weekly plan.";
      toast.error(message);
    } finally {
      setIsUpdatingPlanDay(null);
    }
  };

  const handleCreateWorkout = async () => {
    setFeedbackMessage(null);
    setFeedbackError(null);
    setWorkoutNameError(null);
    setExerciseNameErrors({});
    setSetFieldErrors({});
    setValidationMessages([]);

    const validationError = getValidationError();
    if (validationError) {
      setFeedbackError(validationError);
      toast.error(validationError);
      return;
    }

    setIsSaving(true);
    try {
      const payload = buildCreateWorkoutPayload();
      const created = await createWorkout(payload);
      setFeedbackMessage(`Workout created successfully (ID: ${created.id}).`);
      toast.success(`Workout saved (ID: ${created.id})`);
      clearDraft();
      setHasRecoveredDraft(false);
    } catch (error) {
      if (error instanceof ApiRequestError) {
        mapValidationErrors(error.validationErrors);
        const workoutNameValidation = error.validationErrors.find((errorItem) => errorItem.field === "name");
        setWorkoutNameError(workoutNameValidation?.message ?? null);
        setValidationMessages(error.validationErrors.map((errorItem) => `${errorItem.field}: ${errorItem.message}`));
      }
      const message = error instanceof Error ? error.message : "Failed to create workout.";
      setFeedbackError(message);
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  const mapValidationErrors = (fieldErrors: ApiFieldValidationError[]) => {
    const nextExerciseNameErrors: Record<string, string> = {};
    const nextSetFieldErrors: Record<string, SetFieldError> = {};

    fieldErrors.forEach((errorItem) => {
      const exerciseNameMatch = errorItem.field.match(/^exercises\[(\d+)\]\.name$/);
      if (exerciseNameMatch) {
        const exerciseIndex = Number(exerciseNameMatch[1]);
        const exercise = exercises[exerciseIndex];
        if (exercise) {
          nextExerciseNameErrors[exercise.id] = errorItem.message;
        }
        return;
      }

      const setFieldMatch = errorItem.field.match(/^exercises\[(\d+)\]\.sets\[(\d+)\]\.(reps|weight)$/);
      if (setFieldMatch) {
        const exerciseIndex = Number(setFieldMatch[1]);
        const setIndex = Number(setFieldMatch[2]);
        const field = setFieldMatch[3] as "reps" | "weight";
        const set = exercises[exerciseIndex]?.sets[setIndex];
        if (set) {
          nextSetFieldErrors[set.id] = {
            ...(nextSetFieldErrors[set.id] ?? {}),
            [field]: errorItem.message,
          };
        }
      }
    });

    setExerciseNameErrors(nextExerciseNameErrors);
    setSetFieldErrors(nextSetFieldErrors);
  };

  const handleLoadWorkouts = async () => {
    setFeedbackMessage(null);
    setFeedbackError(null);
    setIsLoadingWorkouts(true);
    try {
      const workouts = await getWorkouts();
      setLoadedWorkouts(workouts);
      setFeedbackMessage(`Loaded ${workouts.length} workout(s) from backend.`);
      toast.success(`Loaded ${workouts.length} workout(s)`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load workouts.";
      setFeedbackError(message);
      toast.error(message);
    } finally {
      setIsLoadingWorkouts(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="flex min-h-screen min-w-0 flex-1 flex-col">
          <Navbar />
          <PageContainer>
            <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
              <section className="surface-page p-4 sm:p-6">
                <div className="pointer-events-none absolute -right-20 -top-20 h-44 w-44 rounded-full bg-emerald-500/10 blur-3xl" />
                <div className="pointer-events-none absolute -bottom-20 -left-16 h-44 w-44 rounded-full bg-emerald-400/10 blur-3xl dark:bg-emerald-500/10" />
                <div className="mb-6">
                  <h1 className="text-2xl font-semibold tracking-tight text-zinc-100">
                    Start Workout
                  </h1>
                </div>

                <div className="relative space-y-6">
                  <div className="surface-soft px-4 py-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex flex-wrap gap-6 text-xs">
                        <div>
                          <p className="text-zinc-400">Duration</p>
                          <p className="text-base font-semibold text-emerald-300">{sessionDurationLabel}</p>
                        </div>
                        <div>
                          <p className="text-zinc-400">Volume</p>
                          <p className="text-base font-semibold text-zinc-100">{liveTotalVolume} kg</p>
                        </div>
                        <div>
                          <p className="text-zinc-400">Sets</p>
                          <p className="text-base font-semibold text-zinc-100">{liveTotalSets}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleCreateWorkout}
                        disabled={!canSaveWorkout}
                        className="btn btn-primary"
                      >
                        {isSaving ? "Saving..." : "Finish"}
                      </button>
                    </div>
                  </div>
                  {getDraftStatusLabel() && (
                    <p className="text-xs text-zinc-500 dark:text-zinc-300">{getDraftStatusLabel()}</p>
                  )}
                  {hasRecoveredDraft && (
                    <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                      <p>
                        Recovered draft
                        {draftTimestamp ? ` from ${new Date(draftTimestamp).toLocaleString()}` : ""}.
                      </p>
                      <button
                        type="button"
                        onClick={discardRecoveredDraft}
                        className="mt-2 text-xs font-medium underline underline-offset-2"
                      >
                        Discard draft
                      </button>
                    </div>
                  )}
                  <div>
                    <label
                      htmlFor="workout-name"
                      className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
                    >
                      Workout name
                    </label>
                    <input
                      id="workout-name"
                      type="text"
                      value={workoutName}
                      onChange={(event) => setWorkoutName(event.target.value)}
                      placeholder="e.g. Push Day"
                      className="field"
                    />
                    {workoutNameError && <p className="mt-1 text-xs text-red-600">{workoutNameError}</p>}
                  </div>

                  <div className="space-y-4">
                    {exercises.map((exercise, exerciseIndex) => (
                      <article
                        key={exercise.id}
                        className="surface-card"
                      >
                        <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div className="w-full">
                            <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-zinc-400">
                              Exercise {exerciseIndex + 1}
                            </label>
                            <input
                              type="text"
                              value={exercise.name}
                              onChange={(event) =>
                                updateExerciseName(exercise.id, event.target.value)
                              }
                              list={EXERCISE_DATALIST_ID}
                              placeholder="e.g. Bench Press"
                              className="field"
                            />
                            {exercise.name.trim() && (
                              <p className="mt-1 text-xs text-zinc-400">
                                Muscle: {resolveMuscleGroup(exercise.name)}
                              </p>
                            )}
                            {exerciseNameErrors[exercise.id] && (
                              <p className="mt-1 text-xs text-red-600">{exerciseNameErrors[exercise.id]}</p>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => removeExercise(exercise.id)}
                            disabled={exercises.length === 1}
                            className="btn btn-secondary self-start"
                          >
                            Remove
                          </button>
                        </div>

                        <div className="mb-2 grid grid-cols-[auto_1fr_1fr_1fr_auto_auto] gap-2 px-1 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                          <span>Set</span>
                          <span>Previous</span>
                          <span>Kg</span>
                          <span>Reps</span>
                          <span>Done</span>
                          <span></span>
                        </div>
                        <div className="space-y-3">
                          {exercise.sets.map((set, setIndex) => (
                            <div
                              key={set.id}
                              className={`surface-soft grid grid-cols-1 gap-2 p-2 sm:grid-cols-[auto_1fr_1fr_1fr_auto_auto] sm:items-center ${
                                completedSetIds.has(set.id) ? "border-emerald-600/60 bg-emerald-950/20" : ""
                              }`}
                            >
                              <div className="flex items-center text-sm font-semibold text-zinc-200">
                                {setIndex + 1}
                              </div>
                              <div className="text-sm text-zinc-500">-</div>
                              <div>
                                <input
                                  type="number"
                                  min={0}
                                  step="0.5"
                                  inputMode="decimal"
                                  placeholder="Kg"
                                  value={set.weight}
                                  onChange={(event) =>
                                    updateSetField(exercise.id, set.id, "weight", event.target.value)
                                  }
                                  className="field"
                                />
                                {setFieldErrors[set.id]?.weight && (
                                  <p className="mt-1 text-xs text-red-600">{setFieldErrors[set.id]?.weight}</p>
                                )}
                              </div>
                              <div>
                                <input
                                  type="number"
                                  min={0}
                                  inputMode="numeric"
                                  placeholder="Reps"
                                  value={set.reps}
                                  onChange={(event) =>
                                    updateSetField(exercise.id, set.id, "reps", event.target.value)
                                  }
                                  className="field"
                                />
                                {setFieldErrors[set.id]?.reps && (
                                  <p className="mt-1 text-xs text-red-600">{setFieldErrors[set.id]?.reps}</p>
                                )}
                              </div>
                              <button
                                type="button"
                                onClick={() => markSetCompleted(set.id)}
                                className="btn btn-secondary"
                                aria-pressed={completedSetIds.has(set.id)}
                              >
                                ✓
                              </button>
                              <button
                                type="button"
                                onClick={() => removeSet(exercise.id, set.id)}
                                disabled={exercise.sets.length === 1}
                                className="btn btn-danger"
                              >
                                X
                              </button>
                            </div>
                          ))}
                        </div>

                        <button
                          type="button"
                          onClick={() => addSet(exercise.id)}
                          className="btn btn-primary mt-4"
                        >
                          Add set
                        </button>
                      </article>
                    ))}
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={addExercise}
                      className="btn btn-secondary w-full sm:w-auto"
                    >
                      Add exercise
                    </button>
                    <Link
                      href="/exercises"
                      className="btn btn-secondary w-full sm:w-auto"
                    >
                      Exercise Library
                    </Link>
                  </div>

                  <div className="surface-card p-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-zinc-100">Ready to save?</p>
                        <p className="text-xs text-zinc-300">
                          {formValidationError
                            ? "Fix validation issues before saving."
                            : "Your workout is valid and ready to store."}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-3">
                        <button
                          type="button"
                          onClick={handleCreateWorkout}
                          disabled={!canSaveWorkout}
                          className="btn btn-primary w-full sm:w-auto"
                        >
                          {isSaving ? "Saving..." : "Save workout"}
                        </button>
                        <button
                          type="button"
                          onClick={handleLoadWorkouts}
                          disabled={isLoadingWorkouts}
                          className="btn btn-secondary w-full sm:w-auto"
                        >
                          {isLoadingWorkouts ? "Loading..." : "Load workouts (integration test)"}
                        </button>
                      </div>
                    </div>
                  </div>
                  {formValidationError && (
                    <p className="text-xs text-zinc-500 dark:text-zinc-300">
                      {formValidationError}
                    </p>
                  )}
                  <div className="surface-card">
                    <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Templates</h2>
                    <p className="mt-1 text-xs text-zinc-400">Save and apply templates fast.</p>
                    <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                      <select
                        value={selectedTemplateId}
                        onChange={(event) => setSelectedTemplateId(event.target.value)}
                        className="field field-select"
                      >
                        <option value="">Select template</option>
                        {templates.map((template) => (
                          <option key={template.id} value={template.id}>
                            {template.name}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={applyTemplate}
                        disabled={!selectedTemplateId || isLoadingTemplates}
                        className="btn btn-secondary"
                      >
                        Start from template
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveTemplate}
                        disabled={isSavingTemplate}
                        className="btn btn-secondary"
                      >
                        {isSavingTemplate ? "Saving template..." : "Save as template"}
                      </button>
                    </div>
                  </div>

                  <div className="surface-card">
                    <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Weekly plan</h2>
                    <p className="mt-1 text-xs text-zinc-400">Assign templates to days.</p>
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      {TRAINING_DAYS.map((day) => {
                        const dayPlan = weeklyPlan.find((item) => item.dayOfWeek === day.dayOfWeek);
                        return (
                          <label key={day.dayOfWeek} className="flex items-center gap-2 text-sm">
                            <span className="w-24 text-zinc-700 dark:text-zinc-300">{day.label}</span>
                            <select
                              value={dayPlan?.templateId ?? ""}
                              onChange={(event) => handleAssignPlanDay(day.dayOfWeek, Number(event.target.value))}
                              disabled={isUpdatingPlanDay === day.dayOfWeek}
                              className="field field-select px-2 py-1"
                            >
                              <option value="">No template</option>
                              {templates.map((template) => (
                                <option key={template.id} value={template.id}>
                                  {template.name}
                                </option>
                              ))}
                            </select>
                          </label>
                        );
                      })}
                    </div>
                    <button
                      type="button"
                      onClick={handleStartTodaysPlannedWorkout}
                      disabled={isStartingTodaysPlan || isLoadingTemplates}
                      className="btn btn-secondary mt-3"
                    >
                      {isStartingTodaysPlan ? "Starting..." : "Start today's planned workout"}
                    </button>
                  </div>

                  {feedbackMessage && (
                    <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                      {feedbackMessage}
                    </p>
                  )}
                  {feedbackError && (
                    <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                      {feedbackError}
                    </p>
                  )}
                  {validationMessages.length > 0 && (
                    <ul className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                      {validationMessages.map((message) => (
                        <li key={message}>- {message}</li>
                      ))}
                    </ul>
                  )}

                  {loadedWorkouts.length > 0 ? (
                    <div className="surface-card">
                      <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                        Loaded workouts
                      </h2>
                      <ul className="mt-2 space-y-1 text-sm text-zinc-700 dark:text-zinc-300">
                        {loadedWorkouts.map((workout) => (
                          <li key={workout.id}>
                            #{workout.id} - {workout.name} ({workout.exercises.length} exercise(s))
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <EmptyState
                      title="No workouts loaded"
                      description="Use 'Load workouts' to fetch your saved workouts from the backend."
                    />
                  )}
                </div>
              </section>

              <RestTimer className="xl:sticky xl:top-6" startSignal={restTimerStartSignal} />
            </div>
          </PageContainer>
        </div>
      </div>
      <datalist id={EXERCISE_DATALIST_ID}>
        {catalogItems.map((exercise) => (
          <option key={`${exercise.name}-${exercise.muscleGroup}`} value={exercise.name}>
            {exercise.muscleGroup}
          </option>
        ))}
      </datalist>
    </div>
  );
}
