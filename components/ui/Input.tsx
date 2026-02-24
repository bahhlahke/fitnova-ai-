import type { InputHTMLAttributes } from "react";

const inputBase =
  "min-h-touch w-full rounded-lg border border-fn-border bg-fn-surface px-4 py-3 text-white placeholder-fn-muted focus:border-fn-teal focus:outline-none focus:ring-1 focus:ring-fn-teal";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {}

export function Input({ className = "", ...props }: InputProps) {
  return <input className={`${inputBase} ${className}`.trim()} {...props} />;
}
