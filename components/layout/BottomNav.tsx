"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";

const navItems = [
  {
    href: "/",
    label: "Home",
    icon: (props: React.SVGProps<SVGSVGElement>) => (
      <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },
  {
    href: "/log/workout",
    label: "Log",
    icon: (props: React.SVGProps<SVGSVGElement>) => (
      <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
  {
    href: "/progress",
    label: "Progress",
    icon: (props: React.SVGProps<SVGSVGElement>) => (
      <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
      </svg>
    ),
  },
  {
    href: "/coach",
    label: "Coach",
    icon: (props: React.SVGProps<SVGSVGElement>) => (
      <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
      </svg>
    ),
  },
  {
    href: "/settings",
    label: "Settings",
    icon: (props: React.SVGProps<SVGSVGElement>) => (
      <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
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
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/5 bg-black/60 backdrop-blur-3xl nav-safe md:hidden shadow-[0_-10px_50px_rgba(0,0,0,0.5)]"
      role="navigation"
      aria-label="Main"
    >
      <div className="mx-auto flex max-w-shell justify-between px-2 py-2">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || (href !== "/" && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={`relative flex flex-col items-center justify-center gap-1 flex-1 py-2 px-1 rounded-xl transition-all duration-300 ${
                isActive ? "text-fn-accent" : "text-fn-muted hover:text-white"
              }`}
              aria-current={isActive ? "page" : undefined}
            >
              <Icon className={`h-5 w-5 transition-all duration-300 ${isActive ? "scale-110" : ""}`} />
              <span className="text-[9px] font-black uppercase tracking-widest leading-none">{label}</span>
              {isActive && (
                <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 h-0.5 w-4 rounded-full bg-fn-accent shadow-[0_0_8px_rgba(10,217,196,1)]" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
