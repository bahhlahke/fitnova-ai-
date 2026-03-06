"use client";

import { usePathname } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { Sidebar } from "./Sidebar";
import { BottomNav } from "./BottomNav";
import { AiCoachPanel } from "@/components/ai/AiCoachPanel";

const hiddenRoutes = ["/auth", "/start", "/onboarding"];

export function MainLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const { user } = useAuth();

    // Check if sidebar should be hidden
    const hideSidebar = hiddenRoutes.some((p) => pathname.startsWith(p)) || (!user && pathname === "/");

    return (
        <div className="flex min-h-screen w-full flex-row">
            <Sidebar />
            <div className={`flex min-w-0 flex-1 flex-col transition-all duration-300 ${hideSidebar ? "" : "md:pl-64"}`}>
                <main id="main" className="flex-1 pb-20 md:pb-10" tabIndex={-1}>
                    {children}
                </main>
                <BottomNav />
                <AiCoachPanel mode="launcher" />
            </div>
        </div>
    );
}
