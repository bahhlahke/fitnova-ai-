import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "default" | "sm";

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-fn-primary text-black shadow-fn-btn hover:bg-white hover:scale-[1.02] focus:ring-fn-primary/40 disabled:opacity-50",
  secondary:
    "border border-white/10 bg-white/5 text-white backdrop-blur-sm hover:bg-white/10 hover:border-white/20 focus:ring-fn-primary/30",
  ghost:
    "text-fn-muted hover:bg-white/5 hover:text-white focus:ring-fn-primary/20",
  danger:
    "bg-fn-danger/20 text-fn-danger border border-fn-danger/30 hover:bg-fn-danger/30 focus:ring-fn-danger/30 disabled:opacity-50",
};

const sizeClasses: Record<ButtonSize, string> = {
  default: "h-touch-lg px-8 py-4 text-[11px] tracking-[0.25em] font-black",
  sm: "h-10 px-4 py-2 text-[10px] tracking-widest font-black uppercase rounded-xl",
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
    "inline-flex items-center justify-center rounded-xl transition-all duration-300 active:scale-95 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-fn-bg";
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
