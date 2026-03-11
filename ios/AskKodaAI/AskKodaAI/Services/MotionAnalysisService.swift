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

    func analyze(images: [String]) async throws -> VisionAnalysisResponse {
        let capability = onDeviceAnalyzer.capability
        guard capability.isOnDeviceAvailable else {
            return try await fallbackResponse(
                images: images,
                mode: "remote_vision_fallback",
                fallbackReason: capability.detail
            )
        }

        do {
            return try await onDeviceAnalyzer.analyze(dataURLs: images)
        } catch {
            return try await fallbackResponse(
                images: images,
                mode: "remote_vision_fallback",
                fallbackReason: (error as? LocalizedError)?.errorDescription ?? error.localizedDescription
            )
        }
    }

    private func fallbackResponse(images: [String], mode: String, fallbackReason: String?) async throws -> VisionAnalysisResponse {
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
            fallback_reason: fallbackReason ?? response.fallback_reason
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

    func analyze(dataURLs: [String]) async throws -> VisionAnalysisResponse {
        let start = Date()
        let decodedImages = dataURLs.compactMap(Self.decodeImage(from:))

        guard !decodedImages.isEmpty else {
            throw dataURLs.isEmpty ? MotionAnalysisError.noUsableImages : MotionAnalysisError.invalidImagePayload
        }

        let frames = try decodedImages.compactMap(analyzeFrame)
        guard !frames.isEmpty else {
            throw MotionAnalysisError.poseNotDetected
        }

        let summary = OnDeviceMotionAnalyzer.summarize(frames: frames)
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
            fallback_reason: nil
        )
    }

    private func analyzeFrame(_ image: UIImage) throws -> PoseFrame? {
        try estimator.estimatePose(in: image)
    }

    static func summarize(frames: [PoseFrame]) -> PoseSummary {
        let poseConfidence = frames.map(\.poseConfidence).average ?? 0
        let avgKneeAngle = frames.compactMap(\.averageKneeAngle).average ?? 150
        let avgHipAngle = frames.compactMap(\.averageHipAngle).average ?? 95
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

        if avgDepthDelta <= 0.08 || avgKneeAngle <= 115 {
            positives.append("depth looked consistent through the available frames")
            score += 4
        } else if avgDepthDelta > 0.16 || avgKneeAngle > 145 {
            corrections.append("sit slightly deeper before driving back up")
            score -= 12
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

        if avgHipAngle < 58 {
            corrections.append("brace harder through the bottom so the hips do not collapse")
            score -= 6
        }

        score -= consistencyPenalty
        let boundedScore = min(96, max(48, score))

        let critiqueLead = positives.isEmpty ? "On-device pose analysis completed." : "On-device pose analysis found that " + positives.joined(separator: ", ") + "."
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

        let trackedPoints = landmarks.allPoints
        poseConfidence = trackedPoints.map(\.confidence).average ?? 0
        averageKneeAngle = [leftSide.kneeAngle, rightSide.kneeAngle].compactMap { $0 }.average
        averageHipAngle = [leftSide.hipAngle, rightSide.hipAngle].compactMap { $0 }.average
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
    let repCount: Int
    let phase: MotionPhase
    let cue: String
    let score: Int
    let fps: Double
    let latencyMs: Int
    let poseConfidence: Double
    let torsoLeanDegrees: Double
    let kneeAngle: Double
    let segments: [PoseSegment]
    let trackingStatus: String
}

struct MotionBenchmarkReport {
    let averageFPS: Double
    let p50LatencyMs: Int
    let p95LatencyMs: Int
    let processedFrames: Int
    let droppedFrames: Int
}

struct RealtimeMotionSessionSummary {
    let response: VisionAnalysisResponse
    let benchmark: MotionBenchmarkReport
}

final class RealtimeMotionSessionEngine {
    private var currentPhase: MotionPhase = .setup
    private var repCount = 0
    private var lastKneeAngle: Double?
    private var sessionStart: TimeInterval?
    private var processedFrames = 0
    private var lastCueTimestamp: TimeInterval = 0
    private var recentFrames: [PoseFrame] = []
    private let cueCooldown: TimeInterval = 0.9
    private let maxRecentFrames = 45
    private let squatBottomThreshold = 118.0
    private let lockoutThreshold = 162.0

    func process(frame: PoseFrame, timestamp: TimeInterval, latencyMs: Int) -> LiveMotionSnapshot {
        if sessionStart == nil {
            sessionStart = timestamp
        }

        processedFrames += 1
        recentFrames.append(frame)
        if recentFrames.count > maxRecentFrames {
            recentFrames.removeFirst(recentFrames.count - maxRecentFrames)
        }

        let kneeAngle = frame.averageKneeAngle ?? 180
        let torsoLean = frame.torsoLeanDegrees ?? 0
        let previousKnee = lastKneeAngle ?? kneeAngle
        let delta = kneeAngle - previousKnee
        lastKneeAngle = kneeAngle

        switch currentPhase {
        case .setup, .lockout:
            if kneeAngle < lockoutThreshold && delta < -2 {
                currentPhase = .eccentric
            }
        case .eccentric:
            if kneeAngle <= squatBottomThreshold {
                currentPhase = .bottom
            } else if kneeAngle >= lockoutThreshold {
                currentPhase = .lockout
            }
        case .bottom:
            if delta > 2 {
                currentPhase = .concentric
            }
        case .concentric:
            if kneeAngle >= lockoutThreshold {
                currentPhase = .lockout
                repCount += 1
            }
        }

        let summary = OnDeviceMotionAnalyzer.summarize(frames: recentFrames)
        let fps: Double = {
            guard let sessionStart else { return 0 }
            let elapsed = max(0.001, timestamp - sessionStart)
            return Double(processedFrames) / elapsed
        }()

        let cue = nextCue(frame: frame, timestamp: timestamp)
        return LiveMotionSnapshot(
            repCount: repCount,
            phase: currentPhase,
            cue: cue,
            score: Int(summary.score.rounded()),
            fps: fps,
            latencyMs: latencyMs,
            poseConfidence: frame.poseConfidence,
            torsoLeanDegrees: torsoLean,
            kneeAngle: kneeAngle,
            segments: frame.landmarks.segments,
            trackingStatus: trackingStatus(for: frame)
        )
    }

    func currentSummaryResponse(benchmarkMs: Int?) -> VisionAnalysisResponse? {
        guard !recentFrames.isEmpty else { return nil }
        let summary = OnDeviceMotionAnalyzer.summarize(frames: recentFrames)
        return VisionAnalysisResponse(
            score: summary.score,
            critique: summary.critique,
            correction: summary.correction,
            analysis_source: "on_device",
            analysis_mode: "on_device_pose_realtime",
            benchmark_ms: benchmarkMs,
            frames_analyzed: recentFrames.count,
            pose_confidence: summary.poseConfidence,
            fallback_reason: nil
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

        if timestamp - lastCueTimestamp < cueCooldown {
            return passiveCue(for: frame)
        }

        if let torsoLean = frame.torsoLeanDegrees, torsoLean > 42 {
            lastCueTimestamp = timestamp
            return "Chest up. Keep the rib cage stacked over the hips."
        }

        if let shoulderTilt = frame.shoulderTilt, let hipTilt = frame.hipTilt,
           shoulderTilt > 0.05 || hipTilt > 0.05 {
            lastCueTimestamp = timestamp
            return "Square the shoulders and hips before the next rep."
        }

        if currentPhase == .bottom, let kneeAngle = frame.averageKneeAngle, kneeAngle > 135 {
            lastCueTimestamp = timestamp
            return "Sit deeper before driving up."
        }

        if currentPhase == .lockout && repCount > 0 {
            lastCueTimestamp = timestamp
            return "Rep \(repCount) counted. Reset, brace, and go again."
        }

        return passiveCue(for: frame)
    }

    private func passiveCue(for frame: PoseFrame) -> String {
        if currentPhase == .setup {
            return "Brace, stay side-on to the camera, and start the rep."
        }

        if currentPhase == .eccentric {
            return "Control the descent and keep pressure through mid-foot."
        }

        if currentPhase == .bottom {
            return "Hold shape at the bottom, then drive straight up."
        }

        if currentPhase == .concentric {
            return "Lead with the chest and finish the rep tall."
        }

        if frame.poseConfidence >= 0.72 {
            return "Tracking stable. Keep the same camera angle."
        }

        return "Stay centered in frame for a cleaner read."
    }
}

final class LivePoseStreamAnalyzer {
    private let capability: MotionAnalysisCapability
    private let engine = RealtimeMotionSessionEngine()
    private let estimator: PoseEstimating
    private var smoother = PoseSmoother()
    private var benchmarkHarness = MotionBenchmarkHarness()
    private var lastProcessedTimestamp: TimeInterval = 0
    private let minFrameInterval: TimeInterval = 1.0 / 18.0
    private let videoOrientation: CGImagePropertyOrientation

    init(
        capability: MotionAnalysisCapability = .current(),
        estimator: PoseEstimating = VisionPoseEstimator(),
        videoOrientation: CGImagePropertyOrientation = .right
    ) {
        self.capability = capability
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
        let report = benchmarkHarness.report()
        guard let response = engine.currentSummaryResponse(benchmarkMs: report?.p95LatencyMs) else {
            return nil
        }

        return RealtimeMotionSessionSummary(
            response: response,
            benchmark: report ?? MotionBenchmarkReport(
                averageFPS: 0,
                p50LatencyMs: 0,
                p95LatencyMs: 0,
                processedFrames: 0,
                droppedFrames: 0
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
            droppedFrames: droppedFrames
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

    private static func angle(a: PosePoint?, vertex: PosePoint?, c: PosePoint?) -> Double? {
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
