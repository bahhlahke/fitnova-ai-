"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";

const navItems = [
    {
        href: "/", label: "Dashboard", icon: (props: React.SVGProps<SVGSVGElement>) => (
            <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
        )
    },
    {
        href: "/vitals", label: "Vitals", icon: (props: React.SVGProps<SVGSVGElement>) => (
            <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
            </svg>
        )
    },
    {
        href: "/plan", label: "Training Plan", icon: (props: React.SVGProps<SVGSVGElement>) => (
            <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
        )
    },
    {
        href: "/log/nutrition", label: "Nutrition", icon: (props: React.SVGProps<SVGSVGElement>) => (
            <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
        )
    },
    {
        href: "/log/workout", label: "Workout", icon: (props: React.SVGProps<SVGSVGElement>) => (
            <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
        )
    },
    {
        href: "/check-in", label: "Check-In", icon: (props: React.SVGProps<SVGSVGElement>) => (
            <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
        )
    },
    {
        href: "/progress", label: "Progress", icon: (props: React.SVGProps<SVGSVGElement>) => (
            <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
        )
    },
    {
        href: "/community", label: "Community", icon: (props: React.SVGProps<SVGSVGElement>) => (
            <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
        )
    },
    {
        href: "/coach", label: "Coach", icon: (props: React.SVGProps<SVGSVGElement>) => (
            <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
        )
    },
    {
        href: "/settings", label: "Settings", icon: (props: React.SVGProps<SVGSVGElement>) => (
            <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
        )
    },
] as const;

const hiddenRoutes = ["/auth", "/start", "/onboarding"];

export function Sidebar() {
    const pathname = usePathname();
    const { user } = useAuth();
    const hide = hiddenRoutes.some((p) => pathname.startsWith(p)) || (!user && pathname === "/");

    if (hide) return null;

    return (
        <aside className="fixed left-0 top-0 hidden h-screen w-64 flex-col border-r border-white/[0.04] bg-fn-bg px-4 py-6 md:flex z-50">
            {/* Logo */}
            <div className="mb-8 flex items-center gap-3 px-3">
                <div className="h-8 w-8 rounded-lg bg-fn-accent flex items-center justify-center text-black shrink-0">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                </div>
                <span className="font-display text-lg font-black uppercase italic tracking-tighter text-white">Koda AI</span>
            </div>

            {/* Nav */}
            <nav className="flex-1 space-y-0.5 overflow-y-auto">
                {navItems.map((item) => {
                    const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`group relative flex items-center gap-4 rounded-xl px-4 py-3.5 transition-all duration-300 ${isActive
                                ? "bg-fn-accent/10 border border-fn-accent/20 text-fn-accent shadow-fn-soft"
                                : "text-fn-ink-soft hover:bg-white/5 hover:text-white border border-transparent"
                                }`}
                        >
                            <span className={`h-5 w-5 transition-transform duration-300 group-hover:scale-110 ${isActive ? "text-fn-accent" : "text-fn-ink/40 group-hover:text-white"}`}>
                                {item.icon({ className: "h-full w-full" })}
                            </span>
                            <span className={`text-[11px] font-black uppercase tracking-[0.2em] ${isActive ? "text-fn-accent" : "text-white/60 group-hover:text-white"}`}>
                                {item.label}
                            </span>
                            {isActive && (
                                <div className="absolute -left-1.5 h-6 w-1 rounded-full bg-fn-accent" />
                            )}
                        </Link>
                    );
                })}
            </nav>

            {/* User footer */}
            <div className="mt-4 border-t border-white/[0.04] pt-4">
                <div className="flex items-center gap-3 px-2">
                    <div className="h-8 w-8 rounded-full bg-gradient-to-br from-fn-accent/30 to-fn-accent/10 flex items-center justify-center border border-fn-accent/20 shrink-0">
                        <span className="text-xs font-black text-fn-accent">{user?.email?.[0].toUpperCase() || "U"}</span>
                    </div>
                    <div className="flex-1 overflow-hidden">
                        <p className="truncate text-xs font-semibold text-white/80">{user?.email}</p>
                        <p className="text-[10px] font-bold text-fn-muted uppercase tracking-widest leading-none mt-0.5">Member</p>
                    </div>
                </div>
            </div>
        </aside>
    );
}
