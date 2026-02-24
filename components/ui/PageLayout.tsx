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
    <div
      id="main"
      className={`mx-auto max-w-lg px-4 py-6 ${className}`.trim()}
    >
      <header className="mb-6">
        {backHref && (
          <Link
            href={backHref}
            className="text-fn-muted hover:text-white focus:outline-none focus:ring-2 focus:ring-fn-teal rounded"
          >
            ← {backLabel}
          </Link>
        )}
        <h1 className={backHref ? "mt-2 text-2xl font-bold text-white" : "text-2xl font-bold text-white"}>
          {title}
        </h1>
        {subtitle && <p className="mt-1 text-fn-muted">{subtitle}</p>}
      </header>
      {children}
    </div>
  );
}
