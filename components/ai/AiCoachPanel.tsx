"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { Button } from "@/components/ui/Button";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { emitDataRefresh } from "@/lib/ui/data-sync";
import { toLocalDateString } from "@/lib/date/local-date";
import type { AiActionResult, RefreshScope } from "@/types";
import ReactMarkdown from "react-markdown";

type Message = {
  role: "user" | "assistant";
  content: string;
  actions?: AiActionResult[];
};

type AiResponse = {
  reply?: string;
  error?: string;
  actions?: AiActionResult[];
  refreshScopes?: RefreshScope[];
};

const QUICK_ACTIONS = [
  "Build today's guided workout for 45 minutes",
  "I just ate 3 eggs and toast",
  "Update my body weight to 185lbs",
  "How am I doing this week?",
];

const HIDDEN_ROUTES = ["/auth", "/start", "/onboarding"];

export interface AiCoachPanelProps {
  mode: "embedded" | "launcher";
  autoFocus?: boolean;
  className?: string;
}

export function AiCoachPanel({
  mode,
  autoFocus = false,
  className = "",
}: AiCoachPanelProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [showTooltip, setShowTooltip] = useState(true);
  const [historyLoaded, setHistoryLoaded] = useState(false);

  const hide =
    HIDDEN_ROUTES.some((route) => pathname.startsWith(route)) ||
    (!user && pathname === "/");

  useEffect(() => {
    if (!user || hide || historyLoaded) return;
    const fetchHistory = async () => {
      try {
        const res = await fetch("/api/v1/ai/history");
        if (res.ok) {
          const data = await res.json();
          if (data.history && Array.isArray(data.history) && data.history.length > 0) {
            setMessages(data.history);
          }
        }
      } catch (e) {
        // Ignore fetch errors
      } finally {
        setHistoryLoaded(true);
      }
    };
    void fetchHistory();
  }, [user, hide, historyLoaded]);

  useEffect(() => {
    if (mode !== "embedded") return;
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, mode]);

  useEffect(() => {
    if (mode !== "embedded" || !autoFocus) return;
    inputRef.current?.focus();
  }, [autoFocus, mode]);

  async function submitMessage(nextText?: string) {
    const text = (nextText ?? input).trim();
    if (!text || loading) return;

    setInput("");
    setMessages((current) => [...current, { role: "user", content: text }]);
    setLoading(true);
    setError(null);

    try {
      // Capture current messages before the state update resolves
      const currentMessages = messages.slice(-8).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await fetch("/api/v1/ai/respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          localDate: toLocalDateString(),
          conversationHistory: currentMessages,
        }),
      });

      const data = (await res.json()) as AiResponse;
      if (!res.ok || !data.reply) {
        throw new Error(data.error ?? "Failed to connect to Koda AI");
      }

      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: data.reply ?? "No response.",
          actions: Array.isArray(data.actions) ? data.actions : undefined,
        },
      ]);

      if (Array.isArray(data.refreshScopes) && data.refreshScopes.length > 0) {
        emitDataRefresh(data.refreshScopes);
      }

      // Automatically handle navigation intents if they were triggered
      if (Array.isArray(data.actions)) {
        const navEvent = data.actions.find(a => (a as any).type === "navigation");
        if (navEvent) {
          router.push(navEvent.targetRoute);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  if (hide) return null;

  if (mode === "launcher") {
    if (pathname === "/") return null;

    return (
      <div className={`fixed bottom-24 right-6 z-[60] flex flex-col items-end md:bottom-10 md:right-10 ${className}`.trim()}>
        {showTooltip && (
          <div className="mb-3 animate-in fade-in slide-in-from-bottom-2 duration-500 relative mr-2">
            <div className="rounded-xl border border-fn-accent/30 bg-fn-bg px-4 py-2.5 shadow-[0_0_20px_rgba(10,217,196,0.2)] flex items-center gap-3">
              <span className="text-xs font-black uppercase tracking-widest text-fn-accent whitespace-nowrap">Coach Koda is ready</span>
              <button
                onClick={(e) => { e.stopPropagation(); setShowTooltip(false); }}
                className="text-fn-muted hover:text-white transition-colors"
                aria-label="Dismiss tooltip"
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            {/* Tooltip triangle */}
            <div className="absolute -bottom-1.5 right-4 w-3 h-3 rotate-45 border-r border-b border-fn-accent/30 bg-fn-bg" />
          </div>
        )}
        <button
          type="button"
          onClick={() => {
            setShowTooltip(false);
            router.push("/?focus=ai");
          }}
          className="relative flex h-14 w-14 items-center justify-center rounded-full bg-fn-accent text-fn-bg shadow-[0_0_30px_rgba(10,217,196,0.4)] transition-transform hover:scale-110 active:scale-95 group"
          aria-label="Open Dashboard AI"
        >
          {/* Subtle breathing animation ring */}
          <div className="absolute inset-0 rounded-full border-2 border-fn-accent/50 animate-[ping_3s_cubic-bezier(0,0,0.2,1)_infinite] opacity-75" />
          <svg className="h-8 w-8 relative z-10" fill="currentColor" viewBox="0 0 24 24">
            <path d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <section
      className={`flex flex-col rounded-[2rem] border border-white/10 bg-white/[0.02] p-6 shadow-2xl backdrop-blur-3xl ${className}`.trim()}
      aria-label="Nova AI"
    >
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-5">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-fn-accent">
            Command Center
          </p>
          <h2 className="mt-2 font-display text-3xl font-black italic tracking-tight text-white sm:text-4xl">
            Koda AI
          </h2>
        </div>
        <p className="max-w-md text-sm font-medium leading-relaxed text-fn-muted">
          Ask questions, log workouts or meals, and adapt your plan in real time.
          Koda applies actions instantly to the right surface.
        </p>
      </div>

      {messages.length === 0 && (
        <div className="mt-4 flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {QUICK_ACTIONS.map((action) => (
            <button
              key={action}
              type="button"
              onClick={() => void submitMessage(action)}
              className="shrink-0 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-left text-[10px] font-semibold uppercase tracking-[0.16em] text-white/75 transition-all hover:border-fn-accent/30 hover:bg-white/10 hover:text-white"
              disabled={loading}
            >
              {action}
            </button>
          ))}
        </div>
      )}

      <div className="mt-4 max-h-none flex-1 space-y-5 overflow-y-auto pr-1">
        {messages.length === 0 && (
          <div className="rounded-3xl border border-white/10 bg-black/20 p-6 text-center">
            <p className="text-lg font-black italic tracking-tight text-white">
              Ready when you are
            </p>
            <p className="mt-3 text-sm font-medium leading-relaxed text-fn-muted">
              You can ask Koda to do anything — build a guided workout, log your meals, adapt today&apos;s plan, or analyze your progress. Koda will automatically process your data or move you into the right flow.
            </p>
          </div>
        )}

        {messages.map((message, index) => (
          <div
            key={`${message.role}-${index}`}
            className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[88%] rounded-3xl px-5 py-4 text-sm font-medium leading-relaxed shadow-2xl ${message.role === "user"
                ? "rounded-tr-none bg-white text-black"
                : "rounded-tl-none border border-white/10 bg-fn-surface text-fn-ink"
                }`}
            >
              <div className={`prose prose-sm max-w-none ${message.role === "user" ? "" : "prose-invert"}`}>
                <ReactMarkdown>
                  {message.content}
                </ReactMarkdown>
              </div>
              {message.actions && message.actions.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {message.actions.map((action) => {
                    if ((action as any).type === "video_demo") {
                      return (
                        <div key={action.targetRoute} className="mt-3 w-full overflow-hidden rounded-2xl border border-white/10 bg-black/40">
                          <video
                            src={action.targetRoute}
                            autoPlay
                            loop
                            muted
                            playsInline
                            className="aspect-video w-full object-cover shadow-[0_0_20px_rgba(10,217,196,0.3)]"
                          />
                          <div className="bg-fn-accent/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-fn-accent antialiased">
                            4K Elite Demonstration: {action.summary.replace("Demo: ", "")}
                          </div>
                        </div>
                      );
                    }
                    return (
                      <Link
                        key={`${action.type}-${action.summary}`}
                        href={action.targetRoute}
                        className="rounded-full border border-fn-accent/30 bg-fn-accent/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-fn-accent transition-colors hover:bg-fn-accent/20"
                      >
                        {action.summary}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="rounded-3xl rounded-tl-none border border-white/5 bg-white/5 px-5 py-4">
              <div className="flex gap-1.5">
                <div className="h-2 w-2 rounded-full bg-fn-accent" />
                <div className="h-2 w-2 rounded-full bg-fn-accent" />
                <div className="h-2 w-2 rounded-full bg-fn-accent" />
              </div>
            </div>
          </div>
        )}

        {error && <ErrorMessage message={error} />}
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          void submitMessage();
        }}
        className="mt-6 border-t border-white/5 pt-5"
      >
        <div className="flex gap-3">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Ask Koda to build, coach, or log..."
              className="flex-1 rounded-2xl border border-white/10 bg-white/5 px-5 py-4 text-white placeholder-white/30 transition-all focus:border-fn-accent/50 focus:outline-none focus:ring-4 focus:ring-fn-accent/10"
              disabled={loading}
            />
          <Button type="submit" disabled={loading || !input.trim()}>
            Send
          </Button>
        </div>
      </form>
    </section>
  );
}
