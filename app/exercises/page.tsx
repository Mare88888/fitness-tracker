"use client";

import { Navbar } from "@/components/navbar";
import { PageContainer } from "@/components/page-container";
import { Sidebar } from "@/components/sidebar";
import { EmptyState } from "@/components/ui/empty-state";
import {
  getFavoriteExerciseNamesSnapshot,
  subscribeExerciseFavorites,
  toggleExerciseFavorite,
} from "@/lib/exercise-favorites";
import { EXERCISE_LIBRARY, EXERCISE_MUSCLE_GROUPS } from "@/lib/exercise-library";
import { queueExercisesForStartWorkout } from "@/lib/exercise-insert-queue";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

export default function ExerciseLibraryPage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [muscleFilter, setMuscleFilter] = useState<string>("all");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  useEffect(() => {
    queueMicrotask(() => setFavorites(getFavoriteExerciseNamesSnapshot()));
    return subscribeExerciseFavorites(() => {
      queueMicrotask(() => setFavorites(getFavoriteExerciseNamesSnapshot()));
    });
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = EXERCISE_LIBRARY.filter((exercise) => {
      if (muscleFilter !== "all" && exercise.muscle !== muscleFilter) {
        return false;
      }
      if (favoritesOnly && !favorites.has(exercise.name)) {
        return false;
      }
      if (!q) {
        return true;
      }
      return (
        exercise.name.toLowerCase().includes(q) || exercise.muscle.toLowerCase().includes(q)
      );
    });
    list = [...list].sort((a, b) => {
      const fa = favorites.has(a.name) ? 0 : 1;
      const fb = favorites.has(b.name) ? 0 : 1;
      if (fa !== fb) {
        return fa - fb;
      }
      return a.name.localeCompare(b.name);
    });
    return list;
  }, [favorites, favoritesOnly, muscleFilter, query]);

  const handleStar = (name: string) => {
    const nowFavorite = toggleExerciseFavorite(name);
    setFavorites(getFavoriteExerciseNamesSnapshot());
    toast.success(nowFavorite ? "Added to favorites." : "Removed from favorites.");
  };

  const handleAddToWorkout = (name: string) => {
    queueExercisesForStartWorkout([name]);
    toast.success(`"${name}" added — opening Start Workout.`);
    router.push("/workouts/start");
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="flex min-h-screen min-w-0 flex-1 flex-col">
          <Navbar />
          <PageContainer>
            <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">Exercise Library</h1>
                  <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                    Search exercises, filter by muscle, star favorites, and add one to your workout in one click.
                  </p>
                </div>
                <Link
                  href="/workouts/start"
                  className="rounded-md border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
                >
                  Start Workout
                </Link>
              </div>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                <input
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search by name or muscle…"
                  className="min-w-[200px] flex-1 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:focus:ring-zinc-800"
                  aria-label="Search exercises"
                />
                <select
                  value={muscleFilter}
                  onChange={(event) => setMuscleFilter(event.target.value)}
                  className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                  aria-label="Filter by muscle"
                >
                  <option value="all">All muscles</option>
                  {EXERCISE_MUSCLE_GROUPS.map((muscle) => (
                    <option key={muscle} value={muscle}>
                      {muscle}
                    </option>
                  ))}
                </select>
                <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
                  <input
                    type="checkbox"
                    checked={favoritesOnly}
                    onChange={(event) => setFavoritesOnly(event.target.checked)}
                    className="rounded border-zinc-300 dark:border-zinc-600"
                  />
                  Favorites only
                </label>
              </div>

              {filtered.length === 0 ? (
                <div className="mt-8">
                  <EmptyState
                    title="No exercises match"
                    description="Try a different search or clear filters."
                  />
                  <div className="mt-3 flex justify-center">
                    <button
                      type="button"
                      onClick={() => {
                        setQuery("");
                        setMuscleFilter("all");
                        setFavoritesOnly(false);
                      }}
                      className="rounded-md border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
                    >
                      Reset filters
                    </button>
                  </div>
                </div>
              ) : (
                <ul className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {filtered.map((exercise) => {
                    const starred = favorites.has(exercise.name);
                    return (
                      <li
                        key={exercise.name}
                        className="flex flex-col gap-3 rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800/60"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-zinc-900 dark:text-zinc-100">{exercise.name}</p>
                          <p className="text-sm text-zinc-600 dark:text-zinc-400">{exercise.muscle}</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => handleStar(exercise.name)}
                            className={`rounded-md border px-3 py-1.5 text-sm font-medium transition ${
                              starred
                                ? "border-amber-400 bg-amber-50 text-amber-900 dark:border-amber-600 dark:bg-amber-950/40 dark:text-amber-200"
                                : "border-zinc-300 text-zinc-700 hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-700"
                            }`}
                            aria-pressed={starred}
                            aria-label={starred ? "Remove from favorites" : "Add to favorites"}
                          >
                            {starred ? "★ Favorited" : "☆ Favorite"}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleAddToWorkout(exercise.name)}
                            className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
                          >
                            Add to workout
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          </PageContainer>
        </div>
      </div>
    </div>
  );
}
