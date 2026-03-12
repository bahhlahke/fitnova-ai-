//
//  MotionAnalysisTests.swift
//  KodaAITests
//
//  Verifies the local pose heuristic layer that powers the Motion Lab fallback path.
//

import CoreGraphics
import Foundation
import XCTest
@testable import AskKodaAI

final class MotionAnalysisTests: XCTestCase {

    func testOnDeviceSummaryRewardsStableBalancedFrames() {
        let frame = PoseFrame(landmarks: PoseLandmarks(
            leftShoulder: point(0.44, 0.66),
            rightShoulder: point(0.56, 0.66),
            leftHip: point(0.45, 0.40),
            rightHip: point(0.55, 0.40),
            leftKnee: point(0.58, 0.35),
            rightKnee: point(0.42, 0.35),
            leftAnkle: point(0.50, 0.11),
            rightAnkle: point(0.50, 0.11),
            nose: point(0.50, 0.80)
        ))

        let summary = OnDeviceMotionAnalyzer.summarize(frames: [frame, frame])

        XCTAssertGreaterThanOrEqual(summary.score, 88)
        XCTAssertTrue(summary.critique.contains("stacked"))
        XCTAssertTrue(summary.critique.contains("balance"))
        XCTAssertTrue(summary.correction.contains("Keep the same setup"))
        XCTAssertGreaterThan(summary.poseConfidence, 0.9)
    }

    func testOnDeviceSummaryFlagsForwardLeanAndBalanceLoss() {
        let frame = PoseFrame(landmarks: PoseLandmarks(
            leftShoulder: point(0.28, 0.60),
            rightShoulder: point(0.41, 0.66),
            leftHip: point(0.43, 0.44),
            rightHip: point(0.58, 0.50),
            leftKnee: point(0.58, 0.34),
            rightKnee: point(0.70, 0.37),
            leftAnkle: point(0.61, 0.10),
            rightAnkle: point(0.74, 0.11),
            nose: point(0.36, 0.77)
        ))

        let summary = OnDeviceMotionAnalyzer.summarize(frames: [frame])

        XCTAssertLessThan(summary.score, 75)
        XCTAssertTrue(summary.correction.contains("chest taller"))
        XCTAssertTrue(summary.correction.contains("level the shoulders and hips"))
    }

    func testRealtimeEngineCountsCompletedRep() {
        let engine = RealtimeMotionSessionEngine()

        _ = engine.process(frame: squatFrame(kneeY: 0.22, shoulderX: 0.47), timestamp: 0.0, latencyMs: 18)
        _ = engine.process(frame: squatFrame(kneeY: 0.30, shoulderX: 0.43), timestamp: 0.10, latencyMs: 17)
        _ = engine.process(frame: squatFrame(kneeY: 0.41, shoulderX: 0.41), timestamp: 0.20, latencyMs: 16)
        _ = engine.process(frame: squatFrame(kneeY: 0.26, shoulderX: 0.46), timestamp: 0.30, latencyMs: 15)
        let lockout = engine.process(frame: squatFrame(kneeY: 0.20, shoulderX: 0.48), timestamp: 0.40, latencyMs: 15)

        XCTAssertEqual(lockout.repCount, 1)
        XCTAssertEqual(lockout.phase, .lockout)
        XCTAssertTrue(lockout.cue.contains("Rep 1"))
    }

    func testRealtimePressEngineCountsCompletedRep() {
        let engine = RealtimeMotionSessionEngine(configuration: MotionSessionConfiguration(pattern: .press))

        _ = engine.process(frame: pressFrame(lockedOut: false), timestamp: 0.0, latencyMs: 16)
        _ = engine.process(frame: pressFrame(lockedOut: false, wristY: 0.66), timestamp: 0.1, latencyMs: 15)
        let top = engine.process(frame: pressFrame(lockedOut: true), timestamp: 0.2, latencyMs: 14)

        XCTAssertEqual(top.repCount, 1)
        XCTAssertEqual(top.phase, .lockout)
        XCTAssertEqual(top.pattern, .press)
    }

    func testRealtimePullEngineCountsCompletedRep() {
        let engine = RealtimeMotionSessionEngine(configuration: MotionSessionConfiguration(pattern: .pull))

        _ = engine.process(frame: pullFrame(contracted: false), timestamp: 0.0, latencyMs: 16)
        _ = engine.process(frame: pullFrame(contracted: true, wristX: 0.58), timestamp: 0.1, latencyMs: 15)
        let top = engine.process(frame: pullFrame(contracted: true), timestamp: 0.2, latencyMs: 14)

        XCTAssertEqual(top.repCount, 1)
        XCTAssertEqual(top.phase, .lockout)
        XCTAssertEqual(top.pattern, .pull)
    }

    func testRealtimeEngineFlagsTrackingLossCue() {
        let engine = RealtimeMotionSessionEngine()
        let lowConfidence = PoseFrame(landmarks: PoseLandmarks(
            leftShoulder: point(0.44, 0.66, confidence: 0.42),
            rightShoulder: point(0.56, 0.66, confidence: 0.42),
            leftHip: point(0.45, 0.40, confidence: 0.42),
            rightHip: point(0.55, 0.40, confidence: 0.42),
            leftKnee: point(0.58, 0.35, confidence: 0.42),
            rightKnee: point(0.42, 0.35, confidence: 0.42),
            leftAnkle: point(0.50, 0.11, confidence: 0.42),
            rightAnkle: point(0.50, 0.11, confidence: 0.42),
            nose: point(0.50, 0.80, confidence: 0.42)
        ))

        let snapshot = engine.process(frame: lowConfidence, timestamp: 0.0, latencyMs: 14)

        XCTAssertTrue(snapshot.cue.contains("Tracking lost"))
        XCTAssertEqual(snapshot.trackingStatus, "Tracking unstable")
    }

    func testRealtimeEngineFlagsForwardLeanCue() {
        let engine = RealtimeMotionSessionEngine()
        let badFrame = PoseFrame(landmarks: PoseLandmarks(
            leftShoulder: point(0.22, 0.62),
            rightShoulder: point(0.34, 0.62),
            leftHip: point(0.43, 0.44),
            rightHip: point(0.53, 0.44),
            leftKnee: point(0.55, 0.30),
            rightKnee: point(0.45, 0.30),
            leftAnkle: point(0.52, 0.11),
            rightAnkle: point(0.48, 0.11),
            nose: point(0.28, 0.80)
        ))

        let snapshot = engine.process(frame: badFrame, timestamp: 1.0, latencyMs: 12)

        XCTAssertTrue(snapshot.cue.contains("Chest up"))
    }

    func testRealtimeSummaryIncludesVelocityAndBenchmarkReport() {
        let tempDirectory = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString, isDirectory: true)
        let writer = MotionBenchmarkReportWriter(rootDirectoryURL: tempDirectory)
        let engine = RealtimeMotionSessionEngine(
            configuration: MotionSessionConfiguration(pattern: .squat),
            benchmarkWriter: writer
        )

        _ = engine.process(frame: squatFrame(kneeY: 0.22, shoulderX: 0.47), timestamp: 0.0, latencyMs: 18)
        _ = engine.process(frame: squatFrame(kneeY: 0.34, shoulderX: 0.43), timestamp: 0.10, latencyMs: 17)
        _ = engine.process(frame: squatFrame(kneeY: 0.41, shoulderX: 0.41), timestamp: 0.20, latencyMs: 16)
        _ = engine.process(frame: squatFrame(kneeY: 0.28, shoulderX: 0.44), timestamp: 0.30, latencyMs: 15)
        _ = engine.process(frame: squatFrame(kneeY: 0.20, shoulderX: 0.48), timestamp: 0.40, latencyMs: 14)

        let benchmark = MotionBenchmarkReport(
            averageFPS: 18.2,
            p50LatencyMs: 14,
            p95LatencyMs: 18,
            processedFrames: 5,
            droppedFrames: 0,
            reportPath: nil
        )

        let finalizedBenchmark = engine.finalizedBenchmarkReport(benchmark)
        let summary = engine.currentSummaryResponse(benchmark: finalizedBenchmark)

        XCTAssertEqual(summary?.movement_pattern, "squat")
        XCTAssertEqual(summary?.rep_count, 1)
        XCTAssertNotNil(summary?.benchmark_report_path)
        XCTAssertGreaterThan(summary?.peak_velocity_mps ?? 0, 0)
        XCTAssertGreaterThan(summary?.mean_velocity_mps ?? 0, 0)
        XCTAssertTrue(FileManager.default.fileExists(atPath: summary?.benchmark_report_path ?? ""))
    }

    func testMovementPatternInferenceUsesExerciseNames() {
        XCTAssertEqual(MotionMovementPattern.infer(from: "Romanian Deadlift"), .hinge)
        XCTAssertEqual(MotionMovementPattern.infer(from: "Overhead Press"), .press)
        XCTAssertEqual(MotionMovementPattern.infer(from: "Chest Supported Row"), .pull)
        XCTAssertEqual(MotionMovementPattern.infer(from: "Front Squat"), .squat)
    }

    private func point(_ x: CGFloat, _ y: CGFloat, confidence: Double = 0.98) -> PosePoint {
        PosePoint(x: x, y: y, confidence: confidence)!
    }

    private func squatFrame(kneeY: CGFloat, shoulderX: CGFloat) -> PoseFrame {
        PoseFrame(landmarks: PoseLandmarks(
            leftShoulder: point(shoulderX, 0.68),
            rightShoulder: point(shoulderX + 0.10, 0.68),
            leftHip: point(0.46, 0.42),
            rightHip: point(0.56, 0.42),
            leftKnee: point(0.56, kneeY),
            rightKnee: point(0.46, kneeY),
            leftAnkle: point(0.54, 0.11),
            rightAnkle: point(0.48, 0.11),
            nose: point(shoulderX + 0.05, 0.82)
        ))
    }

    private func pressFrame(lockedOut: Bool, wristY: CGFloat? = nil) -> PoseFrame {
        let leftWristY = wristY ?? (lockedOut ? 0.92 : 0.60)
        let rightWristY = wristY ?? (lockedOut ? 0.92 : 0.60)
        let leftWristX: CGFloat = lockedOut ? 0.44 : 0.54
        let rightWristX: CGFloat = lockedOut ? 0.56 : 0.46

        return PoseFrame(landmarks: PoseLandmarks(
            leftShoulder: point(0.44, 0.74),
            rightShoulder: point(0.56, 0.74),
            leftElbow: point(0.46, 0.62),
            rightElbow: point(0.54, 0.62),
            leftWrist: point(leftWristX, leftWristY),
            rightWrist: point(rightWristX, rightWristY),
            leftHip: point(0.46, 0.45),
            rightHip: point(0.54, 0.45),
            leftKnee: point(0.47, 0.25),
            rightKnee: point(0.53, 0.25),
            leftAnkle: point(0.47, 0.09),
            rightAnkle: point(0.53, 0.09),
            nose: point(0.50, 0.85)
        ))
    }

    private func pullFrame(contracted: Bool, wristX: CGFloat? = nil) -> PoseFrame {
        let leftWristX = contracted ? (wristX ?? 0.58) : 0.44
        let rightWristX = contracted ? (1 - (wristX ?? 0.58)) : 0.56
        let wristY: CGFloat = contracted ? 0.60 : 0.42

        return PoseFrame(landmarks: PoseLandmarks(
            leftShoulder: point(0.44, 0.74),
            rightShoulder: point(0.56, 0.74),
            leftElbow: point(0.45, 0.58),
            rightElbow: point(0.55, 0.58),
            leftWrist: point(leftWristX, wristY),
            rightWrist: point(rightWristX, wristY),
            leftHip: point(0.46, 0.45),
            rightHip: point(0.54, 0.45),
            leftKnee: point(0.47, 0.25),
            rightKnee: point(0.53, 0.25),
            leftAnkle: point(0.47, 0.09),
            rightAnkle: point(0.53, 0.09),
            nose: point(0.50, 0.85)
        ))
    }
}
