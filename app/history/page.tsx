"use client";

import { Navbar } from "@/components/navbar";
import { PageContainer } from "@/components/page-container";
import { Sidebar } from "@/components/sidebar";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { APP_NAME } from "@/lib/constants";
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
  const isFiltered =
    query.trim() !== "" || dateFrom !== "" || dateTo !== "" || sortOrder !== "desc";

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
                note: exercise.note ?? undefined,
                sets: exercise.sets.map((set) => ({
                  reps: set.reps ?? undefined,
                  durationSeconds: set.durationSeconds ?? undefined,
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
            <section className="surface-page">
              <div className="pointer-events-none absolute -right-24 -top-24 h-52 w-52 rounded-full bg-emerald-500/10 blur-3xl" />
              <div className="pointer-events-none absolute -bottom-20 -left-16 h-44 w-44 rounded-full bg-emerald-400/10 blur-3xl" />

              <div className="relative space-y-1">
                <p className="text-xs font-medium uppercase tracking-wider text-emerald-400/90">{APP_NAME}</p>
                <h1 className="text-2xl font-semibold tracking-tight text-zinc-100 sm:text-3xl">Workout history</h1>
                <p className="max-w-xl text-sm leading-relaxed text-zinc-400">
                  Search and filter past sessions, open details, or edit a copy. Deletes can be undone from the toast.
                </p>
              </div>

              {!isLoading && !error && workouts.length > 0 && (
                <div className="surface-card mt-6">
                  <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
                    <h2 className="text-sm font-semibold text-zinc-100">Filter &amp; sort</h2>
                    <p className="text-xs tabular-nums text-zinc-500">
                      {visibleWorkouts.length === workouts.length
                        ? `${workouts.length} workout${workouts.length === 1 ? "" : "s"}`
                        : `${visibleWorkouts.length} of ${workouts.length} shown`}
                    </p>
                  </div>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <div>
                      <label htmlFor="history-search" className="mb-1 block text-xs font-medium text-zinc-400">
                        Search
                      </label>
                      <input
                        id="history-search"
                        type="search"
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder="Workout or exercise…"
                        className="field"
                        autoComplete="off"
                      />
                    </div>
                    <div>
                      <label htmlFor="history-from" className="mb-1 block text-xs font-medium text-zinc-400">
                        From
                      </label>
                      <input
                        id="history-from"
                        type="date"
                        value={dateFrom}
                        onChange={(event) => setDateFrom(event.target.value)}
                        className="field"
                      />
                    </div>
                    <div>
                      <label htmlFor="history-to" className="mb-1 block text-xs font-medium text-zinc-400">
                        To
                      </label>
                      <input
                        id="history-to"
                        type="date"
                        value={dateTo}
                        onChange={(event) => setDateTo(event.target.value)}
                        className="field"
                      />
                    </div>
                    <div>
                      <label htmlFor="history-sort" className="mb-1 block text-xs font-medium text-zinc-400">
                        Order
                      </label>
                      <select
                        id="history-sort"
                        value={sortOrder}
                        onChange={(event) => setSortOrder(event.target.value as "desc" | "asc")}
                        className="field field-select"
                      >
                        <option value="desc">Newest first</option>
                        <option value="asc">Oldest first</option>
                      </select>
                    </div>
                  </div>
                  {isFiltered && (
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-zinc-800/80 pt-4">
                      <p className="text-xs text-zinc-500">Filters active — adjust fields above or clear dates/search.</p>
                      <button
                        type="button"
                        onClick={() => {
                          setQuery("");
                          setDateFrom("");
                          setDateTo("");
                          setSortOrder("desc");
                        }}
                        className="btn btn-ghost px-2 py-1 text-xs"
                      >
                        Reset filters
                      </button>
                    </div>
                  )}
                </div>
              )}

              {isLoading && (
                <div className="mt-6 space-y-3">
                  <Skeleton className="h-32 w-full rounded-xl border border-zinc-800/80" />
                  <Skeleton className="h-28 w-full rounded-xl border border-zinc-800/80" />
                  <Skeleton className="h-28 w-full rounded-xl border border-zinc-800/80" />
                </div>
              )}

              {error && (
                <p
                  className="mt-6 rounded-lg border border-rose-500/40 bg-rose-950/25 px-4 py-3 text-sm text-rose-100"
                  role="alert"
                >
                  {error}
                </p>
              )}

              {!isLoading && !error && workouts.length === 0 && (
                <div className="mt-6">
                  <EmptyState
                    title="No workouts yet"
                    description="Start your first workout - then your history shows up here."
                    actionLabel="Start workout"
                    actionHref="/workouts/start"
                  />
                </div>
              )}

              {!isLoading && !error && workouts.length > 0 && visibleWorkouts.length > 0 && (
                <ul className="mt-6 space-y-3">
                  {paginatedWorkouts.map((workout) => (
                    <li
                      key={workout.id}
                      className="surface-card text-sm transition-colors hover:border-zinc-500/60"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-semibold text-zinc-100">{workout.name}</p>
                          <p className="mt-0.5 text-xs text-zinc-400">
                            {workout.formattedDate ?? workout.date}
                          </p>
                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            <span className="inline-flex rounded-md border border-zinc-700/80 bg-zinc-900/50 px-2 py-0.5 text-[11px] font-medium text-zinc-300">
                              {workout.exercises.length} exercise
                              {workout.exercises.length === 1 ? "" : "s"}
                            </span>
                          </div>
                        </div>
                        <span className="shrink-0 rounded-full border border-zinc-600 bg-zinc-900/80 px-2.5 py-1 text-[11px] font-medium tabular-nums text-zinc-400">
                          ID {workout.id}
                        </span>
                      </div>
                      <div className="mt-4 flex flex-wrap gap-2 border-t border-zinc-800/80 pt-3">
                        <Link
                          href={`/history/${workout.id}`}
                          className="btn btn-secondary px-3 py-1.5 text-xs"
                        >
                          View details
                        </Link>
                        <Link
                          href={`/workouts/${workout.id}/edit`}
                          className="btn btn-secondary px-3 py-1.5 text-xs"
                        >
                          Edit
                        </Link>
                        <button
                          type="button"
                          onClick={() => setPendingDelete(workout)}
                          className="btn btn-danger px-3 py-1.5 text-xs"
                        >
                          Delete
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              {!isLoading && !error && workouts.length > 0 && visibleWorkouts.length === 0 && (
                <div className="mt-6">
                  <EmptyState
                    title="No matching workouts"
                    description="Try another search - or reset filters to see everything."
                  />
                </div>
              )}
              {!isLoading && !error && visibleWorkouts.length > 0 && (
                <div className="surface-card mt-6 flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm tabular-nums text-zinc-400">
                    Page <span className="font-medium text-zinc-200">{page}</span> of{" "}
                    <span className="font-medium text-zinc-200">{pageCount}</span>
                    <span className="text-zinc-600"> · </span>
                    {visibleWorkouts.length} total
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={page <= 1}
                      onClick={() => setPage((previous) => Math.max(1, previous - 1))}
                      className="btn btn-secondary px-3 py-1.5 text-xs"
                    >
                      ← Previous
                    </button>
                    <button
                      type="button"
                      disabled={page >= pageCount}
                      onClick={() => setPage((previous) => Math.min(pageCount, previous + 1))}
                      className="btn btn-secondary px-3 py-1.5 text-xs"
                    >
                      Next →
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
