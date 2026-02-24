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
      <header className="mb-6">
        {backHref && (
          <Link
            href={backHref}
            className="inline-flex items-center gap-2 rounded-lg px-2 py-1 text-sm font-medium text-fn-muted hover:bg-white hover:text-fn-ink focus:outline-none focus:ring-2 focus:ring-fn-primary/30"
          >
            <span aria-hidden>←</span> {backLabel}
          </Link>
        )}
        <h1 className={backHref ? "mt-3 font-display text-3xl font-semibold text-fn-ink sm:text-4xl" : "font-display text-3xl font-semibold text-fn-ink sm:text-4xl"}>
          {title}
        </h1>
        {subtitle && <p className="mt-2 max-w-2xl text-base text-fn-muted">{subtitle}</p>}
      </header>
      {children}
    </div>
  );
}
