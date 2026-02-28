"use client";

import { useState, useRef } from "react";
import { PageLayout, Card, Button, CardHeader } from "@/components/ui";
import { useRouter } from "next/navigation";
import Image from "next/image";

export default function BodyCompScannerPage() {
    const router = useRouter();
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [isScanning, setIsScanning] = useState(false);
    const [result, setResult] = useState<{ body_fat_percent: number; analysis: string } | null>(null);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate size (keep under 4MB for api limits)
        if (file.size > 4 * 1024 * 1024) {
            setError("Image too large. Please keep under 4MB.");
            return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            setImagePreview(event.target?.result as string);
            setError(null);
            setResult(null);
        };
        reader.readAsDataURL(file);
    };

    const startScan = async () => {
        if (!imagePreview) return;
        setIsScanning(true);
        setError(null);

        try {
            const res = await fetch("/api/v1/ai/body-comp", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ image: imagePreview }),
            });

            if (!res.ok) {
                throw new Error("Failed to analyze image");
            }

            const data = await res.json();
            if (data.error) throw new Error(data.error);

            setResult(data);
        } catch (err: any) {
            setError(err.message || "Something went wrong.");
        } finally {
            setIsScanning(false);
        }
    };

    return (
        <PageLayout title="AI Body Comp Scan" subtitle="Visual Analysis Engine">
            <main className="mx-auto max-w-shell px-4 pt-6 sm:px-6">
                <header className="mb-8 text-center">
                    <p className="text-[10px] font-black uppercase tracking-[0.4em] text-fn-accent mb-2">DEXA-Grade Insights</p>
                    <h1 className="font-display text-4xl font-black italic uppercase tracking-tighter sm:text-5xl">
                        Body Comp <span className="text-fn-accent">Scanner</span>
                    </h1>
                    <p className="mt-4 text-fn-muted max-w-md mx-auto">
                        Upload a photo of your physique. The Vision AI will estimate your body fat composition to feed accurate metabolic targets to your coaching engine.
                    </p>
                </header>

                {error && (
                    <div className="mb-6 p-4 rounded-xl border border-red-500/20 bg-red-500/10 text-red-400 text-center font-medium">
                        {error}
                    </div>
                )}

                {!result ? (
                    <Card className="border-white/5 bg-white/[0.02] overflow-hidden p-6 text-center shadow-2xl">
                        {imagePreview ? (
                            <div className="relative mb-6 mx-auto w-full max-w-sm rounded-[2rem] overflow-hidden border-2 border-white/10 aspect-[3/4] bg-black">
                                <Image
                                    src={imagePreview}
                                    alt="Ready for scan"
                                    fill
                                    className={`object-cover ${isScanning ? "opacity-50 grayscale transition-all duration-1000" : ""}`}
                                />

                                {/* Scanning Laser Animation overlay */}
                                {isScanning && (
                                    <div className="absolute inset-0 z-10 pointer-events-none">
                                        <div className="absolute top-0 w-full h-1 bg-fn-accent shadow-[0_0_20px_4px_rgba(10,217,196,0.8)] animate-[scan_2s_ease-in-out_infinite]" />
                                        <div className="absolute inset-0 bg-fn-accent/10 animate-pulse" />
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <p className="text-fn-accent font-black uppercase tracking-widest bg-black/50 px-4 py-2 rounded-full backdrop-blur-md">
                                                Analyzing Composition...
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div
                                className="mb-6 mx-auto w-full max-w-sm rounded-[2rem] border-2 border-dashed border-white/20 aspect-[3/4] flex flex-col items-center justify-center cursor-pointer hover:border-fn-accent/50 hover:bg-white/5 transition-all group"
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <div className="h-16 w-16 rounded-full bg-white/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                    <svg className="w-8 h-8 text-white/70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                </div>
                                <p className="font-bold text-white uppercase tracking-wider">Tap to Camera</p>
                                <p className="mt-2 text-sm text-fn-muted">Best results in decent lighting.</p>
                            </div>
                        )}

                        <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            ref={fileInputRef}
                            onChange={handleImageUpload}
                            disabled={isScanning}
                        />

                        <div className="flex gap-4 max-w-sm mx-auto">
                            {!imagePreview && (
                                <Button className="w-full" onClick={() => fileInputRef.current?.click()}>
                                    Open Camera
                                </Button>
                            )}

                            {imagePreview && !isScanning && (
                                <>
                                    <Button variant="ghost" onClick={() => setImagePreview(null)} className="w-full">
                                        Retake
                                    </Button>
                                    <Button onClick={startScan} className="w-full">
                                        Extract Data
                                    </Button>
                                </>
                            )}
                        </div>
                    </Card>
                ) : (
                    <Card className="border-fn-accent/20 bg-gradient-to-br from-fn-accent/10 to-transparent overflow-hidden shadow-[0_0_40px_rgba(10,217,196,0.15)] animate-in fade-in slide-in-from-bottom-8 duration-700">
                        <CardHeader title="Biological Extraction Complete" subtitle="Data synchronized to Coach Engine" />
                        <div className="p-8 text-center border-b border-white/5">
                            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-fn-muted mb-2">Estimated Body Fat</p>
                            <p className="font-display text-8xl font-black italic tracking-tighter text-white">
                                {result.body_fat_percent}<span className="text-fn-accent text-6xl">%</span>
                            </p>
                        </div>
                        <div className="p-6 bg-black/20">
                            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-fn-accent mb-4">Vision Analysis</p>
                            <p className="text-fn-muted leading-relaxed italic border-l-2 border-fn-accent pl-4">
                                &quot;{result.analysis}&quot;
                            </p>
                            <div className="mt-8 flex gap-4">
                                <Button variant="secondary" className="w-full" onClick={() => { setResult(null); setImagePreview(null); }}>
                                    Scan Again
                                </Button>
                                <Button className="w-full" onClick={() => router.push("/coach")}>
                                    Return to Coach
                                </Button>
                            </div>
                        </div>
                    </Card>
                )}
            </main>

            {/* Global CSS for the scan line animation specifically for this page if not exported globally */}
            <style dangerouslySetInnerHTML={{
                __html: `
        @keyframes scan {
          0% { transform: translateY(0); }
          50% { transform: translateY(1000%); }
          100% { transform: translateY(0); }
        }
      ` }} />
        </PageLayout>
    );
}
