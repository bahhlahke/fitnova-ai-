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
      className={`rounded-xl2 border border-fn-border bg-fn-surface/50 backdrop-blur-md shadow-fn-card ${paddingClass} ${className}`.trim()}
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
    <div className={`mb-4 ${className}`.trim()}>
      <h2 className="text-xl font-bold text-fn-ink tracking-tight">{title}</h2>
      {subtitle && <p className="mt-1 text-sm text-fn-muted">{subtitle}</p>}
    </div>
  );
}
