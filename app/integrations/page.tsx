"use client";

import { useState, useEffect } from "react";
import { PageLayout, Card, CardHeader, Button, ErrorMessage, LoadingState } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";

const PROVIDERS = [
    { id: "apple_health", name: "Apple Health", icon: "🍎", description: "Activity, Sleep, HR" },
    { id: "garmin", name: "Garmin Connect", icon: "⌚", description: "Activity, Sleep, HRV, SpO2" },
    { id: "oura", name: "Oura Ring", icon: "💍", description: "Deep Sleep, HRV, Readiness" },
    { id: "whoop", name: "WHOOP", icon: "⚡", description: "Strain, Recovery, Sleep" },
    { id: "freestyle_libre", name: "FreeStyle Libre (CGM)", icon: "🩸", description: "Continuous Glucose Data" }
];

export default function IntegrationsPage() {
    const [loading, setLoading] = useState(true);
    const [activeProviders, setActiveProviders] = useState<Set<string>>(new Set());
    const [userId, setUserId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function load() {
            const supabase = createClient();
            if (!supabase) return;

            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                setLoading(false);
                return;
            }

            if (user) {
                setUserId(user.id);
            }

            // See which providers actually have data
            const { data } = await supabase
                .from("connected_signals")
                .select("provider")
                .eq("user_id", user.id);

            if (data) {
                const providers = new Set(data.map(d => d.provider));
                setActiveProviders(providers);
            }
            setLoading(false);
        }
        void load();
    }, []);

    function copyToClipboard(text: string) {
        navigator.clipboard.writeText(text);
        alert("Koda ID copied to clipboard!");
    }

    return (
        <PageLayout
            title="Integrations & Devices"
            subtitle="Connect wearables via Open Wearables API to supercharge your AI Coach"
        >
            <Card padding="lg" className="mb-6 border-fn-accent/20 bg-fn-accent/5">
                <CardHeader
                    title="Setup Instructions"
                    subtitle="Link your wearable devices in 30 seconds"
                />
                <div className="mt-4 space-y-6">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center justify-between p-4 rounded-2xl bg-black/20 border border-white/5">
                        <div className="flex-1">
                            <p className="text-[10px] font-black uppercase tracking-widest text-fn-accent mb-1">Step 1: Get your Koda ID</p>
                            <p className="text-xs text-fn-muted leading-relaxed">Required to pair your data securely.</p>
                            <div className="mt-2 flex items-center gap-2">
                                <code className="bg-black/40 px-3 py-1.5 rounded-lg text-xs font-mono text-white border border-white/10 break-all">
                                    {userId || "loading..."}
                                </code>
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={() => userId && copyToClipboard(userId)}
                                    className="shrink-0"
                                >
                                    Copy
                                </Button>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center justify-between p-4 rounded-2xl bg-black/20 border border-white/5">
                        <div className="flex-1">
                            <p className="text-[10px] font-black uppercase tracking-widest text-fn-accent mb-1">Step 2: Connect via Dashboard</p>
                            <p className="text-xs text-fn-muted leading-relaxed">Login to your Open Wearables dashboard and paste your Koda ID into the "User ID" field when linking devices.</p>
                        </div>
                        <Link href="https://open-wearables-ui-production.up.railway.app" target="_blank">
                            <Button className="w-full sm:w-auto bg-fn-accent text-black hover:bg-white transition-colors">
                                Launch Dashboard
                                <svg className="ml-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                            </Button>
                        </Link>
                    </div>
                </div>
            </Card>

            <Card padding="lg">
                <CardHeader title="Supported Devices" subtitle="Data will appear automatically once synced" />

                {error && <ErrorMessage message={error} className="mb-4" />}

                {loading ? (
                    <div className="mt-4"><LoadingState /></div>
                ) : (
                    <ul className="mt-6 space-y-3">
                        {PROVIDERS.map((provider) => {
                            const isConnected = activeProviders.has(provider.id);
                            return (
                                <li key={provider.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-fn-border bg-fn-surface px-4 py-4 p-4 hover:bg-fn-surface-hover transition-colors">
                                    <div className="flex items-center gap-4">
                                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-fn-bg text-2xl border border-fn-border/50">
                                            {provider.icon}
                                        </div>
                                        <div>
                                            <p className="font-bold text-fn-ink flex items-center gap-2">
                                                {provider.name}
                                                {isConnected && <span className="text-[10px] font-black uppercase tracking-widest text-fn-accent bg-fn-accent/10 px-2 py-0.5 rounded-full">Active Sync</span>}
                                            </p>
                                            <p className="text-xs text-fn-muted mt-0.5">{provider.description}</p>
                                        </div>
                                    </div>

                                    {isConnected ? (
                                        <div className="flex items-center gap-2 text-fn-accent text-xs font-bold px-3 py-1.5 rounded-full bg-fn-accent/5 border border-fn-accent/10">
                                            <span className="relative flex h-2 w-2">
                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-fn-accent opacity-75"></span>
                                                <span className="relative inline-flex rounded-full h-2 w-2 bg-fn-accent"></span>
                                            </span>
                                            Live
                                        </div>
                                    ) : (
                                        <div className="text-[10px] font-black uppercase tracking-widest text-fn-muted/40">Not Linked</div>
                                    )}
                                </li>
                            );
                        })}
                    </ul>
                )}
            </Card>

            <p className="mt-6 text-center text-xs font-medium text-fn-muted/60 px-4">
                Biometric data is processed locally by Koda AI to generate coaching insights and is never sold to third parties.
            </p>
        </PageLayout>
    );
}
