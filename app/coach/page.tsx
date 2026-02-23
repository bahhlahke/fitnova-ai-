"use client";

import { useState, useRef, useEffect } from "react";

type Message = { role: "user" | "assistant"; content: string };

export default function CoachPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
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
      if (!res.ok) throw new Error(data.error ?? "Request failed");
      setMessages((m) => [...m, { role: "assistant", content: data.reply ?? "" }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-lg flex-col px-4 py-6 h-[calc(100vh-5rem)]">
      <header className="mb-4 flex-shrink-0">
        <h1 className="text-2xl font-bold text-white">
          AI <span className="text-fn-magenta">Coach</span>
        </h1>
        <p className="mt-1 text-sm text-fn-muted">Ask for plans, form cues, or start today’s workout</p>
      </header>

      <div className="flex-1 space-y-4 overflow-y-auto rounded-xl border border-fn-border bg-fn-surface p-4">
        {messages.length === 0 && (
          <p className="text-fn-muted">Send a message to get started. Try: “What should I do for upper body today?” or “Log my workout: 3x10 bench press, 135 lb.”</p>
        )}
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`rounded-lg px-4 py-3 ${
              msg.role === "user" ? "ml-4 bg-fn-teal/20 text-white" : "mr-4 bg-fn-surface-hover text-white"
            }`}
          >
            <p className="whitespace-pre-wrap text-sm">{msg.content}</p>
          </div>
        ))}
        {loading && <p className="text-fn-muted">Thinking…</p>}
        {error && <p className="text-sm text-red-400">{error}</p>}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSubmit} className="mt-4 flex-shrink-0 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Message coach…"
          className="min-h-touch flex-1 rounded-lg border border-fn-border bg-fn-surface px-4 py-3 text-white placeholder-fn-muted focus:border-fn-teal focus:outline-none focus:ring-1 focus:ring-fn-teal"
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="min-h-touch min-w-touch rounded-lg bg-fn-magenta px-4 py-3 font-medium text-white hover:bg-fn-magenta-dim disabled:opacity-50"
        >
          Send
        </button>
      </form>

      <div className="mt-2 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setInput("Start today’s workout")}
          className="rounded-full border border-fn-border px-3 py-1.5 text-xs text-fn-muted hover:bg-fn-surface-hover hover:text-white"
        >
          Start today’s workout
        </button>
        <button
          type="button"
          onClick={() => setInput("Log workout: 3 sets bench press")}
          className="rounded-full border border-fn-border px-3 py-1.5 text-xs text-fn-muted hover:bg-fn-surface-hover hover:text-white"
        >
          Log workout
        </button>
      </div>
    </div>
  );
}
