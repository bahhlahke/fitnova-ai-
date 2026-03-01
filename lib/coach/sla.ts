export type EscalationUrgency = "low" | "normal" | "high";

const SLA_HOURS: Record<EscalationUrgency, number> = {
  low: 48,
  normal: 24,
  high: 4,
};

export function computeSlaDueAt(urgency: EscalationUrgency, now = new Date()): string {
  const hours = SLA_HOURS[urgency] ?? SLA_HOURS.normal;
  const due = new Date(now.getTime() + hours * 60 * 60 * 1000);
  return due.toISOString();
}

export function timeRemainingLabel(slaDueAt: string, now = new Date()): string {
  const due = new Date(slaDueAt).getTime();
  if (Number.isNaN(due)) return "Unknown";
  const diffMs = due - now.getTime();
  if (diffMs <= 0) return "Overdue";
  const totalMinutes = Math.ceil(diffMs / (60 * 1000));
  if (totalMinutes < 60) return `${totalMinutes}m`;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h ${minutes}m`;
}
