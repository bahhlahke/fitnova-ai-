//
//  MotionAnalysisService.swift
//  Koda AI
//
//  Local-first Motion Lab analysis with automatic fallback to the server vision API.
//

import CoreGraphics
import CoreMedia
import Foundation
import ImageIO
import UIKit
import Vision

protocol PoseEstimating {
    func estimatePose(in image: UIImage) throws -> PoseFrame?
    func estimatePose(in pixelBuffer: CVPixelBuffer, orientation: CGImagePropertyOrientation) throws -> PoseFrame?
}

struct VisionPoseEstimator: PoseEstimating {
    func estimatePose(in image: UIImage) throws -> PoseFrame? {
        guard let cgImage = image.cgImage else {
            return nil
        }

        let request = VNDetectHumanBodyPoseRequest()
        let handler = VNImageRequestHandler(
            cgImage: cgImage,
            orientation: CGImagePropertyOrientation(image.imageOrientation),
            options: [:]
        )
        try handler.perform([request])

        guard let observation = request.results?.first else {
            return nil
        }

        let points = try observation.recognizedPoints(.all)
        return PoseFrame(points: points)
    }

    func estimatePose(in pixelBuffer: CVPixelBuffer, orientation: CGImagePropertyOrientation) throws -> PoseFrame? {
        let request = VNDetectHumanBodyPoseRequest()
        let handler = VNImageRequestHandler(cvPixelBuffer: pixelBuffer, orientation: orientation, options: [:])
        try handler.perform([request])

        guard let observation = request.results?.first else {
            return nil
        }

        let points = try observation.recognizedPoints(.all)
        return PoseFrame(points: points)
    }
}

enum MotionMovementPattern: String, Codable, CaseIterable, Identifiable {
    case squat
    case hinge
    case press
    case pull

    var id: String { rawValue }

    var label: String {
        switch self {
        case .squat: return "Squat"
        case .hinge: return "Hinge"
        case .press: return "Press"
        case .pull: return "Pull"
        }
    }

    var summaryLabel: String {
        switch self {
        case .squat: return "squat pattern"
        case .hinge: return "hinge pattern"
        case .press: return "press pattern"
        case .pull: return "pull pattern"
        }
    }

    static func infer(from exerciseName: String?) -> MotionMovementPattern {
        let name = (exerciseName ?? "").lowercased()
        if name.contains("deadlift") || name.contains("rdl") || name.contains("hinge") || name.contains("good morning") || name.contains("swing") {
            return .hinge
        }
        if name.contains("pull") || name.contains("row") || name.contains("chin") || name.contains("lat pulldown") {
            return .pull
        }
        if name.contains("press") || name.contains("bench") || name.contains("push-up") || name.contains("pushup") {
            return .press
        }
        return .squat
    }
}

struct MotionSessionConfiguration {
    let pattern: MotionMovementPattern

    static let `default` = MotionSessionConfiguration(pattern: .squat)
}

struct MotionAnalysisCapability {
    let isOnDeviceAvailable: Bool
    let detail: String
    let supportsRealtime: Bool

    static func current(processInfo: ProcessInfo = .processInfo) -> MotionAnalysisCapability {
        guard #available(iOS 16.0, *) else {
            return MotionAnalysisCapability(
                isOnDeviceAvailable: false,
                detail: "Requires iOS 16 or later for the local pose runtime.",
                supportsRealtime: false
            )
        }

        let thermalState = processInfo.thermalState
        guard thermalState != .serious && thermalState != .critical else {
            return MotionAnalysisCapability(
                isOnDeviceAvailable: false,
                detail: "Thermal pressure is too high for reliable on-device analysis right now.",
                supportsRealtime: false
            )
        }

        guard !processInfo.isLowPowerModeEnabled else {
            return MotionAnalysisCapability(
                isOnDeviceAvailable: false,
                detail: "Low Power Mode is enabled, so Motion Lab is using the server fallback.",
                supportsRealtime: false
            )
        }

        #if targetEnvironment(simulator)
        return MotionAnalysisCapability(
            isOnDeviceAvailable: true,
            detail: "On-device pose analysis is enabled in the simulator for development.",
            supportsRealtime: true
        )
        #else
        return MotionAnalysisCapability(
            isOnDeviceAvailable: true,
            detail: "On-device pose analysis is available for realtime Motion Lab checks.",
            supportsRealtime: true
        )
        #endif
    }
}

enum MotionAnalysisError: LocalizedError {
    case invalidImagePayload
    case noUsableImages
    case poseNotDetected
    case videoFrameUnavailable

    var errorDescription: String? {
        switch self {
        case .invalidImagePayload:
            return "One or more selected images could not be decoded for local pose analysis."
        case .noUsableImages:
            return "Motion Lab could not prepare any images for local analysis."
        case .poseNotDetected:
            return "Local pose tracking could not find a stable body pose in these photos."
        case .videoFrameUnavailable:
            return "Motion Lab could not decode the live camera frame for pose analysis."
        }
    }
}

struct MotionAnalysisService {
    private let api: KodaAPIService
    private let onDeviceAnalyzer = OnDeviceMotionAnalyzer()

    init(api: KodaAPIService) {
        self.api = api
    }

    var capability: MotionAnalysisCapability {
        onDeviceAnalyzer.capability
    }

    func analyze(images: [String], configuration: MotionSessionConfiguration = MotionSessionConfiguration(pattern: .squat)) async throws -> VisionAnalysisResponse {
        let capability = onDeviceAnalyzer.capability
        guard capability.isOnDeviceAvailable else {
            return try await fallbackResponse(
                images: images,
                configuration: configuration,
                mode: "remote_vision_fallback",
                fallbackReason: capability.detail
            )
        }

        do {
            return try await onDeviceAnalyzer.analyze(dataURLs: images, configuration: configuration)
        } catch {
            return try await fallbackResponse(
                images: images,
                configuration: configuration,
                mode: "remote_vision_fallback",
                fallbackReason: (error as? LocalizedError)?.errorDescription ?? error.localizedDescription
            )
        }
    }

    private func fallbackResponse(images: [String], configuration: MotionSessionConfiguration, mode: String, fallbackReason: String?) async throws -> VisionAnalysisResponse {
        let response = try await api.aiVision(images: images)
        return VisionAnalysisResponse(
            score: response.score,
            critique: response.critique,
            correction: response.correction,
            analysis_source: "server",
            analysis_mode: mode,
            benchmark_ms: response.benchmark_ms,
            frames_analyzed: response.frames_analyzed ?? images.count,
            pose_confidence: response.pose_confidence,
            fallback_reason: fallbackReason ?? response.fallback_reason,
            movement_pattern: configuration.pattern.rawValue,
            rep_count: response.rep_count,
            peak_velocity_mps: response.peak_velocity_mps,
            mean_velocity_mps: response.mean_velocity_mps,
            velocity_dropoff_percent: response.velocity_dropoff_percent,
            benchmark_report_path: response.benchmark_report_path
        )
    }
}

struct OnDeviceMotionAnalyzer {
    let capability: MotionAnalysisCapability
    private let estimator: PoseEstimating

    init(capability: MotionAnalysisCapability = .current(), estimator: PoseEstimating = VisionPoseEstimator()) {
        self.capability = capability
        self.estimator = estimator
    }

    func analyze(dataURLs: [String], configuration: MotionSessionConfiguration) async throws -> VisionAnalysisResponse {
        let start = Date()
        let decodedImages = dataURLs.compactMap(Self.decodeImage(from:))

        guard !decodedImages.isEmpty else {
            throw dataURLs.isEmpty ? MotionAnalysisError.noUsableImages : MotionAnalysisError.invalidImagePayload
        }

        let frames = try decodedImages.compactMap(analyzeFrame)
        guard !frames.isEmpty else {
            throw MotionAnalysisError.poseNotDetected
        }

        let summary = OnDeviceMotionAnalyzer.summarize(frames: frames, pattern: configuration.pattern)
        let elapsedMs = max(1, Int(Date().timeIntervalSince(start) * 1000))

        return VisionAnalysisResponse(
            score: summary.score,
            critique: summary.critique,
            correction: summary.correction,
            analysis_source: "on_device",
            analysis_mode: "on_device_pose_photo",
            benchmark_ms: elapsedMs,
            frames_analyzed: frames.count,
            pose_confidence: summary.poseConfidence,
            fallback_reason: nil,
            movement_pattern: configuration.pattern.rawValue,
            rep_count: nil,
            peak_velocity_mps: nil,
            mean_velocity_mps: nil,
            velocity_dropoff_percent: nil,
            benchmark_report_path: nil
        )
    }

    private func analyzeFrame(_ image: UIImage) throws -> PoseFrame? {
        try estimator.estimatePose(in: image)
    }

    static func summarize(frames: [PoseFrame], pattern: MotionMovementPattern = .squat) -> PoseSummary {
        let poseConfidence = frames.map(\.poseConfidence).average ?? 0
        let avgKneeAngle = frames.compactMap(\.averageKneeAngle).average ?? 150
        let avgHipAngle = frames.compactMap(\.averageHipAngle).average ?? 95
        let avgElbowAngle = frames.compactMap(\.averageElbowAngle).average ?? 145
        let avgTorsoLean = frames.compactMap(\.torsoLeanDegrees).average ?? 35
        let avgShoulderTilt = frames.compactMap(\.shoulderTilt).average ?? 0
        let avgHipTilt = frames.compactMap(\.hipTilt).average ?? 0
        let avgDepthDelta = frames.compactMap(\.depthDelta).average ?? 0.14
        let consistencyPenalty = min(8, Int((frames.compactMap(\.torsoLeanDegrees).standardDeviation) * 0.35))

        var score = 86
        var positives: [String] = []
        var corrections: [String] = []

        if poseConfidence >= 0.7 {
            positives.append("pose tracking stayed stable across the selected frame set")
            score += 4
        } else if poseConfidence >= 0.55 {
            positives.append("tracking quality was usable for a local technique pass")
        } else {
            corrections.append("camera angle or lighting reduced local pose confidence")
            score -= 14
        }

        switch pattern {
        case .squat:
            if avgDepthDelta <= 0.08 || avgKneeAngle <= 115 {
                positives.append("depth looked consistent through the available frames")
                score += 4
            } else if avgDepthDelta > 0.16 || avgKneeAngle > 145 {
                corrections.append("sit slightly deeper before driving back up")
                score -= 12
            }
        case .hinge:
            if avgHipAngle <= 92 {
                positives.append("the hinge stayed loaded through the hip pocket")
                score += 4
            } else if avgHipAngle > 120 {
                corrections.append("push the hips back farther before returning to lockout")
                score -= 12
            }
        case .press:
            if avgElbowAngle >= 148 {
                positives.append("press lockout looked clean and decisive")
                score += 4
            } else {
                corrections.append("finish the press with a harder elbow lockout")
                score -= 10
            }
        case .pull:
            if avgElbowAngle <= 92 {
                positives.append("top-end contraction looked strong")
                score += 4
            } else {
                corrections.append("pull higher before lowering back to the start")
                score -= 10
            }
        }

        if avgTorsoLean <= 28 {
            positives.append("torso position stayed stacked and controlled")
            score += 3
        } else if avgTorsoLean > 42 {
            corrections.append("keep the chest taller so the torso does not pitch forward early")
            score -= 10
        }

        if avgShoulderTilt <= 0.045 && avgHipTilt <= 0.045 {
            positives.append("left-to-right balance looked even")
            score += 3
        } else {
            corrections.append("level the shoulders and hips before each rep to stay centered")
            score -= 8
        }

        if pattern == .squat && avgHipAngle < 58 {
            corrections.append("brace harder through the bottom so the hips do not collapse")
            score -= 6
        }

        score -= consistencyPenalty
        let boundedScore = min(96, max(48, score))

        let critiqueLead = positives.isEmpty ? "On-device \(pattern.summaryLabel) analysis completed." : "On-device \(pattern.summaryLabel) analysis found that " + positives.joined(separator: ", ") + "."
        let correctionLead = corrections.isEmpty
            ? "Keep the same setup and repeat from a side angle when you want a tighter local read."
            : corrections.uniqued().joined(separator: " ")

        return PoseSummary(
            score: Double(boundedScore),
            critique: critiqueLead,
            correction: correctionLead,
            poseConfidence: poseConfidence
        )
    }

    private static func decodeImage(from input: String) -> UIImage? {
        let payload: String
        if let commaIndex = input.firstIndex(of: ",") {
            payload = String(input[input.index(after: commaIndex)...])
        } else {
            payload = input
        }

        guard let data = Data(base64Encoded: payload, options: .ignoreUnknownCharacters) else {
            return nil
        }
        return UIImage(data: data)
    }
}

struct PoseSummary {
    let score: Double
    let critique: String
    let correction: String
    let poseConfidence: Double
}

struct PoseFrame {
    let landmarks: PoseLandmarks
    let poseConfidence: Double
    let averageKneeAngle: Double?
    let averageHipAngle: Double?
    let averageElbowAngle: Double?
    let torsoLeanDegrees: Double?
    let shoulderTilt: Double?
    let hipTilt: Double?
    let depthDelta: Double?

    init(points: [VNHumanBodyPoseObservation.JointName: VNRecognizedPoint]) {
        self.init(landmarks: PoseLandmarks(points: points))
    }

    init(landmarks: PoseLandmarks) {
        self.landmarks = landmarks
        let leftSide = PoseSideMetrics(
            shoulder: landmarks.leftShoulder,
            hip: landmarks.leftHip,
            knee: landmarks.leftKnee,
            ankle: landmarks.leftAnkle
        )
        let rightSide = PoseSideMetrics(
            shoulder: landmarks.rightShoulder,
            hip: landmarks.rightHip,
            knee: landmarks.rightKnee,
            ankle: landmarks.rightAnkle
        )
        let leftElbowAngle = PoseSideMetrics.angle(a: landmarks.leftShoulder, vertex: landmarks.leftElbow, c: landmarks.leftWrist)
        let rightElbowAngle = PoseSideMetrics.angle(a: landmarks.rightShoulder, vertex: landmarks.rightElbow, c: landmarks.rightWrist)

        let trackedPoints = landmarks.allPoints
        poseConfidence = trackedPoints.map(\.confidence).average ?? 0
        averageKneeAngle = [leftSide.kneeAngle, rightSide.kneeAngle].compactMap { $0 }.average
        averageHipAngle = [leftSide.hipAngle, rightSide.hipAngle].compactMap { $0 }.average
        averageElbowAngle = [leftElbowAngle, rightElbowAngle].compactMap { $0 }.average
        torsoLeanDegrees = [leftSide.torsoLeanDegrees, rightSide.torsoLeanDegrees].compactMap { $0 }.average

        if let leftShoulder = landmarks.leftShoulder, let rightShoulder = landmarks.rightShoulder {
            shoulderTilt = abs(Double(leftShoulder.y - rightShoulder.y))
        } else {
            shoulderTilt = nil
        }

        if let leftHip = landmarks.leftHip, let rightHip = landmarks.rightHip {
            hipTilt = abs(Double(leftHip.y - rightHip.y))
            depthDelta = abs(Double(((leftHip.y + rightHip.y) / 2) - ((landmarks.leftKnee?.y ?? leftHip.y) + (landmarks.rightKnee?.y ?? rightHip.y)) / 2))
        } else {
            hipTilt = nil
            depthDelta = nil
        }
    }
}

enum MotionPhase: String {
    case setup
    case eccentric
    case bottom
    case concentric
    case lockout

    var label: String {
        rawValue.capitalized
    }
}

struct PoseSegment: Hashable, Identifiable {
    let start: PosePoint
    let end: PosePoint

    var id: String {
        "\(start.x)-\(start.y)-\(end.x)-\(end.y)"
    }
}

struct LiveMotionSnapshot {
    let pattern: MotionMovementPattern
    let repCount: Int
    let phase: MotionPhase
    let cue: String
    let score: Int
    let fps: Double
    let latencyMs: Int
    let poseConfidence: Double
    let torsoLeanDegrees: Double
    let primaryMetric: Double
    let currentVelocityMps: Double
    let peakVelocityMps: Double
    let meanVelocityMps: Double
    let segments: [PoseSegment]
    let trackingStatus: String
}

struct MotionBenchmarkReport {
    let averageFPS: Double
    let p50LatencyMs: Int
    let p95LatencyMs: Int
    let processedFrames: Int
    let droppedFrames: Int
    let reportPath: String?
}

struct MotionVelocitySummary {
    let peakVelocityMps: Double
    let meanVelocityMps: Double
    let velocityDropoffPercent: Double
    let fastestRepMps: Double
    let slowestRepMps: Double
}

struct RealtimeMotionSessionSummary {
    let response: VisionAnalysisResponse
    let benchmark: MotionBenchmarkReport
}

private enum MotionMetricOrientation {
    case highAtTop
    case lowAtTop
}

private struct MotionPatternProfile {
    let pattern: MotionMovementPattern
    let orientation: MotionMetricOrientation
    let topThreshold: Double
    let bottomThreshold: Double

    func primaryMetric(for frame: PoseFrame) -> Double? {
        switch pattern {
        case .squat:
            return frame.averageKneeAngle
        case .hinge:
            return frame.averageHipAngle
        case .press, .pull:
            return frame.averageElbowAngle
        }
    }

    func anchorY(for frame: PoseFrame) -> Double? {
        switch pattern {
        case .squat, .hinge:
            return frame.landmarks.shoulderMidpoint.map { Double($0.y) }
        case .press, .pull:
            return frame.landmarks.wristMidpoint.map { Double($0.y) }
        }
    }

    func isAtTop(_ metric: Double) -> Bool {
        switch orientation {
        case .highAtTop:
            return metric >= topThreshold
        case .lowAtTop:
            return metric <= topThreshold
        }
    }

    func isAtBottom(_ metric: Double) -> Bool {
        switch orientation {
        case .highAtTop:
            return metric <= bottomThreshold
        case .lowAtTop:
            return metric >= bottomThreshold
        }
    }

    func movingTowardTop(delta: Double) -> Bool {
        switch orientation {
        case .highAtTop:
            return delta > 2
        case .lowAtTop:
            return delta < -2
        }
    }

    func movingTowardBottom(delta: Double) -> Bool {
        switch orientation {
        case .highAtTop:
            return delta < -2
        case .lowAtTop:
            return delta > 2
        }
    }

    func passiveCue(for phase: MotionPhase, poseConfidence: Double) -> String {
        switch phase {
        case .setup:
            switch pattern {
            case .squat:
                return "Brace, stay side-on to the camera, and start the rep."
            case .hinge:
                return "Set the lats, soften the knees, and hinge from the hips."
            case .press:
                return "Stack the ribs, keep wrists over elbows, and press cleanly."
            case .pull:
                return "Start from a long hang and pull the elbows toward the ribs."
            }
        case .eccentric:
            switch pattern {
            case .squat:
                return "Control the descent and keep pressure through mid-foot."
            case .hinge:
                return "Push the hips back and keep the bar path close."
            case .press:
                return "Lower with control and keep the forearms vertical."
            case .pull:
                return "Descend under control without losing upper-back tension."
            }
        case .bottom:
            switch pattern {
            case .squat:
                return "Hold shape at the bottom, then drive straight up."
            case .hinge:
                return "Stay loaded in the hamstrings, then drive the hips through."
            case .press:
                return "Stay stacked at the rack position, then punch overhead."
            case .pull:
                return "Hit the top hard, then own the position before lowering."
            }
        case .concentric:
            switch pattern {
            case .squat:
                return "Lead with the chest and finish the rep tall."
            case .hinge:
                return "Drive the floor away and snap to a tall finish."
            case .press:
                return "Press fast and finish with the biceps by the ears."
            case .pull:
                return "Pull the elbows down and keep the chest proud."
            }
        case .lockout:
            return poseConfidence >= 0.72 ? "Tracking stable. Keep the same camera angle." : "Stay centered in frame for a cleaner read."
        }
    }

    func activeCue(for frame: PoseFrame, phase: MotionPhase) -> String? {
        if let torsoLean = frame.torsoLeanDegrees, torsoLean > 42, pattern != .pull {
            switch pattern {
            case .squat:
                return "Chest up. Keep the rib cage stacked over the hips."
            case .hinge:
                return "Keep the spine neutral and hinge from the hips, not the low back."
            case .press:
                return "Stay stacked. Do not lean back to finish the press."
            case .pull:
                return nil
            }
        }

        if let shoulderTilt = frame.shoulderTilt, let hipTilt = frame.hipTilt,
           shoulderTilt > 0.05 || hipTilt > 0.05 {
            return "Square the shoulders and hips before the next rep."
        }

        switch pattern {
        case .squat:
            if phase == .bottom, let kneeAngle = frame.averageKneeAngle, kneeAngle > 135 {
                return "Sit deeper before driving up."
            }
        case .hinge:
            if phase == .bottom, let hipAngle = frame.averageHipAngle, hipAngle > 108 {
                return "Reach the hips back farther before standing tall."
            }
        case .press:
            if let elbowAngle = frame.averageElbowAngle, elbowAngle < 148, phase == .lockout {
                return "Finish taller and lock the elbows overhead."
            }
        case .pull:
            if let elbowAngle = frame.averageElbowAngle, elbowAngle > 92, phase == .bottom {
                return "Pull higher and finish with the elbows down."
            }
        }

        return nil
    }

    static func forPattern(_ pattern: MotionMovementPattern) -> MotionPatternProfile {
        switch pattern {
        case .squat:
            return MotionPatternProfile(pattern: .squat, orientation: .highAtTop, topThreshold: 162, bottomThreshold: 118)
        case .hinge:
            return MotionPatternProfile(pattern: .hinge, orientation: .highAtTop, topThreshold: 154, bottomThreshold: 88)
        case .press:
            return MotionPatternProfile(pattern: .press, orientation: .highAtTop, topThreshold: 156, bottomThreshold: 92)
        case .pull:
            return MotionPatternProfile(pattern: .pull, orientation: .lowAtTop, topThreshold: 78, bottomThreshold: 148)
        }
    }
}

final class RealtimeMotionSessionEngine {
    private let configuration: MotionSessionConfiguration
    private let profile: MotionPatternProfile
    private var currentPhase: MotionPhase = .setup
    private var repCount = 0
    private var lastPrimaryMetric: Double?
    private var visitedBottom = false
    private var countedCurrentTop = false
    private var sessionStart: TimeInterval?
    private var processedFrames = 0
    private var lastCueTimestamp: TimeInterval = 0
    private var recentFrames: [PoseFrame] = []
    private var lastAnchorY: Double?
    private var lastAnchorTimestamp: TimeInterval?
    private var currentVelocityMps = 0.0
    private var allConcentricVelocitySamples: [Double] = []
    private var currentRepVelocitySamples: [Double] = []
    private var repPeakVelocities: [Double] = []
    private let cueCooldown: TimeInterval = 0.9
    private let maxRecentFrames = 45
    private let benchmarkWriter: MotionBenchmarkReportWriter

    init(
        configuration: MotionSessionConfiguration = MotionSessionConfiguration(pattern: .squat),
        benchmarkWriter: MotionBenchmarkReportWriter = MotionBenchmarkReportWriter()
    ) {
        self.configuration = configuration
        self.profile = MotionPatternProfile.forPattern(configuration.pattern)
        self.benchmarkWriter = benchmarkWriter
    }

    func process(frame: PoseFrame, timestamp: TimeInterval, latencyMs: Int) -> LiveMotionSnapshot {
        if sessionStart == nil {
            sessionStart = timestamp
        }

        processedFrames += 1
        recentFrames.append(frame)
        if recentFrames.count > maxRecentFrames {
            recentFrames.removeFirst(recentFrames.count - maxRecentFrames)
        }

        let primaryMetric = profile.primaryMetric(for: frame) ?? 0
        let torsoLean = frame.torsoLeanDegrees ?? 0
        let previousMetric = lastPrimaryMetric ?? primaryMetric
        let delta = primaryMetric - previousMetric
        lastPrimaryMetric = primaryMetric

        if let anchorY = profile.anchorY(for: frame) {
            currentVelocityMps = updateVelocity(anchorY: anchorY, frame: frame, timestamp: timestamp)
        } else {
            currentVelocityMps = 0
        }

        if profile.isAtBottom(primaryMetric) {
            currentPhase = .bottom
            visitedBottom = true
            countedCurrentTop = false
        } else if profile.isAtTop(primaryMetric) {
            currentPhase = .lockout
            if visitedBottom && !countedCurrentTop {
                repCount += 1
                countedCurrentTop = true
                visitedBottom = false
                finalizeRepVelocity()
            }
        } else if profile.movingTowardTop(delta: delta) {
            currentPhase = .concentric
            countedCurrentTop = false
        } else if profile.movingTowardBottom(delta: delta) {
            currentPhase = .eccentric
            if currentPhase == .eccentric {
                currentRepVelocitySamples.removeAll(keepingCapacity: true)
            }
        }

        if currentPhase == .concentric, currentVelocityMps > 0 {
            currentRepVelocitySamples.append(currentVelocityMps)
            allConcentricVelocitySamples.append(currentVelocityMps)
        }

        let velocitySummary = currentVelocitySummary()
        let summary = OnDeviceMotionAnalyzer.summarize(frames: recentFrames, pattern: configuration.pattern)
        let fps: Double = {
            guard let sessionStart else { return 0 }
            let elapsed = max(0.001, timestamp - sessionStart)
            return Double(processedFrames) / elapsed
        }()

        let cue = nextCue(frame: frame, timestamp: timestamp)
        return LiveMotionSnapshot(
            pattern: configuration.pattern,
            repCount: repCount,
            phase: currentPhase,
            cue: cue,
            score: Int(summary.score.rounded()),
            fps: fps,
            latencyMs: latencyMs,
            poseConfidence: frame.poseConfidence,
            torsoLeanDegrees: torsoLean,
            primaryMetric: primaryMetric,
            currentVelocityMps: currentVelocityMps,
            peakVelocityMps: velocitySummary.peakVelocityMps,
            meanVelocityMps: velocitySummary.meanVelocityMps,
            segments: frame.landmarks.segments,
            trackingStatus: trackingStatus(for: frame)
        )
    }

    func currentSummaryResponse(benchmark: MotionBenchmarkReport?) -> VisionAnalysisResponse? {
        guard !recentFrames.isEmpty else { return nil }
        let summary = OnDeviceMotionAnalyzer.summarize(frames: recentFrames, pattern: configuration.pattern)
        let velocitySummary = currentVelocitySummary()
        return VisionAnalysisResponse(
            score: summary.score,
            critique: summary.critique,
            correction: summary.correction,
            analysis_source: "on_device",
            analysis_mode: "on_device_pose_realtime",
            benchmark_ms: benchmark?.p95LatencyMs,
            frames_analyzed: recentFrames.count,
            pose_confidence: summary.poseConfidence,
            fallback_reason: nil,
            movement_pattern: configuration.pattern.rawValue,
            rep_count: repCount,
            peak_velocity_mps: velocitySummary.peakVelocityMps,
            mean_velocity_mps: velocitySummary.meanVelocityMps,
            velocity_dropoff_percent: velocitySummary.velocityDropoffPercent,
            benchmark_report_path: benchmark?.reportPath
        )
    }

    private func trackingStatus(for frame: PoseFrame) -> String {
        if frame.poseConfidence >= 0.72 {
            return "Tracking locked"
        }
        if frame.poseConfidence >= 0.55 {
            return "Tracking usable"
        }
        return "Tracking unstable"
    }

    private func nextCue(frame: PoseFrame, timestamp: TimeInterval) -> String {
        if frame.poseConfidence < 0.55 {
            return "Tracking lost. Reset the camera to a clearer side angle."
        }

        if currentPhase == .lockout && repCount > 0 && countedCurrentTop {
            lastCueTimestamp = timestamp
            return "Rep \(repCount) counted. Reset and attack the next \(configuration.pattern.label.lowercased()) rep."
        }

        if timestamp - lastCueTimestamp < cueCooldown {
            return profile.passiveCue(for: currentPhase, poseConfidence: frame.poseConfidence)
        }

        if let cue = profile.activeCue(for: frame, phase: currentPhase) {
            lastCueTimestamp = timestamp
            return cue
        }

        return profile.passiveCue(for: currentPhase, poseConfidence: frame.poseConfidence)
    }

    private func updateVelocity(anchorY: Double, frame: PoseFrame, timestamp: TimeInterval) -> Double {
        defer {
            lastAnchorY = anchorY
            lastAnchorTimestamp = timestamp
        }

        guard let lastAnchorY, let lastAnchorTimestamp else {
            return 0
        }

        let dt = max(0.001, timestamp - lastAnchorTimestamp)
        let normalizedDelta = anchorY - lastAnchorY
        let scale = frame.landmarks.approximateMetersPerNormalizedUnit
        return max(0, (normalizedDelta * scale) / dt)
    }

    private func finalizeRepVelocity() {
        guard !currentRepVelocitySamples.isEmpty else { return }
        repPeakVelocities.append(currentRepVelocitySamples.max() ?? 0)
        currentRepVelocitySamples.removeAll(keepingCapacity: true)
    }

    private func currentVelocitySummary() -> MotionVelocitySummary {
        let peakVelocity = repPeakVelocities.max() ?? allConcentricVelocitySamples.max() ?? 0
        let meanVelocity = allConcentricVelocitySamples.average ?? repPeakVelocities.average ?? 0
        let fastestRep = repPeakVelocities.max() ?? 0
        let slowestRep = repPeakVelocities.min() ?? 0
        let dropoffPercent: Double = {
            guard fastestRep > 0, slowestRep > 0 else { return 0 }
            return max(0, ((fastestRep - slowestRep) / fastestRep) * 100)
        }()

        return MotionVelocitySummary(
            peakVelocityMps: peakVelocity,
            meanVelocityMps: meanVelocity,
            velocityDropoffPercent: dropoffPercent,
            fastestRepMps: fastestRep,
            slowestRepMps: slowestRep
        )
    }

    func finalizedBenchmarkReport(_ benchmark: MotionBenchmarkReport?) -> MotionBenchmarkReport? {
        guard let benchmark else { return nil }
        let velocity = currentVelocitySummary()
        let reportPath = benchmarkWriter.write(
            pattern: configuration.pattern,
            repCount: repCount,
            benchmark: benchmark,
            velocity: velocity
        )?.path

        return MotionBenchmarkReport(
            averageFPS: benchmark.averageFPS,
            p50LatencyMs: benchmark.p50LatencyMs,
            p95LatencyMs: benchmark.p95LatencyMs,
            processedFrames: benchmark.processedFrames,
            droppedFrames: benchmark.droppedFrames,
            reportPath: reportPath
        )
    }
}

final class LivePoseStreamAnalyzer {
    private let capability: MotionAnalysisCapability
    private let engine: RealtimeMotionSessionEngine
    private let estimator: PoseEstimating
    private var smoother = PoseSmoother()
    private var benchmarkHarness = MotionBenchmarkHarness()
    private var lastProcessedTimestamp: TimeInterval = 0
    private let minFrameInterval: TimeInterval = 1.0 / 18.0
    private let videoOrientation: CGImagePropertyOrientation

    init(
        capability: MotionAnalysisCapability = .current(),
        configuration: MotionSessionConfiguration = MotionSessionConfiguration(pattern: .squat),
        estimator: PoseEstimating = VisionPoseEstimator(),
        videoOrientation: CGImagePropertyOrientation = .right
    ) {
        self.capability = capability
        self.engine = RealtimeMotionSessionEngine(configuration: configuration)
        self.estimator = estimator
        self.videoOrientation = videoOrientation
    }

    func process(sampleBuffer: CMSampleBuffer) -> LiveMotionSnapshot? {
        guard capability.isOnDeviceAvailable, capability.supportsRealtime else { return nil }
        let timestamp = CMTimeGetSeconds(CMSampleBufferGetPresentationTimeStamp(sampleBuffer))
        guard timestamp.isFinite else { return nil }
        guard timestamp - lastProcessedTimestamp >= minFrameInterval else {
            benchmarkHarness.recordDroppedFrame()
            return nil
        }
        lastProcessedTimestamp = timestamp

        guard let pixelBuffer = CMSampleBufferGetImageBuffer(sampleBuffer) else {
            return nil
        }

        let started = Date()
        do {
            guard let frame = try estimator.estimatePose(in: pixelBuffer, orientation: videoOrientation) else {
                return nil
            }
            let latencyMs = max(1, Int(Date().timeIntervalSince(started) * 1000))
            benchmarkHarness.record(latencyMs: latencyMs, timestamp: timestamp)
            let smoothedFrame = PoseFrame(landmarks: smoother.smooth(frame.landmarks))
            return engine.process(frame: smoothedFrame, timestamp: timestamp, latencyMs: latencyMs)
        } catch {
            return nil
        }
    }

    func currentSummaryResponse() -> RealtimeMotionSessionSummary? {
        let finalizedBenchmark = engine.finalizedBenchmarkReport(benchmarkHarness.report())
        guard let response = engine.currentSummaryResponse(benchmark: finalizedBenchmark) else {
            return nil
        }

        return RealtimeMotionSessionSummary(
            response: response,
            benchmark: finalizedBenchmark ?? MotionBenchmarkReport(
                averageFPS: 0,
                p50LatencyMs: 0,
                p95LatencyMs: 0,
                processedFrames: 0,
                droppedFrames: 0,
                reportPath: nil
            )
        )
    }
}

private struct PoseSmoother {
    private var previousLandmarks: PoseLandmarks?
    private let alpha: CGFloat = 0.38

    mutating func smooth(_ landmarks: PoseLandmarks) -> PoseLandmarks {
        guard let previousLandmarks else {
            self.previousLandmarks = landmarks
            return landmarks
        }

        let smoothed = PoseLandmarks(
            leftShoulder: blend(current: landmarks.leftShoulder, previous: previousLandmarks.leftShoulder),
            rightShoulder: blend(current: landmarks.rightShoulder, previous: previousLandmarks.rightShoulder),
            leftElbow: blend(current: landmarks.leftElbow, previous: previousLandmarks.leftElbow),
            rightElbow: blend(current: landmarks.rightElbow, previous: previousLandmarks.rightElbow),
            leftWrist: blend(current: landmarks.leftWrist, previous: previousLandmarks.leftWrist),
            rightWrist: blend(current: landmarks.rightWrist, previous: previousLandmarks.rightWrist),
            leftHip: blend(current: landmarks.leftHip, previous: previousLandmarks.leftHip),
            rightHip: blend(current: landmarks.rightHip, previous: previousLandmarks.rightHip),
            leftKnee: blend(current: landmarks.leftKnee, previous: previousLandmarks.leftKnee),
            rightKnee: blend(current: landmarks.rightKnee, previous: previousLandmarks.rightKnee),
            leftAnkle: blend(current: landmarks.leftAnkle, previous: previousLandmarks.leftAnkle),
            rightAnkle: blend(current: landmarks.rightAnkle, previous: previousLandmarks.rightAnkle),
            nose: blend(current: landmarks.nose, previous: previousLandmarks.nose)
        )
        self.previousLandmarks = smoothed
        return smoothed
    }

    private func blend(current: PosePoint?, previous: PosePoint?) -> PosePoint? {
        guard let current else { return previous }
        guard let previous else { return current }

        let x = (alpha * current.x) + ((1 - alpha) * previous.x)
        let y = (alpha * current.y) + ((1 - alpha) * previous.y)
        let confidence = (Double(alpha) * current.confidence) + (Double(1 - alpha) * previous.confidence)
        return PosePoint(x: x, y: y, confidence: confidence)
    }
}

private struct MotionBenchmarkHarness {
    private var processedFrames = 0
    private var droppedFrames = 0
    private var latenciesMs: [Int] = []
    private var firstTimestamp: TimeInterval?
    private var lastTimestamp: TimeInterval?

    mutating func record(latencyMs: Int, timestamp: TimeInterval) {
        processedFrames += 1
        latenciesMs.append(latencyMs)
        firstTimestamp = firstTimestamp ?? timestamp
        lastTimestamp = timestamp
    }

    mutating func recordDroppedFrame() {
        droppedFrames += 1
    }

    func report() -> MotionBenchmarkReport? {
        guard processedFrames > 0 else { return nil }
        let sortedLatencies = latenciesMs.sorted()
        let elapsed = max(0.001, (lastTimestamp ?? 0) - (firstTimestamp ?? 0))
        let averageFPS = processedFrames > 1 ? Double(processedFrames - 1) / elapsed : Double(processedFrames)

        return MotionBenchmarkReport(
            averageFPS: averageFPS,
            p50LatencyMs: percentile(0.50, values: sortedLatencies),
            p95LatencyMs: percentile(0.95, values: sortedLatencies),
            processedFrames: processedFrames,
            droppedFrames: droppedFrames,
            reportPath: nil
        )
    }

    private func percentile(_ fraction: Double, values: [Int]) -> Int {
        guard !values.isEmpty else { return 0 }
        let boundedFraction = max(0, min(1, fraction))
        let index = Int((Double(values.count - 1) * boundedFraction).rounded())
        return values[index]
    }
}

struct PoseLandmarks {
    let leftShoulder: PosePoint?
    let rightShoulder: PosePoint?
    let leftElbow: PosePoint?
    let rightElbow: PosePoint?
    let leftWrist: PosePoint?
    let rightWrist: PosePoint?
    let leftHip: PosePoint?
    let rightHip: PosePoint?
    let leftKnee: PosePoint?
    let rightKnee: PosePoint?
    let leftAnkle: PosePoint?
    let rightAnkle: PosePoint?
    let nose: PosePoint?

    init(points: [VNHumanBodyPoseObservation.JointName: VNRecognizedPoint]) {
        leftShoulder = PosePoint(points[.leftShoulder])
        rightShoulder = PosePoint(points[.rightShoulder])
        leftElbow = PosePoint(points[.leftElbow])
        rightElbow = PosePoint(points[.rightElbow])
        leftWrist = PosePoint(points[.leftWrist])
        rightWrist = PosePoint(points[.rightWrist])
        leftHip = PosePoint(points[.leftHip])
        rightHip = PosePoint(points[.rightHip])
        leftKnee = PosePoint(points[.leftKnee])
        rightKnee = PosePoint(points[.rightKnee])
        leftAnkle = PosePoint(points[.leftAnkle])
        rightAnkle = PosePoint(points[.rightAnkle])
        nose = PosePoint(points[.nose])
    }

    init(
        leftShoulder: PosePoint? = nil,
        rightShoulder: PosePoint? = nil,
        leftElbow: PosePoint? = nil,
        rightElbow: PosePoint? = nil,
        leftWrist: PosePoint? = nil,
        rightWrist: PosePoint? = nil,
        leftHip: PosePoint? = nil,
        rightHip: PosePoint? = nil,
        leftKnee: PosePoint? = nil,
        rightKnee: PosePoint? = nil,
        leftAnkle: PosePoint? = nil,
        rightAnkle: PosePoint? = nil,
        nose: PosePoint? = nil
    ) {
        self.leftShoulder = leftShoulder
        self.rightShoulder = rightShoulder
        self.leftElbow = leftElbow
        self.rightElbow = rightElbow
        self.leftWrist = leftWrist
        self.rightWrist = rightWrist
        self.leftHip = leftHip
        self.rightHip = rightHip
        self.leftKnee = leftKnee
        self.rightKnee = rightKnee
        self.leftAnkle = leftAnkle
        self.rightAnkle = rightAnkle
        self.nose = nose
    }

    var allPoints: [PosePoint] {
        [
            leftShoulder,
            rightShoulder,
            leftElbow,
            rightElbow,
            leftWrist,
            rightWrist,
            leftHip,
            rightHip,
            leftKnee,
            rightKnee,
            leftAnkle,
            rightAnkle,
            nose,
        ]
        .compactMap { $0 }
    }

    var segments: [PoseSegment] {
        [
            segment(leftShoulder, rightShoulder),
            segment(leftShoulder, leftElbow),
            segment(leftElbow, leftWrist),
            segment(rightShoulder, rightElbow),
            segment(rightElbow, rightWrist),
            segment(leftShoulder, leftHip),
            segment(rightShoulder, rightHip),
            segment(leftHip, rightHip),
            segment(leftHip, leftKnee),
            segment(leftKnee, leftAnkle),
            segment(rightHip, rightKnee),
            segment(rightKnee, rightAnkle),
            segment(nose, leftShoulder),
            segment(nose, rightShoulder),
        ]
        .compactMap { $0 }
    }

    private func segment(_ start: PosePoint?, _ end: PosePoint?) -> PoseSegment? {
        guard let start, let end else { return nil }
        return PoseSegment(start: start, end: end)
    }

    var shoulderMidpoint: PosePoint? {
        midpoint(leftShoulder, rightShoulder)
    }

    var wristMidpoint: PosePoint? {
        midpoint(leftWrist, rightWrist)
    }

    var hipMidpoint: PosePoint? {
        midpoint(leftHip, rightHip)
    }

    var averageTorsoLength: Double? {
        let lengths = [
            distance(from: leftShoulder, to: leftHip),
            distance(from: rightShoulder, to: rightHip),
        ]
        .compactMap { $0 }

        return lengths.average
    }

    var approximateMetersPerNormalizedUnit: Double {
        guard let torsoLength = averageTorsoLength, torsoLength > 0 else { return 1.4 }
        return 0.35 / torsoLength
    }

    private func midpoint(_ lhs: PosePoint?, _ rhs: PosePoint?) -> PosePoint? {
        guard let lhs, let rhs else { return nil }
        let confidence = min(lhs.confidence, rhs.confidence)
        return PosePoint(
            x: (lhs.x + rhs.x) / 2,
            y: (lhs.y + rhs.y) / 2,
            confidence: confidence
        )
    }

    private func distance(from start: PosePoint?, to end: PosePoint?) -> Double? {
        guard let start, let end else { return nil }
        let dx = Double(start.x - end.x)
        let dy = Double(start.y - end.y)
        return sqrt((dx * dx) + (dy * dy))
    }
}

private struct MotionBenchmarkFilePayload: Codable {
    let pattern: String
    let repCount: Int
    let benchmark: MotionBenchmarkReportCodable
    let velocity: MotionVelocitySummaryCodable
    let createdAt: String
}

private struct MotionBenchmarkReportCodable: Codable {
    let averageFPS: Double
    let p50LatencyMs: Int
    let p95LatencyMs: Int
    let processedFrames: Int
    let droppedFrames: Int
}

private struct MotionVelocitySummaryCodable: Codable {
    let peakVelocityMps: Double
    let meanVelocityMps: Double
    let velocityDropoffPercent: Double
    let fastestRepMps: Double
    let slowestRepMps: Double
}

struct MotionBenchmarkReportWriter {
    private let rootDirectoryURL: URL?

    init(rootDirectoryURL: URL? = nil) {
        self.rootDirectoryURL = rootDirectoryURL
    }

    func write(
        pattern: MotionMovementPattern,
        repCount: Int,
        benchmark: MotionBenchmarkReport,
        velocity: MotionVelocitySummary
    ) -> URL? {
        let fileManager = FileManager.default
        let baseURL = rootDirectoryURL ?? fileManager.urls(for: .documentDirectory, in: .userDomainMask).first
        guard let baseURL else { return nil }

        let reportsDirectory = baseURL
            .appendingPathComponent("MotionLabReports", isDirectory: true)
            .appendingPathComponent(pattern.rawValue, isDirectory: true)

        do {
            try fileManager.createDirectory(at: reportsDirectory, withIntermediateDirectories: true, attributes: nil)
            let encoder = JSONEncoder()
            encoder.outputFormatting = [.prettyPrinted, .sortedKeys]
            let payload = MotionBenchmarkFilePayload(
                pattern: pattern.rawValue,
                repCount: repCount,
                benchmark: MotionBenchmarkReportCodable(
                    averageFPS: benchmark.averageFPS,
                    p50LatencyMs: benchmark.p50LatencyMs,
                    p95LatencyMs: benchmark.p95LatencyMs,
                    processedFrames: benchmark.processedFrames,
                    droppedFrames: benchmark.droppedFrames
                ),
                velocity: MotionVelocitySummaryCodable(
                    peakVelocityMps: velocity.peakVelocityMps,
                    meanVelocityMps: velocity.meanVelocityMps,
                    velocityDropoffPercent: velocity.velocityDropoffPercent,
                    fastestRepMps: velocity.fastestRepMps,
                    slowestRepMps: velocity.slowestRepMps
                ),
                createdAt: ISO8601DateFormatter().string(from: Date())
            )

            let filename = "motion-benchmark-\(pattern.rawValue)-\(Int(Date().timeIntervalSince1970)).json"
            let fileURL = reportsDirectory.appendingPathComponent(filename)
            try encoder.encode(payload).write(to: fileURL, options: .atomic)
            return fileURL
        } catch {
            return nil
        }
    }
}

struct PosePoint: Hashable {
    let x: CGFloat
    let y: CGFloat
    let confidence: Double

    init?(x: CGFloat, y: CGFloat, confidence: Double) {
        guard confidence > 0 else { return nil }
        self.x = x
        self.y = y
        self.confidence = confidence
    }

    init?(_ point: VNRecognizedPoint?) {
        guard let point, point.confidence > 0 else { return nil }
        self.x = point.location.x
        self.y = point.location.y
        self.confidence = Double(point.confidence)
    }
}

private struct PoseSideMetrics {
    let kneeAngle: Double?
    let hipAngle: Double?
    let torsoLeanDegrees: Double?

    init(shoulder: PosePoint?, hip: PosePoint?, knee: PosePoint?, ankle: PosePoint?) {
        kneeAngle = Self.angle(a: hip, vertex: knee, c: ankle)
        hipAngle = Self.angle(a: shoulder, vertex: hip, c: knee)
        torsoLeanDegrees = Self.torsoLean(shoulder: shoulder, hip: hip)
    }

    static func angle(a: PosePoint?, vertex: PosePoint?, c: PosePoint?) -> Double? {
        guard let a, let vertex, let c else { return nil }

        let first = CGVector(dx: a.x - vertex.x, dy: a.y - vertex.y)
        let second = CGVector(dx: c.x - vertex.x, dy: c.y - vertex.y)
        let firstMagnitude = sqrt((first.dx * first.dx) + (first.dy * first.dy))
        let secondMagnitude = sqrt((second.dx * second.dx) + (second.dy * second.dy))
        guard firstMagnitude > 0, secondMagnitude > 0 else { return nil }

        let cosine = max(-1, min(1, ((first.dx * second.dx) + (first.dy * second.dy)) / (firstMagnitude * secondMagnitude)))
        return Double(acos(cosine) * 180 / .pi)
    }

    private static func torsoLean(shoulder: PosePoint?, hip: PosePoint?) -> Double? {
        guard let shoulder, let hip else { return nil }
        let dx = abs(Double(shoulder.x - hip.x))
        let dy = abs(Double(shoulder.y - hip.y))
        guard dy > 0 else { return nil }
        return Double(atan2(dx, dy) * 180 / .pi)
    }
}

private extension CGImagePropertyOrientation {
    init(_ orientation: UIImage.Orientation) {
        switch orientation {
        case .up: self = .up
        case .down: self = .down
        case .left: self = .left
        case .right: self = .right
        case .upMirrored: self = .upMirrored
        case .downMirrored: self = .downMirrored
        case .leftMirrored: self = .leftMirrored
        case .rightMirrored: self = .rightMirrored
        @unknown default: self = .up
        }
    }
}

private extension Array where Element == Double {
    var average: Double? {
        guard !isEmpty else { return nil }
        return reduce(0, +) / Double(count)
    }

    var standardDeviation: Double {
        guard count > 1, let average else { return 0 }
        let variance = reduce(0) { partial, element in
            let diff = element - average
            return partial + (diff * diff)
        } / Double(count)
        return sqrt(variance)
    }
}

private extension Array where Element == String {
    func uniqued() -> [String] {
        var seen = Set<String>()
        return filter { seen.insert($0).inserted }
    }
}
