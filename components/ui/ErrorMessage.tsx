import type { ReactNode } from "react";

export interface ErrorMessageProps {
  message: string | ReactNode;
  className?: string;
}

export function ErrorMessage({ message, className = "" }: ErrorMessageProps) {
  return (
    <p
      className={`text-sm text-red-400 ${className}`.trim()}
      role="alert"
    >
      {message}
    </p>
  );
}
