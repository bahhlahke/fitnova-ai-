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
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/5 bg-black/40 backdrop-blur-3xl nav-safe md:hidden shadow-[0_-10px_50px_rgba(0,0,0,0.5)]"
      role="navigation"
      aria-label="Main"
    >
      <div className="mx-auto flex max-w-shell justify-between px-6 py-4">
        {navItems.map(({ href, label }) => {
          const isActive = pathname === href || (href !== "/" && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={`relative flex flex-col items-center justify-center transition-all duration-300 ${isActive
                ? "text-fn-accent scale-110"
                : "text-fn-muted hover:text-white"
                }`}
              aria-current={isActive ? "page" : undefined}
            >
              <div className={`h-1.5 w-1.5 rounded-full mb-1 transition-all ${isActive ? "bg-fn-accent shadow-[0_0_10px_rgba(10,217,196,1)] scale-100" : "bg-transparent scale-0"}`} />
              <span className="text-[10px] font-black uppercase tracking-widest">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
