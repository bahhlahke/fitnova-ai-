import type { ReactNode } from "react";

export interface ErrorMessageProps {
  message: string | ReactNode;
  className?: string;
}

export function ErrorMessage({ message, className = "" }: ErrorMessageProps) {
  return (
    <p
      className={`rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 ${className}`.trim()}
      role="alert"
    >
      {message}
    </p>
  );
}
