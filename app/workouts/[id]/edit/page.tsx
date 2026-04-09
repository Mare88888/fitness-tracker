"use client";

import { Navbar } from "@/components/navbar";
import { PageContainer } from "@/components/page-container";
import { Sidebar } from "@/components/sidebar";
import { EmptyState } from "@/components/ui/empty-state";
import { getWorkoutById, updateWorkout } from "@/lib/services/workout-service";
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

export default function EditWorkoutPage({ params }: EditWorkoutPageProps) {
  const router = useRouter();
  const [workoutId, setWorkoutId] = useState<number | null>(null);
  const [payload, setPayload] = useState<CreateWorkoutInput | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const handleSave = async () => {
    if (!payload || workoutId == null) {
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
                  {payload.exercises.map((exercise, exerciseIndex) => (
                    <article key={`exercise-${exerciseIndex}`} className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-700">
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
                        className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:focus:ring-zinc-800"
                      />
                    </article>
                  ))}
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={isSaving}
                    className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
                  >
                    {isSaving ? "Saving..." : "Save changes"}
                  </button>
                </div>
              )}
            </section>
          </PageContainer>
        </div>
      </div>
    </div>
  );
}
