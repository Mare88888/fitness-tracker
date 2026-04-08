"use client";

import { Navbar } from "@/components/navbar";
import { PageContainer } from "@/components/page-container";
import { Sidebar } from "@/components/sidebar";
import { getWorkouts } from "@/lib/services/workout-service";
import type { Workout } from "@/types/workout";
import Link from "next/link";
import { useEffect, useState } from "react";

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
        setError(loadError instanceof Error ? loadError.message : "Failed to load workouts.");
      } finally {
        setIsLoading(false);
      }
    };

    void loadWorkouts();
  }, []);

  return (
    <div className="min-h-screen bg-zinc-50">
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="flex min-h-screen min-w-0 flex-1 flex-col">
          <Navbar />
          <PageContainer>
            <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
              <h1 className="text-2xl font-semibold text-zinc-900">Workout History</h1>
              <p className="mt-2 text-sm text-zinc-600">
                Review previously saved workouts from your backend.
              </p>

              {isLoading && <p className="mt-4 text-sm text-zinc-600">Loading workouts...</p>}

              {error && (
                <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {error}
                </p>
              )}

              {!isLoading && !error && workouts.length === 0 && (
                <p className="mt-4 text-sm text-zinc-600">No workouts saved yet.</p>
              )}

              {!isLoading && !error && workouts.length > 0 && (
                <ul className="mt-4 space-y-3">
                  {workouts.map((workout) => (
                    <li
                      key={workout.id}
                      className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-sm"
                    >
                      <p className="font-semibold text-zinc-900">{workout.name}</p>
                      <p className="text-zinc-600">Date: {workout.date}</p>
                      <p className="text-zinc-600">Exercises: {workout.exercises.length}</p>
                      <Link
                        href={`/history/${workout.id}`}
                        className="mt-2 inline-block text-sm font-medium text-zinc-900 underline-offset-4 hover:underline"
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
