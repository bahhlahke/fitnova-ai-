import type { InputHTMLAttributes } from "react";

const inputBase =
  "min-h-touch w-full rounded-xl border border-fn-border bg-white px-4 py-3 text-black placeholder-neutral-400 focus:border-neutral-600 focus:outline-none focus:ring-2 focus:ring-neutral-600/20";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {}

export function Input({ className = "", ...props }: InputProps) {
  return <input className={`${inputBase} ${className}`.trim()} {...props} />;
}
