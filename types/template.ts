import type { CreateExerciseInput } from "@/types/workout";

export type WorkoutTemplate = {
  id: number;
  name: string;
  exercises: {
    id: number;
    name: string;
    note?: string | null;
    sets: {
      id: number;
      reps: number | null;
      durationSeconds?: number | null;
      weight: number;
    }[];
  }[];
};

export type CreateWorkoutTemplateInput = {
  name: string;
  exercises: CreateExerciseInput[];
};
