export function toPlainFitnessLanguage(value?: string | null): string {
  if (!value) return "";

  return value
    .replace(/\s+/g, " ")
    .replace(/\bprotocols\b/gi, "plans")
    .replace(/\bprotocol\b/gi, "plan")
    .replace(/\bbiometrics\b/gi, "body data")
    .replace(/\bbiometric\b/gi, "body data")
    .replace(/\bCNS\b/g, "nervous system")
    .replace(/\bHRV\b/g, "heart-rate variability")
    .replace(/\bSpO2\b/g, "blood oxygen")
    .replace(/\bcompound movements\b/gi, "big lifts")
    .replace(/\bmechanical overload\b/gi, "heavy-lifting progress")
    .replace(/\bneuromuscular\b/gi, "strength-and-coordination")
    .replace(/\badherence\b/gi, "consistency")
    .replace(/\boverreaching\b/gi, "pushing too hard")
    .replace(/\brecovery debt\b/gi, "built-up fatigue")
    .replace(/\bhypertrophy\b/gi, "muscle-building")
    .replace(/\bprogressive overload\b/gi, "small increases over time")
    .replace(/\bmesocycle\b/gi, "training block")
    .replace(/\bperiodization\b/gi, "planned training cycle")
    .replace(/\bdeload\b/gi, "lighter week")
    .replace(/\bmetabolic\b/gi, "nutrition")
    .replace(/\bphysiological\b/gi, "body")
    .trim();
}

function capitalize(word: string): string {
  if (!word) return word;
  return word.charAt(0).toUpperCase() + word.slice(1);
}

export function toTitleCaseLabel(value?: string | null): string {
  if (!value) return "";

  const normalized = value.replace(/_/g, " ").trim();
  const needsNormalization = normalized === normalized.toUpperCase() || !/[a-z]/.test(normalized);
  const working = needsNormalization ? normalized.toLowerCase() : normalized;

  return working
    .split(/\s+/)
    .map((part) => capitalize(part))
    .join(" ");
}

export function toSentenceCase(value?: string | null): string {
  if (!value) return "";

  const normalized = value.replace(/_/g, " ").trim().toLowerCase();
  return normalized.replace(/(^\w|[.!?]\s+\w)/g, (match) => match.toUpperCase());
}

export function describeCommunityMetric(metric?: string | null): string {
  const normalized = metric?.trim().toLowerCase().replace(/_/g, " ");
  if (!normalized) return "Scored by progress logged";
  if (normalized === "workouts") return "Scored by workouts logged";
  if (normalized === "steps") return "Scored by steps completed";
  if (normalized === "minutes") return "Scored by active minutes";
  if (normalized === "consistency") return "Scored by days completed";
  return `Scored by ${normalized}`;
}
