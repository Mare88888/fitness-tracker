"use client";

import { Navbar } from "@/components/navbar";
import { PageContainer } from "@/components/page-container";
import { Sidebar } from "@/components/sidebar";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { formatSecondsToMMSS } from "@/lib/duration-format";
import { createWorkout, deleteWorkout, getWorkoutById } from "@/lib/services/workout-service";
import type { Workout } from "@/types/workout";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

type WorkoutDetailsPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default function WorkoutDetailsPage({ params }: WorkoutDetailsPageProps) {
  const router = useRouter();
  const [workout, setWorkout] = useState<Workout | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  useEffect(() => {
    const loadWorkout = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const { id } = await params;
        const workoutId = Number(id);

        if (Number.isNaN(workoutId)) {
          setError("Invalid workout id.");
          return;
        }

        const data = await getWorkoutById(workoutId);
        setWorkout(data);
      } catch (loadError) {
        const message = loadError instanceof Error ? loadError.message : "Failed to load workout.";
        setError(message);
        toast.error(message);
      } finally {
        setIsLoading(false);
      }
    };

    void loadWorkout();
  }, [params]);

  const handleDelete = async () => {
    if (!workout) {
      return;
    }
    try {
      await deleteWorkout(workout.id);
      setIsDeleteModalOpen(false);
      toast.success("Workout deleted.", {
        action: {
          label: "Undo",
          onClick: async () => {
            try {
              await createWorkout({
                name: workout.name,
                date: workout.date,
                exercises: workout.exercises.map((exercise) => ({
                  name: exercise.name,
                  sets: exercise.sets.map((set) => ({
                    reps: set.reps ?? undefined,
                    durationSeconds: set.durationSeconds ?? undefined,
                    weight: set.weight,
                  })),
                })),
              });
              toast.success("Workout restored.");
              router.push("/history");
            } catch {
              toast.error("Failed to restore workout.");
            }
          },
        },
      });
      router.push("/history");
    } catch (deleteError) {
      toast.error(deleteError instanceof Error ? deleteError.message : "Failed to delete workout.");
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
              <Link
                href="/history"
                className="mb-4 inline-block text-sm font-medium text-zinc-700 underline-offset-4 hover:underline dark:text-zinc-300"
              >
                Back to history
              </Link>

              {isLoading && (
                <div className="space-y-3">
                  <Skeleton className="h-8 w-1/3" />
                  <Skeleton className="h-5 w-1/4" />
                  <Skeleton className="h-24 w-full" />
                  <Skeleton className="h-24 w-full" />
                </div>
              )}

              {error && (
                <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {error}
                </p>
              )}

              {!isLoading && !error && !workout && (
                <EmptyState
                  title="Workout not found"
                  description="The workout may have been deleted or the URL is incorrect."
                  actionLabel="Back to history"
                  actionHref="/history"
                />
              )}

              {!isLoading && !error && workout && (
                <div className="space-y-4">
                  <header>
                    <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
                      {workout.name}
                    </h1>
                    <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">Date: {workout.formattedDate ?? workout.date}</p>
                    <div className="mt-3 flex gap-3">
                      <Link
                        href={`/workouts/${workout.id}/edit`}
                        className="btn btn-secondary px-2.5 py-1.5 text-xs"
                      >
                        Edit workout
                      </Link>
                      <button
                        type="button"
                        onClick={() => setIsDeleteModalOpen(true)}
                        className="btn btn-danger px-2.5 py-1.5 text-xs"
                      >
                        Delete workout
                      </button>
                    </div>
                  </header>

                  {workout.exercises.length === 0 ? (
                    <EmptyState
                      title="No exercises in this workout"
                      description="Add exercises while creating workouts to see details here."
                    />
                  ) : (
                    <div className="space-y-3">
                      {workout.exercises.map((exercise, exerciseIndex) => (
                        <article
                          key={exercise.id}
                          className="surface-card"
                        >
                          <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">
                            {exerciseIndex + 1}. {exercise.name}
                          </h2>

                          {exercise.sets.length === 0 ? (
                            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">No sets logged.</p>
                          ) : (
                            <ul className="mt-2 space-y-1 text-sm text-zinc-700 dark:text-zinc-300">
                              {exercise.sets.map((set, setIndex) => (
                                <li key={set.id}>
                                  Set {setIndex + 1}:{" "}
                                  {set.reps != null
                                    ? `${set.reps} reps`
                                    : `${formatSecondsToMMSS(set.durationSeconds)} (time)`},
                                  {" "}weight: {set.weight} kg
                                </li>
                              ))}
                            </ul>
                          )}
                        </article>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </section>
          </PageContainer>
        </div>
      </div>
      <ConfirmModal
        isOpen={isDeleteModalOpen && Boolean(workout)}
        title="Delete workout?"
        description={
          workout
            ? `This will delete ${workout.name}. You can still undo from the toast.`
            : ""
        }
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onConfirm={handleDelete}
        onCancel={() => setIsDeleteModalOpen(false)}
      />
    </div>
  );
}
