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
            <main className="mx-auto max-w-shell px-4 pt-6 sm:px-6 pb-20">
                <header className="mb-8 text-center">
                    <p className="text-[10px] font-black uppercase tracking-[0.4em] text-fn-accent mb-2">DEXA-Grade Insights</p>
                    <h1 className="font-display text-4xl font-black italic uppercase tracking-tighter sm:text-5xl">
                        Body Comp <span className="text-fn-accent">Scanner</span>
                    </h1>
                    <p className="mt-4 text-fn-muted max-w-md mx-auto text-sm">
                        Capture 3 profiles to extract your biological data. This drives the Coach Engine&apos;s precise metabolic targets.
                    </p>
                </header>

                {error && (
                    <div className="mb-6 p-4 rounded-xl border border-red-500/20 bg-red-500/10 text-red-400 text-center font-medium">
                        {error}
                    </div>
                )}

                {!result ? (
                    <Card className="border-white/5 bg-white/[0.02] overflow-hidden p-6 text-center shadow-2xl relative min-h-[460px] flex flex-col justify-center">
                        {images.front && images.side && images.back ? (
                            <div className="py-4 animate-in fade-in zoom-in duration-500">
                                <div className="h-16 w-16 mx-auto bg-fn-accent/20 rounded-full flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(10,217,196,0.2)]">
                                    <svg className="w-8 h-8 text-fn-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                    </svg>
                                </div>
                                <h3 className="text-2xl font-black italic uppercase text-white mb-2">Data Collected</h3>
                                <p className="text-fn-muted mb-8 text-sm">3D biological markers are queued for extraction.</p>

                                <div className="grid grid-cols-3 gap-3 mb-8 px-2 opacity-60 grayscale hover:opacity-100 hover:grayscale-0 transition-all duration-500 cursor-pointer">
                                    <div className="aspect-[3/4] relative bg-black rounded-lg overflow-hidden border border-white/10" onClick={() => triggerUpload("front")}>
                                        <Image src={images.front} alt="front" fill className="object-cover" />
                                        <div className="absolute bottom-1 right-1 bg-black/50 rounded-full p-1"><svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg></div>
                                    </div>
                                    <div className="aspect-[3/4] relative bg-black rounded-lg overflow-hidden border border-white/10" onClick={() => triggerUpload("side")}>
                                        <Image src={images.side} alt="side" fill className="object-cover" />
                                        <div className="absolute bottom-1 right-1 bg-black/50 rounded-full p-1"><svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg></div>
                                    </div>
                                    <div className="aspect-[3/4] relative bg-black rounded-lg overflow-hidden border border-white/10" onClick={() => triggerUpload("back")}>
                                        <Image src={images.back} alt="back" fill className="object-cover" />
                                        <div className="absolute bottom-1 right-1 bg-black/50 rounded-full p-1"><svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg></div>
                                    </div>
                                </div>

                                <div className="flex gap-4">
                                    <Button variant="ghost" className="w-[100px]" onClick={() => setImages({ front: null, side: null, back: null })}>
                                        Reset
                                    </Button>
                                    <Button className="flex-1 shadow-[0_0_20px_rgba(10,217,196,0.3)] animate-pulse" onClick={startScan} disabled={isScanning}>
                                        Analyze Physique
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center flex-1 h-full py-2">
                                {/* Progress Tracker */}
                                <div className="flex justify-center gap-3 w-full mb-10">
                                    {(['front', 'side', 'back'] as const).map((step) => {
                                        const isCompleted = !!images[step];
                                        const isCurrent = (!images.front && step === 'front') || (images.front && !images.side && step === 'side') || (images.front && images.side && !images.back && step === 'back');

                                        return (
                                            <div key={step} className="flex-1 flex flex-col gap-2 relative">
                                                {isCurrent && <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-fn-accent animate-bounce"><svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg></div>}
                                                <div className={`h-1.5 w-full rounded-full transition-all duration-500 ${isCompleted ? 'bg-fn-accent shadow-[0_0_10px_rgba(10,217,196,0.5)]' : isCurrent ? 'bg-white/40' : 'bg-white/10'}`} />
                                                <p className={`text-[9px] uppercase font-black tracking-widest ${isCompleted ? 'text-fn-accent' : isCurrent ? 'text-white drop-shadow-md' : 'text-white/30'}`}>
                                                    {step}
                                                </p>
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Current Step Instructions */}
                                <div className="mb-10 h-32 flex flex-col justify-center animate-in fade-in slide-in-from-right-4 duration-500 w-full" key={!images.front ? 'front' : !images.side ? 'side' : 'back'}>
                                    {!images.front ? (
                                        <>
                                            <h3 className="text-2xl font-black italic uppercase text-white mb-3">Step 1: Front Profile</h3>
                                            <p className="text-sm text-fn-muted max-w-[280px] mx-auto leading-relaxed">Face the camera directly. Keep your arms slightly flared to reveal your torso outline.</p>
                                        </>
                                    ) : !images.side ? (
                                        <>
                                            <h3 className="text-2xl font-black italic uppercase text-white mb-3">Step 2: Side Profile</h3>
                                            <p className="text-sm text-fn-muted max-w-[280px] mx-auto leading-relaxed">Turn 90 degrees. Let your arms hang naturally. Keep your posture relaxed.</p>
                                        </>
                                    ) : (
                                        <>
                                            <h3 className="text-2xl font-black italic uppercase text-white mb-3">Step 3: Back Profile</h3>
                                            <p className="text-sm text-fn-muted max-w-[280px] mx-auto leading-relaxed">Face away from the lens. Flex your upper back slightly to reveal definition.</p>
                                        </>
                                    )}
                                </div>

                                {/* Big Camera Button */}
                                <div className="mt-auto perspective-1000 relative">
                                    <div
                                        className="relative w-40 h-40 rounded-full border-4 border-dashed border-white/20 flex items-center justify-center cursor-pointer group mb-4 shadow-xl active:scale-95 transition-all duration-300"
                                        onClick={() => triggerUpload(!images.front ? 'front' : !images.side ? 'side' : 'back')}
                                        style={{ transformStyle: 'preserve-3d' }}
                                    >
                                        <div className="absolute inset-0 rounded-full bg-fn-accent opacity-0 group-hover:opacity-10 transition-opacity duration-500" />
                                        {/* Outer glowing pulse ring */}
                                        <div className="absolute -inset-4 rounded-full border border-fn-accent/30 animate-[ping_3s_cubic-bezier(0,0,0.2,1)_infinite]" />

                                        <div className="h-24 w-24 rounded-full bg-white/5 backdrop-blur-md border border-white/10 flex items-center justify-center group-hover:bg-white/10 group-hove:scale-110 shadow-[inset_0_0_20px_rgba(255,255,255,0.05)] transition-all duration-300">
                                            <svg className="w-10 h-10 text-white/80 group-hover:text-white group-hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.8)] transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                                            </svg>
                                        </div>
                                    </div>
                                </div>
                                <p className="text-[10px] font-black tracking-widest text-white/40 uppercase mb-2">Tap to Capture Filter</p>
                            </div>
                        )}

                        {isScanning && (
                            <div className="absolute inset-0 bg-black/95 backdrop-blur-2xl z-50 flex flex-col items-center justify-center animate-in fade-in duration-500 rounded-2xl overflow-hidden">
                                <div className="absolute inset-0 opacity-40">
                                    <Image src="/images/refined/scanner.png" alt="wireframe" fill className="object-cover animate-pulse" />
                                </div>
                                <div className="relative w-56 h-56 mb-10">
                                    {/* 3D wireframe or abstract rotating element to depict 3D compositing */}
                                    <div className="absolute inset-0 rounded-full border-[3px] border-fn-accent/30 animate-spin" style={{ animationDuration: '4s' }} />
                                    <div className="absolute inset-4 rounded-full border-[2px] border-dashed border-white/20 animate-spin-slow" />
                                    <div className="absolute inset-8 rounded-full border-[1px] border-fn-accent/80 animate-spin" style={{ animationDuration: '2s', animationDirection: 'reverse' }} />
                                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                                        <svg className="w-16 h-16 text-white animate-pulse drop-shadow-[0_0_15px_rgba(10,217,196,1)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-2 1m2-1l-2-1m2 1v2.5M14 4l-2-1-2 1M4 7l2-1M4 7l2 1M4 7v2.5M12 21l-2-1m2 1l2-1m-2 1v-2.5M6 18l-2-1v-2.5M18 18l2-1v-2.5" />
                                        </svg>
                                        <p className="mt-4 text-[9px] font-black uppercase tracking-[0.5em] text-fn-accent">Scanning Depth</p>
                                    </div>
                                </div>
                                <div className="w-full max-w-[240px] relative h-1 bg-white/5 rounded-full overflow-hidden mb-6">
                                    <div className="absolute top-0 bottom-0 left-0 bg-fn-accent shadow-[0_0_20px_rgba(10,217,196,1)] w-full animate-[scan_2s_ease-in-out_infinite]" />
                                </div>
                                <p className="text-white font-black uppercase italic tracking-[0.3em] text-base drop-shadow-[0_0_20px_rgba(10,217,196,0.6)]">
                                    Compositing <span className="text-fn-accent">3D Physique</span>
                                </p>
                                <p className="mt-2 text-[10px] text-fn-muted uppercase font-bold tracking-widest">Medical Heuristics Active</p>
                            </div>
                        )}

                        <input
                            type="file"
                            accept="image/*"
                            capture="environment"
                            className="hidden"
                            ref={fileInputRef}
                            onChange={handleImageUpload}
                            disabled={isScanning}
                        />

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
                            <p className="text-fn-muted leading-relaxed italic border-l-2 border-fn-accent pl-4 text-sm">
                                &quot;{result.analysis}&quot;
                            </p>
                            <div className="mt-8 flex gap-4">
                                <Button variant="secondary" className="w-full" onClick={() => { setResult(null); setImages({ front: null, side: null, back: null }); }}>
                                    Scan Again
                                </Button>
                                <Button className="w-full shadow-[0_0_20px_rgba(10,217,196,0.1)] hover:shadow-[0_0_30px_rgba(10,217,196,0.25)]" onClick={() => router.push("/coach")}>
                                    Return to Coach
                                </Button>
                            </div>
                        </div>
                    </Card>
                )}
            </main>

            <style dangerouslySetInnerHTML={{
                __html: `
        @keyframes scan {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
        .animate-spin-slow {
          animation: spin 8s linear infinite;
        }
      ` }} />
        </PageLayout>
    );
}
