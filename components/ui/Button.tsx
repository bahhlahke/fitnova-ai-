import type { ButtonHTMLAttributes } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "default" | "sm";

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-fn-primary text-white shadow-fn-soft hover:bg-fn-primary-dim focus:ring-fn-primary/40 disabled:opacity-50",
  secondary:
    "border border-fn-border bg-white text-fn-ink hover:bg-fn-surface-hover focus:ring-fn-primary/30",
  ghost:
    "text-fn-ink-soft hover:bg-white focus:ring-fn-primary/20",
  danger:
    "bg-fn-danger text-white hover:brightness-95 focus:ring-fn-danger/30 disabled:opacity-50",
};

const sizeClasses: Record<ButtonSize, string> = {
  default: "min-h-touch min-w-touch px-5 py-3 text-sm",
  sm: "min-h-[36px] px-3 py-1.5 text-xs rounded-lg",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
}

export function Button({
  variant = "primary",
  size = "default",
  loading = false,
  disabled,
  className = "",
  type = "button",
  children,
  ...props
}: ButtonProps) {
  const base =
    "inline-flex items-center justify-center font-semibold rounded-xl transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-transparent";
  const combined = [
    base,
    variantClasses[variant],
    sizeClasses[size],
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={combined}
      {...props}
    >
      {loading ? "..." : children}
    </button>
  );
}
