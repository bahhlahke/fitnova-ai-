import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "default" | "sm";

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-fn-primary text-black shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:bg-white hover:shadow-[0_0_30px_rgba(255,255,255,0.2)] hover:-translate-y-0.5 focus:ring-fn-primary/40 disabled:opacity-50",
  secondary:
    "border border-fn-border bg-transparent text-fn-ink hover:bg-fn-surface-hover focus:ring-fn-primary/30 backdrop-blur-sm",
  ghost:
    "text-fn-ink-soft hover:bg-fn-surface focus:ring-fn-primary/20",
  danger:
    "bg-fn-danger text-white hover:brightness-95 focus:ring-fn-danger/30 disabled:opacity-50",
};

const sizeClasses: Record<ButtonSize, string> = {
  default: "min-h-touch-lg min-w-touch px-8 py-4 text-sm tracking-wide uppercase font-bold",
  sm: "min-h-[40px] px-4 py-2 text-xs rounded-xl font-semibold",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: ReactNode;
}

export function Button({
  variant = "primary",
  size = "default",
  loading = false,
  disabled,
  className = "",
  type = "button",
  icon,
  children,
  ...props
}: ButtonProps) {
  const base =
    "inline-flex items-center justify-center rounded-xl font-black uppercase tracking-widest transition-all duration-500 cubic-bezier(0.4, 0, 0.2, 1) active:scale-95 active:brightness-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-fn-bg";
  const combined = [
    base,
    variantClasses[variant],
    sizeClasses[size],
    icon ? "gap-2" : "",
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
      {loading ? (
        <span className="flex items-center gap-1" aria-label="Loading">
          <span className="h-1.5 w-1.5 rounded-full bg-current animate-bounce [animation-delay:0ms]" />
          <span className="h-1.5 w-1.5 rounded-full bg-current animate-bounce [animation-delay:150ms]" />
          <span className="h-1.5 w-1.5 rounded-full bg-current animate-bounce [animation-delay:300ms]" />
        </span>
      ) : (
        <>{icon}{children}</>
      )}
    </button>
  );
}
