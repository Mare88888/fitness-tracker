"use client";

import { Navbar } from "@/components/navbar";
import { PageContainer } from "@/components/page-container";
import { Sidebar } from "@/components/sidebar";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { createWorkout, deleteWorkout, getWorkouts } from "@/lib/services/workout-service";
import type { CreateWorkoutInput, Workout } from "@/types/workout";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

export default function HistoryPage() {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [pendingDelete, setPendingDelete] = useState<Workout | null>(null);
  const pageSize = 5;

  useEffect(() => {
    const loadWorkouts = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await getWorkouts();
        setWorkouts(data);
      } catch (loadError) {
        const message = loadError instanceof Error ? loadError.message : "Failed to load workouts.";
        setError(message);
        toast.error(message);
      } finally {
        setIsLoading(false);
      }
    };

    void loadWorkouts();
  }, []);

  const visibleWorkouts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const filtered = workouts.filter((workout) => {
      const workoutDate = new Date(workout.date);
      const fromDate = dateFrom ? new Date(dateFrom) : null;
      const toDate = dateTo ? new Date(dateTo) : null;
      if (fromDate && workoutDate < fromDate) {
        return false;
      }
      if (toDate && workoutDate > toDate) {
        return false;
      }
      if (!normalizedQuery) {
        return true;
      }
      return (
        workout.name.toLowerCase().includes(normalizedQuery) ||
        workout.exercises.some((exercise) => exercise.name.toLowerCase().includes(normalizedQuery))
      );
    });

    const sorted = [...filtered].sort((a, b) => {
      const timeA = new Date(a.date).getTime();
      const timeB = new Date(b.date).getTime();
      return sortOrder === "desc" ? timeB - timeA : timeA - timeB;
    });

    return sorted;
  }, [dateFrom, dateTo, query, sortOrder, workouts]);

  const pageCount = Math.max(1, Math.ceil(visibleWorkouts.length / pageSize));
  const paginatedWorkouts = visibleWorkouts.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => {
    setPage(1);
  }, [dateFrom, dateTo, query, sortOrder]);

  useEffect(() => {
    if (page > pageCount) {
      setPage(pageCount);
    }
  }, [page, pageCount]);

  const handleDelete = async () => {
    if (!pendingDelete) {
      return;
    }
    const workout = pendingDelete;

    try {
      await deleteWorkout(workout.id);
      setWorkouts((previous) => previous.filter((item) => item.id !== workout.id));
      setPendingDelete(null);
      toast.success("Workout deleted.", {
        action: {
          label: "Undo",
          onClick: async () => {
            const payload: CreateWorkoutInput = {
              name: workout.name,
              date: workout.date,
              exercises: workout.exercises.map((exercise) => ({
                name: exercise.name,
                sets: exercise.sets.map((set) => ({
                  reps: set.reps,
                  weight: set.weight,
                })),
              })),
            };
            try {
              const restored = await createWorkout(payload);
              setWorkouts((previous) => [restored, ...previous]);
              toast.success("Workout restored.");
            } catch (restoreError) {
              const message =
                restoreError instanceof Error ? restoreError.message : "Failed to restore workout.";
              toast.error(message);
            }
          },
        },
      });
    } catch (deleteError) {
      const message = deleteError instanceof Error ? deleteError.message : "Failed to delete workout.";
      toast.error(message);
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
              <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">Workout History</h1>
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                Review previously saved workouts from your backend.
              </p>
              {!isLoading && !error && workouts.length > 0 && (
                <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-4">
                  <input
                    type="search"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search by workout or exercise name"
                    className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:focus:ring-zinc-800"
                  />
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(event) => setDateFrom(event.target.value)}
                    className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:focus:ring-zinc-800"
                  />
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(event) => setDateTo(event.target.value)}
                    className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:focus:ring-zinc-800"
                  />
                  <select
                    value={sortOrder}
                    onChange={(event) => setSortOrder(event.target.value as "desc" | "asc")}
                    className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:focus:ring-zinc-800"
                  >
                    <option value="desc">Newest first</option>
                    <option value="asc">Oldest first</option>
                  </select>
                </div>
              )}

              {isLoading && (
                <div className="mt-4 space-y-3">
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-20 w-full" />
                </div>
              )}

              {error && (
                <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {error}
                </p>
              )}

              {!isLoading && !error && workouts.length === 0 && (
                <div className="mt-4">
                  <EmptyState
                    title="No workouts yet"
                    description="Start your first workout to see your history here."
                    actionLabel="Start workout"
                    actionHref="/workouts/start"
                  />
                </div>
              )}

              {!isLoading && !error && workouts.length > 0 && (
                <ul className="mt-4 space-y-3">
                  {paginatedWorkouts.map((workout) => (
                    <li key={workout.id} className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-sm dark:border-zinc-700 dark:bg-zinc-800/60">
                      <p className="font-semibold text-zinc-900 dark:text-zinc-100">{workout.name}</p>
                      <p className="text-zinc-600 dark:text-zinc-400">Date: {workout.date}</p>
                      <p className="text-zinc-600 dark:text-zinc-400">
                        Exercises: {workout.exercises.length}
                      </p>
                      <div className="mt-2 flex gap-3">
                        <Link
                          href={`/history/${workout.id}`}
                          className="inline-block text-sm font-medium text-zinc-900 underline-offset-4 hover:underline dark:text-zinc-100"
                        >
                          View details
                        </Link>
                        <Link
                          href={`/workouts/${workout.id}/edit`}
                          className="inline-block text-sm font-medium text-zinc-900 underline-offset-4 hover:underline dark:text-zinc-100"
                        >
                          Edit
                        </Link>
                        <button
                          type="button"
                          onClick={() => setPendingDelete(workout)}
                          className="text-sm font-medium text-red-700 underline-offset-4 hover:underline dark:text-red-400"
                        >
                          Delete
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              {!isLoading && !error && workouts.length > 0 && visibleWorkouts.length === 0 && (
                <div className="mt-4">
                  <EmptyState
                    title="No matching workouts"
                    description="Try a different search term."
                  />
                </div>
              )}
              {!isLoading && !error && visibleWorkouts.length > 0 && (
                <div className="mt-4 flex items-center justify-between text-sm text-zinc-600 dark:text-zinc-300">
                  <p>
                    Page {page} of {pageCount}
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={page <= 1}
                      onClick={() => setPage((previous) => Math.max(1, previous - 1))}
                      className="rounded border border-zinc-300 px-3 py-1 disabled:opacity-50 dark:border-zinc-700"
                    >
                      Previous
                    </button>
                    <button
                      type="button"
                      disabled={page >= pageCount}
                      onClick={() => setPage((previous) => Math.min(pageCount, previous + 1))}
                      className="rounded border border-zinc-300 px-3 py-1 disabled:opacity-50 dark:border-zinc-700"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </section>
          </PageContainer>
        </div>
      </div>
      <ConfirmModal
        isOpen={Boolean(pendingDelete)}
        title="Delete workout?"
        description={
          pendingDelete
            ? `This will delete ${pendingDelete.name}. You can still undo from the toast.`
            : ""
        }
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onConfirm={handleDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
