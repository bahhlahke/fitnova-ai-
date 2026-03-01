"use client";

import { useState, useRef } from "react";
import { Button, Card, CardHeader, PageLayout } from "@/components/ui";

type VisionResult = {
  score: number;
  critique: string;
  correction: string;
  confidence_score?: number;
  reliability?: {
    confidence_score?: number;
    explanation?: string;
    limitations?: string[];
  };
};

export default function MotionLabPage() {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<VisionResult | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setVideoFile(file);
    setVideoUrl(URL.createObjectURL(file));
    setResult(null);
  }

  async function analyzeVideo() {
    if (!videoRef.current || !videoFile) return;
    setAnalyzing(true);
    setResult(null);

    try {
      const video = videoRef.current;
      const canvas = document.createElement("canvas");
      canvas.width = 512;
      canvas.height = 512;
      const ctx = canvas.getContext("2d");

      const frames: string[] = [];
      const duration = video.duration || 3;

      for (let i = 1; i <= 3; i += 1) {
        video.currentTime = (duration / 4) * i;
        await new Promise((resolve) => setTimeout(resolve, 300));

        if (!ctx) continue;

        const scale = Math.max(
          canvas.width / video.videoWidth,
          canvas.height / video.videoHeight
        );
        const x = canvas.width / 2 - (video.videoWidth / 2) * scale;
        const y = canvas.height / 2 - (video.videoHeight / 2) * scale;
        ctx.drawImage(video, x, y, video.videoWidth * scale, video.videoHeight * scale);
        frames.push(canvas.toDataURL("image/jpeg", 0.7));
      }

      const res = await fetch("/api/v1/ai/vision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ images: frames }),
      });

      if (!res.ok) {
        throw new Error("Analysis failed");
      }

      const data = (await res.json()) as VisionResult;
      setResult(data);
    } catch {
      alert("Motion Lab failed to execute. Ensure the video is readable.");
    } finally {
      setAnalyzing(false);
    }
  }

  return (
    <PageLayout
      title="Motion Lab"
      subtitle="Upload side-profile footage for biomechanical critique."
      backHref="/log/workout"
      backLabel="Workout"
    >
      <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
        <Card className="flex flex-col border-white/5 bg-white/[0.02] p-8">
          {!videoUrl ? (
            <div className="flex flex-1 flex-col items-center justify-center rounded-xl2 border-2 border-dashed border-white/10 py-20 text-center transition-colors hover:border-fn-accent/50">
              <svg className="mb-4 h-12 w-12 text-fn-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              <h3 className="mb-2 text-xl font-bold text-white">Upload Footage</h3>
              <p className="mb-6 max-w-xs text-sm text-fn-muted">
                MP4 or MOV. Keep it under 30 seconds for the cleanest scan.
              </p>
              <label className="cursor-pointer rounded-full bg-white/10 px-6 py-3 text-xs font-black uppercase tracking-wider text-white transition-colors hover:bg-white/20">
                Select Video
                <input
                  type="file"
                  accept="video/mp4,video/quicktime"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </label>
            </div>
          ) : (
            <div className="relative flex-1 overflow-hidden rounded-xl2 bg-black">
              <video
                ref={videoRef}
                src={videoUrl}
                className="h-full w-full object-contain"
                controls={!analyzing}
                playsInline
                muted
              />

              {analyzing && (
                <div className="absolute inset-0 z-10 flex items-center justify-center overflow-hidden bg-fn-accent/10">
                  <div className="absolute left-0 right-0 top-0 h-1 bg-fn-accent shadow-[0_0_20px_rgba(10,217,196,1)] animate-pulse" />
                  <div className="rounded-full border border-fn-accent/30 bg-black/80 px-6 py-3 backdrop-blur-md">
                    <span className="text-xs font-black uppercase tracking-widest text-fn-accent">
                      Extracting kinematics...
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {videoUrl && (
            <div className="mt-6 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  setVideoUrl(null);
                  setVideoFile(null);
                  setResult(null);
                }}
                className="text-xs font-bold uppercase tracking-widest text-fn-muted transition-colors hover:text-white"
                disabled={analyzing}
              >
                Discard
              </button>
              <Button onClick={analyzeVideo} loading={analyzing} className="px-10">
                Run Diagnostic
              </Button>
            </div>
          )}
        </Card>

        <aside className="space-y-6">
          <Card className="border-fn-accent/30 bg-fn-accent/5">
            <CardHeader title="System Verdict" subtitle="Biomechanical status" />
            {result ? (
              <div className="mt-6 space-y-8">
                <div className="flex flex-col items-center justify-center border-b border-white/5 py-6">
                  <span className="mb-2 text-[10px] font-black uppercase tracking-widest text-fn-muted">
                    Form Score
                  </span>
                  <div className="relative flex items-center justify-center">
                    <svg className="h-32 w-32 -rotate-90 transform">
                      <circle cx="64" cy="64" r="60" stroke="currentColor" strokeWidth="4" fill="transparent" className="text-white/5" />
                      <circle
                        cx="64"
                        cy="64"
                        r="60"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="transparent"
                        strokeDasharray={377}
                        strokeDashoffset={377 - (377 * result.score) / 100}
                        className="text-fn-accent transition-all duration-1000 ease-out"
                      />
                    </svg>
                    <span className="absolute text-4xl font-black italic tracking-tighter text-white">
                      {result.score}
                    </span>
                  </div>
                </div>

                <div>
                  <span className="mb-2 block text-[10px] font-black uppercase tracking-widest text-fn-accent">
                    Critical Assessment
                  </span>
                  <p className="rounded-xl border border-white/5 bg-black/40 p-4 text-sm font-medium leading-relaxed text-white">
                    {result.critique}
                  </p>
                  <p className="mt-2 text-[10px] font-semibold uppercase tracking-widest text-fn-muted">
                    AI confidence {Math.round(((result.confidence_score ?? result.reliability?.confidence_score ?? 0.6) * 100))}%
                  </p>
                </div>

                <div>
                  <span className="mb-2 block text-[10px] font-black uppercase tracking-widest text-fn-accent">
                    Correction Protocol
                  </span>
                  <p className="rounded-xl bg-fn-accent p-4 text-sm font-bold leading-relaxed text-black shadow-[0_0_30px_rgba(10,217,196,0.2)]">
                    {result.correction}
                  </p>
                  {result.reliability?.limitations?.length ? (
                    <p className="mt-2 text-xs text-fn-muted">
                      Limitation: {result.reliability.limitations[0]}
                    </p>
                  ) : null}
                </div>
              </div>
            ) : (
              <div className="py-20 text-center">
                <p className="mb-4 text-xs font-black uppercase tracking-[0.3em] text-fn-muted opacity-50">
                  Awaiting Data
                </p>
                <p className="text-sm font-medium leading-relaxed text-fn-muted opacity-50">
                  Upload a movement clip to activate the motion analysis system.
                </p>
              </div>
            )}
          </Card>
        </aside>
      </div>
    </PageLayout>
  );
}
