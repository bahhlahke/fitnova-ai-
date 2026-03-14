import type { SitFeatureMode } from "@/lib/sit/types";

function parseBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value == null) return fallback;
  const normalized = value.trim().toLowerCase();
  if (["1", "true", "yes", "on", "enforce"].includes(normalized)) return true;
  if (["0", "false", "no", "off"].includes(normalized)) return false;
  return fallback;
}

export function getFeatureMode(name: string, fallback: SitFeatureMode = "off"): SitFeatureMode {
  const value = process.env[name]?.trim().toLowerCase();
  if (!value) return fallback;
  if (value === "shadow") return "shadow";
  if (["true", "1", "on", "enforce"].includes(value)) return "enforce";
  if (["false", "0", "off"].includes(value)) return "off";
  return fallback;
}

export function getSitFeatureFlags() {
  return {
    safetyValidatorEnforce: parseBoolean(process.env.FF_SAFETY_VALIDATOR_ENFORCE, true),
    readinessOrchestratorMode: getFeatureMode("FF_READINESS_ORCHESTRATOR", "shadow"),
    autoMutationTrace: parseBoolean(process.env.FF_AUTO_MUTATION_TRACE, true),
    voiceDuplexStreaming: parseBoolean(process.env.FF_VOICE_DUPLEX_STREAMING, false),
    iosCvRepSegmentation: parseBoolean(process.env.FF_IOS_CV_REP_SEGMENTATION, false),
  };
}
