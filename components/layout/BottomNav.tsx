"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";

const navItems = [
  {
    href: "/",
    label: "Home",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
        <path d="M3 12L12 3l9 9" />
        <path d="M9 21V12h6v9" />
        <path d="M5 21h14" />
      </svg>
    ),
    iconFilled: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
        <path d="M12 2.1L1 12.7h3V21h6v-6h4v6h6v-8.3h3L12 2.1z" />
      </svg>
    ),
  },
  {
    href: "/log",
    label: "Log",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
        <rect x="3" y="3" width="18" height="18" rx="3" />
        <path d="M12 8v8M8 12h8" />
      </svg>
    ),
    iconFilled: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
        <rect x="3" y="3" width="18" height="18" rx="3" />
        <path fill="white" fillRule="evenodd" d="M13 9h-2v3H8v2h3v3h2v-3h3v-2h-3V9z" />
      </svg>
    ),
  },
  {
    href: "/progress",
    label: "Progress",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
        <path d="M3 20h18" />
        <path d="M5 20V14" />
        <path d="M9 20V9" />
        <path d="M13 20V12" />
        <path d="M17 20V5" />
      </svg>
    ),
    iconFilled: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
        <path d="M3 21h18v-1.5H3V21z" />
        <rect x="3.5" y="14" width="3" height="6" rx="0.5" />
        <rect x="7.5" y="9" width="3" height="11" rx="0.5" />
        <rect x="11.5" y="12" width="3" height="8" rx="0.5" />
        <rect x="15.5" y="5" width="3" height="15" rx="0.5" />
      </svg>
    ),
  },
  {
    href: "/coach",
    label: "Coach",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
        <path d="M12 2a7 7 0 017 7c0 4.5-7 13-7 13S5 13.5 5 9a7 7 0 017-7z" />
        <circle cx="12" cy="9" r="2.5" />
      </svg>
    ),
    iconFilled: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
        <path d="M12 2a7 7 0 017 7c0 4.5-7 13-7 13S5 13.5 5 9a7 7 0 017-7z" />
        <circle cx="12" cy="9" r="2.5" fill="white" />
      </svg>
    ),
  },
  {
    href: "/settings",
    label: "Settings",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
      </svg>
    ),
    iconFilled: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
        <circle cx="12" cy="12" r="3.5" />
        <path d="M20.83 14.83A9 9 0 0021 12a9 9 0 00-.17-1.77l-1.93-.56a7 7 0 00-.82-1.97l1.1-1.65A9 9 0 0016.7 4.6l-1.65 1.1a7 7 0 00-1.97-.82L12.57 3H11.4l-.56 1.93a7 7 0 00-1.97.82L7.22 4.65A9 9 0 004.78 7.1L5.9 8.75a7 7 0 00-.82 1.97L3.17 11.3A9 9 0 003 12a9 9 0 00.17 1.77l1.93.56a7 7 0 00.82 1.97l-1.1 1.65a9 9 0 002.43 2.5l1.65-1.1a7 7 0 001.97.82l.56 1.93h1.17l.56-1.93a7 7 0 001.97-.82l1.65 1.1a9 9 0 002.43-2.43l-1.1-1.65a7 7 0 00.82-1.97l1.86-.56z" />
      </svg>
    ),
  },
] as const;

const hiddenRoutes = ["/auth", "/start", "/onboarding"];

export function BottomNav() {
  const pathname = usePathname();
  const { user } = useAuth();
  const hide = hiddenRoutes.some((p) => pathname.startsWith(p)) || (!user && pathname === "/");

  if (hide) return null;

  return (
    <>
      {/* ── Mobile bottom nav ─────────────────────────────── */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 md:hidden"
        role="navigation"
        aria-label="Main navigation"
      >
        <div className="nav-safe glass border-t border-fn-border/60 shadow-fn-elevated px-2">
          <div className="flex justify-around">
            {navItems.map(({ href, label, icon, iconFilled }) => {
              const isActive = pathname === href || (href !== "/" && pathname.startsWith(href));
              return (
                <Link
                  key={href}
                  href={href}
                  className={`relative flex min-h-touch flex-col items-center justify-center gap-1 px-3 py-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-fn-primary/40 rounded-xl transition-all duration-200 ${
                    isActive ? "text-fn-primary" : "text-fn-muted hover:text-fn-ink"
                  }`}
                  aria-current={isActive ? "page" : undefined}
                >
                  {isActive ? (
                    <>
                      <span className="absolute inset-x-1 top-1.5 h-0.5 rounded-full bg-fn-primary" />
                      {iconFilled}
                    </>
                  ) : (
                    icon
                  )}
                  <span className="text-[10px] font-semibold tracking-wide">{label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </nav>

      {/* ── Desktop top nav ────────────────────────────────── */}
      <nav
        className="hidden md:flex sticky top-0 z-40 w-full border-b border-fn-border/60 glass shadow-fn-soft"
        role="navigation"
        aria-label="Main navigation"
      >
        <div className="mx-auto flex w-full max-w-shell items-center justify-between px-6 py-3">
          {/* Brand */}
          <Link href="/" className="flex items-center gap-2 group">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-primary shadow-fn-primary">
              <svg viewBox="0 0 24 24" fill="white" className="h-4 w-4">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
              </svg>
            </span>
            <span className="font-display text-lg font-semibold text-fn-ink-rich tracking-tight">FitNova</span>
          </Link>

          {/* Nav links */}
          <div className="flex items-center gap-1">
            {navItems.map(({ href, label, icon }) => {
              const isActive = pathname === href || (href !== "/" && pathname.startsWith(href));
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-semibold transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-fn-primary/40 ${
                    isActive
                      ? "bg-fn-primary text-white shadow-fn-primary"
                      : "text-fn-muted hover:bg-fn-surface-hover hover:text-fn-ink"
                  }`}
                  aria-current={isActive ? "page" : undefined}
                >
                  <span className="h-4 w-4 opacity-80">{icon}</span>
                  {label}
                </Link>
              );
            })}
          </div>
        </div>
      </nav>
    </>
  );
}
