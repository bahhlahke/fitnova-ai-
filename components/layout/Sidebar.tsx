"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { Button } from "@/components/ui/Button";

const navItems = [
    {
        href: "/", label: "Dashboard", icon: (props: any) => (
            <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
        )
    },
    {
        href: "/coach", label: "Coach Room", icon: (props: any) => (
            <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
        )
    },
    {
        href: "/log/workout", label: "Training Log", icon: (props: any) => (
            <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
        )
    },
    {
        href: "/progress", label: "Analytics", icon: (props: any) => (
            <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
            </svg>
        )
    },
    {
        href: "/motion", label: "Motion Lab", icon: (props: any) => (
            <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
        )
    },
    {
        href: "/settings", label: "Settings", icon: (props: any) => (
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
        <aside className="fixed left-0 top-0 hidden h-screen w-64 flex-col border-r border-fn-border bg-fn-bg px-6 py-8 md:flex">
            <div className="mb-10 flex items-center gap-3 px-2">
                <div className="h-8 w-8 rounded-lg bg-fn-accent flex items-center justify-center text-fn-bg">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                </div>
                <span className="font-display text-xl font-black uppercase italic tracking-tighter text-white">FitNova</span>
            </div>

            <nav className="flex-1 space-y-1">
                {navItems.map(({ href, label, icon: Icon }) => {
                    const isActive = pathname === href || (href !== "/" && pathname.startsWith(href));
                    return (
                        <Link
                            key={href}
                            href={href}
                            className={`group flex items-center gap-4 rounded-xl px-4 py-3 text-sm font-bold uppercase tracking-wider transition-all duration-200 ${isActive
                                    ? "bg-white text-black shadow-[0_0_20px_rgba(255,255,255,0.1)]"
                                    : "text-fn-muted hover:bg-white/5 hover:text-white"
                                }`}
                        >
                            <Icon className={`h-5 w-5 ${isActive ? "text-black" : "text-fn-muted group-hover:text-white"}`} />
                            {label}
                        </Link>
                    );
                })}
            </nav>

            <div className="mt-auto border-t border-fn-border pt-6">
                <div className="flex items-center gap-4 px-2">
                    <div className="h-10 w-10 rounded-full bg-fn-accent/10 flex items-center justify-center border border-fn-accent/20 shrink-0">
                        <span className="text-xs font-black text-fn-accent">{user?.email?.[0].toUpperCase() || "U"}</span>
                    </div>
                    <div className="flex-1 overflow-hidden">
                        <p className="truncate text-xs font-black text-white tracking-tight">{user?.email}</p>
                        <p className="text-[10px] font-bold text-fn-muted uppercase tracking-widest leading-none mt-1">Member</p>
                    </div>
                </div>
            </div>
        </aside>
    );
}
