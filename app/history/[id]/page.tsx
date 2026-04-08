"use client";

import { Navbar } from "@/components/navbar";
import { PageContainer } from "@/components/page-container";
import { Sidebar } from "@/components/sidebar";
import { getWorkoutById } from "@/lib/services/workout-service";
import type { Workout } from "@/types/workout";
import Link from "next/link";
import { useEffect, useState } from "react";

type WorkoutDetailsPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default function WorkoutDetailsPage({ params }: WorkoutDetailsPageProps) {
  const [workout, setWorkout] = useState<Workout | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
        setError(loadError instanceof Error ? loadError.message : "Failed to load workout.");
      } finally {
        setIsLoading(false);
      }
    };

    void loadWorkout();
  }, [params]);

  return (
    <div className="min-h-screen bg-zinc-50">
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="flex min-h-screen min-w-0 flex-1 flex-col">
          <Navbar />
          <PageContainer>
            <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
              <Link
                href="/history"
                className="mb-4 inline-block text-sm font-medium text-zinc-700 underline-offset-4 hover:underline"
              >
                Back to history
              </Link>

              {isLoading && <p className="text-sm text-zinc-600">Loading workout details...</p>}

              {error && (
                <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {error}
                </p>
              )}

              {!isLoading && !error && !workout && (
                <p className="text-sm text-zinc-600">Workout not found.</p>
              )}

              {!isLoading && !error && workout && (
                <div className="space-y-4">
                  <header>
                    <h1 className="text-2xl font-semibold text-zinc-900">{workout.name}</h1>
                    <p className="mt-1 text-sm text-zinc-600">Date: {workout.date}</p>
                  </header>

                  {workout.exercises.length === 0 ? (
                    <p className="text-sm text-zinc-600">No exercises in this workout.</p>
                  ) : (
                    <div className="space-y-3">
                      {workout.exercises.map((exercise, exerciseIndex) => (
                        <article
                          key={exercise.id}
                          className="rounded-lg border border-zinc-200 bg-zinc-50 p-4"
                        >
                          <h2 className="font-semibold text-zinc-900">
                            {exerciseIndex + 1}. {exercise.name}
                          </h2>

                          {exercise.sets.length === 0 ? (
                            <p className="mt-2 text-sm text-zinc-600">No sets logged.</p>
                          ) : (
                            <ul className="mt-2 space-y-1 text-sm text-zinc-700">
                              {exercise.sets.map((set, setIndex) => (
                                <li key={set.id}>
                                  Set {setIndex + 1}: {set.reps} reps, weight: {set.weight} kg
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
    </div>
  );
}
