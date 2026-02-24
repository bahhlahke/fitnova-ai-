"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
const navItems = [
  { href: "/", label: "Dashboard", icon: "◉" },
  { href: "/log", label: "Log", icon: "◆" },
  { href: "/progress", label: "Progress", icon: "▣" },
  { href: "/coach", label: "AI Coach", icon: "◇" },
  { href: "/settings", label: "Settings", icon: "○" },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-fn-border bg-fn-charcoal nav-safe md:relative md:border-t-0 md:bg-transparent"
      role="navigation"
      aria-label="Main"
    >
      <div className="mx-auto flex max-w-lg justify-around md:justify-start md:gap-4 md:px-4 md:py-2">
        {navItems.map(({ href, label, icon }) => {
          const isActive = pathname === href || (href !== "/" && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={`relative flex min-h-touch min-w-touch flex-col items-center justify-center gap-0.5 px-4 py-2 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-fn-teal md:min-h-0 md:min-w-0 md:rounded-lg ${
                isActive ? "text-fn-teal" : "text-fn-muted hover:bg-fn-surface-hover hover:text-white"
              }`}
              aria-current={isActive ? "page" : undefined}
            >
              <span className="text-lg" aria-hidden>{icon}</span>
              <span>{label}</span>
              {isActive && (
                <span className="absolute bottom-0 left-1/2 h-0.5 w-8 -translate-x-1/2 rounded-full bg-fn-teal md:bottom-1/2 md:left-0 md:top-1/2 md:h-4 md:w-0.5 md:-translate-y-1/2 md:translate-x-0 md:rounded-none" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
