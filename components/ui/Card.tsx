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
  const paddingClass = padding === "lg" ? "p-8" : "p-6";
  return (
    <div
      className={`group relative overflow-hidden rounded-xl3 border border-white/10 bg-gradient-to-b from-white/[0.03] to-transparent backdrop-blur-3xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] transition-all duration-700 hover:border-fn-accent/30 hover:shadow-[0_0_40px_rgba(10,217,196,0.1)] ${paddingClass} ${className}`.trim()}
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
      <h2 className="text-xl font-black text-white italic uppercase tracking-tighter leading-none">{title}</h2>
      {subtitle && <p className="mt-2 text-[10px] font-black uppercase tracking-widest text-fn-accent/70">{subtitle}</p>}
    </div>
  );
}
