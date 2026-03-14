"use client";

import { useEffect, useState } from "react";
import { PageLayout, Card, CardHeader, Button, LoadingState, EmptyState } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";

export default function CoachOpsPage() {
    const [safetyLogs, setSafetyLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const supabase = createClient();
        if (!supabase) return;

        supabase.from("safety_validation_ledger")
            .select("*")
            .order("created_at", { ascending: false })
            .limit(20)
            .then(({ data }) => {
                setSafetyLogs(data ?? []);
                setLoading(false);
            });
    }, []);

    return (
        <PageLayout title="Coach Ops" subtitle="Strategic Platform Overview & Safety Audit">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Card className="border-fn-accent/20 bg-fn-accent/5">
                    <CardHeader title="Stability Index" subtitle="System health" />
                    <p className="mt-4 text-3xl font-black text-fn-accent uppercase italic">98.4%</p>
                    <p className="mt-1 text-[10px] font-black uppercase tracking-widest text-fn-link/40">Prescription reliability</p>
                </Card>
                <Card>
                    <CardHeader title="Retention Risk" subtitle="Prioritized outreach" />
                    <p className="mt-4 text-3xl font-black text-white uppercase italic">12 Users</p>
                    <p className="mt-1 text-[10px] font-black uppercase tracking-widest text-fn-link/40">Score &gt; 0.7</p>
                </Card>
                <Card>
                    <CardHeader title="Memory Density" subtitle="Long-term RAG health" />
                    <p className="mt-4 text-3xl font-black text-fn-accent uppercase italic">1,242 Nodes</p>
                    <p className="mt-1 text-[10px] font-black uppercase tracking-widest text-fn-ink/40">Vector embeddings active</p>
                </Card>
            </div>

            <section className="mt-8">
                <Card>
                    <CardHeader title="Safety Ledger Audit" subtitle="Recent plan modifications and blocks" />
                    {loading ? (
                        <LoadingState className="mt-10" />
                    ) : safetyLogs.length > 0 ? (
                        <div className="mt-8 overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-white/10 uppercase font-black text-[10px] tracking-widest text-fn-link/40">
                                        <th className="pb-4">Date</th>
                                        <th className="pb-4">User ID</th>
                                        <th className="pb-4">Status</th>
                                        <th className="pb-4">Issues</th>
                                    </tr>
                                </thead>
                                <tbody className="text-[12px] font-medium text-fn-link/70">
                                    {safetyLogs.map((log) => (
                                        <tr key={log.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-all">
                                            <td className="py-4 font-black italic">{new Date(log.created_at).toLocaleDateString()}</td>
                                            <td className="py-4 family-mono text-[10px]">{log.user_id.slice(0, 8)}...</td>
                                            <td className="py-4 uppercase font-black tracking-tight italic">
                                                <span className={log.validation_json?.status === "blocked" ? "text-fn-danger" : "text-fn-accent"}>
                                                    {log.validation_json?.status}
                                                </span>
                                            </td>
                                            <td className="py-4">
                                                {log.validation_json?.issues?.map((i: any) => i.message).join(", ") || "None"}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <EmptyState message="No safety logs found." className="mt-10" />
                    )}
                </Card>
            </section>
        </PageLayout>
    );
}
