export type AiReliability = {
  confidence_score: number;
  explanation: string;
  limitations: string[];
};

export function clampConfidence(value: number): number {
  if (!Number.isFinite(value)) return 0.5;
  return Math.max(0, Math.min(1, Math.round(value * 100) / 100));
}

export function confidenceFromBucket(bucket: "high" | "medium" | "low"): number {
  if (bucket === "high") return 0.86;
  if (bucket === "low") return 0.45;
  return 0.66;
}

export function defaultLimitations(domain: "nutrition" | "motion" | "body_comp"): string[] {
  if (domain === "nutrition") {
    return [
      "Portion size uncertainty can materially affect calorie estimates.",
      "Restaurant and mixed dishes are often under-specified without exact ingredients.",
    ];
  }
  if (domain === "motion") {
    return [
      "Single camera angle can hide joint and bar path deviations.",
      "Video quality and frame timing can reduce movement assessment precision.",
    ];
  }
  return [
    "Visual body composition is directional and not equivalent to DEXA accuracy.",
    "Lighting, pose, and camera distance can materially alter estimates.",
  ];
}
