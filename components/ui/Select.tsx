import type { SelectHTMLAttributes } from "react";

const selectBase =
  "min-h-touch w-full rounded-lg border border-fn-border bg-fn-surface px-4 py-3 text-white focus:border-fn-teal focus:outline-none focus:ring-1 focus:ring-fn-teal";

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {}

export function Select({ className = "", children, ...props }: SelectProps) {
  return (
    <select
      className={`${selectBase} ${className}`.trim()}
      {...props}
    >
      {children}
    </select>
  );
}
