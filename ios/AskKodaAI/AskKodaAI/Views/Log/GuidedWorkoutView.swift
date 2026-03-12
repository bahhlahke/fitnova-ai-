//
//  GuidedWorkoutView.swift
//  Koda AI
//
//  Guided workout from today's plan: exercises → sets → rest → save. Optional swap exercise.
//

import SwiftUI
import Supabase
import Realtime
import PhotosUI

struct GuidedWorkoutView: View {
    @EnvironmentObject var auth: SupabaseService
    @Environment(\.dismiss) var dismiss
    @StateObject private var healthKit = HealthKitService.shared
    let initialExercises: [PlanExercise]
    let initialTrainingPlan: TrainingPlan?
    @State private var exercises: [PlanExercise] = []
    @State private var sessionFocus: String?
    @State private var sessionDurationMinutes: Int?
    @State private var sessionRationale: String?

    init(exercises: [PlanExercise] = [], trainingPlan: TrainingPlan? = nil) {
        let normalized = Self.normalizedTrainingPlan(trainingPlan)
        self.initialExercises = normalized?.exercises ?? exercises
        self.initialTrainingPlan = normalized
    }
    @State private var exerciseIndex = 0
    @State private var setIndex = 0
    @State private var phase: Phase = .loading
    @State private var restRemaining = 0
    @State private var errorMessage: String?
    @State private var saved = false
    @State private var postWorkoutInsight: String?
    @State private var insightLoading = false

    // Neural Mastery State (Phase 5)
    @State private var neuralRestMode = true
    @State private var recoveryTarget = 110
    /// Simulated HR used only when HealthKit streaming is unavailable.
    @State private var simulatedHeartRate = 148
    /// Active rest timer task — stored so it can be cancelled on manual skip.
    @State private var restTimerTask: Task<Void, Never>?
    @State private var isFormCheckActive = false
    @State private var showRealtimeFormCheck = false
    @State private var formCheckLoading = false
    @State private var formCheckResult: VisionAnalysisResponse?
    @State private var capturedPhotos: [String] = [] // Base64 strings for simplicity in this flow
    @State private var selectedItems: [PhotosPickerItem] = []

    // AI Override State
    @State private var isSwapOptionsVisible = false
    @State private var swapInput = ""
    @State private var swapLoading = false
    @State private var swapFeedback: String?

    // Logging State
    struct LoggedSet: Codable { var weight: Double?; var reps: Int? }
    // Array of sets per exercise index
    @State private var loggedSets: [[LoggedSet]] = []
    @State private var currentWeightInput: String = ""
    @State private var currentRepsInput: String = ""
    // Stable log ID generated once per session — used for optimistic mid-session upserts.
    private let sessionLogId = UUID().uuidString

    // Resolved CDN demo video URL for the current exercise (nil until fetched).
    @State private var resolvedDemoURL: URL?

    // Exercise intro: set when transitioning to a new exercise after rest
    @State private var isNewExerciseAfterRest = false

    // Pulse state
    @State private var showingPulseAnimation = false
    @State private var pulseMessage = ""
    @State private var pulseScale = 0.8
    @State private var pulseOpacity = 0.0

    @State private var coachAudio = CoachAudioService.shared

    private let restSeconds = 90
    private var api: KodaAPIService { KodaAPIService(getAccessToken: { auth.accessToken }) }
    private var motionAnalysis: MotionAnalysisService { MotionAnalysisService(api: api) }
    private var dataService: KodaDataService? {
        guard let uid = auth.currentUserId else { return nil }
        return KodaDataService(client: auth.supabaseClient, userId: uid)
    }

    private static func normalizedTrainingPlan(_ plan: TrainingPlan?) -> TrainingPlan? {
        guard let plan else { return nil }
        guard shouldReplaceWithRecoveryPlan(plan) else { return plan }

        let duration = plan.duration_minutes ?? 25
        return TrainingPlan(
            focus: "Recovery and movement quality",
            duration_minutes: duration,
            exercises: recoveryExercises(for: duration)
        )
    }

    private static func shouldReplaceWithRecoveryPlan(_ plan: TrainingPlan) -> Bool {
        let focus = (plan.focus ?? "").lowercased()
        let isRecoveryFocus =
            focus.contains("recovery") ||
            focus.contains("mobility") ||
            focus.contains("movement quality") ||
            focus.contains("stress-relief")

        guard isRecoveryFocus else { return false }

        let exerciseText = (plan.exercises ?? [])
            .compactMap(\.name)
            .map { $0.lowercased() }
            .joined(separator: " ")
        let strengthSignals = [
            "bench",
            "squat",
            "deadlift",
            "press",
            "row",
            "pull",
            "lunge",
            "hinge",
            "hypertrophy",
            "strength",
        ]

        return strengthSignals.contains { exerciseText.contains($0) }
    }

    private static func recoveryExercises(for duration: Int) -> [PlanExercise] {
        let finisherMinutes = max(6, min(12, duration / 3))
        return [
            PlanExercise(
                name: "90/90 Breathing",
                sets: 3,
                reps: "5 breaths",
                intensity: "Easy",
                notes: "Feet elevated, ribs down, and full exhales on every rep.",
                tempo: "Slow",
                breathing: "Full nasal inhale, long controlled exhale",
                intent: "Shift into recovery mode",
                rationale: "Down-regulates tension and restores recovery posture.",
                target_rir: nil,
                target_load_kg: nil,
                video_url: nil,
                cinema_video_url: nil,
                image_url: nil
            ),
            PlanExercise(
                name: "Cat-Cow",
                sets: 2,
                reps: "8",
                intensity: "Fluid",
                notes: "Move segment by segment instead of rushing through the range.",
                tempo: "Controlled",
                breathing: "Inhale into extension, exhale into flexion",
                intent: "Restore spinal motion",
                rationale: "Opens the trunk without heavy axial loading.",
                target_rir: nil,
                target_load_kg: nil,
                video_url: nil,
                cinema_video_url: nil,
                image_url: nil
            ),
            PlanExercise(
                name: "90/90 Hip Switches",
                sets: 2,
                reps: "8/side",
                intensity: "Controlled",
                notes: "Stay tall and let the hips do the work.",
                tempo: "2111",
                breathing: "Exhale into end range",
                intent: "Open hips and reduce stiffness",
                rationale: "Restores hip rotation and movement quality.",
                target_rir: nil,
                target_load_kg: nil,
                video_url: nil,
                cinema_video_url: nil,
                image_url: nil
            ),
            PlanExercise(
                name: "Pigeon Stretch",
                sets: 2,
                reps: "45s/side",
                intensity: "Easy-moderate",
                notes: "Stay square through the hips and ease into the position.",
                tempo: "Hold",
                breathing: "Slow nasal breathing",
                intent: "Reduce hip and glute tension",
                rationale: "Supports low-intensity mobility and tissue recovery.",
                target_rir: nil,
                target_load_kg: nil,
                video_url: nil,
                cinema_video_url: nil,
                image_url: nil
            ),
            PlanExercise(
                name: "Zone 2 Finisher",
                sets: 1,
                reps: "\(finisherMinutes) min",
                intensity: "Easy",
                notes: "Walk, bike, or row at a conversational pace.",
                tempo: "Steady",
                breathing: "Nasal, conversational",
                intent: "Facilitate recovery",
                rationale: "Keeps the session executable while staying aligned with a recovery day.",
                target_rir: nil,
                target_load_kg: nil,
                video_url: nil,
                cinema_video_url: nil,
                image_url: nil
            ),
        ]
    }

    enum Phase { case loading, overview, exerciseIntro, work, rest, completed }

    var body: some View {
        Group {
            switch phase {
            case .loading:
                ProgressView("Loading plan…")
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            case .overview:
                overviewView
            case .exerciseIntro:
                exerciseIntroPhaseView
            case .work, .rest:
                workoutView
            case .completed:
                completedView
            }
            
            if isSwapOptionsVisible {
                neuralOverrideModal
            }
            
            if isFormCheckActive {
                neuralFormCheckModal
            }
        }
        .navigationTitle("Guided workout")
        .task {
            if exercises.isEmpty {
                if let initialTrainingPlan {
                    seedSession(from: initialTrainingPlan)
                } else if !initialExercises.isEmpty {
                    seedSession(exercises: initialExercises, focus: nil, durationMinutes: nil)
                }
            }
            await loadPlan()
            await setupPulseSubscription()
            startNeuralMastery()
            speakCoachCue(for: phase)
        }
        .onChange(of: phase) { _, newValue in
            speakCoachCue(for: newValue)
        }
        .onDisappear {
            stopNeuralMastery()
        }
        .sheet(isPresented: $showRealtimeFormCheck) {
            RealtimeMotionLabSessionView(
                capability: motionAnalysis.capability,
                configuration: MotionSessionConfiguration(pattern: currentMotionPattern),
                title: "Realtime Form Check",
                subtitle: "Run live rep counting and technique cues without leaving your workout."
            ) { summary in
                formCheckResult = summary.response
                Task {
                    await Telemetry.track("ios_guided_form_check_realtime_completed", props: realtimeFormCheckTelemetry(for: summary))
                }
            }
            .ignoresSafeArea()
        }
        .overlay {
            if showingPulseAnimation {
                ZStack {
                    Color.black.opacity(0.4).ignoresSafeArea()

                    VStack(spacing: 20) {
                        Image(systemName: "bolt.fill")
                            .font(.system(size: 100))
                            .foregroundStyle(Color.accentColor)
                            .shadow(color: .accentColor, radius: 40)
                            .scaleEffect(pulseScale)
                            .opacity(pulseOpacity)

                        Text(pulseMessage)
                            .font(.title)
                            .fontWeight(.black)
                            .foregroundStyle(.white)
                            .multilineTextAlignment(.center)
                            .padding(.horizontal)
                            .shadow(radius: 10)
                            .scaleEffect(pulseScale)
                            .opacity(pulseOpacity)
                    }
                }
                .transition(.opacity)
                .zIndex(100)
            }
        }
        .overlay(alignment: .bottom) {
            if let feedback = swapFeedback {
                HStack(spacing: 10) {
                    Image(systemName: feedback.hasPrefix("Swapped") ? "checkmark.circle.fill" : "exclamationmark.triangle.fill")
                        .foregroundStyle(feedback.hasPrefix("Swapped") ? Brand.Color.success : Brand.Color.danger)
                    Text(feedback)
                        .font(.subheadline.weight(.semibold))
                        .foregroundStyle(.white)
                }
                .padding(.horizontal, 18)
                .padding(.vertical, 12)
                .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
                .overlay(
                    RoundedRectangle(cornerRadius: 16, style: .continuous)
                        .stroke(feedback.hasPrefix("Swapped") ? Brand.Color.success.opacity(0.4) : Brand.Color.danger.opacity(0.4), lineWidth: 1)
                )
                .padding(.bottom, 32)
                .transition(.move(edge: .bottom).combined(with: .opacity))
                .animation(.spring(response: 0.4, dampingFraction: 0.8), value: swapFeedback)
                .zIndex(50)
            }
        }
    }

    private var overviewView: some View {
        ZStack {
            Image("WorkoutBackground")
                .resizable()
                .aspectRatio(contentMode: .fill)
                .ignoresSafeArea()
                .opacity(0.4)
                .blur(radius: 10)
            
            Color.black.opacity(0.6).ignoresSafeArea()
            
            ScrollView {
                VStack(alignment: .leading, spacing: 18) {
                    PremiumHeroCard(
                        title: "Guided Workout",
                        subtitle: "One clear exercise at a time, with live targets, fast logging, and recovery control between efforts.",
                        eyebrow: "Session Cockpit"
                    ) {
                        ScrollView(.horizontal, showsIndicators: false) {
                            HStack(spacing: 10) {
                                PremiumMetricPill(label: "Exercises", value: "\(exercises.count)")
                                PremiumMetricPill(label: "Sets", value: "\(totalSetCount)")
                                PremiumMetricPill(label: "Focus", value: sessionFocusLabel)
                                if let sessionDurationMinutes {
                                    PremiumMetricPill(label: "Duration", value: "\(sessionDurationMinutes)m")
                                }
                            }
                        }
                    }

                    PremiumRowCard {
                        HStack(alignment: .top, spacing: 12) {
                            VStack(alignment: .leading, spacing: 4) {
                                Text("Today")
                                    .font(.system(size: 10, weight: .black, design: .monospaced))
                                    .tracking(1.2)
                                    .foregroundStyle(Brand.Color.accent)
                                Text(sessionTitle)
                                    .font(.title3.weight(.black))
                                    .foregroundStyle(.white)
                                Text("Lead with quality reps, then move smoothly through the remaining sequence.")
                                    .font(.subheadline)
                                    .foregroundStyle(Brand.Color.muted)
                            }
                            Spacer()
                            Button(action: { dismiss() }) {
                                Image(systemName: "xmark")
                                    .font(.headline.weight(.bold))
                                    .foregroundStyle(.white.opacity(0.72))
                                    .frame(width: 36, height: 36)
                                    .background(
                                        Circle()
                                            .fill(Brand.Color.surfaceRaised)
                                            .overlay(Circle().stroke(Brand.Color.borderStrong, lineWidth: 1))
                                    )
                            }
                        }
                    }

                    if let rationale = sessionRationale, !rationale.isEmpty {
                        PremiumRowCard {
                            VStack(alignment: .leading, spacing: 10) {
                                HStack(spacing: 6) {
                                    Circle().fill(Brand.Color.accent).frame(width: 6, height: 6)
                                    Text("Neural Rationale // Bio-Briefing")
                                        .font(.system(size: 9, weight: .black, design: .monospaced))
                                        .foregroundStyle(Brand.Color.accent)
                                }
                                Text(rationale)
                                    .font(.subheadline)
                                    .fontWeight(.medium)
                                    .foregroundStyle(.white)
                                    .fixedSize(horizontal: false, vertical: true)
                            }
                        }
                    }

                    VStack(alignment: .leading, spacing: 12) {
                        PremiumSectionHeader("Exercise Order", eyebrow: "Plan")
                        ForEach(Array(exercises.enumerated()), id: \.offset) { i, ex in
                            overviewExerciseRow(index: i, exercise: ex)
                        }
                    }

                    Button(action: {
                        guard !exercises.isEmpty else { phase = .completed; return }
                        setIndex = 0
                        exerciseIndex = 0
                        isNewExerciseAfterRest = false
                        phase = .exerciseIntro
                    }) {
                        Text("Start Session")
                    }
                    .buttonStyle(PremiumActionButtonStyle())
                }
                .padding()
            }
        }
    }

    /// Full-screen coached intro view shown before each exercise (session start + new-exercise transitions).
    @ViewBuilder
    private var exerciseIntroPhaseView: some View {
        if let ex = exercises[safe: exerciseIndex] {
            ExerciseIntroView(
                exercise: ex,
                exerciseIndex: exerciseIndex,
                totalExercises: exercises.count,
                onReady: {
                    HapticEngine.impact(.medium)
                    phase = .work
                }
            )
        } else {
            // Fallback — shouldn't happen but avoids a blank screen
            Color.black.ignoresSafeArea()
                .overlay(ProgressView().tint(Brand.Color.accent))
        }
    }

    private var workoutView: some View {
        let ex = exercises[safe: exerciseIndex] ?? PlanExercise(name: nil, sets: nil, reps: nil, intensity: nil, notes: nil, tempo: nil, breathing: nil, intent: nil, rationale: nil, target_rir: nil, target_load_kg: nil, video_url: nil, cinema_video_url: nil, image_url: nil)
        
        return ZStack {
            // Full Screen Background Video
            if let url = resolveAssetUrl(ex: ex) {
                CinemaPlayerView(videoURL: url)
                    .id(url.absoluteString) // Force rebuild on URL change
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                    .ignoresSafeArea()
                    .opacity(phase == .rest ? 0.2 : 0.6)
            } else {
                Color.black.ignoresSafeArea()
            }
            
            // Gradient Overlay
            LinearGradient(colors: [.black.opacity(phase == .rest ? 0.8 : 0.4), .black.opacity(0.8), .black], startPoint: .top, endPoint: .bottom)
                .ignoresSafeArea()

            VStack(spacing: 0) {
                workoutHeader(exercise: ex)

                Spacer()

                if phase == .rest {
                    restCockpit(exercise: ex)
                } else {
                    workCockpit(exercise: ex)
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .clipped()
    }

    private var completedView: some View {
        ZStack {
            Image("WorkoutBackground")
                .resizable()
                .aspectRatio(contentMode: .fill)
                .ignoresSafeArea()
                .opacity(0.4)
                .blur(radius: 20)
            
            Color.black.opacity(0.7).ignoresSafeArea()
            
            ScrollView {
                VStack(spacing: 20) {
                    PremiumHeroCard(
                        title: "Workout Complete",
                        subtitle: "Session logged, post-workout insight generated, and the execution trail is now on record.",
                        eyebrow: "Session Closed"
                    ) {
                        ScrollView(.horizontal, showsIndicators: false) {
                            HStack(spacing: 10) {
                                PremiumMetricPill(label: "Exercises", value: "\(exercises.count)")
                                PremiumMetricPill(label: "Sets Logged", value: "\(completedSetCount)")
                                PremiumMetricPill(label: "Status", value: saved ? "Saved" : "Pending")
                            }
                        }
                    }
                    if saved {
                        VStack(spacing: 24) {
                            ProBadge(
                                type: exercises.first?.name?.lowercased().contains("squat") == true ? .iron_core : .architect,
                                label: "Elite Attainment",
                                size: 150
                            )
                            .padding(.vertical, 20)
                            
                            Text("Session Decoded. Protocol Logged.")
                                .font(.system(size: 12, weight: .black, design: .monospaced))
                                .foregroundStyle(Brand.Color.accent)
                        }
                    }
                    if insightLoading {
                        PremiumStateCard(title: "Generating recap", detail: "Koda is turning your logged work into a concise post-session insight.", symbol: "waveform.path.ecg")
                    } else if let insight = postWorkoutInsight {
                        PremiumRowCard {
                            VStack(alignment: .leading, spacing: 10) {
                                Text("Post-Workout Readout")
                                    .font(.system(size: 10, weight: .black, design: .monospaced))
                                    .tracking(1.1)
                                    .foregroundStyle(Brand.Color.accent)
                                Text(insight)
                                    .font(.subheadline)
                                    .foregroundStyle(.white)
                                    .fixedSize(horizontal: false, vertical: true)
                            }
                        }
                    }
                    
                    Button("Return Home") {
                        dismiss()
                    }
                    .buttonStyle(PremiumActionButtonStyle())
                    .padding(.top, 20)
                }
                .padding()
            }
        }
    }

    private func workoutHeader(exercise ex: PlanExercise) -> some View {
        VStack(spacing: 16) {
            ViewThatFits(in: .horizontal) {
                HStack(alignment: .top) {
                    workoutBackButton
                    Spacer(minLength: 12)
                    SpotifyPlayerView(compact: true)
                        .frame(maxWidth: 180)
                }

                VStack(alignment: .leading, spacing: 12) {
                    HStack {
                        workoutBackButton
                        Spacer()
                    }
                    SpotifyPlayerView(compact: true)
                }
            }

            VStack(alignment: .leading, spacing: 10) {
                HStack(spacing: 8) {
                    Text(phase == .rest ? "Recovery" : "Execution")
                        .font(.system(size: 10, weight: .black, design: .monospaced))
                        .tracking(1.2)
                        .foregroundStyle(Brand.Color.accent)
                    Text("•")
                        .foregroundStyle(.white.opacity(0.4))
                    Text("Exercise \(exerciseIndex + 1) of \(max(exercises.count, 1))")
                        .font(.caption.weight(.semibold))
                        .foregroundStyle(.white.opacity(0.72))
                }

                Text(ex.name ?? "Exercise")
                    .font(.system(size: 34, weight: .black))
                    .italic()
                    .foregroundStyle(.white)
                    .lineLimit(2)

                GeometryReader { geometry in
                    ZStack(alignment: .leading) {
                        Capsule()
                            .fill(Color.white.opacity(0.14))
                        Capsule()
                            .fill(LinearGradient(colors: [Brand.Color.accent, Color.white], startPoint: .leading, endPoint: .trailing))
                            .frame(width: max(geometry.size.width * sessionProgress, 12))
                    }
                }
                .frame(height: 8)

                ViewThatFits(in: .horizontal) {
                    HStack(spacing: 10) {
                        workoutBadge(label: "Set", value: "\(min(setIndex + 1, ex.sets ?? 1))/\(ex.sets ?? 1)")
                        workoutBadge(label: "Target", value: ex.reps ?? "-")
                        workoutBadge(label: "Focus", value: ex.intensity ?? "Push")
                    }

                    VStack(alignment: .leading, spacing: 10) {
                        workoutBadge(label: "Set", value: "\(min(setIndex + 1, ex.sets ?? 1))/\(ex.sets ?? 1)")
                        workoutBadge(label: "Target", value: ex.reps ?? "-")
                        workoutBadge(label: "Focus", value: ex.intensity ?? "Push")
                    }
                }
            }
        }
        .padding(.horizontal, 16)
        .padding(.top, 10)
    }

    private func workCockpit(exercise ex: PlanExercise) -> some View {
        VStack(spacing: 18) {
            Spacer()

            VStack(alignment: .leading, spacing: 16) {
                workSummarySection(exercise: ex)
                workTargetSection(exercise: ex)
                workCoachingSection(exercise: ex)
                workLoggingSection(exercise: ex)
                loggedSetsSection
                workActionSection
            }
            .frame(maxWidth: .infinity)
            .padding(20)
            .background(
                RoundedRectangle(cornerRadius: 28, style: .continuous)
                    .fill(.ultraThinMaterial)
                    .overlay(
                        RoundedRectangle(cornerRadius: 28, style: .continuous)
                            .stroke(Color.white.opacity(0.12), lineWidth: 1)
                    )
            )
            .padding(.horizontal, 16)
            .padding(.bottom, 16)
        }
        .frame(maxWidth: .infinity)
    }

    private func workSummarySection(exercise ex: PlanExercise) -> some View {
        HStack(alignment: .top, spacing: 16) {
            VStack(alignment: .leading, spacing: 6) {
                Text("NOW")
                    .font(.system(size: 10, weight: .black, design: .monospaced))
                    .tracking(1.2)
                    .foregroundStyle(Brand.Color.accent)
                Text("Set \(setIndex + 1) of \(ex.sets ?? 1)")
                    .font(.title2.weight(.black))
                    .foregroundStyle(.white)
                Text(ex.rationale ?? "Stay crisp, hit the target cleanly, and leave enough control for the next round.")
                    .font(.subheadline)
                    .foregroundStyle(Brand.Color.muted)
                    .fixedSize(horizontal: false, vertical: true)
            }
            Spacer()
            VStack(alignment: .trailing, spacing: 6) {
                Text("Logged")
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(.white.opacity(0.64))
                Text("\(currentExerciseLoggedSets.count)")
                    .font(.system(size: 30, weight: .black, design: .rounded))
                    .foregroundStyle(.white)
            }
        }
    }

    private func workTargetSection(exercise ex: PlanExercise) -> some View {
        ViewThatFits(in: .horizontal) {
            HStack(spacing: 12) {
                targetCard(title: "Reps", value: ex.reps ?? "-", accent: .white)
                targetCard(title: "Intensity", value: ex.intensity ?? "Push", accent: Brand.Color.accent)
                if let rir = ex.target_rir {
                    targetCard(title: "RIR", value: "\(rir)", accent: Brand.Color.warning)
                }
            }

            VStack(spacing: 12) {
                targetCard(title: "Reps", value: ex.reps ?? "-", accent: .white)
                targetCard(title: "Intensity", value: ex.intensity ?? "Push", accent: Brand.Color.accent)
                if let rir = ex.target_rir {
                    targetCard(title: "RIR", value: "\(rir)", accent: Brand.Color.warning)
                }
            }
        }
    }

    @ViewBuilder
    private func workCoachingSection(exercise ex: PlanExercise) -> some View {
        if ex.tempo != nil || ex.breathing != nil || ex.intent != nil || ex.notes != nil {
            VStack(alignment: .leading, spacing: 10) {
                Text("Coaching cues")
                    .font(.system(size: 10, weight: .black, design: .monospaced))
                    .tracking(1.1)
                    .foregroundStyle(Brand.Color.accent)
                VStack(spacing: 8) {
                    if let tempo = ex.tempo, !tempo.isEmpty {
                        cueRow(label: "TEMPO", value: tempo)
                    }
                    if let breathing = ex.breathing, !breathing.isEmpty {
                        cueRow(label: "BREATH", value: breathing)
                    }
                    if let intent = ex.intent, !intent.isEmpty {
                        cueRow(label: "INTENT", value: intent)
                    }
                    if let notes = ex.notes, !notes.isEmpty {
                        cueRow(label: "NOTE", value: notes)
                    }
                }
            }
        }
    }

    private func workLoggingSection(exercise ex: PlanExercise) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Log this set")
                .font(.system(size: 10, weight: .black, design: .monospaced))
                .tracking(1.1)
                .foregroundStyle(Brand.Color.accent)
            ViewThatFits(in: .horizontal) {
                HStack(spacing: 12) {
                    workoutEntryField(label: "Weight", unit: "LBS", placeholder: "0", text: $currentWeightInput, keyboard: .decimalPad)
                    workoutEntryField(label: "Reps", unit: "COUNT", placeholder: ex.reps?.components(separatedBy: "-").first ?? "0", text: $currentRepsInput, keyboard: .numberPad)
                }

                VStack(spacing: 12) {
                    workoutEntryField(label: "Weight", unit: "LBS", placeholder: "0", text: $currentWeightInput, keyboard: .decimalPad)
                    workoutEntryField(label: "Reps", unit: "COUNT", placeholder: ex.reps?.components(separatedBy: "-").first ?? "0", text: $currentRepsInput, keyboard: .numberPad)
                }
            }
        }
    }

    @ViewBuilder
    private var loggedSetsSection: some View {
        if !currentExerciseLoggedSets.isEmpty {
            VStack(alignment: .leading, spacing: 10) {
                Text("Logged so far")
                    .font(.system(size: 10, weight: .black, design: .monospaced))
                    .tracking(1.1)
                    .foregroundStyle(Brand.Color.accent)
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 8) {
                        ForEach(Array(currentExerciseLoggedSets.enumerated()), id: \.offset) { index, logged in
                            loggedSetPill(index: index, logged: logged)
                        }
                    }
                }
            }
        }
    }

    private func loggedSetPill(index: Int, logged: LoggedSet) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text("S\(index + 1)")
                .font(.caption2.weight(.bold))
                .foregroundStyle(.white.opacity(0.64))
            Text("\(Int(logged.weight ?? 0)) x \(logged.reps ?? 0)")
                .font(.caption.weight(.bold))
                .foregroundStyle(.white)
        }
        .padding(.horizontal, 10)
        .padding(.vertical, 8)
        .background(
            RoundedRectangle(cornerRadius: 14, style: .continuous)
                .fill(Color.white.opacity(0.06))
                .overlay(
                    RoundedRectangle(cornerRadius: 14, style: .continuous)
                        .stroke(Color.white.opacity(0.08), lineWidth: 1)
                )
        )
    }

    private var workActionSection: some View {
        VStack(spacing: 12) {
            Button(action: { advanceSet() }) {
                Text(nextActionLabel)
            }
            .buttonStyle(PremiumActionButtonStyle())

            ViewThatFits(in: .horizontal) {
                HStack(spacing: 12) {
                    Button(action: { isFormCheckActive = true }) {
                        Label("Form Check", systemImage: "camera.viewfinder")
                    }
                    .buttonStyle(PremiumActionButtonStyle(filled: false))

                    Button(action: { isSwapOptionsVisible = true }) {
                        Label("Swap Exercise", systemImage: "arrow.triangle.2.circlepath")
                    }
                    .buttonStyle(PremiumActionButtonStyle(filled: false))
                }

                VStack(spacing: 12) {
                    Button(action: { isFormCheckActive = true }) {
                        Label("Form Check", systemImage: "camera.viewfinder")
                    }
                    .buttonStyle(PremiumActionButtonStyle(filled: false))

                    Button(action: { isSwapOptionsVisible = true }) {
                        Label("Swap Exercise", systemImage: "arrow.triangle.2.circlepath")
                    }
                    .buttonStyle(PremiumActionButtonStyle(filled: false))
                }
            }
        }
    }

    private func restCockpit(exercise ex: PlanExercise) -> some View {
        let displayHR = healthKit.currentHeartRate ?? simulatedHeartRate
        let isOptimal = displayHR <= recoveryTarget

        return VStack(spacing: 20) {
            Spacer()

            VStack(spacing: 18) {
                Text(neuralRestMode ? "Neural recovery active" : "Rest phase")
                    .font(.system(size: 10, weight: .black, design: .monospaced))
                    .tracking(1.2)
                    .foregroundStyle(Brand.Color.accent)

                if neuralRestMode {
                    NeuralRestHUD(
                        heartRate: displayHR,
                        timeRemaining: restRemaining,
                        recoveryScore: calculateRecoveryScore(),
                        steeringMessage: getSteeringMessage()
                    )
                } else {
                    VStack(spacing: 8) {
                        Text("\(restRemaining)")
                            .font(.system(size: 88, weight: .black, design: .rounded))
                            .foregroundStyle(.white)
                        Text("SECONDS")
                            .font(.headline.weight(.bold))
                            .foregroundStyle(Brand.Color.accent)
                    }
                }

                ViewThatFits(in: .horizontal) {
                    HStack(spacing: 12) {
                        targetCard(title: "Heart Rate", value: "\(displayHR)", accent: .white)
                        targetCard(title: "Target", value: "\(recoveryTarget)", accent: Brand.Color.accent)
                        targetCard(title: "Ready", value: isOptimal ? "Yes" : "Not Yet", accent: isOptimal ? Brand.Color.success : Brand.Color.warning)
                    }

                    VStack(spacing: 12) {
                        targetCard(title: "Heart Rate", value: "\(displayHR)", accent: .white)
                        targetCard(title: "Target", value: "\(recoveryTarget)", accent: Brand.Color.accent)
                        targetCard(title: "Ready", value: isOptimal ? "Yes" : "Not Yet", accent: isOptimal ? Brand.Color.success : Brand.Color.warning)
                    }
                }

                restUpNextCard(exercise: ex, isOptimal: isOptimal)

                Button(action: advanceRest) {
                    Text(isOptimal ? "Start Next Set" : "Override Recovery")
                }
                .buttonStyle(PremiumActionButtonStyle(filled: isOptimal))
            }
            .padding(20)
            .background(
                RoundedRectangle(cornerRadius: 28, style: .continuous)
                    .fill(.ultraThinMaterial)
                    .overlay(
                        RoundedRectangle(cornerRadius: 28, style: .continuous)
                            .stroke(Color.white.opacity(0.12), lineWidth: 1)
                    )
            )
            .padding(.horizontal, 16)
            .padding(.bottom, 16)
        }
    }

    /// "Up next" card shown during rest — previews the upcoming exercise with catalog cues.
    private func restUpNextCard(exercise ex: PlanExercise, isOptimal: Bool) -> some View {
        let nextCatalog = ExerciseCatalog.entry(for: ex.name ?? "")
        let isNewExercise = isNewExerciseAfterRest

        return VStack(alignment: .leading, spacing: 10) {
            HStack {
                VStack(alignment: .leading, spacing: 3) {
                    Text(isNewExercise ? "NEXT EXERCISE" : "CONTINUING")
                        .font(.system(size: 10, weight: .black, design: .monospaced))
                        .tracking(1.1)
                        .foregroundStyle(Brand.Color.accent)
                    Text(ex.name ?? "Next Exercise")
                        .font(.title3.weight(.black))
                        .foregroundStyle(.white)
                }
                Spacer()
                if let muscles = nextCatalog?.muscles {
                    VStack(alignment: .trailing, spacing: 3) {
                        ForEach(muscles.prefix(2), id: \.self) { m in
                            Text(m)
                                .font(.system(size: 8, weight: .bold))
                                .foregroundStyle(.white.opacity(0.6))
                                .padding(.horizontal, 7)
                                .padding(.vertical, 3)
                                .background(Capsule().fill(Color.white.opacity(0.07)))
                        }
                    }
                }
            }

            if isNewExercise, let firstCue = nextCatalog?.formCues.first {
                HStack(alignment: .top, spacing: 8) {
                    Image(systemName: firstCue.icon)
                        .font(.caption.weight(.bold))
                        .foregroundStyle(Brand.Color.accent)
                    Text(firstCue.cue)
                        .font(.caption)
                        .foregroundStyle(.white.opacity(0.75))
                        .fixedSize(horizontal: false, vertical: true)
                }
            }

            Text(isOptimal
                 ? "Recovery threshold met. Intro will play when you're ready."
                 : "Keep breathing, let your heart rate settle before advancing.")
                .font(.caption)
                .foregroundStyle(Brand.Color.muted)
                .fixedSize(horizontal: false, vertical: true)
        }
    }

    private func loadPlan() async {
        if !exercises.isEmpty { 
            await MainActor.run {
                if loggedSets.count != exercises.count {
                    loggedSets = Array(repeating: [], count: exercises.count)
                }
                if phase == .loading {
                    phase = exercises.isEmpty ? .completed : .overview
                }
            }
            return 
        }
        do {
            let freshPlan = try await api.planDaily(todayConstraints: nil).plan
            await MainActor.run {
                seedSession(
                    exercises: freshPlan.training_plan?.exercises ?? [],
                    focus: freshPlan.training_plan?.focus,
                    durationMinutes: freshPlan.training_plan?.duration_minutes
                )
            }
            Task {
                if let briefing = try? await api.aiBriefing(localDate: DateHelpers.todayLocal) {
                    await MainActor.run {
                        sessionRationale = briefing.rationale
                    }
                }
            }
        } catch {
            if let ds = dataService {
                do {
                    let storedPlan = try await ds.fetchDailyPlan(dateLocal: DateHelpers.todayLocal)
                    await MainActor.run {
                        seedSession(
                            exercises: storedPlan?.training_plan?.exercises ?? [],
                            focus: storedPlan?.training_plan?.focus,
                            durationMinutes: storedPlan?.training_plan?.duration_minutes
                        )
                    }
                    return
                } catch {
                    await MainActor.run {
                        errorMessage = error.localizedDescription
                        phase = .overview
                    }
                    return
                }
            }
            await MainActor.run {
                errorMessage = error.localizedDescription
                phase = .overview
            }
        }
    }

    private func advanceSet() {
        // 1. Update local state immediately — the UI responds at once (optimistic).
        let w = Double(currentWeightInput)
        let r = Int(currentRepsInput)
        if exerciseIndex < loggedSets.count {
            loggedSets[exerciseIndex].append(LoggedSet(weight: w, reps: r))
        }
        currentWeightInput = ""
        currentRepsInput = ""

        // Hide keyboard
        UIApplication.shared.sendAction(#selector(UIResponder.resignFirstResponder), to: nil, from: nil, for: nil)

        let ex = exercises[safe: exerciseIndex]
        let sets = ex?.sets ?? 1
        if setIndex + 1 >= sets {
            if exerciseIndex + 1 >= exercises.count {
                phase = .completed
                HapticEngine.notification(.success)
                Task { await saveAndGetInsight() }
            } else {
                exerciseIndex += 1
                setIndex = 0
                isNewExerciseAfterRest = true   // flag: show exercise intro after rest
                HapticEngine.impact(.heavy)
                if let next = exercises[safe: exerciseIndex] { prefetchDemoURL(for: next) }
                startRestTimer()
            }
        } else {
            setIndex += 1
            isNewExerciseAfterRest = false
            HapticEngine.impact(.heavy)
            startRestTimer()
        }

        // 2. Background checkpoint — persist partial log so data survives a crash.
        Task { await persistCheckpoint() }
    }

    /// Upserts the current logged sets to the DB without blocking the UI.
    private func persistCheckpoint() async {
        guard let ds = dataService else { return }
        var log = buildWorkoutLog()
        log.log_id = sessionLogId
        log.notes = "in_progress"
        try? await ds.upsertWorkoutLog(log)
    }
    
    // Skip the rest countdown and advance immediately.
    private func advanceRest() {
        restTimerTask?.cancel()
        restTimerTask = nil
        phase = .work
    }

    private func startRestTimer() {
        phase = .rest
        restRemaining = restSeconds

        if neuralRestMode {
            // Seed simulation only when HealthKit HR is unavailable.
            if healthKit.currentHeartRate == nil {
                simulatedHeartRate = 148
            }
            recoveryTarget = 110
        }

        restTimerTask?.cancel()
        restTimerTask = Task {
            for i in (0..<restSeconds).reversed() {
                try? await Task.sleep(nanoseconds: 1_000_000_000)
                guard !Task.isCancelled else { return }
                await MainActor.run {
                    restRemaining = i
                    if neuralRestMode {
                        // When HealthKit is unavailable, simulate HR drop
                        if healthKit.currentHeartRate == nil {
                            simulatedHeartRate -= Int.random(in: 1...3)
                            if simulatedHeartRate < recoveryTarget { simulatedHeartRate = recoveryTarget }
                        }
                    }
                }
                guard !Task.isCancelled else { return }

                let effectiveHR = healthKit.currentHeartRate ?? simulatedHeartRate
                if i == 0 || (neuralRestMode && effectiveHR <= recoveryTarget && i < restSeconds - 10) {
                    await MainActor.run {
                        if isNewExerciseAfterRest {
                            isNewExerciseAfterRest = false
                            phase = .exerciseIntro
                        } else {
                            phase = .work
                        }
                    }
                    break
                }
            }
        }
    }

    private func executeNeuralOverride() async {
        let ex = exercises[safe: exerciseIndex]
        guard let name = ex?.name, !swapInput.trimmingCharacters(in: .whitespaces).isEmpty else { return }
        
        swapLoading = true
        swapFeedback = nil
        
        do {
            let res = try await api.planSwapExercise(currentExercise: name, reason: swapInput, location: "gym", sets: ex?.sets, reps: ex?.reps, intensity: nil)
            if let rep = res.replacement?.name, exerciseIndex < exercises.count {
                let newEx = PlanExercise(
                    name: rep,
                    sets: res.replacement?.sets ?? ex?.sets,
                    reps: res.replacement?.reps ?? ex?.reps,
                    intensity: res.replacement?.intensity ?? ex?.intensity,
                    notes: res.replacement?.notes,
                    tempo: ex?.tempo,
                    breathing: ex?.breathing,
                    intent: ex?.intent,
                    rationale: ex?.rationale,
                    target_rir: ex?.target_rir,
                    target_load_kg: ex?.target_load_kg,
                    video_url: ex?.video_url,
                    cinema_video_url: ex?.cinema_video_url,
                    image_url: ex?.image_url
                )
                
                await MainActor.run {
                    exercises[exerciseIndex] = newEx
                    swapFeedback = "Swapped to \(rep)."
                    if let conf = res.reliability?.confidence_score {
                        swapFeedback! += " AI Confidence: \(Int(conf * 100))%"
                    }
                    swapInput = ""
                    isSwapOptionsVisible = false
                }
                HapticEngine.notification(.success)
                try? await Task.sleep(nanoseconds: 3_000_000_000)
                await MainActor.run { swapFeedback = nil }
            }
        } catch {
            await MainActor.run { swapFeedback = "Override failed. Try again." }
            HapticEngine.notification(.error)
            try? await Task.sleep(nanoseconds: 3_000_000_000)
            await MainActor.run { swapFeedback = nil }
        }

        await MainActor.run { swapLoading = false }
    }
    
    // Extracted Modal UI
    private var neuralOverrideModal: some View {
        ZStack {
            Color.black.opacity(0.85)
                .ignoresSafeArea()
                .background(.ultraThinMaterial)
                .onTapGesture { if !swapLoading { isSwapOptionsVisible = false } }
            
            VStack(spacing: 16) {
                HStack {
                    HStack(spacing: 6) {
                        Circle()
                            .fill(Color.accentColor)
                            .frame(width: 8, height: 8)
                            .opacity(0.8)
                        Text("Neural Override")
                            .font(.system(size: 10, weight: .black, design: .monospaced))
                            .textCase(.uppercase)
                            .tracking(2)
                            .foregroundStyle(Color.accentColor)
                    }
                    Spacer()
                    Button(action: { isSwapOptionsVisible = false }) {
                        Image(systemName: "xmark")
                            .font(.headline)
                            .foregroundStyle(.white.opacity(0.5))
                    }
                    .disabled(swapLoading)
                }
                
                Text("How should Koda adapt this movement?")
                    .font(.subheadline)
                    .italic()
                    .foregroundStyle(.secondary)
                    .frame(maxWidth: .infinity, alignment: .leading)
                
                HStack(spacing: 12) {
                    Text(">")
                        .font(.system(size: 14, weight: .black, design: .monospaced))
                        .foregroundStyle(Color.accentColor)
                    
                    TextField("e.g. 'I only have dumbbells'", text: $swapInput)
                        .font(.system(size: 14, design: .monospaced))
                        .foregroundStyle(.white)
                        .disabled(swapLoading)
                        .onSubmit {
                            Task { await executeNeuralOverride() }
                        }
                    
                    Button(action: { Task { await executeNeuralOverride() } }) {
                        if swapLoading {
                            ProgressView()
                                .scaleEffect(0.8)
                                .tint(Color.accentColor)
                        } else {
                            Text("EXE")
                                .font(.system(size: 10, weight: .black, design: .monospaced))
                                .padding(.horizontal, 10)
                                .padding(.vertical, 8)
                                .background(Color.accentColor.opacity(0.1))
                                .foregroundStyle(Color.accentColor)
                                .clipShape(RoundedRectangle(cornerRadius: 6))
                        }
                    }
                    .disabled(swapLoading || swapInput.trimmingCharacters(in: .whitespaces).isEmpty)
                }
                .padding()
                .background(Color.black.opacity(0.6))
                .clipShape(RoundedRectangle(cornerRadius: 12))
                .overlay(RoundedRectangle(cornerRadius: 12).stroke(Color.white.opacity(0.1), lineWidth: 1))
                
                HStack(spacing: 8) {
                    ForEach(["No Equipment", "Too Hard", "Pain / Discomfort"], id: \.self) { quick in
                        Button(action: { swapInput = quick }) {
                            Text(quick)
                                .font(.system(size: 9, weight: .bold))
                                .textCase(.uppercase)
                                .tracking(1)
                                .foregroundStyle(.white.opacity(0.7))
                                .padding(.horizontal, 8)
                                .padding(.vertical, 6)
                                .background(Color.white.opacity(0.05))
                                .clipShape(RoundedRectangle(cornerRadius: 4))
                                .overlay(RoundedRectangle(cornerRadius: 4).stroke(Color.white.opacity(0.1), lineWidth: 1))
                        }
                        .disabled(swapLoading)
                    }
                }
                .frame(maxWidth: .infinity, alignment: .leading)
            }
            .padding(24)
            .background(Color(UIColor.systemGray6))
            .clipShape(RoundedRectangle(cornerRadius: 24))
            .overlay(RoundedRectangle(cornerRadius: 24).stroke(Color.accentColor.opacity(0.2), lineWidth: 1))
            .padding(.horizontal, 20)
            .transition(.scale(scale: 0.95).combined(with: .opacity))
        }
        .zIndex(200)
    }
    
    // Integrated Motion Lab Modal
    private var neuralFormCheckModal: some View {
        ZStack {
            Color.black.opacity(0.95).ignoresSafeArea().background(.ultraThinMaterial)
            
            VStack(spacing: 24) {
                HStack {
                    HStack(spacing: 8) {
                        Image(systemName: "camera.viewfinder")
                            .foregroundStyle(Brand.Color.accent)
                        Text("NEURAL MOTION ANALYSIS")
                            .font(.system(size: 10, weight: .black, design: .monospaced))
                            .textCase(.uppercase)
                            .tracking(2)
                            .foregroundStyle(Brand.Color.accent)
                    }
                    Spacer()
                    Button(action: { isFormCheckActive = false }) {
                        Image(systemName: "xmark")
                            .foregroundStyle(.white.opacity(0.5))
                    }
                    .disabled(formCheckLoading)
                }
                
                if let result = formCheckResult {
                    VStack(alignment: .leading, spacing: 12) {
                        HStack(spacing: 8) {
                            Label(
                                result.analysis_source == "on_device" ? "ON DEVICE" : "SERVER",
                                systemImage: result.analysis_source == "on_device" ? "cpu" : "network"
                            )
                            .font(.system(size: 10, weight: .bold))
                            .foregroundStyle(result.analysis_source == "on_device" ? Brand.Color.accent : .orange)

                            if let benchmark = result.benchmark_ms {
                                Text("\(benchmark) MS")
                                    .font(.system(size: 10, weight: .bold))
                                    .foregroundStyle(.secondary)
                            }
                        }

                        HStack {
                            Text("BIOMECHANICAL SCORE:")
                                .font(.system(size: 9, weight: .bold))
                                .foregroundStyle(.secondary)
                            Spacer()
                            Text("\(normalizedVisionScore(result.score))")
                                .font(.system(size: 24, weight: .black, design: .rounded))
                                .foregroundStyle(Brand.Color.accent)
                        }
                        
                        Text(result.critique ?? "No critique available.")
                            .font(.subheadline)
                            .foregroundStyle(.white)
                        
                        if let corr = result.correction {
                            Text("ADJUSTMENT: \(corr)")
                                .font(.caption.bold())
                                .foregroundStyle(Brand.Color.accent)
                                .padding(8)
                                .background(Brand.Color.accent.opacity(0.1))
                                .clipShape(RoundedRectangle(cornerRadius: 6))
                        }

                        if let fallback = result.fallback_reason, !fallback.isEmpty {
                            Text(fallback)
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }

                        if let reps = result.rep_count, reps > 0 || result.peak_velocity_mps != nil {
                            HStack(spacing: 8) {
                                if reps > 0 {
                                    Text("\(reps) REPS")
                                        .font(.system(size: 10, weight: .bold))
                                        .foregroundStyle(.secondary)
                                }
                                if let peak = result.peak_velocity_mps {
                                    Text(String(format: "PEAK %.2f M/S", peak))
                                        .font(.system(size: 10, weight: .bold))
                                        .foregroundStyle(.secondary)
                                }
                                if let mean = result.mean_velocity_mps {
                                    Text(String(format: "MEAN %.2f M/S", mean))
                                        .font(.system(size: 10, weight: .bold))
                                        .foregroundStyle(.secondary)
                                }
                                if let dropoff = result.velocity_dropoff_percent, dropoff > 0 {
                                    Text(String(format: "DROPOFF %.0f%%", dropoff))
                                        .font(.system(size: 10, weight: .bold))
                                        .foregroundStyle(.secondary)
                                }
                            }
                        }

                        if let reportPath = result.benchmark_report_path, !reportPath.isEmpty {
                            Text("BENCHMARK: \(benchmarkReportLabel(for: reportPath))")
                                .font(.system(size: 10, weight: .bold))
                                .foregroundStyle(.secondary)
                        }
                    }
                    .padding()
                    .background(Color.white.opacity(0.05))
                    .clipShape(RoundedRectangle(cornerRadius: 16))
                } else {
                    VStack(spacing: 20) {
                        Image(systemName: "waveform.path.ecg")
                            .font(.system(size: 44))
                            .foregroundStyle(Brand.Color.accent.opacity(0.4))
                        
                        Text("Record or capture a photo of your set for immediate biomechanical feedback.")
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                            .multilineTextAlignment(.center)

                        if motionAnalysis.capability.supportsRealtime {
                            Button {
                                showRealtimeFormCheck = true
                            } label: {
                                Text("START REALTIME SCAN")
                                    .font(.system(size: 12, weight: .black))
                                    .padding()
                                    .frame(maxWidth: .infinity)
                                    .background(Brand.Color.accent.opacity(0.14))
                                    .foregroundStyle(Brand.Color.accent)
                                    .clipShape(Capsule())
                            }
                        }
                        
                        PhotosPicker(selection: $selectedItems, maxSelectionCount: 1, matching: .images) {
                            Text("CHOOSE PHOTO")
                                .font(.system(size: 12, weight: .black))
                                .padding()
                                .frame(maxWidth: .infinity)
                                .background(Brand.Color.accent)
                                .foregroundStyle(.black)
                                .clipShape(Capsule())
                        }
                        .onChange(of: selectedItems) { _, items in
                            Task {
                                if let item = items.first, let data = try? await item.loadTransferable(type: Data.self) {
                                    let base64 = "data:image/jpeg;base64,\(data.base64EncodedString())"
                                    await MainActor.run { 
                                        capturedPhotos = [base64]
                                        executeFormCheck()
                                    }
                                }
                            }
                        }
                    }
                    .padding(.vertical, 40)
                }
                
                if formCheckLoading {
                    ProgressView("Analyzing Kinetic Chain…")
                        .tint(Brand.Color.accent)
                }
            }
            .padding(30)
            .background(Color(.systemGray6))
            .clipShape(RoundedRectangle(cornerRadius: 24))
            .padding(20)
        }
    }
    
    private func executeFormCheck() {
        guard !capturedPhotos.isEmpty else { return }
        formCheckLoading = true
        formCheckResult = nil
        Task {
            do {
                let res = try await motionAnalysis.analyze(
                    images: capturedPhotos,
                    configuration: MotionSessionConfiguration(pattern: currentMotionPattern)
                )
                await Telemetry.track("ios_guided_form_check_completed", props: formCheckTelemetry(for: res))
                await MainActor.run {
                    formCheckResult = res
                    formCheckLoading = false
                }
            } catch {
                await Telemetry.track("ios_guided_form_check_failed", props: [
                    "requested_frames": capturedPhotos.count,
                    "error": (error as? LocalizedError)?.errorDescription ?? error.localizedDescription,
                ])
                await MainActor.run { formCheckLoading = false }
            }
        }
    }
    
    private func startNeuralMastery() {
        healthKit.startHeartRateStreaming()
    }
    
    private func stopNeuralMastery() {
        restTimerTask?.cancel()
        restTimerTask = nil
        healthKit.stopHeartRateStreaming()
    }

    private func normalizedVisionScore(_ score: Double?) -> Int {
        guard let score else { return 0 }
        if score <= 1 {
            return Int((score * 100).rounded())
        }
        return Int(score.rounded())
    }

    private func benchmarkReportLabel(for path: String) -> String {
        URL(fileURLWithPath: path).lastPathComponent
    }

    private func formCheckTelemetry(for response: VisionAnalysisResponse) -> [String: Any] {
        var props: [String: Any] = [
            "requested_frames": capturedPhotos.count,
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

    private func realtimeFormCheckTelemetry(for summary: RealtimeMotionSessionSummary) -> [String: Any] {
        var props = formCheckTelemetry(for: summary.response)
        props["average_fps"] = summary.benchmark.averageFPS
        props["latency_p50_ms"] = summary.benchmark.p50LatencyMs
        props["latency_p95_ms"] = summary.benchmark.p95LatencyMs
        props["processed_frames"] = summary.benchmark.processedFrames
        props["dropped_frames"] = summary.benchmark.droppedFrames
        return props
    }
    
    private func calculateRecoveryScore() -> Double {
        let hr = Double(healthKit.currentHeartRate ?? simulatedHeartRate)
        let spread = 160.0 - Double(recoveryTarget)
        let progress = 1.0 - ((hr - Double(recoveryTarget)) / spread)
        return max(0, min(1, progress))
    }

    private func getSteeringMessage() -> String? {
        let hr = Double(healthKit.currentHeartRate ?? simulatedHeartRate)
        if hr <= Double(recoveryTarget) {
            return "Metabolic Reset Complete. Readiness Optimal."
        } else if restRemaining < 20 && hr > Double(recoveryTarget) + 20 {
            return "Recovery Lag Detected. Suggest Neural Override."
        } else if hr > 150 {
            return "High Intensity Signal. Focus on Deep Respiration."
        } else {
            return "Physiological Calibration in Progress..."
        }
    }
    

    // MARK: - Helpers
    
    private func resolveAssetUrl(ex: PlanExercise) -> URL? {
        // CDN-resolved URL takes priority (bundle or Supabase Storage).
        if let cdn = resolvedDemoURL { return cdn }

        let assetStr = ex.cinema_video_url ?? ex.video_url ?? ex.image_url
        let finalStr = ExerciseImages.getExerciseImageUrl(exerciseName: ex.name ?? "", overrideUrl: assetStr)

        if finalStr.hasPrefix("http") {
            return URL(string: finalStr)
        } else {
            let path = finalStr.hasPrefix("/") ? String(finalStr.dropFirst()) : finalStr
            return AppConfig.apiBaseURL.appendingPathComponent(path)
        }
    }

    /// Kicks off an async CDN lookup for the current exercise's demo video.
    private func prefetchDemoURL(for exercise: PlanExercise) {
        resolvedDemoURL = nil
        guard let name = exercise.name, !name.isEmpty else { return }
        Task {
            let url = await ExerciseDemoResolver.url(for: name)
            await MainActor.run { resolvedDemoURL = url }
        }
    }
    
    private func cueRow(label: String, value: String) -> some View {
        HStack {
            Text(label)
                .font(.system(size: 10, weight: .bold, design: .monospaced))
                .foregroundStyle(Brand.Color.accent.opacity(0.7))
            Spacer()
            Text(value)
                .font(.system(size: 11, weight: .medium))
                .foregroundStyle(.white.opacity(0.9))
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 6)
        .background(Color.white.opacity(0.05))
        .clipShape(RoundedRectangle(cornerRadius: 6))
    }

    private func overviewExerciseRow(index: Int, exercise: PlanExercise) -> some View {
        HStack(alignment: .top, spacing: 14) {
            Text("\(index + 1)")
                .font(.system(size: 18, weight: .black, design: .rounded))
                .foregroundStyle(.black)
                .frame(width: 34, height: 34)
                .background(
                    Circle()
                        .fill(index == 0 ? Brand.Color.accent : Color.white.opacity(0.16))
                )

            VStack(alignment: .leading, spacing: 6) {
                Text(exercise.name ?? "Exercise \(index + 1)")
                    .font(.headline.weight(.bold))
                    .foregroundStyle(.white)
                ViewThatFits(in: .horizontal) {
                    HStack(spacing: 8) {
                        workoutInfoPill("\(exercise.sets ?? 0) sets")
                        workoutInfoPill(exercise.reps ?? "- reps")
                        if let intensity = exercise.intensity {
                            workoutInfoPill(intensity)
                        }
                    }

                    VStack(alignment: .leading, spacing: 8) {
                        workoutInfoPill("\(exercise.sets ?? 0) sets")
                        workoutInfoPill(exercise.reps ?? "- reps")
                        if let intensity = exercise.intensity {
                            workoutInfoPill(intensity)
                        }
                    }
                }
                if let rationale = exercise.rationale, !rationale.isEmpty {
                    Text(rationale)
                        .font(.caption)
                        .foregroundStyle(Brand.Color.muted)
                        .fixedSize(horizontal: false, vertical: true)
                }
            }

            Spacer()
        }
        .padding(16)
        .background(
            RoundedRectangle(cornerRadius: 22, style: .continuous)
                .fill(Brand.Color.surfaceRaised.opacity(0.92))
                .overlay(
                    RoundedRectangle(cornerRadius: 22, style: .continuous)
                        .stroke(Brand.Color.borderStrong, lineWidth: 1)
                )
        )
    }

    private func workoutInfoPill(_ text: String) -> some View {
        Text(text)
            .font(.caption.weight(.semibold))
            .foregroundStyle(.white)
            .padding(.horizontal, 10)
            .padding(.vertical, 6)
            .background(
                Capsule()
                    .fill(Color.white.opacity(0.08))
                    .overlay(Capsule().stroke(Color.white.opacity(0.08), lineWidth: 1))
            )
    }

    private func workoutBadge(label: String, value: String) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(label.uppercased())
                .font(.system(size: 9, weight: .black, design: .monospaced))
                .foregroundStyle(.white.opacity(0.56))
            Text(value)
                .font(.subheadline.weight(.bold))
                .foregroundStyle(.white)
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 10)
        .background(
            Capsule()
                .fill(Color.white.opacity(0.08))
                .overlay(Capsule().stroke(Color.white.opacity(0.08), lineWidth: 1))
        )
    }

    private func targetCard(title: String, value: String, accent: Color) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(title.uppercased())
                .font(.system(size: 9, weight: .black, design: .monospaced))
                .foregroundStyle(.white.opacity(0.56))
            Text(value)
                .font(.title3.weight(.black))
                .foregroundStyle(accent)
                .lineLimit(2)
                .minimumScaleFactor(0.8)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(14)
        .background(
            RoundedRectangle(cornerRadius: 18, style: .continuous)
                .fill(Color.white.opacity(0.06))
                .overlay(
                    RoundedRectangle(cornerRadius: 18, style: .continuous)
                        .stroke(Color.white.opacity(0.08), lineWidth: 1)
                )
        )
    }

    private func workoutEntryField(label: String, unit: String, placeholder: String, text: Binding<String>, keyboard: UIKeyboardType) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(label.uppercased())
                .font(.system(size: 9, weight: .black, design: .monospaced))
                .foregroundStyle(.white.opacity(0.56))
            HStack {
                Text(unit)
                    .font(.caption.weight(.bold))
                    .foregroundStyle(.white.opacity(0.42))
                Spacer()
                TextField(placeholder, text: text)
                    .keyboardType(keyboard)
                    .multilineTextAlignment(.trailing)
                    .font(.title2.weight(.black))
                    .foregroundStyle(.white)
            }
            .padding(14)
            .background(
                RoundedRectangle(cornerRadius: 18, style: .continuous)
                    .fill(Color.white.opacity(0.08))
                    .overlay(
                        RoundedRectangle(cornerRadius: 18, style: .continuous)
                            .stroke(Color.white.opacity(0.1), lineWidth: 1)
                    )
            )
        }
    }

    private var totalSetCount: Int {
        exercises.reduce(0) { $0 + max($1.sets ?? 0, 0) }
    }

    private var completedSetCount: Int {
        loggedSets.reduce(0) { $0 + $1.count }
    }

    private var currentExerciseLoggedSets: [LoggedSet] {
        loggedSets[safe: exerciseIndex] ?? []
    }

    private var sessionProgress: CGFloat {
        let total = max(totalSetCount, 1)
        return min(max(CGFloat(completedSetCount) / CGFloat(total), 0.04), 1)
    }

    private var nextActionLabel: String {
        let currentSets = currentExerciseLoggedSets.count + 1
        let targetSets = currentExercise?.sets ?? 1
        if exerciseIndex + 1 >= exercises.count && currentSets >= targetSets {
            return "Finish Session"
        }
        if currentSets >= targetSets {
            return "Log Set And Recover"
        }
        return "Log Set"
    }

    private var currentExercise: PlanExercise? {
        exercises[safe: exerciseIndex]
    }

    private var currentMotionPattern: MotionMovementPattern {
        MotionMovementPattern.infer(from: currentExercise?.name)
    }

    private var primaryExerciseName: String {
        exercises.first?.name ?? "Adaptive Strength Session"
    }

    private var currentExerciseFocus: String {
        exercises.first?.intensity ?? "Strength"
    }

    private var sessionTitle: String {
        sessionFocus ?? primaryExerciseName
    }

    private var sessionFocusLabel: String {
        sessionFocus ?? currentExerciseFocus
    }

    private func buildWorkoutLog() -> WorkoutLog {
        var log = WorkoutLog()
        log.user_id = auth.currentUserId
        log.date = DateHelpers.todayLocal
        log.workout_type = "Guided"
        log.duration_minutes = sessionDurationMinutes ?? 45
        log.exercises = exercises.enumerated().map { i, ex in
            let exLogs = i < loggedSets.count ? loggedSets[i] : []
            let maxWeight = exLogs.compactMap { $0.weight }.max() ?? 0.0
            let setDetailsStr = exLogs.enumerated().map { j, setLog in
                "Set \(j+1): \(setLog.weight ?? 0)lbs x \(setLog.reps ?? 0)"
            }.joined(separator: "; ")
            let finalNotes = (ex.notes != nil && !ex.notes!.isEmpty) ? "\(ex.notes!) | Log: \(setDetailsStr)" : "Log: \(setDetailsStr)"
            return WorkoutExerciseEntry(name: ex.name, sets: ex.sets, reps: ex.reps, weight_kg: maxWeight > 0 ? maxWeight : nil, rpe: nil, form_cues: finalNotes)
        }
        return log
    }

    @Environment(\.modelContext) private var modelContext

    private func saveAndGetInsight() async {
        guard let ds = dataService else { return }
        // Optimistic: mark saved immediately so the completion screen shows the badge at once.
        await MainActor.run { saved = true }

        let apiLog = buildWorkoutLog()
        
        // --- OFFLINE-FIRST PERSISTENCE ---
        let persistentExercises = exercises.enumerated().compactMap { i, ex -> PersistentExerciseLog? in
            let exLogs = i < loggedSets.count ? loggedSets[i] : []
            let maxWeight = exLogs.compactMap { $0.weight }.max()
            let repsStr = ex.reps ?? "0"
            return PersistentExerciseLog(name: ex.name ?? "Exercise", sets: exLogs.count, reps: repsStr, weight: maxWeight)
        }
        
        let localWorkout = PersistentWorkoutLog(
            userId: auth.currentUserId ?? "anon",
            date: DateHelpers.todayLocal,
            workoutType: "Guided",
            exercises: persistentExercises
        )
        localWorkout.logId = sessionLogId
        localWorkout.notes = apiLog.notes
        
        modelContext.insert(localWorkout)
        try? modelContext.save()
        
        // Attempt immediate sync if connected
        if NetworkMonitor.shared.isConnected {
            var log = apiLog
            log.log_id = sessionLogId
            try? await ds.upsertWorkoutLog(log)
            localWorkout.isSynced = true
            try? modelContext.save()
        } else {
            print("Offline mode: workout saved locally for future sync.")
        }
        
        _ = try? await api.analyticsProcessPRs()
        _ = try? await api.awardsCheck()

        await MainActor.run { insightLoading = true }
        let insight = try? await api.aiPostWorkoutInsight(dateLocal: DateHelpers.todayLocal)
        await MainActor.run {
            postWorkoutInsight = insight?.insight
            insightLoading = false
        }
    }

    private func speakCoachCue(for phase: Phase) {
        guard coachAudio.isEnabled else { return }
        
        switch phase {
        case .overview:
            coachAudio.playCue(.startWorkout, fallbackText: "Your protocol is ready. Review the execution order and let's get to work.")
        case .work:
            if let name = currentExercise?.name {
                coachAudio.playCue(.startSet, details: ["exercise": name], fallbackText: "Next set: \(name). Focus on quality reps.")
            }
        case .rest:
            coachAudio.playCue(.finishSet, fallbackText: "Set complete. Recover and reset.")
        case .completed:
            coachAudio.playCue(.finishWorkout, fallbackText: "Session closed. Insight analysis incoming.")
        case .exerciseIntro:
            if let name = currentExercise?.name {
                coachAudio.playCue(.startSet, details: ["exercise": name], fallbackText: "Next up: \(name). Here's your execution guide.")
            }
        case .loading:
            break
        }
    }

    private func setupPulseSubscription() async {
        guard let myId = auth.currentUserId else { return }
        
        let channel = auth.supabaseClient.channel("synapse_pulses_\(myId)")
        try? await channel.subscribeWithError()
        
        Task {
            for await message in channel.broadcastStream(event: "pulse") {
                guard let senderName = message["sender_name"]?.stringValue else { continue }
                
                await MainActor.run {
                    self.pulseMessage = "\(senderName.uppercased()) SENT A PULSE!"
                    
                    withAnimation { self.showingPulseAnimation = true }
                    
                    // Animation sequence
                    withAnimation(.spring(response: 0.3, dampingFraction: 0.4)) {
                        self.pulseScale = 1.2
                        self.pulseOpacity = 1.0
                    }
                    
                    // Haptic feedback (Success means "Good job!")
                    UINotificationFeedbackGenerator().notificationOccurred(.success)
                }
                
                try? await Task.sleep(nanoseconds: 2_500_000_000)
                
                await MainActor.run {
                    withAnimation(.easeOut(duration: 0.3)) {
                        self.pulseScale = 0.8
                        self.pulseOpacity = 0.0
                    }
                }
                
                try? await Task.sleep(nanoseconds: 300_000_000)
                
                await MainActor.run {
                    withAnimation { self.showingPulseAnimation = false }
                }
            }
        }
    }

    @MainActor
    private func seedSession(from trainingPlan: TrainingPlan) {
        seedSession(
            exercises: trainingPlan.exercises ?? [],
            focus: trainingPlan.focus,
            durationMinutes: trainingPlan.duration_minutes
        )
    }

    @MainActor
    private func seedSession(exercises: [PlanExercise], focus: String?, durationMinutes: Int?) {
        self.exercises = exercises
        sessionFocus = focus
        sessionDurationMinutes = durationMinutes
        loggedSets = Array(repeating: [], count: exercises.count)
        phase = exercises.isEmpty ? .completed : .overview
        // Pre-fetch demo video for the first exercise.
        if let first = exercises.first { prefetchDemoURL(for: first) }
    }

    private var workoutBackButton: some View {
        Button(action: { phase = .overview }) {
            Image(systemName: "chevron.left")
                .font(.headline.weight(.bold))
                .foregroundStyle(.white)
                .frame(width: 42, height: 42)
                .background(
                    Circle()
                        .fill(Color.white.opacity(0.08))
                        .overlay(Circle().stroke(Color.white.opacity(0.12), lineWidth: 1))
                )
        }
    }
}

private extension Array {
    subscript(safe index: Int) -> Element? {
        indices.contains(index) ? self[index] : nil
    }
}
