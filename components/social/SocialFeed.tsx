"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { LoadingState } from "@/components/ui/LoadingState";
import { Button } from "@/components/ui/Button";

interface Post {
    post_id: string;
    user_id: string;
    type: string;
    content: string;
    created_at: string;
    user: {
        name: string;
        xp: number;
    };
    likes?: string[];
    comments?: any[];
}

export function SocialFeed() {
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentUser, setCurrentUser] = useState<string | null>(null);

    const load = async () => {
        const supabase = createClient();
        if (!supabase) return;

        const { data: { user } } = await supabase.auth.getUser();
        setCurrentUser(user?.id || null);

        const { data } = await supabase
            .from("social_posts")
            .select(`
        post_id, user_id, type, content, created_at,
        user:user_profile (name, xp)
      `)
            .order("created_at", { ascending: false })
            .limit(20);

        if (data) {
            const enriched = await Promise.all((data as any[]).map(async (post) => {
                const res = await fetch(`/api/v1/social/posts/interactions?postId=${post.post_id}`);
                const interactions = await res.json();
                return { ...post, ...interactions };
            }));
            setPosts(enriched);
        }
        setLoading(false);
    };

    useEffect(() => {
        load();
    }, []);

    const handleLike = async (postId: string, isLiked: boolean) => {
        const action = isLiked ? "unlike" : "like";
        const res = await fetch("/api/v1/social/posts/interactions", {
            method: "POST",
            body: JSON.stringify({ postId, action })
        });
        if (res.ok) {
            setPosts(prev => prev.map(p => {
                if (p.post_id === postId) {
                    const newLikes = isLiked
                        ? p.likes?.filter(id => id !== currentUser)
                        : [...(p.likes || []), currentUser!];
                    return { ...p, likes: newLikes };
                }
                return p;
            }));
        }
    };

    const [commentingOn, setCommentingOn] = useState<string | null>(null);
    const [commentText, setCommentText] = useState("");

    const handleComment = async (postId: string) => {
        if (!commentText.trim()) return;
        const res = await fetch("/api/v1/social/posts/interactions", {
            method: "POST",
            body: JSON.stringify({ postId, action: "comment", content: commentText })
        });
        if (res.ok) {
            setCommentText("");
            setCommentingOn(null);
            load(); // Refresh for comments
        }
    };

    if (loading) return <LoadingState />;

    if (posts.length === 0) {
        return (
            <div className="rounded-2xl border border-dashed border-fn-border bg-fn-bg-alt/50 p-8 text-center">
                <p className="text-sm text-fn-muted uppercase tracking-widest font-black">Quiet in here...</p>
                <p className="mt-2 text-xs text-fn-muted/70">Connect with friends to see their activity and progress.</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {posts.map((post) => {
                const isLiked = post.likes?.includes(currentUser || "");
                return (
                    <div key={post.post_id} className="group relative flex flex-col rounded-2xl border border-white/5 bg-white/[0.03] p-4 transition-all hover:bg-white/[0.05]">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3">
                                <div className="h-8 w-8 rounded-full bg-fn-accent/20 flex items-center justify-center text-[10px] font-black text-fn-accent shadow-[0_0_10px_rgba(10,217,196,0.2)]">
                                    {post.user?.name?.[0]}
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-white uppercase tracking-widest">{post.user?.name}</p>
                                    <p className="text-[8px] text-fn-muted uppercase tracking-[0.2em]">{new Date(post.created_at).toLocaleTimeString()} · {post.user?.xp} XP</p>
                                </div>
                            </div>
                            <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-fn-accent/10 text-xs text-fn-accent">
                                {getIcon(post.type)}
                            </div>
                        </div>
                        <p className="text-sm font-medium leading-relaxed text-white/90 italic">
                            &quot;{post.content}&quot;
                        </p>

                        <div className="mt-4 flex items-center gap-6 text-[10px] font-black uppercase tracking-widest">
                            <button
                                onClick={() => handleLike(post.post_id, !!isLiked)}
                                className={`flex items-center gap-1.5 transition-colors ${isLiked ? "text-fn-accent" : "text-fn-muted hover:text-white"}`}
                            >
                                <svg viewBox="0 0 24 24" fill={isLiked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2.5" className="h-3 w-3"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78v0z" /></svg>
                                {post.likes?.length || 0} Cheers
                            </button>
                            <button
                                onClick={() => setCommentingOn(commentingOn === post.post_id ? null : post.post_id)}
                                className="flex items-center gap-1.5 text-fn-muted hover:text-white transition-colors"
                            >
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-3 w-3"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" /></svg>
                                {post.comments?.length || 0} Comments
                            </button>
                        </div>

                        {/* Comment Section */}
                        {(commentingOn === post.post_id || (post.comments?.length || 0) > 0) && (
                            <div className="mt-4 border-t border-white/5 pt-4">
                                <div className="space-y-3">
                                    {post.comments?.map((c) => (
                                        <div key={c.comment_id} className="text-[11px]">
                                            <span className="font-bold text-fn-accent uppercase tracking-tighter mr-2">{c.user.name}</span>
                                            <span className="text-white/80">{c.content}</span>
                                        </div>
                                    ))}
                                </div>
                                {commentingOn === post.post_id && (
                                    <div className="mt-3 flex gap-2">
                                        <input
                                            autoFocus
                                            className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white placeholder:text-fn-muted focus:outline-none focus:ring-1 focus:ring-fn-accent/30"
                                            placeholder="Write a message..."
                                            value={commentText}
                                            onChange={(e) => setCommentText(e.target.value)}
                                            onKeyDown={(e) => e.key === "Enter" && handleComment(post.post_id)}
                                        />
                                        <Button size="sm" onClick={() => handleComment(post.post_id)}>Send</Button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}

function getIcon(type: string) {
    switch (type) {
        case "workout": return "💪";
        case "meal": return "🥗";
        case "achievement": return "🏆";
        case "pr": return "🎯";
        default: return "📢";
    }
}
