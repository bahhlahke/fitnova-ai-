import type { InputHTMLAttributes } from "react";

const inputBase =
  "min-h-touch w-full rounded-xl border border-fn-border bg-white px-4 py-3 text-fn-ink placeholder-fn-muted focus:border-fn-primary focus:outline-none focus:ring-2 focus:ring-fn-primary/20";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {}

export function Input({ className = "", ...props }: InputProps) {
  return <input className={`${inputBase} ${className}`.trim()} {...props} />;
}
