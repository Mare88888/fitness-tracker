export type ExerciseDefinition = {
  name: string;
  muscle: string;
};

export const EXERCISE_LIBRARY: ExerciseDefinition[] = [
  { name: "Bench Press", muscle: "Chest" },
  { name: "Incline Dumbbell Press", muscle: "Chest" },
  { name: "Chest Fly", muscle: "Chest" },
  { name: "Push Up", muscle: "Chest" },
  { name: "Overhead Press", muscle: "Shoulders" },
  { name: "Lateral Raise", muscle: "Shoulders" },
  { name: "Rear Delt Fly", muscle: "Shoulders" },
  { name: "Barbell Row", muscle: "Back" },
  { name: "Pull Up", muscle: "Back" },
  { name: "Lat Pulldown", muscle: "Back" },
  { name: "Deadlift", muscle: "Back" },
  { name: "Seated Cable Row", muscle: "Back" },
  { name: "Barbell Curl", muscle: "Biceps" },
  { name: "Dumbbell Curl", muscle: "Biceps" },
  { name: "Hammer Curl", muscle: "Biceps" },
  { name: "Triceps Pushdown", muscle: "Triceps" },
  { name: "Skull Crusher", muscle: "Triceps" },
  { name: "Dips", muscle: "Triceps" },
  { name: "Squat", muscle: "Quadriceps" },
  { name: "Front Squat", muscle: "Quadriceps" },
  { name: "Leg Press", muscle: "Quadriceps" },
  { name: "Leg Extension", muscle: "Quadriceps" },
  { name: "Bulgarian Split Squat", muscle: "Quadriceps" },
  { name: "Romanian Deadlift", muscle: "Hamstrings" },
  { name: "Leg Curl", muscle: "Hamstrings" },
  { name: "Hip Thrust", muscle: "Glutes" },
  { name: "Glute Bridge", muscle: "Glutes" },
  { name: "Calf Raise", muscle: "Calves" },
  { name: "Seated Calf Raise", muscle: "Calves" },
  { name: "Crunch", muscle: "Core" },
  { name: "Hanging Leg Raise", muscle: "Core" },
  { name: "Plank", muscle: "Core" },
];

export const EXERCISE_MUSCLE_GROUPS: string[] = [...new Set(EXERCISE_LIBRARY.map((e) => e.muscle))].sort(
  (a, b) => a.localeCompare(b)
);

function normalize(input: string): string {
  return input.trim().toLowerCase().replace(/\s+/g, " ");
}

function fallbackMuscle(name: string): string {
  const normalized = normalize(name);
  if (/(bench|chest|incline|fly|pec|push up)/.test(normalized)) return "Chest";
  if (/(row|pull up|lat|deadlift|back|pulldown)/.test(normalized)) return "Back";
  if (/(overhead press|lateral raise|rear delt|shoulder)/.test(normalized)) return "Shoulders";
  if (/(barbell curl|dumbbell curl|hammer curl|bicep)/.test(normalized)) return "Biceps";
  if (/(triceps|skull crusher|dip|pushdown)/.test(normalized)) return "Triceps";
  if (/(squat|leg press|leg extension|quadricep|quad|lunge)/.test(normalized)) return "Quadriceps";
  if (/(romanian deadlift|leg curl|hamstring)/.test(normalized)) return "Hamstrings";
  if (/(hip thrust|glute bridge|glute)/.test(normalized)) return "Glutes";
  if (/(calf)/.test(normalized)) return "Calves";
  if (/(core|abs|plank|crunch)/.test(normalized)) return "Core";
  return "Other";
}

export function resolveExerciseMuscle(exerciseName: string): string {
  const normalized = normalize(exerciseName);
  const match = EXERCISE_LIBRARY.find((entry) => normalize(entry.name) === normalized);
  return match?.muscle ?? fallbackMuscle(exerciseName);
}

