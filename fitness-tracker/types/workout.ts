export type Set = {
  id: string;
  reps: number;
  weight: number;
  restTime: number;
};

export type Exercise = {
  id: string;
  name: string;
  sets: Set[];
};

export type Workout = {
  id: string;
  name: string;
  date: string;
  exercises: Exercise[];
};
