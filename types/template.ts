import type { CreateExerciseInput } from "@/types/workout";

export type WorkoutTemplate = {
  id: number;
  name: string;
  exercises: {
    id: number;
    name: string;
    sets: {
      id: number;
      reps: number;
      weight: number;
    }[];
  }[];
};

export type CreateWorkoutTemplateInput = {
  name: string;
  exercises: CreateExerciseInput[];
};
