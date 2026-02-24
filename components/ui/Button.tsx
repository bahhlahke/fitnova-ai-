import type { ButtonHTMLAttributes } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "default" | "sm";

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-fn-teal text-fn-black hover:bg-fn-teal-dim focus:ring-fn-teal disabled:opacity-50",
  secondary:
    "border border-fn-border bg-fn-surface text-white hover:bg-fn-surface-hover focus:ring-fn-teal",
  ghost:
    "text-fn-muted hover:bg-fn-surface-hover hover:text-white focus:ring-fn-teal",
  danger:
    "bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 disabled:opacity-50",
};

const sizeClasses: Record<ButtonSize, string> = {
  default: "min-h-touch min-w-touch px-4 py-3 text-sm",
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
    "inline-flex items-center justify-center font-medium rounded-lg transition-colors focus:outline-none focus:ring-2";
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
      {loading ? "…" : children}
    </button>
  );
}
