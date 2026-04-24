export type Set = {
  id: number;
  reps: number | null;
  durationSeconds?: number | null;
  weight: number;
};

export type Exercise = {
  id: number;
  catalogId?: number | null;
  name: string;
  muscleGroup?: string | null;
  sets: Set[];
};

export type Workout = {
  id: number;
  name: string;
  date: string;
  formattedDate?: string;
  exercises: Exercise[];
};

export type CreateSetInput = {
  reps?: number;
  durationSeconds?: number;
  weight: number;
};

export type CreateExerciseInput = {
  name: string;
  sets: CreateSetInput[];
};

export type CreateWorkoutInput = {
  name: string;
  date: string;
  exercises: CreateExerciseInput[];
};
