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

    private func point(_ x: CGFloat, _ y: CGFloat, confidence: Double = 0.98) -> PosePoint {
        PosePoint(x: x, y: y, confidence: confidence)!
    }
}
