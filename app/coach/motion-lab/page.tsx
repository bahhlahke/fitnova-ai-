"use client";

import { useState, useRef } from "react";
import { Button, Card, CardHeader } from "@/components/ui";

type VisionResult = {
    score: number;
    critique: string;
    correction: string;
};

export default function MotionLabPage() {
    const [videoFile, setVideoFile] = useState<File | null>(null);
    const [videoUrl, setVideoUrl] = useState<string | null>(null);
    const [analyzing, setAnalyzing] = useState(false);
    const [result, setResult] = useState<VisionResult | null>(null);
    const videoRef = useRef<HTMLVideoElement>(null);

    function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (file) {
            setVideoFile(file);
            setVideoUrl(URL.createObjectURL(file));
            setResult(null);
        }
    }

    async function analyzeVideo() {
        if (!videoRef.current || !videoFile) return;
        setAnalyzing(true);
        setResult(null);

        try {
            // Extract 3 frames dynamically from the video using a temporary canvas
            const video = videoRef.current;
            const canvas = document.createElement("canvas");
            canvas.width = 512; // lower resolution to save token cost and time
            canvas.height = 512;
            const ctx = canvas.getContext("2d");

            const frames: string[] = [];
            const duration = video.duration || 3;

            // Grab frames at 25%, 50%, 75%
            for (let i = 1; i <= 3; i++) {
                video.currentTime = (duration / 4) * i;
                await new Promise(resolve => setTimeout(resolve, 300)); // wait for seek

                if (ctx) {
                    // center crop approach to fill 512x512
                    const scale = Math.max(canvas.width / video.videoWidth, canvas.height / video.videoHeight);
                    const x = (canvas.width / 2) - (video.videoWidth / 2) * scale;
                    const y = (canvas.height / 2) - (video.videoHeight / 2) * scale;
                    ctx.drawImage(video, x, y, video.videoWidth * scale, video.videoHeight * scale);
                    frames.push(canvas.toDataURL("image/jpeg", 0.7));
                }
            }

            const res = await fetch("/api/v1/ai/vision", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ images: frames })
            });

            if (!res.ok) throw new Error("Analysis failed");
            const data = await res.json();
            setResult(data);
        } catch (e) {
            console.error(e);
            alert("Motion Lab failed to execute. Ensure video is readable.");
        } finally {
            setAnalyzing(false);
        }
    }

    return (
        <div className="mx-auto w-full max-w-shell px-4 py-12 sm:px-8">
            <header className="mb-10 text-center">
                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-fn-accent">Diagnostic Suite</p>
                <h1 className="mt-2 font-display text-4xl font-black text-white italic tracking-tighter uppercase sm:text-6xl">Motion Lab</h1>
                <p className="mt-4 mx-auto max-w-2xl text-lg font-medium text-fn-muted leading-relaxed">
                    Upload a clear, side-profile recording of your lift. System will extract spatial kinematics for biomechanical critique.
                </p>
            </header>

            <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
                <Card className="flex flex-col border-white/5 bg-white/[0.02] p-8">
                    {!videoUrl ? (
                        <div className="flex flex-1 flex-col items-center justify-center border-2 border-dashed border-white/10 rounded-xl2 py-20 text-center hover:border-fn-accent/50 transition-colors">
                            <svg className="mb-4 h-12 w-12 text-fn-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                            <h3 className="text-xl font-bold text-white mb-2">Upload Footage</h3>
                            <p className="text-sm text-fn-muted max-w-xs mb-6">MP4 or MOV formats. Max 30 seconds for optimal scanning resolution.</p>
                            <label className="cursor-pointer rounded-full bg-white/10 px-6 py-3 text-xs font-black uppercase tracking-wider text-white hover:bg-white/20 transition-colors">
                                Select Video
                                <input type="file" accept="video/mp4,video/quicktime" className="hidden" onChange={handleFileChange} />
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

                            {/* Scanning Animation Overlay */}
                            {analyzing && (
                                <div className="absolute inset-0 z-10 bg-fn-accent/10 flex items-center justify-center overflow-hidden">
                                    {/* Scanning horizontal line */}
                                    <div className="absolute top-0 left-0 right-0 h-1 bg-fn-accent shadow-[0_0_20px_rgba(10,217,196,1)] animate-[scan_2s_ease-in-out_infinite]" />

                                    {/* Target reticles */}
                                    <div className="absolute top-1/4 left-1/4 w-12 h-12 border-l-2 border-t-2 border-fn-accent opacity-50 transition-all scale-150 animate-pulse" />
                                    <div className="absolute bottom-1/4 right-1/4 w-12 h-12 border-r-2 border-b-2 border-fn-accent opacity-50 transition-all scale-150 animate-pulse delay-75" />

                                    <div className="bg-black/80 backdrop-blur-md px-6 py-3 rounded-full border border-fn-accent/30 flex items-center gap-3">
                                        <div className="h-2 w-2 rounded-full bg-fn-accent animate-ping" />
                                        <span className="text-xs font-black uppercase tracking-widest text-fn-accent">Extracting Kinematics...</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {videoUrl && (
                        <div className="mt-6 flex justify-between items-center">
                            <button onClick={() => { setVideoUrl(null); setVideoFile(null); setResult(null); }} className="text-xs font-bold uppercase tracking-widest text-fn-muted hover:text-white transition-colors" disabled={analyzing}>
                                Discard
                            </button>
                            <Button onClick={analyzeVideo} loading={analyzing} className="px-10">Run Diagnostic</Button>
                        </div>
                    )}
                </Card>

                <aside className="space-y-6">
                    <Card className="border-fn-accent/30 bg-fn-accent/5">
                        <CardHeader title="System Verdict" subtitle="Biomechanical Status" />

                        {result ? (
                            <div className="mt-6 space-y-8">
                                <div className="flex flex-col items-center justify-center py-6 border-b border-white/5">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-fn-muted mb-2">Form Score</span>
                                    <div className="relative flex items-center justify-center">
                                        <svg className="w-32 h-32 transform -rotate-90">
                                            <circle cx="64" cy="64" r="60" stroke="currentColor" strokeWidth="4" fill="transparent" className="text-white/5" />
                                            <circle cx="64" cy="64" r="60" stroke="currentColor" strokeWidth="4" fill="transparent" strokeDasharray={377} strokeDashoffset={377 - (377 * result.score) / 100} className="text-fn-accent transition-all duration-1000 ease-out" />
                                        </svg>
                                        <span className="absolute text-4xl font-black text-white italic tracking-tighter">{result.score}</span>
                                    </div>
                                </div>

                                <div>
                                    <span className="text-[10px] font-black uppercase tracking-widest text-fn-accent mb-2 block">Critical Assessment</span>
                                    <p className="text-sm font-medium leading-relaxed text-white bg-black/40 p-4 rounded-xl border border-white/5">
                                        {result.critique}
                                    </p>
                                </div>

                                <div>
                                    <span className="text-[10px] font-black uppercase tracking-widest text-fn-accent mb-2 block">Correction Protocol</span>
                                    <p className="text-sm font-bold leading-relaxed text-black bg-fn-accent p-4 rounded-xl shadow-[0_0_30px_rgba(10,217,196,0.2)]">
                                        {result.correction}
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div className="py-20 text-center">
                                <p className="text-xs font-black uppercase tracking-[0.3em] text-fn-muted mb-4 opacity-50">Awaiting Data</p>
                                <p className="text-sm font-medium text-fn-muted leading-relaxed opacity-50">System inactive pending footage upload and diagnostic command.</p>
                            </div>
                        )}
                    </Card>
                </aside>
            </div>
        </div>
    );
}
