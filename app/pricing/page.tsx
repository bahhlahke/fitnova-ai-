"use client";

import { useState, useCallback, useEffect, Suspense } from "react";
import {
    PageLayout,
    Card,
    Button,
    CardHeader
} from "@/components/ui";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const PLANS = [
    {
        name: "Standard",
        price: "7-Day Trial",
        description: "Experience the full power of Koda AI for one week.",
        features: [
            "Full Natural Language Logging",
            "Adaptive Daily Protocols",
            "Core Performance Analytics",
            "Single Device Sync",
        ],
        cta: "Start Free Trial",
        href: "/start",
        popular: false,
    },
    {
        name: "Pro",
        price: "$9.99",
        interval: "/mo",
        description: "The gold standard for elite performance intelligence.",
        features: [
            "Everything in Trial",
            "Predictive Progression Engine (1RM, PRs)",
            "Wearable Biometric Sync (SpO2, HRV, Sleep)",
            "Hormonal Cycle AI Coaching",
            "AI Motion Analysis Lab",
            "Metabolic Autopilot & Scanning",
            "Priority AI Inference Speed",
        ],
        cta: "Go Pro (Includes Trial)",
        href: "#",
        popular: true,
    },
];

function PricingContent() {
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const searchParams = useSearchParams();

    const handleUpgrade = useCallback(async () => {
        setLoading(true);
        try {
            const supabase = createClient();
            if (!supabase) throw new Error("Supabase unavailable");
            
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                // Preserve intent through auth
                router.push("/auth?next=/pricing?intent=checkout");
                return;
            }

            const res = await fetch("/api/v1/stripe/checkout", { method: "POST" });
            const data = await res.json();
            if (data.url) {
                window.location.href = data.url;
            } else if (res.status === 401) {
                router.push("/auth?next=/pricing?intent=checkout");
            }
        } catch (err) {
            console.error("Checkout failed", err);
        } finally {
            setLoading(false);
        }
    }, [router]);

    useEffect(() => {
        if (searchParams.get("intent") === "checkout") {
            handleUpgrade();
        }
    }, [searchParams, handleUpgrade]);

    return (
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
                <p className="text-[11px] font-black uppercase tracking-[0.5em] text-fn-accent">Investment in Excellence</p>
                <h1 className="mt-6 font-display text-5xl font-black uppercase italic tracking-tighter text-white sm:text-7xl">
                    Choose your protocol
                </h1>
                <p className="mt-6 text-xl text-fn-muted max-w-2xl mx-auto">
                    Scale your performance with precision-engineered coaching tiers.
                </p>
            </div>

            <div className="grid gap-8 md:grid-cols-2 max-w-4xl mx-auto">
                {PLANS.map((plan) => (
                    <Card
                        key={plan.name}
                        padding="lg"
                        className={`relative flex flex-col border ${plan.popular ? "border-fn-accent/50 bg-fn-accent/5" : "border-white/10 bg-fn-surface/20"
                            } backdrop-blur-xl`}
                    >
                        {plan.popular && (
                            <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                                <span className="bg-fn-accent text-black text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full">
                                    Most Advanced
                                </span>
                            </div>
                        )}
                        <div className="mb-8">
                            <h3 className="font-display text-2xl font-black uppercase italic text-white">{plan.name}</h3>
                            <div className="mt-4 flex items-baseline">
                                <span className="text-5xl font-black tracking-tighter text-white">{plan.price}</span>
                                {plan.interval && <span className="ml-1 text-fn-muted">{plan.interval}</span>}
                            </div>
                            <p className="mt-4 text-sm text-fn-muted">{plan.description}</p>
                        </div>

                        <ul className="mb-10 space-y-4 flex-1">
                            {plan.features.map((feature) => (
                                <li key={feature} className="flex items-start text-sm text-fn-ink">
                                    <svg className="h-5 w-5 text-fn-accent shrink-0 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                    {feature}
                                </li>
                            ))}
                        </ul>

                        {plan.name === "Pro" ? (
                            <Button
                                onClick={handleUpgrade}
                                loading={loading}
                                className="w-full h-14 text-sm font-black uppercase tracking-widest"
                            >
                                {plan.cta}
                            </Button>
                        ) : (
                            <Link href={plan.href}>
                                <Button
                                    variant="secondary"
                                    className="w-full h-14 text-sm font-black uppercase tracking-widest"
                                >
                                    {plan.cta}
                                </Button>
                            </Link>
                        )}
                    </Card>
                ))}
            </div>

            {/* Trust Quote */}
            <div className="mt-24 text-center border-t border-white/5 pt-16">
                <div className="max-w-3xl mx-auto">
                    <p className="text-2xl font-medium italic text-white/80 leading-relaxed">
                        &ldquo;Koda AI isn&apos;t just an app; it&apos;s the silent partner in my pursuit of elite performance. The precision is unmatched.&rdquo;
                    </p>
                    <div className="mt-6 flex items-center justify-center gap-4">
                        <div className="h-10 w-10 rounded-full bg-fn-accent/20 border border-fn-accent/30" />
                        <div className="text-left">
                            <p className="text-sm font-bold text-white uppercase">Marcus V.</p>
                            <p className="text-[10px] font-bold text-fn-accent uppercase tracking-widest">Hyrox Elite Athlete</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function PricingPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-fn-bg flex items-center justify-center"><div className="animate-spin h-8 w-8 border-4 border-fn-accent border-t-transparent rounded-full" /></div>}>
            <PricingContent />
        </Suspense>
    );
}
