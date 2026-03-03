"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Card, Button, ErrorMessage } from "@/components/ui";
import * as tf from "@tensorflow/tfjs";
import "@tensorflow/tfjs-backend-webgl";
import * as poseDetection from "@tensorflow-models/pose-detection";

// Calculate angle between three 2D points (A, B, C) where B is the vertex
function calculateAngle(a: any, b: any, c: any) {
    const radians = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
    let angle = Math.abs((radians * 180.0) / Math.PI);
    if (angle > 180.0) {
        angle = 360 - angle;
    }
    return angle;
}

export function FormCorrection() {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isActive, setIsActive] = useState(false);
    const [feedback, setFeedback] = useState<string>("Ready to analyze...");
    const [error, setError] = useState<string | null>(null);

    const detectorRef = useRef<poseDetection.PoseDetector | null>(null);
    const reqRef = useRef<number>(0);

    const initTF = async () => {
        try {
            await tf.setBackend('webgl');
            const detectorConfig = { modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING };
            const detector = await poseDetection.createDetector(poseDetection.SupportedModels.MoveNet, detectorConfig);
            detectorRef.current = detector;
        } catch (err) {
            console.error(err);
            setError("Failed to load Pose Detection model. Your browser might not support WebGL.");
        }
    };

    const detectPose = useCallback(async () => {
        if (!videoRef.current || !canvasRef.current || !detectorRef.current || !isActive) return;

        const video = videoRef.current;
        if (video.readyState < 2) {
            reqRef.current = requestAnimationFrame(detectPose);
            return;
        }

        try {
            const poses = await detectorRef.current.estimatePoses(video, {
                maxPoses: 1,
                flipHorizontal: false
            });

            if (poses.length > 0) {
                const keypoints = poses[0].keypoints;

                // For squats, we look at the Hip, Knee, and Ankle (usually the side facing the camera)
                // Assuming left side visibility for simplicity
                const hip = keypoints.find((k: any) => k.name === 'left_hip');
                const knee = keypoints.find((k: any) => k.name === 'left_knee');
                const ankle = keypoints.find((k: any) => k.name === 'left_ankle');
                const shoulder = keypoints.find((k: any) => k.name === 'left_shoulder');

                if (hip?.score && hip.score > 0.3 && knee?.score && knee.score > 0.3 && ankle?.score && ankle.score > 0.3 && shoulder?.score && shoulder.score > 0.3) {

                    const kneeAngle = calculateAngle(hip, knee, ankle);
                    const hipAngle = calculateAngle(shoulder, hip, knee);

                    // Squat Biomechanics Logic
                    if (kneeAngle < 100 && kneeAngle > 70) {
                        setFeedback("Good depth! Push through the heels.");
                    } else if (kneeAngle <= 70) {
                        setFeedback("Deep squat. Maintain tension!");
                    } else if (kneeAngle > 100 && kneeAngle < 150) {
                        setFeedback("Squat deeper! Aim for parallel or below (knee angle < 100°).");
                    } else if (kneeAngle >= 150) {
                        setFeedback("Waiting for movement...");

                        // Check starting torso lean while standing
                        if (hipAngle < 160) {
                            setFeedback("Stand tall before descending. Hips fully extended.");
                        }
                    }
                } else {
                    setFeedback("Please step back so your full body is visible.");
                }
            }

            // Draw skeleton (optional, for debugging or visual flair)
            const ctx = canvasRef.current.getContext("2d");
            if (ctx) {
                canvasRef.current.width = video.videoWidth;
                canvasRef.current.height = video.videoHeight;
                ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);

                if (poses.length > 0) {
                    poses[0].keypoints.forEach((k: any) => {
                        if (k.score && k.score > 0.3) {
                            ctx.beginPath();
                            ctx.arc(k.x, k.y, 5, 0, 2 * Math.PI);
                            ctx.fillStyle = "#A3FF12"; // fn-accent
                            ctx.fill();
                        }
                    });
                }
            }

        } catch (err) {
            console.error("Inference Error:", err);
        }

        if (isActive) {
            reqRef.current = requestAnimationFrame(detectPose);
        }

    }, [isActive]);

    useEffect(() => {
        initTF();
        return () => {
            if (reqRef.current) cancelAnimationFrame(reqRef.current);
            stopAnalysis();
        };
    }, []);

    useEffect(() => {
        if (isActive && detectorRef.current) {
            reqRef.current = requestAnimationFrame(detectPose);
        }
        return () => {
            if (reqRef.current) cancelAnimationFrame(reqRef.current);
        };
    }, [isActive, detectPose]);

    const startAnalysis = async () => {
        if (!detectorRef.current) {
            setError("Model is still loading. Please wait.");
            return;
        }

        setError(null);
        setFeedback("Initializing camera...");
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: 640, height: 480 } });
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                // Wait for video to load metadata to play and get dimensions
                videoRef.current.onloadedmetadata = () => {
                    videoRef.current?.play();
                    setIsActive(true);
                };
            }
        } catch (err) {
            console.error(err);
            setError("Camera access denied or device not found.");
        }
    };

    const stopAnalysis = () => {
        setIsActive(false);
        if (reqRef.current) cancelAnimationFrame(reqRef.current);
        if (videoRef.current?.srcObject) {
            (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
            videoRef.current.srcObject = null;
        }
        setFeedback("Ready to analyze...");

        // Clear canvas
        if (canvasRef.current) {
            const ctx = canvasRef.current.getContext("2d");
            if (ctx) ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        }
    };

    return (
        <Card className="relative overflow-hidden bg-black aspect-video flex flex-col items-center justify-center">
            {error && (
                <div className="absolute top-4 z-20 w-3/4 max-w-sm">
                    <ErrorMessage message={error} />
                </div>
            )}

            {!isActive ? (
                <div className="z-10 text-center p-6 bg-black/50 backdrop-blur-sm rounded-2xl">
                    <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-fn-accent/20 text-fn-accent">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-6 w-6">
                            <path d="M15 10l5 5-5 5" /><path d="M4 4v7a4 4 0 004 4h12" />
                        </svg>
                    </div>
                    <h3 className="text-sm font-black uppercase tracking-widest text-white">AI Squat Analysis</h3>
                    <p className="mt-2 text-xs text-fn-muted max-w-[250px] mx-auto">Real-time biomechanics feedback using TensorFlow.js posture detection.</p>
                    <Button onClick={startAnalysis} className="mt-6">Start Camera</Button>
                </div>
            ) : (
                <>
                    {/* The video element is hidden (opacity-0 or handled manually) because we draw on the canvas, 
                        or we can just show it and overlay the canvas. Showing it is better. */}
                    <video
                        ref={videoRef}
                        playsInline
                        muted
                        className="absolute inset-0 h-full w-full object-contain opacity-70"
                    />
                    <canvas
                        ref={canvasRef}
                        className="absolute inset-0 h-full w-full object-contain pointer-events-none"
                    />

                    <div className="absolute top-4 left-4 right-4 flex justify-between items-start z-10">
                        <div className="rounded-xl bg-black/80 border border-fn-accent/30 px-4 py-2 text-xs font-black uppercase tracking-widest text-white shadow-xl max-w-[70%]">
                            {feedback}
                        </div>
                        <Button variant="secondary" size="sm" onClick={stopAnalysis}>Stop</Button>
                    </div>

                    <div className="absolute bottom-4 left-4 flex gap-2 items-center bg-black/50 px-3 py-1.5 rounded-full z-10">
                        <div className="h-2 w-2 rounded-full bg-fn-accent animate-ping" />
                        <span className="text-[10px] font-bold text-white uppercase tracking-widest">TFJS Active</span>
                    </div>
                </>
            )}
        </Card>
    );
}
