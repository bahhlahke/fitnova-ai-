export function parseCoachAdminIds(raw: string | undefined = process.env.COACH_ADMIN_USER_IDS): Set<string> {
  if (!raw) return new Set();
  return new Set(
    raw
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean)
  );
}

export function isCoachAdmin(userId: string | null | undefined, raw: string | undefined = process.env.COACH_ADMIN_USER_IDS): boolean {
  if (!userId) return false;
  const ids = parseCoachAdminIds(raw);
  return ids.has(userId);
}
