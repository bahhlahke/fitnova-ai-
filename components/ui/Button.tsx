import type { ButtonHTMLAttributes } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "dark" | "accent";
type ButtonSize = "default" | "sm" | "lg";

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-gradient-primary text-white shadow-fn-primary hover:shadow-fn-primary hover:brightness-110 focus-visible:ring-fn-primary/40 disabled:opacity-50 disabled:shadow-none",
  secondary:
    "border border-fn-border bg-white text-fn-ink hover:bg-fn-surface-hover hover:border-fn-border-strong focus-visible:ring-fn-primary/30 shadow-fn-soft",
  ghost:
    "text-fn-muted hover:bg-fn-surface-hover hover:text-fn-ink focus-visible:ring-fn-primary/20",
  danger:
    "bg-fn-danger text-white hover:brightness-105 focus-visible:ring-fn-danger/30 disabled:opacity-50 shadow-fn-soft",
  dark:
    "bg-fn-ink-rich text-white hover:bg-fn-bg-dark focus-visible:ring-fn-ink/30 shadow-fn-dark disabled:opacity-50",
  accent:
    "bg-gradient-accent text-white hover:brightness-105 focus-visible:ring-fn-accent/40 disabled:opacity-50 shadow-fn-soft",
};

const sizeClasses: Record<ButtonSize, string> = {
  lg: "min-h-[52px] px-7 py-3.5 text-base rounded-2xl gap-2.5",
  default: "min-h-touch min-w-touch px-5 py-2.5 text-sm rounded-xl gap-2",
  sm: "min-h-[36px] px-3.5 py-2 text-xs rounded-lg gap-1.5",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: React.ReactNode;
  iconRight?: React.ReactNode;
}

export function Button({
  variant = "primary",
  size = "default",
  loading = false,
  disabled,
  className = "",
  type = "button",
  children,
  icon,
  iconRight,
  ...props
}: ButtonProps) {
  const base =
    "inline-flex items-center justify-center font-semibold transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent select-none";

  const combined = [base, variantClasses[variant], sizeClasses[size], className]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={combined}
      {...props}
    >
      {loading ? (
        <span className="flex items-center gap-2">
          <svg className="animate-spin h-4 w-4 opacity-70" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Loading…
        </span>
      ) : (
        <>
          {icon && <span className="shrink-0">{icon}</span>}
          {children}
          {iconRight && <span className="shrink-0">{iconRight}</span>}
        </>
      )}
    </button>
  );
}
