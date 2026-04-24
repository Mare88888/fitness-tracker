export type Set = {
  id: number;
  reps: number | null;
  durationSeconds?: number | null;
  weight: number;
  completed?: boolean | null;
  type?: "normal" | "warmup" | "failure" | "drop" | null;
};

export type Exercise = {
  id: number;
  catalogId?: number | null;
  name: string;
  note?: string | null;
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
  completed?: boolean;
  type?: "normal" | "warmup" | "failure" | "drop";
};

export type CreateExerciseInput = {
  name: string;
  note?: string;
  sets: CreateSetInput[];
};

export type CreateWorkoutInput = {
  name: string;
  date: string;
  exercises: CreateExerciseInput[];
};
