"use client";

import { Navbar } from "@/components/navbar";
import { PageContainer } from "@/components/page-container";
import { Sidebar } from "@/components/sidebar";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { getWorkouts } from "@/lib/services/workout-service";
import type { Workout } from "@/types/workout";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export default function HistoryPage() {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
                  {workouts.map((workout) => (
                    <li key={workout.id} className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-sm dark:border-zinc-700 dark:bg-zinc-800/60">
                      <p className="font-semibold text-zinc-900 dark:text-zinc-100">{workout.name}</p>
                      <p className="text-zinc-600 dark:text-zinc-400">Date: {workout.date}</p>
                      <p className="text-zinc-600 dark:text-zinc-400">
                        Exercises: {workout.exercises.length}
                      </p>
                      <Link
                        href={`/history/${workout.id}`}
                        className="mt-2 inline-block text-sm font-medium text-zinc-900 underline-offset-4 hover:underline dark:text-zinc-100"
                      >
                        View details
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </PageContainer>
        </div>
      </div>
    </div>
  );
}
