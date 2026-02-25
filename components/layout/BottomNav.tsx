"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";

const navItems = [
  { href: "/", label: "Home" },
  { href: "/log", label: "Log" },
  { href: "/progress", label: "Progress" },
  { href: "/coach", label: "Coach" },
  { href: "/settings", label: "Settings" },
] as const;

const hiddenRoutes = ["/auth", "/start", "/onboarding"];

export function BottomNav() {
  const pathname = usePathname();
  const { user } = useAuth();
  const hide = hiddenRoutes.some((p) => pathname.startsWith(p)) || (!user && pathname === "/");

  if (hide) return null;

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-fn-border bg-black/40 backdrop-blur-xl nav-safe md:relative md:border-t-0 md:bg-transparent"
      role="navigation"
      aria-label="Main"
    >
      <div className="mx-auto flex max-w-shell justify-around md:justify-center md:gap-4 md:px-4 md:py-6">
        {navItems.map(({ href, label }) => {
          const isActive = pathname === href || (href !== "/" && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={`relative flex min-h-touch min-w-touch items-center justify-center rounded-2xl px-6 py-3 text-xs font-black uppercase tracking-widest transition-all duration-300 md:min-h-0 md:min-w-0 ${isActive
                  ? "bg-white text-black scale-105 shadow-[0_0_20px_rgba(255,255,255,0.3)]"
                  : "text-fn-muted hover:text-white hover:bg-white/5"
                }`}
              aria-current={isActive ? "page" : undefined}
            >
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
