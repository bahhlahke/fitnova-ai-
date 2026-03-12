//
//  MotionLabView.swift
//  Koda AI
//
//  Form check: 1–3 photos → AI biomechanics analysis. Parity with web /motion.
//

import SwiftUI
import PhotosUI

struct MotionLabView: View {
    @EnvironmentObject var auth: SupabaseService
    @State private var imageDataUrls: [String] = []
    @State private var selectedItems: [PhotosPickerItem] = []
    @State private var showPicker = false
    @State private var showCamera = false
    @State private var showRealtimeScanner = false
    @State private var analyzing = false
    @State private var result: VisionAnalysisResponse?
    @State private var errorMessage: String?
    @State private var selectedPattern: MotionMovementPattern = .squat

    private var api: KodaAPIService {
        KodaAPIService(getAccessToken: { auth.accessToken })
    }

    private var motionAnalysis: MotionAnalysisService {
        MotionAnalysisService(api: api)
    }

    private var analysisCapability: MotionAnalysisCapability {
        motionAnalysis.capability
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                Text("Capture a live photo or choose from your library. We'll analyze your form and suggest corrections.")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)

                VStack(alignment: .leading, spacing: 8) {
                    HStack(spacing: 8) {
                        Image(systemName: analysisCapability.isOnDeviceAvailable ? "iphone.gen3.radiowaves.left.and.right" : "icloud.and.arrow.up")
                            .foregroundStyle(analysisCapability.isOnDeviceAvailable ? Brand.Color.accent : .orange)
                        Text(analysisCapability.isOnDeviceAvailable ? "On-device pose analysis enabled" : "Server fallback mode")
                            .font(.subheadline.weight(.semibold))
                    }

                    Text(analysisCapability.detail)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding()
                .background(Color(.systemGray6))
                .clipShape(RoundedRectangle(cornerRadius: 12))

                VStack(alignment: .leading, spacing: 12) {
                    Picker("Movement", selection: $selectedPattern) {
                        ForEach(MotionMovementPattern.allCases) { pattern in
                            Text(pattern.label).tag(pattern)
                        }
                    }
                    .pickerStyle(.segmented)

                    Text("Realtime Motion Lab")
                        .font(.headline)

                    Text("Run continuous pose tracking, rep counting, live cues, and camera-derived velocity estimates directly on device.")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)

                    Button {
                        showRealtimeScanner = true
                    } label: {
                        Label("Start realtime scan", systemImage: "figure.strengthtraining.traditional")
                            .frame(maxWidth: .infinity)
                            .padding()
                            .background(analysisCapability.supportsRealtime ? Brand.Color.accent : Color(.systemGray5))
                            .foregroundStyle(analysisCapability.supportsRealtime ? .black : .secondary)
                            .clipShape(RoundedRectangle(cornerRadius: 12))
                    }
                    .disabled(!analysisCapability.supportsRealtime)
                }

                // Dual-source capture
                HStack(spacing: 12) {
                    Button {
                        showCamera = true
                    } label: {
                        Label("Live capture", systemImage: "camera.fill")
                            .frame(maxWidth: .infinity)
                            .padding()
                            .background(Brand.Color.accent)
                            .foregroundStyle(.black)
                            .clipShape(RoundedRectangle(cornerRadius: 12))
                    }

                    PhotosPicker(
                        selection: $selectedItems,
                        maxSelectionCount: 3,
                        matching: .images
                    ) {
                        Label(
                            imageDataUrls.isEmpty ? "From library" : "\(imageDataUrls.count) photo(s)",
                            systemImage: "photo.on.rectangle"
                        )
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(Color(.systemGray6))
                        .clipShape(RoundedRectangle(cornerRadius: 12))
                    }
                }
                .onChange(of: selectedItems) { _, newItems in
                    Task {
                        var urls: [String] = []
                        for item in newItems {
                            if let data = try? await item.loadTransferable(type: Data.self) {
                                let base64 = data.base64EncodedString()
                                urls.append("data:image/jpeg;base64,\(base64)")
                            }
                        }
                        await MainActor.run {
                            imageDataUrls = urls
                            result = nil
                        }
                    }
                }

                if let err = errorMessage {
                    Text(err)
                        .font(.caption)
                        .foregroundStyle(.red)
                }

                if let r = result {
                    VStack(alignment: .leading, spacing: 10) {
                        HStack(spacing: 8) {
                            analysisBadge(
                                title: r.analysis_source == "on_device" ? "On device" : "Server",
                                systemImage: r.analysis_source == "on_device" ? "cpu" : "network"
                            )

                            if let frames = r.frames_analyzed {
                                analysisBadge(title: "\(frames) frame\(frames == 1 ? "" : "s")", systemImage: "square.stack.3d.down.right")
                            }

                            if let benchmark = r.benchmark_ms {
                                analysisBadge(title: "\(benchmark) ms", systemImage: "speedometer")
                            }

                            if let pattern = r.movement_pattern {
                                analysisBadge(title: pattern.replacingOccurrences(of: "_", with: " ").capitalized, systemImage: "figure.strengthtraining.traditional")
                            }
                        }

                        if let score = r.score {
                            Text("Form score: \(normalizedScore(score))/100")
                                .font(.headline)
                        }
                        if let c = r.critique, !c.isEmpty {
                            Text("Critique")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                            Text(c)
                                .font(.subheadline)
                        }
                        if let corr = r.correction, !corr.isEmpty {
                            Text("Focus on")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                            Text(corr)
                                .font(.subheadline)
                                .italic()
                        }

                        if let reps = r.rep_count, reps > 0 || r.peak_velocity_mps != nil {
                            HStack(spacing: 12) {
                                if reps > 0 {
                                    analysisBadge(title: "\(reps) reps", systemImage: "repeat")
                                }
                                if let peak = r.peak_velocity_mps {
                                    analysisBadge(title: String(format: "Peak %.2f m/s", peak), systemImage: "gauge.with.dots.needle.33percent")
                                }
                                if let mean = r.mean_velocity_mps {
                                    analysisBadge(title: String(format: "Mean %.2f m/s", mean), systemImage: "speedometer")
                                }
                                if let dropoff = r.velocity_dropoff_percent, dropoff > 0 {
                                    analysisBadge(title: String(format: "Dropoff %.0f%%", dropoff), systemImage: "chart.line.downtrend.xyaxis")
                                }
                            }
                        }

                        if let reportPath = r.benchmark_report_path, !reportPath.isEmpty {
                            Text("Benchmark report saved: \(benchmarkReportLabel(for: reportPath))")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }

                        if let fallback = r.fallback_reason, !fallback.isEmpty {
                            Text(fallback)
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding()
                    .background(Color.accentColor.opacity(0.1))
                    .clipShape(RoundedRectangle(cornerRadius: 12))
                }

                Button(action: analyze) {
                    if analyzing {
                        ProgressView()
                            .tint(.white)
                            .frame(maxWidth: .infinity)
                            .padding()
                    } else {
                        Text("Analyze form")
                            .frame(maxWidth: .infinity)
                            .padding()
                    }
                }
                .disabled(analyzing || imageDataUrls.isEmpty)
                .buttonStyle(.borderedProminent)
            }
            .padding()
        }
        .navigationTitle("Form check")
        .sheet(isPresented: $showCamera) {
            KodaCameraView(onCapture: { image in
                if let data = image.jpegData(compressionQuality: 0.8) {
                    let base64 = data.base64EncodedString()
                    imageDataUrls.append("data:image/jpeg;base64,\(base64)")
                    result = nil
                }
            })
            .ignoresSafeArea()
        }
        .sheet(isPresented: $showRealtimeScanner) {
            RealtimeMotionLabSessionView(
                capability: analysisCapability,
                configuration: MotionSessionConfiguration(pattern: selectedPattern),
                onComplete: { summary in
                    result = summary.response
                    Task {
                        await Telemetry.track("ios_cv_realtime_session_completed", props: realtimeTelemetry(for: summary))
                    }
                }
            )
            .ignoresSafeArea()
        }
    }

    private func analyze() {
        guard !imageDataUrls.isEmpty else { return }
        errorMessage = nil
        result = nil
        analyzing = true
        Task {
            do {
                let res = try await motionAnalysis.analyze(images: imageDataUrls, configuration: MotionSessionConfiguration(pattern: selectedPattern))
                await Telemetry.track("ios_cv_analysis_completed", props: analysisTelemetry(for: res))
                await MainActor.run {
                    result = res
                    analyzing = false
                }
            } catch {
                await Telemetry.track("ios_cv_analysis_failed", props: [
                    "requested_frames": imageDataUrls.count,
                    "error": (error as? LocalizedError)?.errorDescription ?? error.localizedDescription,
                ])
                await MainActor.run {
                    errorMessage = (error as? LocalizedError)?.errorDescription ?? error.localizedDescription
                    analyzing = false
                }
            }
        }
    }

    private func normalizedScore(_ score: Double) -> Int {
        if score <= 1 {
            return Int((score * 100).rounded())
        }
        return Int(score.rounded())
    }

    private func analysisTelemetry(for response: VisionAnalysisResponse) -> [String: Any] {
        var props: [String: Any] = [
            "requested_frames": imageDataUrls.count,
            "source": response.analysis_source ?? "unknown",
            "mode": response.analysis_mode ?? "unknown",
        ]
        if let benchmark = response.benchmark_ms { props["benchmark_ms"] = benchmark }
        if let frames = response.frames_analyzed { props["frames_analyzed"] = frames }
        if let confidence = response.pose_confidence { props["pose_confidence"] = confidence }
        if let fallback = response.fallback_reason, !fallback.isEmpty { props["fallback_reason"] = fallback }
        if let pattern = response.movement_pattern { props["movement_pattern"] = pattern }
        if let reps = response.rep_count { props["rep_count"] = reps }
        if let peak = response.peak_velocity_mps { props["peak_velocity_mps"] = peak }
        if let mean = response.mean_velocity_mps { props["mean_velocity_mps"] = mean }
        if let dropoff = response.velocity_dropoff_percent { props["velocity_dropoff_percent"] = dropoff }
        if let reportPath = response.benchmark_report_path { props["benchmark_report_path"] = reportPath }
        return props
    }

    private func realtimeTelemetry(for summary: RealtimeMotionSessionSummary) -> [String: Any] {
        var props = analysisTelemetry(for: summary.response)
        props["average_fps"] = summary.benchmark.averageFPS
        props["latency_p50_ms"] = summary.benchmark.p50LatencyMs
        props["latency_p95_ms"] = summary.benchmark.p95LatencyMs
        props["processed_frames"] = summary.benchmark.processedFrames
        props["dropped_frames"] = summary.benchmark.droppedFrames
        return props
    }

    @ViewBuilder
    private func analysisBadge(title: String, systemImage: String) -> some View {
        Label(title, systemImage: systemImage)
            .font(.caption.weight(.medium))
            .padding(.horizontal, 10)
            .padding(.vertical, 6)
            .background(Color.black.opacity(0.06))
            .clipShape(Capsule())
    }

    private func benchmarkReportLabel(for path: String) -> String {
        URL(fileURLWithPath: path).lastPathComponent
    }
}
