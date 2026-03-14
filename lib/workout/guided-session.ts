import type { DailyPlan, DailyPlanTrainingExercise } from "@/lib/plan/types";
import { enrichExercise } from "@/lib/workout/enrich-exercises";
import { getExerciseImageUrl, isExerciseVideoUrl } from "@/lib/workout/exercise-images";

function normalizeExerciseName(name: string): string {
  return name.toLowerCase().trim().replace(/\s+/g, " ");
}

function trimSentence(value?: string | null): string | undefined {
  const cleaned = value?.trim();
  return cleaned ? cleaned : undefined;
}

function estimateRestSeconds(exercise: DailyPlanTrainingExercise): number {
  if (typeof exercise.rest_seconds_after_set === "number" && exercise.rest_seconds_after_set > 0) {
    return exercise.rest_seconds_after_set;
  }

  const intensity = exercise.intensity.toLowerCase();
  const reps = exercise.reps.toLowerCase();
  const name = normalizeExerciseName(exercise.name);

  if (reps.includes("work /") || reps.includes("seconds") || reps.includes("min")) return 45;
  if (intensity.includes("high") || intensity.includes("rpe 8") || intensity.includes("rpe 9")) return 90;
  if (name.includes("deadlift") || name.includes("squat") || name.includes("press")) return 90;
  if (name.includes("stretch") || name.includes("mobility") || name.includes("cat-cow")) return 30;
  return 60;
}

function buildWalkthroughSteps(exercise: DailyPlanTrainingExercise): string[] {
  const steps = [
    trimSentence(exercise.intent)
      ? `Set up: ${trimSentence(exercise.intent)}`
      : "Set up: get stable first, then start the movement with control.",
    trimSentence(exercise.tempo)
      ? `Move: follow the tempo ${trimSentence(exercise.tempo)} and stay smooth through every rep.`
      : `Move: complete ${exercise.reps} with clean control before chasing more load.`,
    trimSentence(exercise.breathing)
      ? `Finish: ${trimSentence(exercise.breathing)}`
      : "Finish: breathe, reset your brace, and end each rep in a strong position.",
  ];

  return steps.filter(Boolean);
}

function buildCoachingPoints(exercise: DailyPlanTrainingExercise): string[] {
  return [
    trimSentence(exercise.notes),
    trimSentence(exercise.rationale) ? `Why this matters: ${trimSentence(exercise.rationale)}` : undefined,
    trimSentence(exercise.progression_note),
  ].filter((value): value is string => Boolean(value));
}

function buildSetupChecklist(exercise: DailyPlanTrainingExercise): string[] {
  const name = normalizeExerciseName(exercise.name);
  const checklist = [
    "Clear the space and set your equipment before the timer starts.",
    name.includes("barbell")
      ? "Load the bar evenly and check collar tightness."
      : name.includes("dumbbell")
        ? "Place both dumbbells where you can grab them safely."
        : name.includes("stretch") || name.includes("mobility")
          ? "Give yourself enough floor space to move without rushing."
          : "Set your starting position before the first rep.",
    trimSentence(exercise.breathing)
      ? `Breathing: ${trimSentence(exercise.breathing)}`
      : "Take one steady breath before you begin.",
  ];

  return checklist.filter(Boolean);
}

function buildCommonMistakes(exercise: DailyPlanTrainingExercise): string[] {
  const name = normalizeExerciseName(exercise.name);

  if (name.includes("squat")) {
    return [
      "Letting the chest drop too early.",
      "Rushing the bottom position instead of staying braced.",
      "Cutting depth short when the set gets hard.",
    ];
  }

  if (name.includes("deadlift") || name.includes("rdl")) {
    return [
      "Losing a neutral spine at the bottom.",
      "Letting the weight drift away from the body.",
      "Turning the set into a squat instead of a hinge.",
    ];
  }

  if (name.includes("press") || name.includes("push-up") || name.includes("push up")) {
    return [
      "Flaring elbows too early.",
      "Rushing the lowering phase.",
      "Losing tension at the top before the next rep.",
    ];
  }

  if (name.includes("row") || name.includes("pull")) {
    return [
      "Shrugging instead of pulling through the back.",
      "Twisting the torso to finish the rep.",
      "Dropping the weight too quickly on the way down.",
    ];
  }

  return [
    "Letting the pace get sloppy late in the set.",
    "Skipping the full range of motion.",
    "Forgetting to reset between reps.",
  ];
}

function attachReliableMedia(exercise: DailyPlanTrainingExercise): Pick<DailyPlanTrainingExercise, "image_url" | "video_url" | "cinema_video_url"> {
  const chosenMedia = getExerciseImageUrl(
    exercise.name,
    exercise.cinema_video_url || exercise.video_url || exercise.image_url
  );

  if (isExerciseVideoUrl(chosenMedia)) {
    return {
      cinema_video_url: exercise.cinema_video_url ?? null,
      video_url: chosenMedia,
      image_url: exercise.image_url ?? null,
    };
  }

  return {
    cinema_video_url: exercise.cinema_video_url ?? null,
    video_url: exercise.video_url ?? null,
    image_url: chosenMedia,
  };
}

export function normalizeGuidedExercise(exercise: DailyPlanTrainingExercise): DailyPlanTrainingExercise {
  const enriched = enrichExercise(exercise.name);
  const merged: DailyPlanTrainingExercise = {
    ...exercise,
    ...enriched,
    ...exercise,
  };

  const media = attachReliableMedia(merged);

  return {
    ...merged,
    ...media,
    walkthrough_steps: merged.walkthrough_steps?.length ? merged.walkthrough_steps : buildWalkthroughSteps(merged),
    coaching_points: merged.coaching_points?.length ? merged.coaching_points : buildCoachingPoints(merged),
    setup_checklist: merged.setup_checklist?.length ? merged.setup_checklist : buildSetupChecklist(merged),
    common_mistakes: merged.common_mistakes?.length ? merged.common_mistakes : buildCommonMistakes(merged),
    rest_seconds_after_set: estimateRestSeconds(merged),
  };
}

export function normalizeGuidedTrainingPlan(plan: DailyPlan["training_plan"]): DailyPlan["training_plan"] {
  return {
    ...plan,
    exercises: plan.exercises.map(normalizeGuidedExercise),
  };
}
