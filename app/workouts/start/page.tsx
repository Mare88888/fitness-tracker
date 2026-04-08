"use client";

import { Navbar } from "@/components/navbar";
import { PageContainer } from "@/components/page-container";
import { RestTimer } from "@/components/rest-timer";
import { Sidebar } from "@/components/sidebar";
import { EmptyState } from "@/components/ui/empty-state";
import { createWorkout, getWorkouts } from "@/lib/services/workout-service";
import type { CreateWorkoutInput, Workout } from "@/types/workout";
import { useState } from "react";
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
  const [workoutName, setWorkoutName] = useState("");
  const [exercises, setExercises] = useState<WorkoutExercise[]>([createExercise()]);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingWorkouts, setIsLoadingWorkouts] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);
  const [loadedWorkouts, setLoadedWorkouts] = useState<Workout[]>([]);

  const addExercise = () => {
    setExercises((previous) => [...previous, createExercise()]);
  };

  const removeExercise = (exerciseId: string) => {
    setExercises((previous) => previous.filter((exercise) => exercise.id !== exerciseId));
  };

  const updateExerciseName = (exerciseId: string, name: string) => {
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

  const updateSetField = (
    exerciseId: string,
    setId: string,
    field: "reps" | "weight",
    value: string
  ) => {
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

  const handleCreateWorkout = async () => {
    setFeedbackMessage(null);
    setFeedbackError(null);

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
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to create workout.";
      setFeedbackError(message);
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
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
            <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
              <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:p-6">
                <div className="mb-6">
                  <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">Start Workout</h1>
                  <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                    Add exercises and log your sets with reps and weight.
                  </p>
                </div>

                <div className="space-y-6">
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
                      className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:focus:ring-zinc-800"
                    />
                  </div>

                  <div className="space-y-4">
                    {exercises.map((exercise, exerciseIndex) => (
                      <article
                        key={exercise.id}
                        className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800/60"
                      >
                        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div className="w-full">
                            <label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                              Exercise {exerciseIndex + 1}
                            </label>
                            <input
                              type="text"
                              value={exercise.name}
                              onChange={(event) =>
                                updateExerciseName(exercise.id, event.target.value)
                              }
                              placeholder="e.g. Bench Press"
                              className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:focus:ring-zinc-800"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => removeExercise(exercise.id)}
                            disabled={exercises.length === 1}
                            className="self-start rounded-md border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                          >
                            Remove exercise
                          </button>
                        </div>

                        <div className="space-y-3">
                          {exercise.sets.map((set, setIndex) => (
                            <div
                              key={set.id}
                              className="grid grid-cols-1 gap-3 rounded-md border border-zinc-200 bg-white p-3 sm:grid-cols-[auto_1fr_1fr_auto] dark:border-zinc-700 dark:bg-zinc-900"
                            >
                              <div className="flex items-center text-sm font-medium text-zinc-700 dark:text-zinc-300">
                                Set {setIndex + 1}
                              </div>
                              <input
                                type="number"
                                min={0}
                                inputMode="numeric"
                                placeholder="Reps"
                                value={set.reps}
                                onChange={(event) =>
                                  updateSetField(exercise.id, set.id, "reps", event.target.value)
                                }
                                className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:focus:ring-zinc-800"
                              />
                              <input
                                type="number"
                                min={0}
                                step="0.5"
                                inputMode="decimal"
                                placeholder="Weight (kg)"
                                value={set.weight}
                                onChange={(event) =>
                                  updateSetField(exercise.id, set.id, "weight", event.target.value)
                                }
                                className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:focus:ring-zinc-800"
                              />
                              <button
                                type="button"
                                onClick={() => removeSet(exercise.id, set.id)}
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
                          onClick={() => addSet(exercise.id)}
                          className="mt-4 rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
                        >
                          Add set
                        </button>
                      </article>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={addExercise}
                    className="w-full rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-800 transition hover:bg-zinc-100 sm:w-auto dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                  >
                    Add exercise
                  </button>

                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={handleCreateWorkout}
                      disabled={isSaving}
                      className="w-full rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
                    >
                      {isSaving ? "Saving..." : "Save workout"}
                    </button>
                    <button
                      type="button"
                      onClick={handleLoadWorkouts}
                      disabled={isLoadingWorkouts}
                      className="w-full rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-800 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                    >
                      {isLoadingWorkouts ? "Loading..." : "Load workouts (integration test)"}
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

                  {loadedWorkouts.length > 0 ? (
                    <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800/60">
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

              <RestTimer className="xl:sticky xl:top-6" />
            </div>
          </PageContainer>
        </div>
      </div>
    </div>
  );
}
