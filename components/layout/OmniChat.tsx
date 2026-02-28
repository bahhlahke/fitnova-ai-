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
    const inputRef = useRef<HTMLInputElement>(null);
    const pathname = usePathname();
    const { user } = useAuth();

    useEffect(() => {
        if (isOpen) {
            setTimeout(() => inputRef.current?.focus(), 50);
            bottomRef.current?.scrollIntoView({ behavior: "smooth" });
        }
    }, [isOpen]);

    useEffect(() => {
        if (isOpen) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, isOpen]);

    // Hide on homepage (inline chat there) and auth/onboarding routes
    const hiddenRoutes = ["/auth", "/start", "/onboarding", "/"];
    const hide = hiddenRoutes.some((p) =>
        p === "/" ? pathname === "/" : pathname.startsWith(p)
    ) || !user;

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
        <div className="fixed bottom-24 right-4 z-50 flex flex-col items-end gap-3 md:bottom-10 md:right-8">
            {/* Popup Card — CSS-toggled, no backdrop-filter bleed issues */}
            <div
                className={`w-[360px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-fn-border bg-fn-bg shadow-2xl transition-all duration-200 origin-bottom-right ${
                    isOpen
                        ? "opacity-100 scale-100 pointer-events-auto"
                        : "opacity-0 scale-95 pointer-events-none"
                }`}
                aria-hidden={!isOpen}
            >
                {/* Header */}
                <div className="flex items-center justify-between border-b border-fn-border bg-fn-surface/60 px-5 py-4">
                    <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-fn-accent/20 bg-fn-accent/10">
                            <svg className="h-4 w-4 text-fn-accent" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                        </div>
                        <div>
                            <p className="text-xs font-black uppercase tracking-widest text-fn-accent leading-none">Nova AI</p>
                            <p className="mt-0.5 text-[10px] text-fn-muted">Your personal coach</p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={() => setIsOpen(false)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-fn-muted transition-colors hover:bg-white/5 hover:text-white"
                        aria-label="Close Nova AI"
                    >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Messages */}
                <div className="max-h-80 min-h-[160px] overflow-y-auto p-4 space-y-3">
                    {messages.length === 0 ? (
                        <div>
                            <p className="mb-3 text-[10px] font-black uppercase tracking-widest text-fn-muted">Quick commands</p>
                            <div className="flex flex-col gap-2">
                                {QUICK_ACTIONS.map((action) => (
                                    <button
                                        key={action}
                                        type="button"
                                        onClick={() => setInput(action)}
                                        className="rounded-xl border border-fn-border bg-fn-surface/40 px-4 py-2.5 text-left text-xs font-medium text-fn-muted transition-all hover:border-fn-accent/20 hover:text-white"
                                    >
                                        {action}
                                    </button>
                                ))}
                            </div>
                        </div>
                    ) : (
                        messages.map((msg, i) => (
                            <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                                <div
                                    className={`max-w-[85%] rounded-xl px-4 py-2.5 text-sm font-medium leading-relaxed ${
                                        msg.role === "user"
                                            ? "bg-fn-accent text-black"
                                            : "border border-fn-border bg-fn-surface text-fn-ink"
                                    }`}
                                >
                                    {msg.content}
                                </div>
                            </div>
                        ))
                    )}

                    {loading && (
                        <div className="flex justify-start">
                            <div className="flex gap-1 rounded-xl border border-fn-border bg-fn-surface px-4 py-3">
                                <span className="h-1.5 w-1.5 rounded-full bg-fn-accent animate-bounce [animation-delay:0ms]" />
                                <span className="h-1.5 w-1.5 rounded-full bg-fn-accent animate-bounce [animation-delay:150ms]" />
                                <span className="h-1.5 w-1.5 rounded-full bg-fn-accent animate-bounce [animation-delay:300ms]" />
                            </div>
                        </div>
                    )}

                    {error && <ErrorMessage message={error} />}
                    <div ref={bottomRef} />
                </div>

                {/* Input */}
                <div className="border-t border-fn-border bg-fn-surface/30 p-3">
                    <form onSubmit={handleSubmit} className="flex gap-2">
                        <input
                            ref={inputRef}
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Log food, workouts, questions..."
                            className="flex-1 rounded-xl border border-fn-border bg-fn-surface px-4 py-2.5 text-sm text-white placeholder-fn-muted transition-colors focus:border-fn-accent/50 focus:outline-none"
                            disabled={loading}
                        />
                        <Button type="submit" disabled={loading || !input.trim()} size="sm">
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                        </Button>
                    </form>
                </div>
            </div>

            {/* FAB */}
            <button
                type="button"
                onClick={() => setIsOpen((o) => !o)}
                className={`flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-all duration-200 hover:scale-110 active:scale-95 ${
                    isOpen
                        ? "border border-fn-border bg-fn-surface text-fn-muted hover:text-white"
                        : "bg-fn-accent text-fn-bg shadow-[0_0_30px_rgba(10,217,196,0.4)]"
                }`}
                aria-label={isOpen ? "Close Nova AI" : "Open Nova AI"}
                aria-expanded={isOpen}
            >
                {isOpen ? (
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                ) : (
                    <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                )}
            </button>
        </div>
    );
}
