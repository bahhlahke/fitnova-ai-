"use client";

import { useState } from "react";
import {
    PageLayout,
    Card,
    CardHeader,
    Button,
} from "@/components/ui";

export default function MotionLabPage() {
    const [analyzing, setAnalyzing] = useState(false);
    const [complete, setComplete] = useState(false);

    async function startAnalysis() {
        setAnalyzing(true);
        // Mock analysis delay
        setTimeout(() => {
            setAnalyzing(false);
            setComplete(true);
        }, 3000);
    }

    return (
        <PageLayout
            title="AI Motion Lab"
            subtitle="Vision AI form verification and corrective feedback."
            backHref="/"
            backLabel="Cockpit"
        >
            <div className="mx-auto max-w-4xl space-y-12 py-10">
                <header className="text-center">
                    <p className="text-[10px] font-black uppercase tracking-[0.4em] text-fn-accent mb-4">Elite Vision System</p>
                    <h1 className="font-display text-5xl font-black text-white italic tracking-tighter uppercase sm:text-7xl">Kinematic Scan</h1>
                </header>

                <section className="grid gap-8 lg:grid-cols-2">
                    <Card className="border-white/5 bg-white/[0.02] overflow-hidden">
                        <div className="relative aspect-[9/16] bg-black/40 flex items-center justify-center border-b border-white/5">
                            {!complete ? (
                                <div className="text-center p-8">
                                    <div className="h-20 w-20 rounded-full border-2 border-dashed border-white/10 flex items-center justify-center mx-auto mb-6">
                                        <svg className="w-8 h-8 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                        </svg>
                                    </div>
                                    <p className="text-xs font-black uppercase tracking-widest text-fn-muted">Upload Movement Clip</p>
                                    <p className="mt-2 text-[10px] text-fn-muted/50 font-medium italic">Max 30s. Clear visibility required.</p>
                                </div>
                            ) : (
                                <div className="absolute inset-0 bg-fn-accent/10 flex items-center justify-center overflow-hidden">
                                    {/* Mock video skeleton */}
                                    <div className="absolute inset-0 border-4 border-fn-accent animate-pulse opacity-20" />
                                    <div className="relative h-full w-full">
                                        <div className="absolute top-1/2 left-1/4 h-1/2 w-1 bg-fn-accent/50 rounded-full blur-sm" />
                                        <div className="absolute top-1/3 left-1/2 h-1/3 w-1 bg-fn-accent/50 rounded-full blur-sm" />
                                    </div>
                                    <p className="absolute bottom-10 text-[10px] font-black uppercase tracking-[0.5em] text-fn-accent">Analysis Active</p>
                                </div>
                            )}
                        </div>
                        <div className="p-6">
                            <Button
                                className="w-full"
                                loading={analyzing}
                                onClick={startAnalysis}
                                disabled={complete}
                            >
                                {complete ? "Analysis Complete" : "Initialize Scan"}
                            </Button>
                        </div>
                    </Card>

                    <aside className="space-y-6">
                        <Card padding="lg" className="border-fn-accent/20 bg-fn-accent/5">
                            <CardHeader title="Live Skeleton" subtitle="Real-time joint tracking" />
                            <div className="mt-8 space-y-4">
                                <div className="flex justify-between items-center text-xs font-black uppercase tracking-widest text-fn-muted">
                                    <span>L-Shoulder Angle</span>
                                    <span className="text-fn-accent">142°</span>
                                </div>
                                <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                                    <div className="h-full bg-fn-accent w-[78%] animate-pulse" />
                                </div>
                                <div className="flex justify-between items-center text-xs font-black uppercase tracking-widest text-fn-muted">
                                    <span>R-Hip Hinge</span>
                                    <span className="text-fn-accent">Stable</span>
                                </div>
                                <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                                    <div className="h-full bg-fn-accent w-[92%] animate-pulse" />
                                </div>
                            </div>
                        </Card>

                        {complete && (
                            <Card padding="lg" className="border-white/5 bg-white/[0.05] animate-in fade-in slide-in-from-right-4 duration-500">
                                <CardHeader title="AI Insight" subtitle="Kinematic Correction" />
                                <p className="mt-4 text-sm text-fn-muted leading-relaxed italic border-l-2 border-fn-accent pl-4">
                                    "Lateral shift detected in mid-rep. Prioritize glute engagement and maintain external rotation of the femur to protect the patellofemoral joint."
                                </p>
                            </Card>
                        )}

                        <Card padding="lg" className="border-white/5 bg-white/[0.01]">
                            <CardHeader title="Lab Guide" subtitle="System requirements" />
                            <ul className="mt-4 space-y-4">
                                <li className="flex gap-4">
                                    <span className="text-xs font-black text-fn-accent">01</span>
                                    <p className="text-xs text-fn-muted">Phone must be parallel to movement plane.</p>
                                </li>
                                <li className="flex gap-4">
                                    <span className="text-xs font-black text-fn-accent">02</span>
                                    <p className="text-xs text-fn-muted">Full body visibility (head to toe).</p>
                                </li>
                                <li className="flex gap-4">
                                    <span className="text-xs font-black text-fn-accent">03</span>
                                    <p className="text-xs text-fn-muted">High-contrast clothing recommended.</p>
                                </li>
                            </ul>
                        </Card>
                    </aside>
                </section>
            </div>
        </PageLayout>
    );
}
