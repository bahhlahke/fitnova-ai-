"use client";

import { useEffect, useRef, useState } from "react";
import { Html5QrcodeScanner } from "html5-qrcode";
import { Button } from "@/components/ui";

interface BarcodeScannerProps {
    onScan: (barcode: string) => void;
    onClose: () => void;
}

export function BarcodeScanner({ onScan, onClose }: BarcodeScannerProps) {
    const [error, setError] = useState<string | null>(null);
    const scannerRef = useRef<Html5QrcodeScanner | null>(null);

    useEffect(() => {
        const scanner = new Html5QrcodeScanner(
            "barcode-reader",
            { fps: 10, qrbox: { width: 250, height: 150 } },
      /* verbose= */ false
        );

        scanner.render(
            (decodedText) => {
                onScan(decodedText);
                scanner.clear();
            },
            (err) => {
                // Only log errors if they are not just "no code found"
                if (err && !err.includes("NotFoundException")) {
                    console.warn(err);
                }
            }
        );

        scannerRef.current = scanner;

        return () => {
            if (scannerRef.current) {
                scannerRef.current.clear().catch((e) => console.error("Failed to clear scanner", e));
            }
        };
    }, [onScan]);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="relative w-full max-w-lg overflow-hidden rounded-3xl bg-fn-surface shadow-2xl">
                <div className="flex items-center justify-between border-b border-fn-border px-6 py-4">
                    <h3 className="text-lg font-bold text-fn-ink">Scan Barcode</h3>
                    <button
                        onClick={onClose}
                        className="rounded-full p-2 text-fn-muted hover:bg-fn-bg-alt hover:text-fn-ink transition-colors"
                    >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-5 w-5">
                            <path d="M18 6L6 18M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="p-6">
                    <div id="barcode-reader" className="overflow-hidden rounded-2xl border-2 border-dashed border-fn-border bg-black/5" />

                    {error && (
                        <p className="mt-4 text-center text-sm font-medium text-fn-danger bg-fn-danger-light py-2 rounded-lg">
                            {error}
                        </p>
                    )}

                    <div className="mt-6 flex justify-center">
                        <Button variant="secondary" onClick={onClose}>
                            Cancel Scanning
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
