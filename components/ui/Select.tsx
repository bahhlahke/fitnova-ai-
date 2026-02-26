import type { SelectHTMLAttributes } from "react";

const selectBase =
  "min-h-touch w-full rounded-xl border border-fn-border bg-white px-4 py-3 text-black focus:border-neutral-600 focus:outline-none focus:ring-2 focus:ring-neutral-600/20";

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {}

export function Select({ className = "", children, ...props }: SelectProps) {
  return (
    <select className={`${selectBase} ${className}`.trim()} {...props}>
      {children}
    </select>
  );
}
