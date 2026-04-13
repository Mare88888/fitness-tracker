"use client";

import { Navbar } from "@/components/navbar";
import { PageContainer } from "@/components/page-container";
import { Sidebar } from "@/components/sidebar";
import { EmptyState } from "@/components/ui/empty-state";
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

export default function EditWorkoutPage({ params }: EditWorkoutPageProps) {
  const router = useRouter();
  const [workoutId, setWorkoutId] = useState<number | null>(null);
  const [payload, setPayload] = useState<CreateWorkoutInput | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [catalogItems, setCatalogItems] = useState<ExerciseCatalogItem[]>([]);

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
        exercise.sets.some((set) => Number.isNaN(set.reps) || Number.isNaN(set.weight) || set.reps <= 0 || set.weight < 0)
      )
    ) {
      return "Each set needs valid values: reps > 0 and weight >= 0.";
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
            sets: exercise.sets.map((set) => ({ reps: set.reps, weight: set.weight })),
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
        exercise.sets.some((set) => Number.isNaN(set.reps) || Number.isNaN(set.weight) || set.reps <= 0 || set.weight < 0)
      )
    ) {
      setError("Each set needs valid values: reps > 0 and weight >= 0.");
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
        exercises: [...previous.exercises, { name: "", sets: [{ reps: 1, weight: 0 }] }],
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
        sets: [...currentExercise.sets, { reps: 1, weight: 0 }],
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
            <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
              <Link
                href="/history"
                className="mb-4 inline-block text-sm font-medium text-zinc-700 underline-offset-4 hover:underline dark:text-zinc-300"
              >
                Back to history
              </Link>
              <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">Edit Workout</h1>
              {isLoading && <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">Loading workout...</p>}
              {error && (
                <p className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
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
                  <div>
                    <label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                      Workout name
                    </label>
                    <input
                      value={payload.name}
                      onChange={(event) => setPayload((prev) => (prev ? { ...prev, name: event.target.value } : prev))}
                      className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:focus:ring-zinc-800"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                      Workout date
                    </label>
                    <input
                      type="date"
                      value={payload.date}
                      onChange={(event) => setPayload((prev) => (prev ? { ...prev, date: event.target.value } : prev))}
                      className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:focus:ring-zinc-800"
                    />
                  </div>
                  {payload.exercises.map((exercise, exerciseIndex) => (
                    <article key={`exercise-${exerciseIndex}`} className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-700">
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <input
                          value={exercise.name}
                          onChange={(event) =>
                            setPayload((prev) => {
                              if (!prev) {
                                return prev;
                              }
                              const next = { ...prev };
                              next.exercises[exerciseIndex] = { ...next.exercises[exerciseIndex], name: event.target.value };
                              return next;
                            })
                          }
                          list={EXERCISE_DATALIST_ID}
                          placeholder={`Exercise ${exerciseIndex + 1}`}
                          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:focus:ring-zinc-800"
                        />
                        <button
                          type="button"
                          onClick={() => removeExercise(exerciseIndex)}
                          disabled={payload.exercises.length === 1}
                          className="rounded-md border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                        >
                          Remove
                        </button>
                      </div>
                      <div className="space-y-2">
                        {exercise.name.trim() && (
                          <p className="text-xs text-zinc-500 dark:text-zinc-400">
                            Muscle: {resolveMuscleGroup(exercise.name)}
                          </p>
                        )}
                        {exercise.sets.map((set, setIndex) => (
                          <div key={`set-${exerciseIndex}-${setIndex}`} className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1fr_auto]">
                            <input
                              type="number"
                              min={1}
                              value={set.reps}
                              onChange={(event) =>
                                setPayload((prev) => {
                                  if (!prev) {
                                    return prev;
                                  }
                                  const next = { ...prev };
                                  next.exercises[exerciseIndex].sets[setIndex] = {
                                    ...next.exercises[exerciseIndex].sets[setIndex],
                                    reps: Number(event.target.value),
                                  };
                                  return next;
                                })
                              }
                              placeholder="Reps"
                              className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:focus:ring-zinc-800"
                            />
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
                              className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:focus:ring-zinc-800"
                            />
                            <button
                              type="button"
                              onClick={() => removeSet(exerciseIndex, setIndex)}
                              disabled={exercise.sets.length === 1}
                              className="rounded-md border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                      </div>
                      <button
                        type="button"
                        onClick={() => addSet(exerciseIndex)}
                        className="mt-3 rounded-md border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                      >
                        Add set
                      </button>
                    </article>
                  ))}
                  <button
                    type="button"
                    onClick={addExercise}
                    className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-800 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                  >
                    Add exercise
                  </button>
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={!canSave}
                    className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
                  >
                    {isSaving ? "Saving..." : "Save changes"}
                  </button>
                  {formValidationError && (
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">{formValidationError}</p>
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
