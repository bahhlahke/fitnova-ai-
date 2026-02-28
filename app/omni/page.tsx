"use client";

import { OmniChat } from "@/components/layout/OmniChat";
import { useAuth } from "@/components/auth/AuthProvider";
import { LoadingState } from "@/components/ui/LoadingState";
import { redirect } from "next/navigation";
import { useEffect } from "react";

export default function OmniPage() {
    const { user, loading } = useAuth();

    useEffect(() => {
        if (!loading && !user) {
            redirect("/auth");
        }
    }, [user, loading]);

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-black">
                <LoadingState message="Connecting to Nova AI..." />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-4xl text-center mb-12">
                <div className="mx-auto mb-6 h-16 w-16 rounded-2xl bg-fn-accent/20 border border-fn-accent/30 flex items-center justify-center text-fn-accent">
                    <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                </div>
                <h1 className="font-display text-4xl sm:text-6xl font-black text-white italic uppercase tracking-tighter mb-4">Command Center</h1>
                <p className="text-xl text-fn-muted font-medium max-w-2xl mx-auto">
                    Your direct line to Nova AI. Text anything to log, analyze, or navigate your performance protocol.
                </p>
            </div>

            <div className="w-full max-w-2xl bg-white/[0.02] border border-white/5 rounded-3xl p-8 backdrop-blur-3xl">
                <p className="text-center text-fn-muted italic mb-8">
                    The Omni-Chat panel is active on the right side of your screen.
                    Use it to begin your command sequence.
                </p>
                <div className="flex justify-center">
                    <div className="h-24 w-1 bg-fn-accent/20 rounded-full overflow-hidden">
                        <div className="h-full w-full bg-fn-accent animate-pulse" />
                    </div>
                </div>
            </div>
        </div>
    );
}
