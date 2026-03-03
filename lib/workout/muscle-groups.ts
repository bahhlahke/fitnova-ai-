export const MUSCLE_GROUPS = [
    "Chest",
    "Back",
    "Shoulders",
    "Quads",
    "Hamstrings",
    "Glutes",
    "Biceps",
    "Triceps",
    "Core",
    "Calves",
] as const;

export type MuscleGroup = (typeof MUSCLE_GROUPS)[number];

export const EXERCISE_MUSCLE_MAP: Record<string, MuscleGroup> = {
    // Chest
    "Bench Press": "Chest",
    "Push-up": "Chest",
    "Incline Bench Press": "Chest",
    "Dumbbell Fly": "Chest",
    "Chest Press": "Chest",
    // Back
    "Pull-up": "Back",
    "Lat Pulldown": "Back",
    "Barbell Row": "Back",
    "Dumbbell Row": "Back",
    "Deadlift": "Back",
    "Face Pull": "Back",
    // Shoulders
    "Overhead Press": "Shoulders",
    "Military Press": "Shoulders",
    "Lateral Raise": "Shoulders",
    "Front Raise": "Shoulders",
    "Shoulder Press": "Shoulders",
    // Quads
    "Squat": "Quads",
    "Goblet Squat": "Quads",
    "Leg Press": "Quads",
    "Leg Extension": "Quads",
    "Lunge": "Quads",
    // Hamstrings/Glutes
    "RDL": "Hamstrings",
    "Dumbbell RDL": "Hamstrings",
    "Leg Curl": "Hamstrings",
    "Hip Thrust": "Glutes",
    "Glute Bridge": "Glutes",
    // Arms
    "Bicep Curl": "Biceps",
    "Hammer Curl": "Biceps",
    "Tricep Extension": "Triceps",
    "Skull Crusher": "Triceps",
    "Dip": "Triceps",
    // Core
    "Plank": "Core",
    "Crunch": "Core",
    "Leg Raise": "Core",
    "Russian Twist": "Core",
};

export function getMuscleGroup(exerciseName: string): MuscleGroup | "Other" {
    const normalized = exerciseName.toLowerCase();
    for (const [name, muscle] of Object.entries(EXERCISE_MUSCLE_MAP)) {
        if (normalized.includes(name.toLowerCase())) return muscle;
    }
    return "Other";
}
