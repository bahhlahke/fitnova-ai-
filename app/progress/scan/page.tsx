"use client";

import { useState, useRef } from "react";
import { PageLayout, Card, Button, CardHeader } from "@/components/ui";
import { useRouter } from "next/navigation";
import Image from "next/image";

export default function BodyCompScannerPage() {
    const router = useRouter();
    const [images, setImages] = useState<{ front: string | null, side: string | null, back: string | null }>({ front: null, side: null, back: null });
    const [activeSlot, setActiveSlot] = useState<"front" | "side" | "back" | null>(null);
    const [isScanning, setIsScanning] = useState(false);
    const [result, setResult] = useState<{ body_fat_percent: number; analysis: string } | null>(null);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !activeSlot) return;

        // Validate size (keep under 4MB for api limits)
        if (file.size > 4 * 1024 * 1024) {
            setError("Image too large. Please keep under 4MB.");
            return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            setImages(prev => ({ ...prev, [activeSlot]: event.target?.result as string }));
            setError(null);
            setResult(null);
            // Reset the input value so the same file could be selected again if needed
            if (fileInputRef.current) fileInputRef.current.value = "";
        };
        reader.readAsDataURL(file);
    };

    const triggerUpload = (slot: "front" | "side" | "back") => {
        setActiveSlot(slot);
        fileInputRef.current?.click();
    };

    const startScan = async () => {
        if (!images.front || !images.side || !images.back) return;
        setIsScanning(true);
        setError(null);

        try {
            const res = await fetch("/api/v1/ai/body-comp", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ images }),
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
                        <div className="grid grid-cols-3 gap-3 mb-6">
                            {(["front", "side", "back"] as const).map((slot) => (
                                <div
                                    key={slot}
                                    onClick={() => !isScanning && triggerUpload(slot)}
                                    className={`relative rounded-xl overflow-hidden border-2 aspect-[3/4] flex flex-col items-center justify-center transition-all ${isScanning ? "cursor-default" : "cursor-pointer"
                                        } ${images[slot] ? "border-white/10" : "border-dashed border-white/20 hover:border-fn-accent/50 hover:bg-white/5 group"
                                        }`}
                                >
                                    {images[slot] ? (
                                        <Image
                                            src={images[slot]!}
                                            alt={`${slot} view`}
                                            fill
                                            className={`object-cover ${isScanning ? "opacity-50 grayscale transition-all duration-1000" : ""}`}
                                        />
                                    ) : (
                                        <>
                                            <div className="h-8 w-8 rounded-full bg-white/10 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                                                <svg className="w-5 h-5 text-white/70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                                </svg>
                                            </div>
                                            <p className="text-[10px] sm:text-xs font-bold text-white uppercase tracking-wider">{slot}</p>
                                        </>
                                    )}

                                    {/* Scanning Laser Animation overlay for each image if scanning */}
                                    {isScanning && images[slot] && (
                                        <div className="absolute inset-0 z-10 pointer-events-none">
                                            <div className="absolute top-0 w-full h-1 bg-fn-accent shadow-[0_0_15px_3px_rgba(10,217,196,0.8)] animate-[scan_2s_ease-in-out_infinite]" />
                                            <div className="absolute inset-0 bg-fn-accent/10 animate-pulse" />
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>

                        {isScanning && (
                            <div className="mb-6">
                                <p className="text-fn-accent font-black uppercase tracking-widest bg-fn-accent/10 px-4 py-2 rounded-full inline-block backdrop-blur-md text-sm border border-fn-accent/20">
                                    Compositing 3D Data...
                                </p>
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
                            {(!images.front || !images.side || !images.back) && (
                                <p className="text-sm text-fn-muted w-full">Please snap all 3 angles to extract clinical DEXA-grade data.</p>
                            )}

                            {images.front && images.side && images.back && !isScanning && (
                                <>
                                    <Button variant="ghost" type="button" onClick={() => setImages({ front: null, side: null, back: null })} className="w-full">
                                        Retake All
                                    </Button>
                                    <Button onClick={startScan} type="button" className="w-full shadow-[0_0_20px_rgba(10,217,196,0.2)]">
                                        Analyze Physique
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
                                <Button variant="secondary" className="w-full" onClick={() => { setResult(null); setImages({ front: null, side: null, back: null }); }}>
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
