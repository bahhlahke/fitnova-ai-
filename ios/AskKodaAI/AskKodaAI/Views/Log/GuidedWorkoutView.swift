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

    init(exercises: [PlanExercise] = [], trainingPlan: TrainingPlan? = nil) {
        self.initialExercises = trainingPlan?.exercises ?? exercises
        self.initialTrainingPlan = trainingPlan
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
    @State private var heartRate = 148              // Simulated post-set HR for neural rest mode
    @State private var isFormCheckActive = false
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
    struct LoggedSet { var weight: Double?; var reps: Int? }
    // Array of sets per exercise index
    @State private var loggedSets: [[LoggedSet]] = []
    @State private var currentWeightInput: String = ""
    @State private var currentRepsInput: String = ""

    // Pulse state
    @State private var showingPulseAnimation = false
    @State private var pulseMessage = ""
    @State private var pulseScale = 0.8
    @State private var pulseOpacity = 0.0

    private let restSeconds = 90
    private var api: KodaAPIService { KodaAPIService(getAccessToken: { auth.accessToken }) }
    private var dataService: KodaDataService? {
        guard let uid = auth.currentUserId else { return nil }
        return KodaDataService(client: auth.supabaseClient, userId: uid)
    }

    enum Phase { case loading, overview, work, rest, completed }

    var body: some View {
        Group {
            switch phase {
            case .loading:
                ProgressView("Loading plan…")
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            case .overview:
                overviewView
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
        }
        .onDisappear {
            stopNeuralMastery()
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

                    VStack(alignment: .leading, spacing: 12) {
                        PremiumSectionHeader("Exercise Order", eyebrow: "Plan")
                        ForEach(Array(exercises.enumerated()), id: \.offset) { i, ex in
                            overviewExerciseRow(index: i, exercise: ex)
                        }
                    }

                    Button(action: {
                        phase = exercises.isEmpty ? .completed : .work
                        setIndex = 0
                    }) {
                        Text("Start Session")
                    }
                    .buttonStyle(PremiumActionButtonStyle())
                }
                .padding()
            }
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
        }
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
        let isOptimal = heartRate <= recoveryTarget

        return VStack(spacing: 20) {
            Spacer()

            VStack(spacing: 18) {
                Text(neuralRestMode ? "Neural recovery active" : "Rest phase")
                    .font(.system(size: 10, weight: .black, design: .monospaced))
                    .tracking(1.2)
                    .foregroundStyle(Brand.Color.accent)

                if neuralRestMode {
                    NeuralRestHUD(
                        heartRate: heartRate,
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
                        targetCard(title: "Heart Rate", value: "\(heartRate)", accent: .white)
                        targetCard(title: "Target", value: "\(recoveryTarget)", accent: Brand.Color.accent)
                        targetCard(title: "Ready", value: isOptimal ? "Yes" : "Not Yet", accent: isOptimal ? Brand.Color.success : Brand.Color.warning)
                    }

                    VStack(spacing: 12) {
                        targetCard(title: "Heart Rate", value: "\(heartRate)", accent: .white)
                        targetCard(title: "Target", value: "\(recoveryTarget)", accent: Brand.Color.accent)
                        targetCard(title: "Ready", value: isOptimal ? "Yes" : "Not Yet", accent: isOptimal ? Brand.Color.success : Brand.Color.warning)
                    }
                }

                VStack(alignment: .leading, spacing: 6) {
                    Text("Up next")
                        .font(.system(size: 10, weight: .black, design: .monospaced))
                        .tracking(1.1)
                        .foregroundStyle(Brand.Color.accent)
                    Text(ex.name ?? "Next Exercise")
                        .font(.title3.weight(.black))
                        .foregroundStyle(.white)
                    Text(isOptimal ? "Recovery threshold met. You can move into the next effort early." : "Hold position, slow breathing, and let readiness catch up before the override.")
                        .font(.subheadline)
                        .foregroundStyle(Brand.Color.muted)
                        .fixedSize(horizontal: false, vertical: true)
                }

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
        // Save current input to state
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
                Task { await saveAndGetInsight() }
            } else {
                exerciseIndex += 1
                setIndex = 0
                startRestTimer()
            }
        } else {
            setIndex += 1
            startRestTimer()
        }
    }
    
    // Extracted logic to skip rest
    private func advanceRest() {
        restRemaining = 0 // Causes loop to exit
    }

    private func startRestTimer() {
        phase = .rest
        restRemaining = restSeconds

        if neuralRestMode {
            heartRate = 148       // Simulate high post-set HR
            recoveryTarget = 110  // Simulated PhD-level target
        }
        
        Task {
            for i in (0..<restSeconds).reversed() {
                try? await Task.sleep(nanoseconds: 1_000_000_000)
                await MainActor.run { 
                    restRemaining = i 
                    if neuralRestMode && heartRate > recoveryTarget {
                        // Simulate HR drop by 1-3 bpm per second
                        heartRate -= Int.random(in: 1...3)
                        if heartRate < recoveryTarget { heartRate = recoveryTarget }
                    }
                }
                
                if i == 0 || (neuralRestMode && heartRate <= recoveryTarget && i < restSeconds - 10) {
                    await MainActor.run { phase = .work }
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
            }
        } catch {
             await MainActor.run { swapFeedback = "Override failed. Try again." }
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
                        HStack {
                            Text("BIOMECHANICAL SCORE:")
                                .font(.system(size: 9, weight: .bold))
                                .foregroundStyle(.secondary)
                            Spacer()
                            Text("\(Int(result.score ?? 0))")
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
                let res = try await api.aiVision(images: capturedPhotos)
                await MainActor.run {
                    formCheckResult = res
                    formCheckLoading = false
                }
            } catch {
                await MainActor.run { formCheckLoading = false }
            }
        }
    }
    
    private func startNeuralMastery() {
        healthKit.startHeartRateStreaming()
    }
    
    private func stopNeuralMastery() {
        healthKit.stopHeartRateStreaming()
    }
    
    private func calculateRecoveryScore() -> Double {
        guard let hr = healthKit.currentHeartRate else { return 0.5 }
        let spread = 160.0 - Double(recoveryTarget)
        let progress = 1.0 - (Double(hr - recoveryTarget) / spread)
        return max(0, min(1, progress))
    }
    
    private func getSteeringMessage() -> String? {
        guard let hr = healthKit.currentHeartRate else { return "Waiting for Synapse data..." }
        
        if hr <= recoveryTarget {
            return "Metabolic Reset Complete. Readiness Optimal."
        } else if restRemaining < 20 && hr > recoveryTarget + 20 {
            return "Recovery Lag Detected. Suggest Neural Override."
        } else if hr > 150 {
            return "High Intensity Signal. Focus on Deep Respiration."
        } else {
            return "Physiological Calibration in Progress..."
        }
    }
    

    // MARK: - Helpers
    
    private func resolveAssetUrl(ex: PlanExercise) -> URL? {
        let assetStr = ex.cinema_video_url ?? ex.video_url ?? ex.image_url
        let finalStr = ExerciseImages.getExerciseImageUrl(exerciseName: ex.name ?? "", overrideUrl: assetStr)
        
        if finalStr.hasPrefix("http") {
            return URL(string: finalStr)
        } else {
            // Assume relative to web server if it starts with /
            let path = finalStr.hasPrefix("/") ? String(finalStr.dropFirst()) : finalStr
            return AppConfig.apiBaseURL.appendingPathComponent(path)
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

    private func saveAndGetInsight() async {
        guard let ds = dataService else { return }
        var log = WorkoutLog()
        log.date = DateHelpers.todayLocal
        log.workout_type = "Guided"
        log.duration_minutes = sessionDurationMinutes ?? 45
        log.exercises = exercises.enumerated().map { i, ex in
            let exLogs = i < loggedSets.count ? loggedSets[i] : []
            // Use max weight among sets for DB, similar to web logic for now
            let maxWeight = exLogs.compactMap { $0.weight }.max() ?? 0.0
            
            // Format detailed cues string for now to preserve per-set data until jsonb DB support
            let setDetailsStr = exLogs.enumerated().map { j, setLog in
                "Set \(j+1): \(setLog.weight ?? 0)lbs x \(setLog.reps ?? 0)"
            }.joined(separator: "; ")
            
            let finalNotes = ex.notes != nil ? "\(ex.notes!) | Log: \(setDetailsStr)" : "Log: \(setDetailsStr)"

            return WorkoutExerciseEntry(name: ex.name, sets: ex.sets, reps: ex.reps, weight_kg: maxWeight > 0 ? maxWeight : nil, form_cues: finalNotes)
        }
        try? await ds.insertWorkoutLog(log)
        _ = try? await api.analyticsProcessPRs()
        _ = try? await api.awardsCheck()
        await MainActor.run { saved = true }
        insightLoading = true
        let insight = try? await api.aiPostWorkoutInsight(dateLocal: DateHelpers.todayLocal)
        await MainActor.run {
            postWorkoutInsight = insight?.insight
            insightLoading = false
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
