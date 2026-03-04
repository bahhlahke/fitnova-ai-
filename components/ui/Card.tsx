import type { HTMLAttributes, ReactNode } from "react";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padding?: "default" | "lg" | "none";
  children: ReactNode;
}

export function Card({
  padding = "default",
  className = "",
  children,
  ...props
}: CardProps) {
  const paddingClass = padding === "lg" ? "p-8" : padding === "none" ? "p-0" : "p-6";
  return (
    <div
      className={`group relative overflow-hidden rounded-xl3 border border-white/[0.08] bg-fn-surface/40 backdrop-blur-md shadow-fn-card transition-all duration-500 hover:border-white/20 hover:bg-fn-surface/60 ${paddingClass} ${className}`.trim()}
      {...props}
    >
      {/* Subtle Inner Glow */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-50" />

      {/* Hover Shimmer */}
      <div className="absolute inset-0 translate-x-[-100%] bg-gradient-to-r from-transparent via-white/[0.02] to-transparent transition-transform duration-1000 group-hover:translate-x-[100%]" />

      <div className="relative z-10">{children}</div>
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
    <div className={`mb-6 ${className}`.trim()}>
      <h2 className="font-display text-2xl font-black text-white italic uppercase tracking-tighter leading-none">{title}</h2>
      {subtitle && <p className="mt-2 text-[11px] font-black uppercase tracking-[0.3em] text-fn-muted">{subtitle}</p>}
    </div>
  );
}
