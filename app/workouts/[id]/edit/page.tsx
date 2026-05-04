"use client";

import { Navbar } from "@/components/navbar";
import { PageContainer } from "@/components/page-container";
import { Sidebar } from "@/components/sidebar";
import { EmptyState } from "@/components/ui/empty-state";
import { APP_NAME } from "@/lib/constants";
import { formatSecondsToMMSS, parseDurationToSeconds } from "@/lib/duration-format";
import { writeExerciseCatalogCache } from "@/lib/exercise-catalog-cache";
import { getExerciseCatalog } from "@/lib/services/exercise-catalog-service";
import { getWorkoutById, updateWorkout } from "@/lib/services/workout-service";
import type { ExerciseCatalogItem } from "@/types/exercise-catalog";
import type { CreateWorkoutInput } from "@/types/workout";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

type EditWorkoutPageProps = {
  params: Promise<{
    id: string;
  }>;
};
const EXERCISE_DATALIST_ID = "exercise-library-options-edit";
const TIMED_EXERCISE_KEYWORDS = [
  "plank",
  "treadmill",
  "cycling",
  "spinning",
  "bike",
  "elliptical",
  "rowing",
  "rower",
  "walk",
  "jog",
  "run",
  "sprint",
  "stairmaster",
];

function isTimedExerciseName(name: string): boolean {
  const normalized = name.trim().toLowerCase();
  return TIMED_EXERCISE_KEYWORDS.some((keyword) => normalized.includes(keyword));
}

export default function EditWorkoutPage({ params }: EditWorkoutPageProps) {
  const router = useRouter();
  const [workoutId, setWorkoutId] = useState<number | null>(null);
  const [payload, setPayload] = useState<CreateWorkoutInput | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [catalogItems, setCatalogItems] = useState<ExerciseCatalogItem[]>([]);
  const [activeSetTypeKey, setActiveSetTypeKey] = useState<string | null>(null);

  const getSetKey = (exerciseIndex: number, setIndex: number) => `${exerciseIndex}-${setIndex}`;

  const getSetTypeLabel = (setType: "normal" | "warmup" | "failure" | "drop", setIndex: number) => {
    if (setType === "warmup") return "W";
    if (setType === "failure") return "F";
    if (setType === "drop") return "D";
    return String(setIndex + 1);
  };

  const getSetTypeButtonClass = (setType: "normal" | "warmup" | "failure" | "drop"): string => {
    if (setType === "warmup") {
      return "border-amber-500/60 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 hover:border-amber-400";
    }
    if (setType === "failure") {
      return "border-rose-500/60 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20 hover:border-rose-400";
    }
    if (setType === "drop") {
      return "border-sky-500/60 bg-sky-500/10 text-sky-300 hover:bg-sky-500/20 hover:border-sky-400";
    }
    return "border-zinc-500/60 bg-zinc-700/20 text-zinc-100 hover:bg-zinc-700/35 hover:border-zinc-400";
  };

  const resolveMuscleGroup = (exerciseName: string): string => {
    const normalized = exerciseName.trim().toLowerCase();
    const match = catalogItems.find((item) => item.name.trim().toLowerCase() === normalized);
    return match?.muscleGroup ?? "Other";
  };

  const getValidationError = (currentPayload: CreateWorkoutInput | null): string | null => {
    if (!currentPayload) {
      return "Workout data is not loaded.";
    }
    if (!currentPayload.name.trim()) {
      return "Workout name is required.";
    }
    if (!currentPayload.date) {
      return "Workout date is required.";
    }
    if (currentPayload.exercises.some((exercise) => !exercise.name.trim())) {
      return "Each exercise must have a name.";
    }
    if (
      currentPayload.exercises.some((exercise) =>
        exercise.sets.some((set) => {
          const repsValue = set.reps ?? null;
          const durationValue = set.durationSeconds ?? null;
          const hasValidReps = repsValue != null && Number.isFinite(repsValue) && repsValue > 0;
          const hasValidDuration =
            durationValue != null && Number.isFinite(durationValue) && durationValue > 0;
          return Number.isNaN(set.weight) || set.weight < 0 || (!hasValidReps && !hasValidDuration);
        })
      )
    ) {
      return "Each set needs reps > 0 or time > 0, and weight >= 0.";
    }
    return null;
  };

  const formValidationError = getValidationError(payload);
  const canSave = !isSaving && !formValidationError;

  useEffect(() => {
    const loadWorkout = async () => {
      setError(null);
      setIsLoading(true);
      try {
        const { id } = await params;
        const parsedId = Number(id);
        if (Number.isNaN(parsedId)) {
          setError("Invalid workout id.");
          return;
        }
        const workout = await getWorkoutById(parsedId);
        setWorkoutId(parsedId);
        setPayload({
          name: workout.name,
          date: workout.date,
          exercises: workout.exercises.map((exercise) => ({
            name: exercise.name,
            note: exercise.note ?? "",
            sets: exercise.sets.map((set) => ({
              reps: set.reps ?? undefined,
              durationSeconds: set.durationSeconds ?? undefined,
              weight: set.weight,
              // Backward compatibility: older workouts may not include persisted completion yet.
              completed: set.completed ?? true,
              type: set.type ?? "normal",
            })),
          })),
        });
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Failed to load workout.");
      } finally {
        setIsLoading(false);
      }
    };

    void loadWorkout();
  }, [params]);

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

  const handleSave = async () => {
    if (!payload || workoutId == null) {
      return;
    }
    if (!payload.name.trim()) {
      setError("Workout name is required.");
      return;
    }
    if (payload.exercises.some((exercise) => !exercise.name.trim())) {
      setError("Each exercise must have a name.");
      return;
    }
    if (
      payload.exercises.some((exercise) =>
        exercise.sets.some((set) => {
          const repsValue = set.reps ?? null;
          const durationValue = set.durationSeconds ?? null;
          const hasValidReps = repsValue != null && Number.isFinite(repsValue) && repsValue > 0;
          const hasValidDuration =
            durationValue != null && Number.isFinite(durationValue) && durationValue > 0;
          return Number.isNaN(set.weight) || set.weight < 0 || (!hasValidReps && !hasValidDuration);
        })
      )
    ) {
      setError("Each set needs reps > 0 or time > 0, and weight >= 0.");
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      await updateWorkout(workoutId, payload);
      toast.success("Workout updated.");
      router.push(`/history/${workoutId}`);
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : "Failed to update workout.";
      setError(message);
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  const addExercise = () => {
    setPayload((previous) => {
      if (!previous) {
        return previous;
      }
      return {
        ...previous,
        exercises: [
          ...previous.exercises,
          {
            name: "",
            note: "",
            sets: [{ reps: 1, durationSeconds: undefined, weight: 0, completed: false, type: "normal" }],
          },
        ],
      };
    });
  };

  const removeExercise = (exerciseIndex: number) => {
    setPayload((previous) => {
      if (!previous || previous.exercises.length === 1) {
        return previous;
      }
      return {
        ...previous,
        exercises: previous.exercises.filter((_, index) => index !== exerciseIndex),
      };
    });
  };

  const addSet = (exerciseIndex: number) => {
    setPayload((previous) => {
      if (!previous) {
        return previous;
      }
      const nextExercises = [...previous.exercises];
      const currentExercise = nextExercises[exerciseIndex];
      nextExercises[exerciseIndex] = {
        ...currentExercise,
        sets: [
          ...currentExercise.sets,
          { reps: 1, durationSeconds: undefined, weight: 0, completed: false, type: "normal" },
        ],
      };
      return { ...previous, exercises: nextExercises };
    });
  };

  const removeSet = (exerciseIndex: number, setIndex: number) => {
    setPayload((previous) => {
      if (!previous) {
        return previous;
      }
      const nextExercises = [...previous.exercises];
      const currentExercise = nextExercises[exerciseIndex];
      if (currentExercise.sets.length === 1) {
        return previous;
      }
      nextExercises[exerciseIndex] = {
        ...currentExercise,
        sets: currentExercise.sets.filter((_, index) => index !== setIndex),
      };
      return { ...previous, exercises: nextExercises };
    });
  };

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
              <Link
                href="/history"
                className="mb-4 inline-block text-sm font-medium text-zinc-300 underline-offset-4 hover:underline"
              >
                Back to history
              </Link>
              <p className="text-xs font-medium uppercase tracking-wider text-emerald-400/90">{APP_NAME}</p>
              <h1 className="text-2xl font-semibold text-zinc-100">Edit workout</h1>
              {isLoading && <p className="mt-3 text-sm text-zinc-400">Loading workout...</p>}
              {error && (
                <p className="mt-3 rounded-md border border-rose-500/40 bg-rose-950/25 px-3 py-2 text-sm text-rose-100">
                  {error}
                </p>
              )}
              {!isLoading && !payload && !error && (
                <div className="mt-4">
                  <EmptyState title="Workout not found" description="Unable to edit this workout." />
                </div>
              )}
              {!isLoading && payload && (
                <div className="mt-4 space-y-4">
                  <div className="surface-card">
                    <div className="grid gap-3 md:grid-cols-[2fr_1fr]">
                      <div>
                        <label className="mb-2 block text-sm font-medium text-zinc-300">
                          Workout name
                        </label>
                        <input
                          value={payload.name}
                          onChange={(event) => setPayload((prev) => (prev ? { ...prev, name: event.target.value } : prev))}
                          className="field"
                        />
                      </div>
                      <div>
                        <label className="mb-2 block text-sm font-medium text-zinc-300">
                          Workout date
                        </label>
                        <input
                          type="date"
                          value={payload.date}
                          onChange={(event) => setPayload((prev) => (prev ? { ...prev, date: event.target.value } : prev))}
                          className="field"
                        />
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className="rounded-full border border-zinc-700 bg-zinc-800/70 px-2 py-1 text-xs font-medium text-zinc-300">
                        {payload.exercises.length} exercise{payload.exercises.length === 1 ? "" : "s"}
                      </span>
                      <span className="rounded-full border border-zinc-700 bg-zinc-800/70 px-2 py-1 text-xs font-medium text-zinc-300">
                        {payload.exercises.reduce((sum, exercise) => sum + exercise.sets.length, 0)} total sets
                      </span>
                    </div>
                  </div>
                  {payload.exercises.map((exercise, exerciseIndex) => (
                    <article key={`exercise-${exerciseIndex}`} className="surface-card">
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <div className="w-full space-y-2">
                          <textarea
                            value={exercise.note ?? ""}
                            onChange={(event) =>
                              setPayload((prev) => {
                                if (!prev) {
                                  return prev;
                                }
                                const next = { ...prev };
                                next.exercises[exerciseIndex] = {
                                  ...next.exercises[exerciseIndex],
                                  note: event.target.value,
                                };
                                return next;
                              })
                            }
                            placeholder="Exercise note (optional)"
                            className="field min-h-[60px]"
                          />
                          <input
                            value={exercise.name}
                            onChange={(event) =>
                              setPayload((prev) => {
                                if (!prev) {
                                  return prev;
                                }
                                const next = { ...prev };
                                next.exercises[exerciseIndex] = {
                                  ...next.exercises[exerciseIndex],
                                  name: event.target.value,
                                };
                                return next;
                              })
                            }
                            list={EXERCISE_DATALIST_ID}
                            placeholder={`Exercise ${exerciseIndex + 1}`}
                            className="field"
                          />
                          {exercise.name.trim() && (
                            <p className="text-xs text-zinc-500 dark:text-zinc-400">
                              Muscle: {resolveMuscleGroup(exercise.name)}
                            </p>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => removeExercise(exerciseIndex)}
                          disabled={payload.exercises.length === 1}
                          className="btn btn-secondary"
                        >
                          Remove
                        </button>
                      </div>
                      <div className="space-y-2">
                        <div className="grid grid-cols-[auto_1fr_1fr_auto_auto] gap-2 px-1 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                          <span>Set</span>
                          <span>{isTimedExerciseName(exercise.name) ? "Time" : "Reps"}</span>
                          <span>Weight</span>
                          <span>Done</span>
                          <span></span>
                        </div>
                        {exercise.sets.map((set, setIndex) => (
                          (() => {
                            const setKey = getSetKey(exerciseIndex, setIndex);
                            const setType = set.type ?? "normal";
                            const isCompleted = Boolean(set.completed);
                            return (
                          <div
                            key={`set-${exerciseIndex}-${setIndex}`}
                            className={`surface-soft grid grid-cols-1 gap-2 p-2 sm:grid-cols-[auto_1fr_1fr_auto_auto] sm:items-center ${
                              isCompleted ? "set-row-complete" : ""
                            }`}
                          >
                            <div className="relative">
                              <button
                                type="button"
                                onClick={() =>
                                  setActiveSetTypeKey((previous) => (previous === setKey ? null : setKey))
                                }
                                className={`inline-flex min-w-[28px] cursor-pointer items-center justify-center rounded-md border px-2 py-1 text-xs font-semibold leading-none shadow-sm transition-colors ${getSetTypeButtonClass(setType)}`}
                                aria-haspopup="menu"
                                aria-expanded={activeSetTypeKey === setKey}
                              >
                                {getSetTypeLabel(setType, setIndex)}
                              </button>
                              {activeSetTypeKey === setKey && (
                                <div className="absolute left-0 top-full z-20 mt-1 w-44 overflow-hidden rounded-md border border-zinc-700 bg-zinc-900 shadow-xl">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setPayload((prev) => {
                                        if (!prev) return prev;
                                        const next = { ...prev };
                                        next.exercises[exerciseIndex].sets[setIndex] = {
                                          ...next.exercises[exerciseIndex].sets[setIndex],
                                          type: "warmup",
                                        };
                                        return next;
                                      });
                                      setActiveSetTypeKey(null);
                                    }}
                                    className="flex w-full items-center justify-between px-3 py-2 text-left text-sm text-zinc-200 hover:bg-amber-500/20"
                                  >
                                    <span>Warm Up Set</span>
                                    <span className="font-semibold text-amber-400">W</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setPayload((prev) => {
                                        if (!prev) return prev;
                                        const next = { ...prev };
                                        next.exercises[exerciseIndex].sets[setIndex] = {
                                          ...next.exercises[exerciseIndex].sets[setIndex],
                                          type: "normal",
                                        };
                                        return next;
                                      });
                                      setActiveSetTypeKey(null);
                                    }}
                                    className="flex w-full items-center justify-between px-3 py-2 text-left text-sm text-zinc-200 hover:bg-zinc-800"
                                  >
                                    <span>Normal Set</span>
                                    <span className="font-semibold text-zinc-300">{setIndex + 1}</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setPayload((prev) => {
                                        if (!prev) return prev;
                                        const next = { ...prev };
                                        next.exercises[exerciseIndex].sets[setIndex] = {
                                          ...next.exercises[exerciseIndex].sets[setIndex],
                                          type: "failure",
                                        };
                                        return next;
                                      });
                                      setActiveSetTypeKey(null);
                                    }}
                                    className="flex w-full items-center justify-between px-3 py-2 text-left text-sm text-zinc-200 hover:bg-rose-500/20"
                                  >
                                    <span>Failure Set</span>
                                    <span className="font-semibold text-rose-400">F</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setPayload((prev) => {
                                        if (!prev) return prev;
                                        const next = { ...prev };
                                        next.exercises[exerciseIndex].sets[setIndex] = {
                                          ...next.exercises[exerciseIndex].sets[setIndex],
                                          type: "drop",
                                        };
                                        return next;
                                      });
                                      setActiveSetTypeKey(null);
                                    }}
                                    className="flex w-full items-center justify-between px-3 py-2 text-left text-sm text-zinc-200 hover:bg-sky-500/20"
                                  >
                                    <span>Drop Set</span>
                                    <span className="font-semibold text-sky-400">D</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      removeSet(exerciseIndex, setIndex);
                                      setActiveSetTypeKey(null);
                                    }}
                                    disabled={exercise.sets.length === 1}
                                    className="flex w-full items-center justify-between px-3 py-2 text-left text-sm text-red-300 hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
                                  >
                                    <span>Remove Set</span>
                                    <span className="font-semibold text-red-400">X</span>
                                  </button>
                                </div>
                              )}
                            </div>
                            {isTimedExerciseName(exercise.name) ? (
                              <input
                                type="text"
                                value={formatSecondsToMMSS(set.durationSeconds)}
                                onChange={(event) =>
                                  setPayload((prev) => {
                                    if (!prev) {
                                      return prev;
                                    }
                                    const next = { ...prev };
                                    const parsedDuration = parseDurationToSeconds(event.target.value);
                                    next.exercises[exerciseIndex].sets[setIndex] = {
                                      ...next.exercises[exerciseIndex].sets[setIndex],
                                      reps: undefined,
                                      durationSeconds: parsedDuration,
                                    };
                                    return next;
                                  })
                                }
                                placeholder="Time (mm:ss or sec)"
                                className="field"
                              />
                            ) : (
                              <input
                                type="number"
                                min={1}
                                value={set.reps ?? ""}
                                onChange={(event) =>
                                  setPayload((prev) => {
                                    if (!prev) {
                                      return prev;
                                    }
                                    const next = { ...prev };
                                    next.exercises[exerciseIndex].sets[setIndex] = {
                                      ...next.exercises[exerciseIndex].sets[setIndex],
                                      reps: Number(event.target.value) || undefined,
                                      durationSeconds: undefined,
                                    };
                                    return next;
                                  })
                                }
                                placeholder="Reps"
                                className="field"
                              />
                            )}
                            <input
                              type="number"
                              min={0}
                              step="0.5"
                              value={set.weight}
                              onChange={(event) =>
                                setPayload((prev) => {
                                  if (!prev) {
                                    return prev;
                                  }
                                  const next = { ...prev };
                                  next.exercises[exerciseIndex].sets[setIndex] = {
                                    ...next.exercises[exerciseIndex].sets[setIndex],
                                    weight: Number(event.target.value),
                                  };
                                  return next;
                                })
                              }
                              placeholder="Weight (kg)"
                              className="field"
                            />
                            <button
                              type="button"
                              onClick={() =>
                                setPayload((prev) => {
                                  if (!prev) {
                                    return prev;
                                  }
                                  const next = { ...prev };
                                  next.exercises[exerciseIndex].sets[setIndex] = {
                                    ...next.exercises[exerciseIndex].sets[setIndex],
                                    completed: !Boolean(next.exercises[exerciseIndex].sets[setIndex].completed),
                                  };
                                  return next;
                                })
                              }
                              className={`btn ${isCompleted ? "set-done-btn" : "btn-secondary"}`}
                              aria-pressed={isCompleted}
                            >
                              ✓
                            </button>
                            <button
                              type="button"
                              onClick={() => removeSet(exerciseIndex, setIndex)}
                              disabled={exercise.sets.length === 1}
                              className="btn btn-secondary"
                            >
                              Remove set
                            </button>
                          </div>
                            );
                          })()
                        ))}
                      </div>
                      <button
                        type="button"
                        onClick={() => addSet(exerciseIndex)}
                        className="btn btn-secondary mt-3"
                      >
                        Add set
                      </button>
                    </article>
                  ))}
                  <button
                    type="button"
                    onClick={addExercise}
                    className="btn btn-secondary"
                  >
                    Add exercise
                  </button>
                  <div className="surface-card flex flex-wrap items-center justify-between gap-3">
                    <p className="text-sm text-zinc-300">
                      {formValidationError ? "Fix validation issues before saving." : "Ready to save changes."}
                    </p>
                    <button
                      type="button"
                      onClick={handleSave}
                      disabled={!canSave}
                      className="btn btn-primary"
                    >
                      {isSaving ? "Saving..." : "Save changes"}
                    </button>
                  </div>
                  {formValidationError && (
                    <p className="text-xs text-zinc-500">{formValidationError}</p>
                  )}
                </div>
              )}
            </section>
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
