import type { VoiceDuplexEvent } from "@/lib/sit/types";

export type VoiceDuplexState = "idle" | "listening" | "thinking" | "speaking" | "interrupted";

export function reduceVoiceState(
  state: VoiceDuplexState,
  event:
    | "session_started"
    | "transcript_received"
    | "assistant_started"
    | "barge_in"
    | "assistant_finished"
): VoiceDuplexState {
  switch (event) {
    case "session_started":
      return "listening";
    case "transcript_received":
      return "thinking";
    case "assistant_started":
      return "speaking";
    case "barge_in":
      return "interrupted";
    case "assistant_finished":
      return "idle";
    default:
      return state;
  }
}

export function chunkVoiceReply(reply: string): VoiceDuplexEvent[] {
  const chunks = reply
    .split(/(?<=[.!?])\s+/)
    .map((chunk) => chunk.trim())
    .filter(Boolean);

  const events: VoiceDuplexEvent[] = [{ type: "barge_in_ready", final: false }];
  chunks.forEach((chunk, index) => {
    events.push({ type: "assistant.partial", content: chunk, index, final: false });
  });
  events.push({ type: "assistant.final", content: reply, index: chunks.length, final: true });
  events.push({ type: "tts.script", content: reply, index: chunks.length + 1, final: true });
  return events;
}
