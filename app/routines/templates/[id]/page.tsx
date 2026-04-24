"use client";

import { Navbar } from "@/components/navbar";
import { PageContainer } from "@/components/page-container";
import { Sidebar } from "@/components/sidebar";
import { formatSecondsToMMSS, parseDurationToSeconds } from "@/lib/duration-format";
import { getTemplateById, updateTemplate } from "@/lib/services/template-service";
import type { CreateWorkoutTemplateInput, WorkoutTemplate } from "@/types/template";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

type DragItem =
  | { type: "exercise"; exerciseIndex: number }
  | { type: "set"; exerciseIndex: number; setIndex: number };

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

export default function EditTemplatePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const templateId = Number(params.id);

  const [template, setTemplate] = useState<WorkoutTemplate | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [dragItem, setDragItem] = useState<DragItem | null>(null);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      try {
        const data = await getTemplateById(templateId);
        setTemplate(data);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to load template.";
        toast.error(message);
        router.push("/routines");
      } finally {
        setIsLoading(false);
      }
    };

    if (Number.isFinite(templateId) && templateId > 0) {
      void load();
    } else {
      toast.error("Invalid template ID.");
      router.push("/routines");
    }
  }, [router, templateId]);

  const updateExerciseName = (exerciseIndex: number, name: string) => {
    setTemplate((prev) => {
      if (!prev) return prev;
      const next = structuredClone(prev);
      next.exercises[exerciseIndex].name = name;
      return next;
    });
  };

  const updateSet = (
    exerciseIndex: number,
    setIndex: number,
    field: "reps" | "weight" | "durationSeconds",
    value: number
  ) => {
    setTemplate((prev) => {
      if (!prev) return prev;
      const next = structuredClone(prev);
      const current = next.exercises[exerciseIndex].sets[setIndex];
      if (field === "reps") {
        current.reps = value || null;
        current.durationSeconds = null;
      } else if (field === "durationSeconds") {
        current.durationSeconds = value || null;
        current.reps = null;
      } else {
        current.weight = value;
      }
      return next;
    });
  };

  const addExercise = () => {
    setTemplate((prev) => {
      if (!prev) return prev;
      const next = structuredClone(prev);
      next.exercises.push({
        id: Date.now(),
        name: "",
        sets: [{ id: Date.now() + 1, reps: 10, durationSeconds: null, weight: 0 }],
      });
      return next;
    });
  };

  const removeExercise = (exerciseIndex: number) => {
    setTemplate((prev) => {
      if (!prev) return prev;
      const next = structuredClone(prev);
      next.exercises.splice(exerciseIndex, 1);
      return next;
    });
  };

  const addSet = (exerciseIndex: number) => {
    setTemplate((prev) => {
      if (!prev) return prev;
      const next = structuredClone(prev);
      next.exercises[exerciseIndex].sets.push({
        id: Date.now(),
        reps: 10,
        durationSeconds: null,
        weight: 0,
      });
      return next;
    });
  };

  const removeSet = (exerciseIndex: number, setIndex: number) => {
    setTemplate((prev) => {
      if (!prev) return prev;
      const next = structuredClone(prev);
      next.exercises[exerciseIndex].sets.splice(setIndex, 1);
      return next;
    });
  };

  const moveExercise = (fromIndex: number, toIndex: number) => {
    setTemplate((prev) => {
      if (!prev || fromIndex === toIndex) return prev;
      const next = structuredClone(prev);
      const [item] = next.exercises.splice(fromIndex, 1);
      next.exercises.splice(toIndex, 0, item);
      return next;
    });
  };

  const moveSet = (exerciseIndex: number, fromIndex: number, toIndex: number) => {
    setTemplate((prev) => {
      if (!prev || fromIndex === toIndex) return prev;
      const next = structuredClone(prev);
      const sets = next.exercises[exerciseIndex].sets;
      const [item] = sets.splice(fromIndex, 1);
      sets.splice(toIndex, 0, item);
      return next;
    });
  };

  const handleSave = async () => {
    if (!template) return;

    const payload: CreateWorkoutTemplateInput = {
      name: template.name.trim(),
      exercises: template.exercises.map((exercise) => ({
        name: exercise.name.trim(),
        sets: exercise.sets.map((set) => ({
          reps: set.reps != null ? Number(set.reps) : undefined,
          durationSeconds: set.durationSeconds != null ? Number(set.durationSeconds) : undefined,
          weight: Number(set.weight),
        })),
      })),
    };

    if (!payload.name || payload.exercises.length === 0) {
      toast.error("Template name and at least one exercise are required.");
      return;
    }

    setIsSaving(true);
    try {
      await updateTemplate(templateId, payload);
      toast.success("Template updated.");
      router.push("/routines");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to update template.";
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="flex min-h-screen min-w-0 flex-1 flex-col">
          <Navbar />
          <PageContainer>
            <section className="surface-page">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">Edit template</h1>
                <Link
                  href="/routines"
                  className="btn btn-secondary"
                >
                  Back
                </Link>
              </div>

              {isLoading || !template ? (
                <p className="text-sm text-zinc-600 dark:text-zinc-400">Loading template...</p>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-200">Template name</label>
                    <input
                      value={template.name}
                      onChange={(event) => setTemplate((prev) => (prev ? { ...prev, name: event.target.value } : prev))}
                      className="field"
                    />
                  </div>

                  {template.exercises.map((exercise, exerciseIndex) => (
                    <div
                      key={exercise.id}
                      draggable
                      onDragStart={() => setDragItem({ type: "exercise", exerciseIndex })}
                      onDragOver={(event) => event.preventDefault()}
                      onDrop={() => {
                        if (dragItem?.type === "exercise") {
                          moveExercise(dragItem.exerciseIndex, exerciseIndex);
                          setDragItem(null);
                        }
                      }}
                      className="surface-card"
                    >
                      <div className="mb-2 flex items-center gap-2">
                        <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Drag</span>
                        <input
                          value={exercise.name}
                          onChange={(event) => updateExerciseName(exerciseIndex, event.target.value)}
                          placeholder="Exercise name"
                          className="field flex-1"
                        />
                        <button
                          type="button"
                          onClick={() => removeExercise(exerciseIndex)}
                          className="btn btn-danger px-2 py-2 text-xs"
                        >
                          Remove
                        </button>
                      </div>

                      <div className="space-y-2">
                        {exercise.sets.map((set, setIndex) => (
                          <div
                            key={set.id}
                            draggable
                            onDragStart={() => setDragItem({ type: "set", exerciseIndex, setIndex })}
                            onDragOver={(event) => event.preventDefault()}
                            onDrop={() => {
                              if (dragItem?.type === "set" && dragItem.exerciseIndex === exerciseIndex) {
                                moveSet(exerciseIndex, dragItem.setIndex, setIndex);
                                setDragItem(null);
                              }
                            }}
                            className="surface-soft grid grid-cols-1 gap-2 p-3 md:grid-cols-[1fr_1fr_auto]"
                          >
                            {isTimedExerciseName(exercise.name) ? (
                              <input
                                type="text"
                                value={formatSecondsToMMSS(set.durationSeconds)}
                                onChange={(event) =>
                                  updateSet(
                                    exerciseIndex,
                                    setIndex,
                                    "durationSeconds",
                                    parseDurationToSeconds(event.target.value) ?? 0
                                  )
                                }
                                className="field"
                                placeholder="Time (mm:ss or sec)"
                              />
                            ) : (
                              <input
                                type="number"
                                min={1}
                                value={set.reps ?? ""}
                                onChange={(event) => updateSet(exerciseIndex, setIndex, "reps", Number(event.target.value))}
                                className="field"
                                placeholder="Reps"
                              />
                            )}
                            <input
                              type="number"
                              min={0}
                              step="0.5"
                              value={set.weight}
                              onChange={(event) => updateSet(exerciseIndex, setIndex, "weight", Number(event.target.value))}
                              className="field"
                              placeholder="Weight"
                            />
                            <button
                              type="button"
                              onClick={() => removeSet(exerciseIndex, setIndex)}
                              className="btn btn-danger px-2 py-2 text-xs"
                            >
                              Remove set
                            </button>
                          </div>
                        ))}
                      </div>

                      <button
                        type="button"
                        onClick={() => addSet(exerciseIndex)}
                        className="btn btn-secondary mt-2 px-2 py-1 text-xs"
                      >
                        Add set
                      </button>
                    </div>
                  ))}

                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={addExercise}
                      className="btn btn-secondary"
                    >
                      Add exercise
                    </button>
                    <button
                      type="button"
                      disabled={isSaving}
                      onClick={handleSave}
                      className="btn btn-primary"
                    >
                      {isSaving ? "Saving..." : "Save template"}
                    </button>
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
