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
    <div id="main" className={`mx-auto w-full max-w-shell px-6 py-12 sm:px-10 ${className}`.trim()}>
      <header className="mb-12">
        {backHref && (
          <Link
            href={backHref}
            className="mb-8 inline-flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-5 py-2.5 text-[11px] font-black uppercase tracking-[0.2em] text-white/60 hover:bg-white/10 hover:text-white transition-all backdrop-blur-sm"
          >
            <span aria-hidden className="text-sm">←</span> {backLabel}
          </Link>
        )}
        <h1 className="font-display text-5xl font-black text-white sm:text-7xl tracking-tighter uppercase italic leading-[0.9]">
          {title}
        </h1>
        {subtitle && <p className="mt-4 max-w-2xl text-lg font-medium text-fn-muted leading-relaxed">{subtitle}</p>}
      </header>
      {children}
    </div>
  );
}
