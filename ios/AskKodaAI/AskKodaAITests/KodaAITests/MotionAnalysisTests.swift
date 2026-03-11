//
//  MotionAnalysisTests.swift
//  KodaAITests
//
//  Verifies the local pose heuristic layer that powers the Motion Lab fallback path.
//

import CoreGraphics
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
}
