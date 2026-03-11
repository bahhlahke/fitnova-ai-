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
    @State private var analyzing = false
    @State private var result: VisionAnalysisResponse?
    @State private var errorMessage: String?

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
    }

    private func analyze() {
        guard !imageDataUrls.isEmpty else { return }
        errorMessage = nil
        result = nil
        analyzing = true
        Task {
            do {
                let res = try await motionAnalysis.analyze(images: imageDataUrls)
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
}
