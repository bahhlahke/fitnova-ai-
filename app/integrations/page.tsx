"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { PageLayout, Card, CardHeader, Button, ErrorMessage, LoadingState } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";

type Provider = {
    id: string;
    name: string;
    icon: string;
    description: string;
    // How data actually arrives — "oauth" means via Open Wearables dashboard, "manual" means user-exported files, "apple" is a special case, "spotify" is direct via Supabase
    syncMethod: "oauth" | "apple" | "spotify";
    learnMoreUrl?: string;
};

const PROVIDERS: Provider[] = [
    {
        id: "garmin",
        name: "Garmin Connect",
        icon: "⌚",
        description: "Activity, Sleep, HRV, SpO2",
        syncMethod: "oauth",
    },
    {
        id: "oura",
        name: "Oura Ring",
        icon: "💍",
        description: "Deep Sleep, HRV, Readiness",
        syncMethod: "oauth",
    },
    {
        id: "whoop",
        name: "WHOOP",
        icon: "⚡",
        description: "Strain, Recovery, Sleep",
        syncMethod: "oauth",
    },
    {
        id: "freestyle_libre",
        name: "FreeStyle Libre (CGM)",
        icon: "🩸",
        description: "Continuous Glucose Monitoring",
        syncMethod: "oauth",
    },
    {
        id: "apple_health",
        name: "Apple Health / Apple Watch",
        icon: "🍎",
        description: "Activity, Sleep, Heart Rate — requires Export",
        syncMethod: "apple",
        learnMoreUrl: "https://support.apple.com/en-us/111762",
    },
    {
        id: "spotify",
        name: "Spotify",
        icon: "🎵",
        description: "Music control & workout playlists",
        syncMethod: "spotify",
    },
];

export default function IntegrationsPage() {
    const [loading, setLoading] = useState(true);
    const [activeProviders, setActiveProviders] = useState<Set<string>>(new Set());
    const [userId, setUserId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function load() {
            const supabase = createClient();
            if (!supabase) { setLoading(false); return; }

            const { data: { user } } = await supabase.auth.getUser();
            if (!user) { setLoading(false); return; }

            setUserId(user.id);

            // A provider is only "Active" if real data has actually been received via the webhook
            const { data } = await supabase
                .from("connected_signals")
                .select("provider")
                .eq("user_id", user.id);

            if (data && data.length > 0) {
                const providers = new Set(data.map(d => d.provider as string));

                // Check if user has Spotify identity
                const identities = user.identities || [];
                const hasSpotify = identities.some(identity => identity.provider === 'spotify');
                if (hasSpotify) {
                    providers.add('spotify');
                }

                setActiveProviders(providers);
            } else {
                // Even if no connected_signals, check for Spotify
                const identities = user.identities || [];
                const hasSpotify = identities.some(identity => identity.provider === 'spotify');
                if (hasSpotify) {
                    setActiveProviders(new Set(['spotify']));
                }
            }
            setLoading(false);
        }
        void load();
    }, []);

    function copyToClipboard(text: string) {
        navigator.clipboard.writeText(text).catch(() => { });
        alert("Koda ID copied to clipboard!");
    }

    async function connectSpotify() {
        const supabase = createClient();
        if (!supabase) return;

        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'spotify',
            options: {
                scopes: 'user-read-playback-state user-modify-playback-state user-read-currently-playing streaming app-remote-control playlist-read-private playlist-read-collaborative',
                redirectTo: `${window.location.origin}/integrations`,
            }
        });

        if (error) {
            setError(error.message);
        }
    }

    return (
        <PageLayout
            title="Integrations & Devices"
            subtitle="Connect your wearables to supercharge your AI Coach with real biometric data"
        >
            <section className="premium-panel animate-panel-rise mb-6 p-5 sm:p-6">
                <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
                    <div>
                        <p className="premium-kicker">Signal stack setup</p>
                        <h1 className="premium-headline mt-2 text-3xl sm:text-4xl">Connect devices for smarter adaptation.</h1>
                        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/70">
                            Koda uses sleep, recovery, and activity signals to improve readiness scoring and workout adaptation quality.
                        </p>
                    </div>
                    <div className="premium-panel-soft p-4">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-fn-accent">Connection path</p>
                        <p className="mt-2 text-xs leading-relaxed text-white/75">
                            Copy Koda ID, connect provider, then verify the Active Sync badge after real data arrives.
                        </p>
                    </div>
                </div>
            </section>

            {/* Setup steps */}
            <Card padding="lg" className="mb-6 border-fn-accent/20 bg-fn-accent/5">
                <CardHeader
                    title="Setup Instructions"
                    subtitle="Link your device to start syncing in under 2 minutes"
                />
                <div className="mt-4 space-y-4">
                    {/* Step 1 */}
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start p-4 rounded-2xl bg-black/20 border border-white/5">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-fn-accent/20 border border-fn-accent/30 text-[11px] font-black text-fn-accent">1</div>
                        <div className="flex-1">
                            <p className="text-xs font-bold text-white mb-0.5">Copy your Koda ID</p>
                            <p className="text-xs text-fn-muted mb-2">This is your unique identifier, required to pair your wearable data.</p>
                            <div className="flex items-center gap-2 flex-wrap">
                                <code className="bg-black/40 px-3 py-1.5 rounded-lg text-xs font-mono text-white border border-white/10 break-all">
                                    {userId || "Loading..."}
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

                    {/* Step 2 */}
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start p-4 rounded-2xl bg-black/20 border border-white/5">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-fn-accent/20 border border-fn-accent/30 text-[11px] font-black text-fn-accent">2</div>
                        <div className="flex-1">
                            <p className="text-xs font-bold text-white mb-0.5">Open the Open Wearables Dashboard</p>
                            <p className="text-xs text-fn-muted mb-3">Sign in and paste your Koda ID into the &quot;User ID&quot; field when linking a device. OAuth authentication happens there — this is the genuine step that authorizes your wearable account.</p>
                        </div>
                        <Link href="https://open-wearables-ui-production.up.railway.app" target="_blank" className="shrink-0">
                            <Button className="w-full sm:w-auto bg-fn-accent text-black hover:bg-white transition-colors text-xs">
                                Launch Dashboard
                                <svg className="ml-2 h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                            </Button>
                        </Link>
                    </div>

                    {/* Step 3 */}
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start p-4 rounded-2xl bg-black/20 border border-white/5">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-fn-accent/20 border border-fn-accent/30 text-[11px] font-black text-fn-accent">3</div>
                        <div className="flex-1">
                            <p className="text-xs font-bold text-white mb-0.5">Data syncs automatically</p>
                            <p className="text-xs text-fn-muted">Once connected, your device sends sleep, HRV, and activity data to Koda AI in real-time. The &quot;Active Sync&quot; badge below will appear only after real data is received.</p>
                        </div>
                    </div>
                </div>
            </Card>

            {/* Apple Health note */}
            <div className="mb-6 rounded-2xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 flex items-start gap-3">
                <span className="text-base shrink-0 mt-0.5">⚠️</span>
                <div>
                    <p className="text-xs font-bold text-amber-300">Apple Health / Apple Watch requires a manual export.</p>
                    <p className="text-xs text-fn-muted mt-0.5">
                        Apple does not support direct cloud OAuth like Garmin or Oura. To sync Apple Health data, you must
                        export it from the Health app and import it manually, or use a third-party bridge app.{" "}
                        <a href="https://support.apple.com/en-us/111762" target="_blank" rel="noopener noreferrer" className="text-fn-accent hover:underline">
                            Learn how to export →
                        </a>
                    </p>
                </div>
            </div>

            {/* Device list */}
            <Card padding="lg">
                <CardHeader title="Supported Devices" subtitle="Status reflects real data received — not just dashboard links" />

                {error && <ErrorMessage message={error} className="mb-4" />}

                {loading ? (
                    <div className="mt-4"><LoadingState /></div>
                ) : (
                    <ul className="mt-6 space-y-3">
                        {PROVIDERS.map((provider) => {
                            const isConnected = activeProviders.has(provider.id);
                            const isApple = provider.syncMethod === "apple";
                            return (
                                <li key={provider.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-fn-border bg-fn-surface px-4 py-4 hover:bg-fn-surface-hover transition-colors">
                                    <div className="flex items-center gap-4">
                                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-fn-bg text-2xl border border-fn-border/50">
                                            {provider.icon}
                                        </div>
                                        <div>
                                            <p className="font-bold text-fn-ink flex items-center gap-2 flex-wrap">
                                                {provider.name}
                                                {isConnected && (
                                                    <span className="text-[9px] font-black uppercase tracking-widest text-fn-accent bg-fn-accent/10 px-2 py-0.5 rounded-full">Active Sync</span>
                                                )}
                                                {isApple && !isConnected && (
                                                    <span className="text-[9px] font-black uppercase tracking-widest text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-full">Manual Export</span>
                                                )}
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
                                            Connected
                                        </div>
                                    ) : provider.syncMethod === "spotify" ? (
                                        <Button
                                            variant="secondary"
                                            size="sm"
                                            onClick={connectSpotify}
                                            className="w-full sm:w-auto text-xs"
                                        >
                                            Connect Spotify
                                        </Button>
                                    ) : isApple ? (
                                        <a href="https://support.apple.com/en-us/111762" target="_blank" rel="noopener noreferrer">
                                            <Button variant="secondary" size="sm" className="w-full sm:w-auto text-xs">
                                                Export Guide
                                            </Button>
                                        </a>
                                    ) : (
                                        <Link href="https://open-wearables-ui-production.up.railway.app" target="_blank">
                                            <Button variant="secondary" size="sm" className="w-full sm:w-auto text-xs">
                                                Connect via Dashboard
                                            </Button>
                                        </Link>
                                    )}
                                </li>
                            );
                        })}
                    </ul>
                )}
            </Card>

            <p className="mt-6 text-center text-xs font-medium text-fn-muted/60 px-4">
                Biometric data is processed locally to generate coaching insights and is never sold to third parties. All connections require explicit OAuth authorization.
            </p>
        </PageLayout>
    );
}
