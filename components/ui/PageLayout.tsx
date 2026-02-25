import Link from "next/link";
import type { ReactNode } from "react";

export interface PageLayoutProps {
  title: ReactNode;
  subtitle?: string;
  backHref?: string;
  backLabel?: string;
  children: ReactNode;
  className?: string;
}

export function PageLayout({
  title,
  subtitle,
  backHref,
  backLabel = "Back",
  children,
  className = "",
}: PageLayoutProps) {
  return (
    <div id="main" className={`mx-auto w-full max-w-shell px-4 py-8 sm:px-6 ${className}`.trim()}>
      <header className="mb-10 text-center">
        {backHref && (
          <Link
            href={backHref}
            className="mb-4 inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold uppercase tracking-widest text-fn-ink/60 hover:bg-white/10 hover:text-fn-ink transition-all ring-1 ring-white/10"
          >
            <span aria-hidden>←</span> {backLabel}
          </Link>
        )}
        <h1 className="font-display text-4xl font-black text-fn-ink sm:text-6xl tracking-tighter uppercase italic">
          {title}
        </h1>
        {subtitle && <p className="mx-auto mt-4 max-w-2xl text-lg font-medium text-fn-muted leading-relaxed">{subtitle}</p>}
      </header>
      {children}
    </div>
  );
}
