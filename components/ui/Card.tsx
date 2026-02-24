import type { HTMLAttributes, ReactNode } from "react";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padding?: "default" | "lg";
  children: ReactNode;
}

export function Card({
  padding = "default",
  className = "",
  children,
  ...props
}: CardProps) {
  const paddingClass = padding === "lg" ? "p-6" : "p-4";
  return (
    <div
      className={`rounded-2xl border border-fn-border bg-fn-surface shadow-fn-card ${paddingClass} ${className}`.trim()}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  subtitle,
  className = "",
}: {
  title: string;
  subtitle?: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <h2 className="text-base font-semibold text-fn-ink">{title}</h2>
      {subtitle && <p className="mt-1 text-sm text-fn-muted">{subtitle}</p>}
    </div>
  );
}
