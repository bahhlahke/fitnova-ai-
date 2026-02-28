"use client";

import { useState, useRef, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { useAuth } from "@/components/auth/AuthProvider";

type Message = { role: "user" | "assistant"; content: string };

const QUICK_ACTIONS = [
    "I just ate 3 eggs and toast",
    "Log a heavy leg day workout",
    "Update my body weight to 185lbs",
    "How am I doing this week?",
];

export function OmniChat() {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const bottomRef = useRef<HTMLDivElement>(null);
    const pathname = usePathname();
    const { user } = useAuth();

    useEffect(() => {
        if (isOpen) {
            bottomRef.current?.scrollIntoView({ behavior: "smooth" });
        }
    }, [messages, isOpen]);

    const hiddenRoutes = ["/auth", "/start", "/onboarding"];
    const hide = hiddenRoutes.some((p) => pathname.startsWith(p)) || (!user && pathname === "/");

    if (hide) return null;

    async function handleSubmit(e?: React.FormEvent) {
        if (e) e.preventDefault();
        const text = input.trim();
        if (!text || loading) return;

        setInput("");
        setMessages((m) => [...m, { role: "user", content: text }]);
        setLoading(true);
        setError(null);

        try {
            const res = await fetch("/api/v1/ai/respond", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ message: text }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error ?? "Failed to connect to Nova AI");

            setMessages((m) => [...m, { role: "assistant", content: data.reply }]);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Something went wrong");
        } finally {
            setLoading(false);
        }
    }

    return (
        <>
            {/* Floating Action Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="fixed bottom-24 right-6 z-[60] h-14 w-14 rounded-full bg-fn-accent text-fn-bg shadow-[0_0_30px_rgba(10,217,196,0.4)] transition-transform hover:scale-110 active:scale-95 md:bottom-10 md:right-10"
                aria-label="Ask Nova AI"
            >
                <div className="flex h-full w-full items-center justify-center">
                    {isOpen ? (
                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    ) : (
                        <svg className="h-8 w-8" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                    )}
                </div>
            </button>

            {/* Backdrop */}
            {isOpen && (
                <div
                    className="fixed inset-0 z-[45] bg-black/60 backdrop-blur-sm transition-opacity duration-500"
                    onClick={() => setIsOpen(false)}
                />
            )}

            {/* Slide-over Panel */}
            <div
                className={`fixed inset-y-0 right-0 z-50 w-full transform border-l border-fn-border bg-black/20 backdrop-blur-3xl transition-transform duration-500 ease-in-out md:w-[450px] ${isOpen ? "translate-x-0" : "translate-x-full"
                    }`}
            >
                <div className="flex h-full flex-col">
                    {/* Header */}
                    <div className="flex items-center justify-between border-b border-fn-border p-8">
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-fn-accent">Omni-Channel AI</p>
                            <h2 className="font-display text-2xl font-black text-white italic uppercase tracking-tighter">Nova AI</h2>
                        </div>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setIsOpen(false);
                            }}
                            className="flex h-12 w-12 items-center justify-center rounded-full bg-white/5 text-fn-muted hover:bg-white/10 hover:text-white transition-all active:scale-90"
                            aria-label="Close Chat"
                        >
                            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {/* Messages Feed */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide">
                        {messages.length === 0 && (
                            <div className="py-10 text-center">
                                <div className="mx-auto mb-6 h-20 w-20 rounded-2xl bg-fn-accent/10 border border-fn-accent/20 flex items-center justify-center text-fn-accent animate-pulse">
                                    <svg className="h-10 w-10" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M13 10V3L4 14h7v7l9-11h-7z" />
                                    </svg>
                                </div>
                                <p className="text-xl font-black text-white uppercase italic tracking-tighter mb-4">Awaiting Command</p>
                                <p className="text-sm font-medium text-fn-muted leading-relaxed max-w-xs mx-auto mb-10">
                                    Tell me what you ate, what you lifted, or where you want to go. I handle the rest.
                                </p>
                                <div className="flex flex-col gap-3">
                                    {QUICK_ACTIONS.map((action) => (
                                        <button
                                            key={action}
                                            onClick={() => {
                                                setInput(action);
                                            }}
                                            className="rounded-xl border border-white/5 bg-white/5 p-4 text-left text-xs font-bold uppercase tracking-widest text-white transition-all hover:bg-white/10 hover:border-fn-accent/30 active:scale-95"
                                        >
                                            {action}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {messages.map((msg, i) => (
                            <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                                <div
                                    className={`max-w-[85%] rounded-2xl px-6 py-4 text-sm font-medium leading-relaxed shadow-2xl ${msg.role === "user" ? "bg-white text-black rounded-tr-none" : "bg-fn-surface border border-white/5 text-fn-ink rounded-tl-none"
                                        }`}
                                >
                                    <p className="whitespace-pre-wrap">{msg.content}</p>
                                </div>
                            </div>
                        ))}

                        {loading && (
                            <div className="flex justify-start">
                                <div className="bg-white/5 border border-white/5 rounded-2xl rounded-tl-none px-6 py-4 animate-pulse">
                                    <div className="flex gap-1">
                                        <div className="h-1.5 w-1.5 rounded-full bg-fn-accent" />
                                        <div className="h-1.5 w-1.5 rounded-full bg-fn-accent delay-75" />
                                        <div className="h-1.5 w-1.5 rounded-full bg-fn-accent delay-150" />
                                    </div>
                                </div>
                            </div>
                        )}

                        {error && <ErrorMessage message={error} />}
                        <div ref={bottomRef} />
                    </div>

                    {/* Input Area */}
                    <div className="border-t border-fn-border bg-black/40 p-6 backdrop-blur-3xl">
                        <form onSubmit={handleSubmit} className="relative flex gap-3">
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder="Log activity or ask questions..."
                                className="flex-1 rounded-xl2 border border-white/10 bg-white/5 px-6 py-4 text-white placeholder-white/30 transition-all focus:border-fn-accent/50 focus:outline-none focus:ring-4 focus:ring-fn-accent/10"
                                disabled={loading}
                            />
                            <Button type="submit" disabled={loading || !input.trim()} className="px-6">
                                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                            </Button>
                        </form>
                    </div>
                </div>
            </div>
        </>
    );
}
