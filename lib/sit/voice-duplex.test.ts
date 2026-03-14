import { describe, expect, it } from "vitest";
import { chunkVoiceReply, reduceVoiceState } from "@/lib/sit/voice-duplex";

describe("voice duplex runtime", () => {
  it("advances states and emits chunked streaming events", () => {
    expect(reduceVoiceState("idle", "session_started")).toBe("listening");
    expect(reduceVoiceState("thinking", "assistant_started")).toBe("speaking");
    expect(reduceVoiceState("speaking", "barge_in")).toBe("interrupted");

    const events = chunkVoiceReply("Keep your ribs down. Slow the eccentric. Then go again.");
    expect(events[0].type).toBe("barge_in_ready");
    expect(events.some((event) => event.type === "assistant.final")).toBe(true);
    expect(events.at(-1)?.type).toBe("tts.script");
  });
});
