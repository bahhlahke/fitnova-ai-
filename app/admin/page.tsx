"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
    PageLayout,
    Card,
    CardHeader,
    LoadingState,
    ErrorMessage,
    Button
} from "@/components/ui";
import { useRouter } from "next/navigation";

export default function AdminDashboard() {
    const [loading, setLoading] = useState(true);
    const [isAdmin, setIsAdmin] = useState(false);
    const [users, setUsers] = useState<any[]>([]);
    const [stats, setStats] = useState({ total: 0, pro: 0, free: 0 });
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();

    useEffect(() => {
        async function checkAdminAndLoad() {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) {
                router.push("/auth");
                return;
            }

            const { data: profile } = await supabase
                .from("user_profile")
                .select("role")
                .eq("user_id", user.id)
                .single();

            if (profile?.role !== "admin") {
                setError("Access Denied. Admin privileges required.");
                setLoading(false);
                return;
            }

            setIsAdmin(true);

            const { data: allUsers, error: userError } = await supabase
                .from("user_profile")
                .select("user_id, name, email, subscription_status, created_at")
                .order("created_at", { ascending: false });

            if (userError) {
                setError(userError.message);
            } else {
                setUsers(allUsers || []);
                const proCount = allUsers?.filter(u => u.subscription_status === 'pro').length || 0;
                setStats({
                    total: allUsers?.length || 0,
                    pro: proCount,
                    free: (allUsers?.length || 0) - proCount
                });
            }
            setLoading(false);
        }

        checkAdminAndLoad();
    }, [router]);

    if (loading) return <PageLayout title="Admin Command"><LoadingState /></PageLayout>;
    if (error) return <PageLayout title="Admin Command"><ErrorMessage message={error} /></PageLayout>;

    return (
        <PageLayout title="Admin Intelligence" subtitle="Platform-wide oversight and calibration">
            <div className="grid gap-6 md:grid-cols-3 mb-8">
                <Card className="bg-fn-accent/5 border-fn-accent/20">
                    <div className="p-6">
                        <p className="text-[10px] font-black uppercase tracking-widest text-fn-accent mb-1">Total Users</p>
                        <p className="text-4xl font-display font-black italic text-white">{stats.total}</p>
                    </div>
                </Card>
                <Card className="bg-white/5 border-white/10">
                    <div className="p-6">
                        <p className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-1">Pro Subscribers</p>
                        <p className="text-4xl font-display font-black italic text-white">{stats.pro}</p>
                    </div>
                </Card>
                <Card className="bg-fn-surface/20 border-white/5">
                    <div className="p-6">
                        <p className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-1">Conversion Rate</p>
                        <p className="text-4xl font-display font-black italic text-white">
                            {stats.total > 0 ? ((stats.pro / stats.total) * 100).toFixed(1) : 0}%
                        </p>
                    </div>
                </Card>
            </div>

            <Card padding="none">
                <CardHeader title="Internal Directory" subtitle="All registered accounts" className="p-6 border-b border-white/5" />
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-white/5 bg-white/[0.02]">
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-white/40">User</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-white/40">Tier</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-white/40">Joined</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-white/40 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {users.map((u) => (
                                <tr key={u.user_id} className="hover:bg-white/[0.02] transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col">
                                            <span className="text-sm font-bold text-white">{u.name || "Anonymous"}</span>
                                            <span className="text-xs text-fn-muted">{u.email}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase border ${u.subscription_status === 'pro'
                                                ? 'bg-fn-accent/10 border-fn-accent/30 text-fn-accent'
                                                : 'bg-white/5 border-white/10 text-white/40'
                                            }`}>
                                            {u.subscription_status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-xs text-white/60">
                                        {new Date(u.created_at).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <Button variant="secondary" size="sm" className="text-[10px] font-black uppercase py-1 h-auto">Inspected</Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>
        </PageLayout>
    );
}
