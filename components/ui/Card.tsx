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
      className={`rounded-xl2 border border-white/10 bg-fn-surface/40 backdrop-blur-xl shadow-[0_0_50px_rgba(0,0,0,0.3)] hover:border-fn-accent/30 hover:shadow-[0_0_30px_rgba(10,217,196,0.1)] transition-all duration-500 ${paddingClass} ${className}`.trim()}
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
