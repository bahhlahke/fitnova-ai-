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
    @State private var showPricing = false
    @State private var analyzing = false
    @State private var result: VisionAnalysisResponse?
    @State private var errorMessage: String?
    @State private var selectedPattern: MotionMovementPattern = .squat
    @State private var isPro = false
    @State private var trialUsedThisMonth = false
    @State private var profileLoading = true

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
                PremiumHeroCard(
                    title: "Motion Lab turns your phone into a live form coach.",
                    subtitle: "Scan reps in real time, get instant technique cues, and review camera-derived velocity trends without leaving the workout flow.",
                    eyebrow: "Motion Lab"
                ) {
                    HStack(spacing: 10) {
                        PremiumMetricPill(label: "Realtime", value: "Live cues")
                        PremiumMetricPill(label: "Patterns", value: "4 lifts")
                        PremiumMetricPill(label: "Source", value: analysisCapability.isOnDeviceAvailable ? "On-device" : "Fallback")
                    }
                }

                PremiumRowCard {
                    VStack(alignment: .leading, spacing: 14) {
                        Text("Best results")
                            .font(.headline)
                            .foregroundStyle(.white)

                        ForEach(selectedPatternTips, id: \.self) { tip in
                            HStack(alignment: .top, spacing: 10) {
                                Image(systemName: "bolt.badge.checkmark")
                                    .foregroundStyle(Brand.Color.accent)
                                Text(tip)
                                    .font(.subheadline)
                                    .foregroundStyle(Brand.Color.muted)
                            }
                        }

                        NavigationLink {
                            PricingView()
                        } label: {
                            HStack {
                                Text("See why athletes upgrade for Motion Lab")
                                Spacer()
                                Image(systemName: "arrow.up.right")
                            }
                        }
                        .buttonStyle(PremiumActionButtonStyle(filled: false))
                    }
                }

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
                        if isPro || !trialUsedThisMonth {
                            showRealtimeScanner = true
                            if !isPro {
                                markTrialUsed()
                            }
                        } else {
                            showPricing = true
                        }
                    } label: {
                        VStack(spacing: 4) {
                            Label(isPro || !trialUsedThisMonth ? "Start \(selectedPattern.label.lowercased()) scan" : "Trial session used", systemImage: "figure.strengthtraining.traditional")
                                .frame(maxWidth: .infinity)
                                .padding()
                                .background(analysisCapability.supportsRealtime ? Brand.Color.accent : Color(.systemGray5))
                                .foregroundStyle(analysisCapability.supportsRealtime ? .black : .secondary)
                                .clipShape(RoundedRectangle(cornerRadius: 12))
                            
                            if !isPro && !trialUsedThisMonth {
                                Text("1 free trial session available this month")
                                    .font(.caption2.bold())
                                    .foregroundStyle(Brand.Color.accent)
                            }
                        }
                    }
                    .disabled(!analysisCapability.supportsRealtime)

                    if profileLoading {
                        ProgressView("Checking Motion Lab access...")
                            .font(.caption)
                            .tint(Brand.Color.accent)
                    } else if !isPro {
                        PremiumRowCard {
                            VStack(alignment: .leading, spacing: 12) {
                                HStack {
                                    VStack(alignment: .leading, spacing: 4) {
                                        Text(trialUsedThisMonth ? "Upgrade for unlimited live scans" : "Use your free scan, then keep coaching live")
                                            .font(.headline)
                                            .foregroundStyle(.white)
                                        Text(trialUsedThisMonth ? "Your monthly trial session is used. Pro keeps Motion Lab available whenever the workout calls for it." : "You have one free realtime Motion Lab session this month. Pro removes the cap and keeps the live coaching loop open.")
                                            .font(.subheadline)
                                            .foregroundStyle(Brand.Color.muted)
                                    }
                                    Spacer()
                                    Image(systemName: trialUsedThisMonth ? "crown.fill" : "sparkles")
                                        .foregroundStyle(Brand.Color.accent)
                                }

                                HStack(spacing: 10) {
                                    PremiumMetricPill(label: "Trial", value: trialUsedThisMonth ? "Used" : "Available")
                                    PremiumMetricPill(label: "Live", value: "Unlimited")
                                    PremiumMetricPill(label: "Value", value: "Realtime cues")
                                }

                                Button {
                                    showPricing = true
                                } label: {
                                    Text(trialUsedThisMonth ? "Upgrade to Pro" : "See Pro benefits")
                                        .frame(maxWidth: .infinity)
                                }
                                .buttonStyle(PremiumActionButtonStyle(filled: true))
                            }
                        }
                    }
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

                    if !isPro {
                        PremiumRowCard {
                            VStack(alignment: .leading, spacing: 12) {
                                Text("Turn every set into a coached session")
                                    .font(.headline)
                                    .foregroundStyle(.white)
                                Text("Pro unlocks unlimited realtime scans, so the next cue and the next rep are always one tap away.")
                                    .font(.subheadline)
                                    .foregroundStyle(Brand.Color.muted)

                                HStack(spacing: 10) {
                                    PremiumMetricPill(label: "Scans", value: "Unlimited")
                                    PremiumMetricPill(label: "Cues", value: "Live")
                                    PremiumMetricPill(label: "Velocity", value: "Tracked")
                                }

                                Button {
                                    showPricing = true
                                } label: {
                                    Text("Upgrade from Motion Lab")
                                        .frame(maxWidth: .infinity)
                                }
                                .buttonStyle(PremiumActionButtonStyle(filled: true))
                            }
                        }
                    }
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
                        await Telemetry.track(.cvRealtimeSessionCompleted, props: realtimeTelemetry(for: summary))
                    }
                }
            )
            .ignoresSafeArea()
        }
        .sheet(isPresented: $showPricing) {
            PricingView()
        }
        .task {
            await checkProStatus()
            checkTrialStatus()
        }
    }

    private var dataService: KodaDataService? {
        guard let uid = auth.currentUserId else { return nil }
        return KodaDataService(client: auth.supabaseClient, userId: uid)
    }

    private func checkProStatus() async {
        profileLoading = true
        if let profile = try? await dataService?.fetchProfile() {
            isPro = profile.subscription_status?.lowercased() == "pro" || profile.role?.lowercased() == "admin"
        }
        profileLoading = false
    }

    private func checkTrialStatus() {
        let lastTrialMonth = UserDefaults.standard.string(forKey: "motion_lab_last_trial_month")
        let currentMonth = currentMonthString()
        trialUsedThisMonth = lastTrialMonth == currentMonth
    }

    private func markTrialUsed() {
        let currentMonth = currentMonthString()
        UserDefaults.standard.set(currentMonth, forKey: "motion_lab_last_trial_month")
        trialUsedThisMonth = true
    }

    private func currentMonthString() -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM"
        return formatter.string(from: Date())
    }

    private func analyze() {
        guard !imageDataUrls.isEmpty else { return }
        errorMessage = nil
        result = nil
        analyzing = true
        Task {
            do {
                let res = try await motionAnalysis.analyze(images: imageDataUrls, configuration: MotionSessionConfiguration(pattern: selectedPattern))
                await Telemetry.track(.cvAnalysisCompleted, props: analysisTelemetry(for: res))
                await MainActor.run {
                    result = res
                    analyzing = false
                }
            } catch {
                await Telemetry.track(.cvAnalysisFailed, props: [
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

    private var selectedPatternTips: [String] {
        switch selectedPattern {
        case .squat:
            return [
                "Set the phone to a side angle and keep your whole body in frame.",
                "Use the realtime scan when you want rep counting and live cues.",
                "Photo checks work best when the bottom and lockout positions are visible."
            ]
        case .hinge:
            return [
                "A side angle gives the cleanest read on hip travel and torso shape.",
                "Pause at lockout between reps so the velocity trend is easier to compare.",
                "Keep the bar path and shoulders visible for the strongest cue quality."
            ]
        case .press:
            return [
                "Leave enough headroom for overhead lockout.",
                "Show wrists, elbows, and torso from the side for cleaner lockout cues.",
                "Use the live scan when you want immediate feedback on finish position."
            ]
        case .pull:
            return [
                "Use a slight side-front angle so the elbow path stays visible.",
                "Show the full hang and top contraction on every rep.",
                "The live scan is best when you want cueing on contraction quality."
            ]
        }
    }
}
