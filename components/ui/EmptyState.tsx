import type { ReactNode } from "react";

export interface EmptyStateProps {
  icon?: ReactNode;
  message: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({
  icon,
  message,
  action,
  className = "",
}: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center rounded-2xl border border-dashed border-fn-border bg-fn-surface-hover/70 py-8 text-center ${className}`.trim()}
      role="status"
      aria-label={message}
    >
      {icon && <span className="mb-2 text-2xl text-fn-muted" aria-hidden>{icon}</span>}
      <p className="text-sm text-fn-muted">{message}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
