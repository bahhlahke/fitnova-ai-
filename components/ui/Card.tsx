import type { HTMLAttributes, ReactNode } from "react";

export type CardVariant = "default" | "glass" | "dark" | "elevated" | "outline" | "accent";
export type CardPadding = "none" | "sm" | "default" | "lg" | "xl";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padding?: CardPadding;
  variant?: CardVariant;
  hover?: boolean;
  children: ReactNode;
}

const variantClasses: Record<CardVariant, string> = {
  default:  "bg-fn-surface border border-fn-border shadow-fn-card",
  glass:    "glass shadow-fn-card",
  dark:     "glass-dark text-white border-0",
  elevated: "bg-fn-surface border border-fn-border shadow-fn-elevated",
  outline:  "bg-transparent border border-fn-border",
  accent:   "bg-fn-primary-light border border-fn-primary/20",
};

const paddingClasses: Record<CardPadding, string> = {
  none:    "",
  sm:      "p-3",
  default: "p-5",
  lg:      "p-6",
  xl:      "p-8",
};

export function Card({
  padding = "default",
  variant = "default",
  hover = false,
  className = "",
  children,
  ...props
}: CardProps) {
  return (
    <div
      className={[
        "rounded-2xl",
        variantClasses[variant],
        paddingClasses[padding],
        hover ? "card-hover cursor-pointer" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  subtitle,
  action,
  className = "",
}: {
  title: ReactNode;
  subtitle?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex items-start justify-between gap-3 ${className}`}>
      <div className="min-w-0">
        <h2 className="text-sm font-semibold tracking-wide text-fn-muted uppercase">{title}</h2>
        {subtitle && <p className="mt-0.5 text-xs text-fn-muted-light">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function StatCard({
  label,
  value,
  sub,
  icon,
  accent = false,
  className = "",
}: {
  label: string;
  value: ReactNode;
  sub?: string;
  icon?: ReactNode;
  accent?: boolean;
  className?: string;
}) {
  return (
    <Card
      padding="default"
      variant={accent ? "accent" : "default"}
      className={`flex flex-col gap-2 ${className}`}
    >
      {icon && (
        <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${accent ? "bg-fn-primary/10" : "bg-fn-bg-alt"}`}>
          {icon}
        </span>
      )}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-fn-muted">{label}</p>
        <p className="mt-0.5 text-2xl font-bold text-fn-ink">{value}</p>
        {sub && <p className="mt-0.5 text-xs text-fn-muted">{sub}</p>}
      </div>
    </Card>
  );
}
