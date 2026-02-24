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
      className={`rounded-xl border border-fn-border bg-fn-surface ${paddingClass} ${className}`.trim()}
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
      <h2 className="text-sm font-medium text-fn-muted">{title}</h2>
      {subtitle && <p className="mt-1 text-sm text-fn-muted">{subtitle}</p>}
    </div>
  );
}
