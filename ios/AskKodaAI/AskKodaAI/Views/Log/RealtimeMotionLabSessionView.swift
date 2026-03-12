//
//  RealtimeMotionLabSessionView.swift
//  Koda AI
//
//  Reusable live Motion Lab session with local pose tracking, rep counting,
//  overlay rendering, and benchmark-aware session summaries.
//

import SwiftUI
import Combine
import CoreMedia

struct RealtimeMotionLabSessionView: View {
    let capability: MotionAnalysisCapability
    let configuration: MotionSessionConfiguration
    let title: String
    let subtitle: String
    let onComplete: (RealtimeMotionSessionSummary) -> Void

    @Environment(\.dismiss) private var dismiss
    @StateObject private var cameraSession = CameraCaptureSession()
    @StateObject private var controller = RealtimeMotionLabController()

    init(
        capability: MotionAnalysisCapability,
        configuration: MotionSessionConfiguration = .default,
        title: String = "Realtime Motion Lab",
        subtitle: String = "Continuous on-device pose tracking, rep counting, and live technique cues.",
        onComplete: @escaping (RealtimeMotionSessionSummary) -> Void
    ) {
        self.capability = capability
        self.configuration = configuration
        self.title = title
        self.subtitle = subtitle
        self.onComplete = onComplete
    }

    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()

            if capability.supportsRealtime {
                CameraPreviewLayer(cameraSession: cameraSession)
                    .ignoresSafeArea()
                    .overlay {
                        GeometryReader { geometry in
                            MotionSkeletonOverlay(snapshot: controller.snapshot, size: geometry.size)
                        }
                    }

                LinearGradient(
                    colors: [Color.black.opacity(0.74), Color.clear, Color.black.opacity(0.88)],
                    startPoint: .top,
                    endPoint: .bottom
                )
                .ignoresSafeArea()

                VStack(spacing: 18) {
                    HStack(alignment: .top) {
                        Button {
                            dismiss()
                        } label: {
                            Image(systemName: "xmark")
                                .font(.title3.weight(.bold))
                                .foregroundStyle(.white)
                                .padding(14)
                                .background(Color.black.opacity(0.45))
                                .clipShape(Circle())
                        }

                        VStack(alignment: .leading, spacing: 6) {
                            Text(title)
                                .font(.headline.weight(.bold))
                                .foregroundStyle(.white)
                            Text(subtitle)
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }

                        Spacer()

                        Text(controller.snapshot.trackingStatus.uppercased())
                            .font(.system(size: 11, weight: .bold, design: .monospaced))
                            .padding(.horizontal, 14)
                            .padding(.vertical, 8)
                            .background(Color.black.opacity(0.45))
                            .clipShape(Capsule())
                    }
                    .padding(.horizontal, 20)
                    .padding(.top, 12)

                    HStack(spacing: 12) {
                        liveMetric(title: "REPS", value: "\(controller.snapshot.repCount)")
                        liveMetric(title: "PHASE", value: controller.snapshot.phase.label.uppercased())
                        liveMetric(title: "FPS", value: "\(Int(controller.snapshot.fps.rounded()))")
                        liveMetric(title: "VEL", value: String(format: "%.2f", controller.snapshot.currentVelocityMps))
                    }
                    .padding(.horizontal, 20)

                    Spacer()

                    VStack(alignment: .leading, spacing: 10) {
                        HStack {
                            Text("Live Cue")
                                .font(.caption.weight(.bold))
                                .foregroundStyle(.secondary)
                            Spacer()
                            Text("\(controller.snapshot.score)/100")
                                .font(.headline.weight(.bold))
                                .foregroundStyle(Brand.Color.accent)
                        }

                        Text(controller.snapshot.cue)
                            .font(.headline)
                            .foregroundStyle(.white)

                        HStack(spacing: 14) {
                            Text("Confidence \(Int((controller.snapshot.poseConfidence * 100).rounded()))%")
                            Text("\(controller.snapshot.pattern.label) \(Int(controller.snapshot.primaryMetric.rounded()))")
                            Text("Torso \(Int(controller.snapshot.torsoLeanDegrees.rounded()))°")
                            Text("Peak \(String(format: "%.2f", controller.snapshot.peakVelocityMps)) m/s")
                        }
                        .font(.caption)
                        .foregroundStyle(.secondary)

                        Button {
                            if let summary = controller.finish() {
                                onComplete(summary)
                            }
                            dismiss()
                        } label: {
                            Text("Finish session")
                                .frame(maxWidth: .infinity)
                                .padding()
                                .background(Brand.Color.accent)
                                .foregroundStyle(.black)
                                .clipShape(RoundedRectangle(cornerRadius: 14))
                        }
                    }
                    .padding(20)
                    .background(Color.black.opacity(0.6))
                    .clipShape(RoundedRectangle(cornerRadius: 20))
                    .padding(.horizontal, 20)
                    .padding(.bottom, 26)
                }
            } else {
                VStack(spacing: 18) {
                    Text("Realtime Motion Lab unavailable")
                        .font(.title2.bold())
                        .foregroundStyle(.white)
                    Text(capability.detail)
                        .multilineTextAlignment(.center)
                        .foregroundStyle(.secondary)
                    Button("Close") {
                        dismiss()
                    }
                    .buttonStyle(.borderedProminent)
                }
                .padding(28)
            }
        }
        .task {
            guard capability.supportsRealtime else { return }
            controller.attach(to: cameraSession, configuration: configuration)
            await cameraSession.startSession(enableVideoFrames: true)
        }
        .onDisappear {
            cameraSession.setVideoFrameHandler(nil)
            cameraSession.stopSession()
        }
    }

    private func liveMetric(title: String, value: String) -> some View {
        VStack(spacing: 4) {
            Text(title)
                .font(.system(size: 10, weight: .bold, design: .monospaced))
                .foregroundStyle(.secondary)
            Text(value)
                .font(.system(size: 18, weight: .black, design: .rounded))
                .foregroundStyle(.white)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 12)
        .background(Color.black.opacity(0.45))
        .clipShape(RoundedRectangle(cornerRadius: 16))
    }
}

@MainActor
final class RealtimeMotionLabController: ObservableObject {
    @Published var snapshot = LiveMotionSnapshot(
        pattern: .squat,
        repCount: 0,
        phase: .setup,
        cue: "Brace, stay side-on to the camera, and start the rep.",
        score: 0,
        fps: 0,
        latencyMs: 0,
        poseConfidence: 0,
        torsoLeanDegrees: 0,
        primaryMetric: 0,
        currentVelocityMps: 0,
        peakVelocityMps: 0,
        meanVelocityMps: 0,
        segments: [],
        trackingStatus: "Waiting for pose"
    )

    private var analyzerBox = RealtimeAnalyzerBox(configuration: .default)

    func attach(to cameraSession: CameraCaptureSession, configuration: MotionSessionConfiguration) {
        analyzerBox = RealtimeAnalyzerBox(configuration: configuration)
        cameraSession.setVideoFrameHandler { [weak self] sampleBuffer in
            guard let self, let update = analyzerBox.process(sampleBuffer: sampleBuffer) else { return }
            DispatchQueue.main.async {
                self.snapshot = update
            }
        }
    }

    func finish() -> RealtimeMotionSessionSummary? {
        analyzerBox.finish()
    }
}

private final class RealtimeAnalyzerBox {
    private let lock = NSLock()
    private let analyzer: LivePoseStreamAnalyzer

    init(configuration: MotionSessionConfiguration) {
        analyzer = LivePoseStreamAnalyzer(configuration: configuration)
    }

    func process(sampleBuffer: CMSampleBuffer) -> LiveMotionSnapshot? {
        lock.lock()
        defer { lock.unlock() }
        return analyzer.process(sampleBuffer: sampleBuffer)
    }

    func finish() -> RealtimeMotionSessionSummary? {
        lock.lock()
        defer { lock.unlock() }
        return analyzer.currentSummaryResponse()
    }
}

struct MotionSkeletonOverlay: View {
    let snapshot: LiveMotionSnapshot
    let size: CGSize

    var body: some View {
        Canvas { context, _ in
            guard !snapshot.segments.isEmpty else { return }

            let color: Color = snapshot.poseConfidence >= 0.72 ? Brand.Color.accent : .orange
            for segment in snapshot.segments {
                var path = Path()
                path.move(to: point(for: segment.start))
                path.addLine(to: point(for: segment.end))
                context.stroke(path, with: .color(color.opacity(0.9)), lineWidth: 4)
            }
        }
    }

    private func point(for posePoint: PosePoint) -> CGPoint {
        CGPoint(
            x: posePoint.x * size.width,
            y: (1 - posePoint.y) * size.height
        )
    }
}
