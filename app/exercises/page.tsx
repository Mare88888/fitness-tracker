"use client";

import { Navbar } from "@/components/navbar";
import { PageContainer } from "@/components/page-container";
import { Sidebar } from "@/components/sidebar";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { APP_NAME } from "@/lib/constants";
import {
  getFavoriteExerciseNamesSnapshot,
  subscribeExerciseFavorites,
  toggleExerciseFavorite,
} from "@/lib/exercise-favorites";
import { writeExerciseCatalogCache } from "@/lib/exercise-catalog-cache";
import { queueExercisesForStartWorkout } from "@/lib/exercise-insert-queue";
import {
  getExerciseCatalog,
  getExerciseCatalogMuscles,
} from "@/lib/services/exercise-catalog-service";
import type { ExerciseCatalogItem } from "@/types/exercise-catalog";
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
  const [catalogItems, setCatalogItems] = useState<ExerciseCatalogItem[]>([]);
  const [muscleGroups, setMuscleGroups] = useState<string[]>([]);
  const [isLoadingCatalog, setIsLoadingCatalog] = useState(true);

  useEffect(() => {
    queueMicrotask(() => setFavorites(getFavoriteExerciseNamesSnapshot()));
    return subscribeExerciseFavorites(() => {
      queueMicrotask(() => setFavorites(getFavoriteExerciseNamesSnapshot()));
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    const loadMuscles = async () => {
      try {
        const groups = await getExerciseCatalogMuscles();
        if (!cancelled) {
          setMuscleGroups(groups);
        }
      } catch {
        if (!cancelled) {
          setMuscleGroups([]);
        }
      }
    };
    void loadMuscles();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setIsLoadingCatalog(true);
    const timeout = window.setTimeout(async () => {
      try {
        const items = await getExerciseCatalog({
          query,
          muscle: muscleFilter === "all" ? undefined : muscleFilter,
          limit: 300,
        });
        if (!cancelled) {
          writeExerciseCatalogCache(items);
          setCatalogItems(items);
        }
      } catch (error) {
        if (!cancelled) {
          const message = error instanceof Error ? error.message : "Failed to load exercise catalog.";
          toast.error(message);
          setCatalogItems([]);
        }
      } finally {
        if (!cancelled) {
          setIsLoadingCatalog(false);
        }
      }
    }, 180);
    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [muscleFilter, query]);

  const filtered = useMemo(() => {
    let list = catalogItems.filter((exercise) => {
      if (favoritesOnly && !favorites.has(exercise.name)) {
        return false;
      }
      return true;
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
  }, [catalogItems, favorites, favoritesOnly]);

  const handleStar = (name: string) => {
    const nowFavorite = toggleExerciseFavorite(name);
    setFavorites(getFavoriteExerciseNamesSnapshot());
    toast.success(nowFavorite ? "Added to favorites." : "Removed from favorites.");
  };

  const handleAddToWorkout = (name: string) => {
    queueExercisesForStartWorkout([name]);
    toast.success(`"${name}" added - opening Start Workout.`);
    router.push("/workouts/start");
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

              <div className="relative flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-emerald-400/90">{APP_NAME}</p>
                  <h1 className="text-2xl font-semibold tracking-tight text-zinc-100 sm:text-3xl">Exercise library</h1>
                  <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                    Search exercises, filter by muscle, star favorites, and add to your workout in one click.
                  </p>
                </div>
                <Link
                  href="/workouts/start"
                  className="btn btn-secondary"
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
                  className="field min-w-50 flex-1"
                  aria-label="Search exercises"
                />
                <select
                  value={muscleFilter}
                  onChange={(event) => setMuscleFilter(event.target.value)}
                  className="field field-select"
                  aria-label="Filter by muscle"
                >
                  <option value="all">All muscles</option>
                  {muscleGroups.map((muscle) => (
                    <option key={muscle} value={muscle}>
                      {muscle}
                    </option>
                  ))}
                </select>
                <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-300">
                  <input
                    type="checkbox"
                    checked={favoritesOnly}
                    onChange={(event) => setFavoritesOnly(event.target.checked)}
                    className="rounded border-zinc-600 bg-zinc-900"
                  />
                  Favorites only
                </label>
              </div>

              {isLoadingCatalog ? (
                <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {[0, 1, 2, 3, 4, 5].map((i) => (
                    <Skeleton key={i} className="h-28 w-full rounded-xl border border-zinc-800/80" />
                  ))}
                </div>
              ) : filtered.length === 0 ? (
                <div className="mt-8">
                  <EmptyState
                    title="No exercises match"
                    description="Try a different search - or clear filters."
                  />
                  <div className="mt-3 flex justify-center">
                    <button
                      type="button"
                      onClick={() => {
                        setQuery("");
                        setMuscleFilter("all");
                        setFavoritesOnly(false);
                      }}
                      className="btn btn-secondary"
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
                        className="surface-card flex flex-col gap-3 transition-colors hover:border-zinc-500/60"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-zinc-100">{exercise.name}</p>
                          <p className="text-sm text-zinc-400">{exercise.muscleGroup}</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => handleStar(exercise.name)}
                            className={`rounded-md border px-3 py-1.5 text-sm font-medium transition ${
                              starred
                                ? "border-amber-400 bg-amber-50 text-amber-900 dark:border-amber-600 dark:bg-amber-950/40 dark:text-amber-200"
                                : "border-zinc-600 text-zinc-300 hover:bg-zinc-800"
                            }`}
                            aria-pressed={starred}
                            aria-label={starred ? "Remove from favorites" : "Add to favorites"}
                          >
                            {starred ? "★ Favorited" : "☆ Favorite"}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleAddToWorkout(exercise.name)}
                            className="btn btn-primary px-3 py-1.5"
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
