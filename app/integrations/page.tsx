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
    const [simulating, setSimulating] = useState<string | null>(null);
    const [activeProviders, setActiveProviders] = useState<Set<string>>(new Set());
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

    async function simulateConnection(providerId: string, providerName: string) {
        setSimulating(providerId);
        setError(null);
        try {
            const supabase = createClient();
            if (!supabase) throw new Error("Supabase client not initialized");
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Must be logged in.");

            // Simulate the aggregator OAuth flow + Webhook push
            // We will hit our own webhook endpoint with a dummy payload

            let payloadType = "sleep";
            let payloadData: any = {};

            if (providerId === "freestyle_libre") {
                payloadType = "body";
                payloadData = { blood_glucose_avg: 95, core_temperature_delta: 0.2 };
            } else if (providerId === "whoop") {
                payloadType = "readiness";
                payloadData = { strain: 14.5 };
            } else {
                payloadType = "sleep";
                payloadData = {
                    duration_seconds: 25200, // 7 hours
                    deep_sleep_seconds: 5400, // 1.5 hours
                    rem_sleep_seconds: 7200, // 2 hours
                    readiness: 85,
                    hrv_rmssd: 65,
                    resting_heart_rate: 52,
                    spo2_avg: 98,
                    respiratory_rate_avg: 14.5
                };
            }

            const res = await fetch("/api/v1/integrations/webhook", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    event_type: payloadType,
                    provider: providerId,
                    user_id: user.id,
                    data: [payloadData]
                })
            });

            if (!res.ok) {
                throw new Error("Failed to process integration webhook");
            }

            setActiveProviders(prev => {
                const next = new Set(prev);
                next.add(providerId);
                return next;
            });

            // Show success
            setTimeout(() => alert(`Successfully connected ${providerName}! Data is now sinking into Koda AI.`), 300);

        } catch (err) {
            setError(err instanceof Error ? err.message : "Integration failed.");
        } finally {
            setSimulating(null);
        }
    }

    return (
        <PageLayout
            title="Integrations & Devices"
            subtitle="Connect wearables via Open Wearables API to supercharge your AI Coach"
        >
            <Card padding="lg">
                <CardHeader title="Available Providers" subtitle="Secure, encrypted biometric sync" />

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
                                                {isConnected && <span className="text-[10px] font-black uppercase tracking-widest text-fn-accent bg-fn-accent/10 px-2 py-0.5 rounded-full">Active</span>}
                                            </p>
                                            <p className="text-xs text-fn-muted mt-0.5">{provider.description}</p>
                                        </div>
                                    </div>

                                    <Button
                                        variant={isConnected ? "secondary" : "primary"}
                                        size="sm"
                                        loading={simulating === provider.id}
                                        onClick={() => void simulateConnection(provider.id, provider.name)}
                                        disabled={isConnected}
                                        className="w-full sm:w-auto"
                                    >
                                        {isConnected ? "Connected" : "Sync Wearable"}
                                    </Button>
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
