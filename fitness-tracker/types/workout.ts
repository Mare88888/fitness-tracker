export type SetEntry = {
  reps: number;
  weightKg?: number;
};

export type ExerciseEntry = {
  name: string;
  sets: SetEntry[];
};

export type WorkoutEntry = {
  id: string;
  date: string;
  exercises: ExerciseEntry[];
};
