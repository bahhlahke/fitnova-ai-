import { createClient } from "@/lib/supabase/server";
import { jsonError } from "@/lib/api/errors";
import { getSitFeatureFlags } from "@/lib/sit/feature-flags";
import { chunkVoiceReply, reduceVoiceState } from "@/lib/sit/voice-duplex";

export const dynamic = "force-dynamic";

type VoiceDuplexRequest = {
  transcript?: string;
  interruption?: boolean;
};

function encodeEvent(event: unknown): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}

export async function POST(request: Request) {
  const flags = getSitFeatureFlags();
  if (!flags.voiceDuplexStreaming) {
    return jsonError(404, "SERVICE_UNAVAILABLE", "Voice duplex streaming is disabled.");
  }

  let body: VoiceDuplexRequest;
  try {
    body = (await request.json()) as VoiceDuplexRequest;
  } catch {
    return jsonError(400, "INVALID_JSON", "Invalid JSON body.");
  }

  const transcript = body.transcript?.trim();
  if (!transcript) {
    return jsonError(400, "VALIDATION_ERROR", "transcript is required.");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return jsonError(401, "AUTH_REQUIRED", "Sign in is required.");
  }

  const reply = body.interruption
    ? "Barge-in detected. I stopped the prior cue. Tell me the adjustment you need and I will recalculate the next step."
    : `Live coach channel received: ${transcript}. Keep the answer short, actionable, and interruption-safe.`;

  const stream = new ReadableStream({
    start(controller) {
      let state = reduceVoiceState("idle", "session_started");
      controller.enqueue(encodeEvent({ type: "state", state }));
      state = reduceVoiceState(state, "transcript_received");
      controller.enqueue(encodeEvent({ type: "transcript.partial", content: transcript }));

      if (body.interruption) {
        state = reduceVoiceState(state, "barge_in");
        controller.enqueue(encodeEvent({ type: "state", state }));
      }

      state = reduceVoiceState(state, "assistant_started");
      controller.enqueue(encodeEvent({ type: "state", state }));

      for (const event of chunkVoiceReply(reply)) {
        controller.enqueue(encodeEvent(event));
      }

      state = reduceVoiceState(state, "assistant_finished");
      controller.enqueue(encodeEvent({ type: "state", state }));
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-store",
      Connection: "keep-alive",
    },
  });
}
