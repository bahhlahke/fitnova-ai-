export const PREAUTH_STORAGE_KEY = "fitnova_pre_auth_assessment_v1";
export const PREAUTH_TTL_MS = 72 * 60 * 60 * 1000;

export type PreAuthAssessmentV1 = {
  email_lead?: string;
  goal: string;
  experience_level: string;
  days_per_week: string;
  location_preference: string;
  nutrition_focus: string;
  created_at: string;
};

export function isPreAuthDraftExpired(draft: PreAuthAssessmentV1, now = Date.now()): boolean {
  const ts = Date.parse(draft.created_at);
  if (!Number.isFinite(ts)) return true;
  return now - ts > PREAUTH_TTL_MS;
}

export function readPreAuthDraft(storage: Storage | null): PreAuthAssessmentV1 | null {
  if (!storage) return null;
  try {
    const raw = storage.getItem(PREAUTH_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PreAuthAssessmentV1>;
    if (
      typeof parsed.goal !== "string" ||
      typeof parsed.experience_level !== "string" ||
      typeof parsed.days_per_week !== "string" ||
      typeof parsed.location_preference !== "string" ||
      typeof parsed.nutrition_focus !== "string" ||
      typeof parsed.created_at !== "string"
    ) {
      storage.removeItem(PREAUTH_STORAGE_KEY);
      return null;
    }

    const draft = parsed as PreAuthAssessmentV1;
    if (isPreAuthDraftExpired(draft)) {
      storage.removeItem(PREAUTH_STORAGE_KEY);
      return null;
    }
    return draft;
  } catch {
    storage.removeItem(PREAUTH_STORAGE_KEY);
    return null;
  }
}

export function writePreAuthDraft(storage: Storage | null, draft: Omit<PreAuthAssessmentV1, "created_at">): void {
  if (!storage) return;
  const fullDraft: PreAuthAssessmentV1 = {
    ...draft,
    created_at: new Date().toISOString(),
  };
  storage.setItem(PREAUTH_STORAGE_KEY, JSON.stringify(fullDraft));
}

export function clearPreAuthDraft(storage: Storage | null): void {
  if (!storage) return;
  storage.removeItem(PREAUTH_STORAGE_KEY);
}
