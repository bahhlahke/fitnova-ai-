import { enrichExercise } from "@/lib/workout/enrich-exercises";
import type { DailyPlanTrainingExercise } from "@/lib/plan/types";
import type {
  DeterministicSubstitutionResult,
  ExerciseOntologyEntry,
  PhysicalHistoryEventRecord,
} from "@/lib/sit/types";

const ONTOLOGY_VERSION = "exercise-ontology-v1";

const EXERCISE_ONTOLOGY: ExerciseOntologyEntry[] = [
  {
    exercise_id: "back_squat",
    canonical_name: "Back Squat",
    aliases: ["back squat", "barbell squat", "squat"],
    contraindications: ["knee", "back", "hip"],
    equivalence_class: "squat_pattern",
    home_variant: "Goblet Squat",
    gym_variant: "Box Squat",
  },
  {
    exercise_id: "bench_press",
    canonical_name: "Bench Press",
    aliases: ["bench press", "barbell bench", "press"],
    contraindications: ["shoulder", "elbow"],
    equivalence_class: "horizontal_push",
    home_variant: "Dumbbell Floor Press",
    gym_variant: "Incline Dumbbell Press",
  },
  {
    exercise_id: "deadlift",
    canonical_name: "Deadlift",
    aliases: ["deadlift", "rdl", "romanian deadlift", "hinge"],
    contraindications: ["back", "hip"],
    equivalence_class: "hinge_pattern",
    home_variant: "Hip Hinge Drill",
    gym_variant: "Hip Hinge Patterning",
  },
  {
    exercise_id: "overhead_press",
    canonical_name: "Overhead Press",
    aliases: ["overhead press", "shoulder press", "military press"],
    contraindications: ["shoulder", "back"],
    equivalence_class: "vertical_push",
    home_variant: "Half-Kneeling Dumbbell Press",
    gym_variant: "Landmine Press",
  },
  {
    exercise_id: "barbell_row",
    canonical_name: "Barbell Row",
    aliases: ["barbell row", "row", "bent over row"],
    contraindications: ["back", "shoulder"],
    equivalence_class: "horizontal_pull",
    home_variant: "Single-arm Dumbbell Row",
    gym_variant: "Chest-Supported Row",
  },
];

const SYMPTOM_KEYWORDS: Record<string, RegExp> = {
  knee: /\bknee|patella|acl|meniscus\b/i,
  shoulder: /\bshoulder|rotator|labrum|ac joint\b/i,
  back: /\bback|spine|lumbar|disc|sciatica\b/i,
  hip: /\bhip|glute med|groin\b/i,
  elbow: /\belbow|forearm|tendon\b/i,
  ankle: /\bankle|achilles|foot\b/i,
  pain: /\bpain|hurts|flare|sharp|injur|tweak|ache\b/i,
};

function unique<T>(values: T[]): T[] {
  return values.filter((value, index) => values.indexOf(value) === index);
}

function inferSymptomTags(text: string): string[] {
  return unique(
    Object.entries(SYMPTOM_KEYWORDS)
      .filter(([, pattern]) => pattern.test(text))
      .map(([tag]) => tag)
  );
}

function findOntologyEntry(name: string): ExerciseOntologyEntry | null {
  const lower = name.trim().toLowerCase();
  return EXERCISE_ONTOLOGY.find((entry) => entry.aliases.some((alias) => lower.includes(alias))) ?? null;
}

function historyMatch(
  history: PhysicalHistoryEventRecord[],
  symptomTags: string[],
  currentExercise: string
): PhysicalHistoryEventRecord | null {
  const currentLower = currentExercise.toLowerCase();
  return (
    [...history]
      .sort((a, b) => String(b.created_at ?? "").localeCompare(String(a.created_at ?? "")))
      .find(
        (event) =>
          event.outcome_quality != null &&
          event.outcome_quality >= 4 &&
          (event.current_exercise?.toLowerCase() ?? "") === currentLower &&
          symptomTags.every((tag) => event.symptom_tags.includes(tag)) &&
          event.replacement_exercise
      ) ?? null
  );
}

function buildReplacement(
  name: string,
  sets: number,
  reps: string,
  intensity: string,
  note: string
): DailyPlanTrainingExercise {
  return {
    name,
    sets,
    reps,
    intensity,
    notes: note,
    ...enrichExercise(name),
  };
}

export function detectSymptomIntent(text: string): { triggered: boolean; symptom_tags: string[] } {
  const symptom_tags = inferSymptomTags(text);
  const triggered = symptom_tags.length > 0;
  return { triggered, symptom_tags };
}

export function getExerciseOntologySeed(): ExerciseOntologyEntry[] {
  return EXERCISE_ONTOLOGY;
}

export function selectDeterministicSubstitution(input: {
  currentExercise: string;
  reason: string;
  location?: "gym" | "home";
  sets?: number;
  reps?: string;
  intensity?: string;
  history?: PhysicalHistoryEventRecord[];
}): DeterministicSubstitutionResult {
  const location = input.location ?? "gym";
  const symptom_tags = inferSymptomTags(input.reason);
  const history = input.history ?? [];
  const sets = Math.max(1, Math.min(8, input.sets ?? 3));
  const reps = input.reps?.trim() || "8-12";
  const intensity = input.intensity?.trim() || "RPE 6-7";
  const entry = findOntologyEntry(input.currentExercise);
  const contraindications = unique(
    [...(entry?.contraindications ?? []), ...symptom_tags.filter((tag) => tag !== "pain")]
  );
  const priorSuccess = historyMatch(history, symptom_tags, input.currentExercise);

  if (priorSuccess?.replacement_exercise) {
    return {
      replacement: buildReplacement(
        priorSuccess.replacement_exercise,
        sets,
        reps,
        "RPE 6",
        "Reused the last successful substitution chain for the same symptom pattern."
      ),
      rationale: "Matched the current symptom recurrence to a prior successful substitution outcome.",
      symptom_tags,
      policy_version: ONTOLOGY_VERSION,
      contraindications,
      triggered: symptom_tags.length > 0,
      reused_history: true,
    };
  }

  const fallbackName =
    location === "home"
      ? entry?.home_variant ?? "Tempo Bodyweight Variation"
      : entry?.gym_variant ?? "Tempo Bodyweight Variation";

  return {
    replacement: buildReplacement(
      fallbackName,
      sets,
      reps,
      "RPE 6",
      "Deterministic substitution policy matched movement pattern and contraindications before any model response."
    ),
    rationale:
      symptom_tags.length > 0
        ? `Detected symptom tags (${symptom_tags.join(", ")}) and removed contraindicated loading.`
        : "Matched movement pattern and preserved the intended training stimulus.",
    symptom_tags,
    policy_version: ONTOLOGY_VERSION,
    contraindications,
    triggered: symptom_tags.length > 0,
    reused_history: false,
  };
}
