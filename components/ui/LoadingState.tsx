export interface LoadingStateProps {
  message?: string;
  className?: string;
}

export function LoadingState({
  message = "Loading…",
  className = "",
}: LoadingStateProps) {
  return (
    <div
      className={`flex items-center gap-2 text-fn-muted ${className}`.trim()}
      role="status"
      aria-live="polite"
      aria-label={message}
    >
      <span
        className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-fn-muted border-t-fn-teal"
        aria-hidden
      />
      <span className="text-sm">{message}</span>
    </div>
  );
}
