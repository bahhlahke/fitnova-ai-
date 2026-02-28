"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { Button } from "@/components/ui/Button";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { emitDataRefresh } from "@/lib/ui/data-sync";
import type { AiActionResult, RefreshScope } from "@/types";

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
  "I just ate 3 eggs and toast",
  "Log a heavy leg day workout",
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

  const hide =
    HIDDEN_ROUTES.some((route) => pathname.startsWith(route)) ||
    (!user && pathname === "/");

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
      const res = await fetch("/api/v1/ai/respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });

      const data = (await res.json()) as AiResponse;
      if (!res.ok || !data.reply) {
        throw new Error(data.error ?? "Failed to connect to Nova AI");
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
      <button
        type="button"
        onClick={() => router.push("/?focus=ai")}
        className={`fixed bottom-24 right-6 z-[60] flex h-14 w-14 items-center justify-center rounded-full bg-fn-accent text-fn-bg shadow-[0_0_30px_rgba(10,217,196,0.4)] transition-transform hover:scale-110 active:scale-95 md:bottom-10 md:right-10 ${className}`.trim()}
        aria-label="Open Dashboard AI"
      >
        <svg className="h-8 w-8" fill="currentColor" viewBox="0 0 24 24">
          <path d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      </button>
    );
  }

  return (
    <section
      className={`rounded-[2rem] border border-white/5 bg-white/[0.02] p-6 shadow-2xl backdrop-blur-3xl ${className}`.trim()}
      aria-label="Nova AI"
    >
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/5 pb-5">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.35em] text-fn-accent">
            Command Center
          </p>
          <h2 className="mt-2 font-display text-3xl font-black uppercase italic tracking-tighter text-white sm:text-4xl">
            Nova AI
          </h2>
        </div>
        <p className="max-w-md text-sm font-medium leading-relaxed text-fn-muted">
          Ask questions, log data, or adjust today&apos;s plan. Logged actions will
          update the relevant tab automatically.
        </p>
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        {QUICK_ACTIONS.map((action) => (
          <button
            key={action}
            type="button"
            onClick={() => void submitMessage(action)}
            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-left text-[11px] font-black uppercase tracking-widest text-white transition-all hover:border-fn-accent/30 hover:bg-white/10"
            disabled={loading}
          >
            {action}
          </button>
        ))}
      </div>

      <div className="mt-6 max-h-[28rem] space-y-5 overflow-y-auto pr-1">
        {messages.length === 0 && (
          <div className="rounded-3xl border border-white/5 bg-black/20 p-6 text-center">
            <p className="text-lg font-black uppercase italic tracking-tighter text-white">
              Ready for input
            </p>
            <p className="mt-3 text-sm font-medium leading-relaxed text-fn-muted">
              Tell Nova what you ate, how you trained, or what you need to
              change today.
            </p>
          </div>
        )}

        {messages.map((message, index) => (
          <div
            key={`${message.role}-${index}`}
            className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[88%] rounded-3xl px-5 py-4 text-sm font-medium leading-relaxed shadow-2xl ${
                message.role === "user"
                  ? "rounded-tr-none bg-white text-black"
                  : "rounded-tl-none border border-white/5 bg-fn-surface text-fn-ink"
              }`}
            >
              <p className="whitespace-pre-wrap">{message.content}</p>
              {message.actions && message.actions.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {message.actions.map((action) => (
                    <Link
                      key={`${action.type}-${action.summary}`}
                      href={action.targetRoute}
                      className="rounded-full border border-fn-accent/30 bg-fn-accent/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-fn-accent transition-colors hover:bg-fn-accent/20"
                    >
                      {action.summary}
                    </Link>
                  ))}
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
            placeholder="Log activity or ask a question..."
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
