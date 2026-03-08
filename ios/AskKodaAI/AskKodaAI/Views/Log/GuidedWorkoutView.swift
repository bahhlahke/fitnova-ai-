//
//  GuidedWorkoutView.swift
//  Koda AI
//
//  Guided workout from today's plan: exercises → sets → rest → save. Optional swap exercise.
//

import SwiftUI
import Supabase
import Realtime

struct GuidedWorkoutView: View {
    @EnvironmentObject var auth: SupabaseService
    @StateObject private var healthKit = HealthKitService.shared
    @State private var exercises: [PlanExercise] = []
    @State private var exerciseIndex = 0
    @State private var setIndex = 0
    @State private var phase: Phase = .loading
    @State private var restRemaining = 0
    @State private var errorMessage: String?
    @State private var saved = false
    @State private var postWorkoutInsight: String?
    @State private var insightLoading = false
    @State private var hasSpotify = false

    // Neural Mastery State (Phase 5)
    @State private var neuralRestMode = true
    @State private var recoveryTarget = 110
    @State private var isFormCheckActive = false
    @State private var formCheckLoading = false
    @State private var formCheckResult: VisionAnalysisResponse?
    @State private var capturedPhotos: [String] = [] // Base64 strings for simplicity in this flow

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
    private var api: KodaAPIService { KodaAPIService(getAccessToken: { await auth.accessToken }) }
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
            await loadPlan()
            hasSpotify = (try? await api.spotifyToken()) != nil
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
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                Text("Today's session")
                    .font(.headline)
                ForEach(Array(exercises.enumerated()), id: \.offset) { i, ex in
                    HStack {
                        Text(ex.name ?? "Exercise \(i+1)")
                        Spacer()
                        Text("\(ex.sets ?? 0)×\(ex.reps ?? "-")")
                            .foregroundStyle(.secondary)
                    }
                    .padding(8)
                    .background(Color(.systemGray6))
                    .clipShape(RoundedRectangle(cornerRadius: 8))
                }
                Button("Start workout") {
                    phase = exercises.isEmpty ? .completed : .work
                    setIndex = 0
                }
                .buttonStyle(.borderedProminent)
                .frame(maxWidth: .infinity)
            }
            .padding()
        }
    }

    private var workoutView: some View {
        let ex = exercises[safe: exerciseIndex] ?? PlanExercise(name: nil, sets: nil, reps: nil, notes: nil)
        
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
                // Header (Progress & Exit)
                HStack {
                    Button(action: { phase = .overview }) {
                        Image(systemName: "xmark.circle.fill")
                            .font(.title2)
                            .foregroundStyle(.white.opacity(0.6))
                    }
                    Spacer()
                    if hasSpotify {
                        SpotifyPlayerView()
                            .frame(width: 150, height: 40)
                            .clipShape(Capsule())
                    }
                }
                .padding(.horizontal)
                .padding(.top, 10)

                Spacer()
                
                if phase == .rest {
                    // Rest UI
                    VStack(spacing: 8) {
                        if neuralRestMode {
                            Text("NEURAL RECOVERY ACTIVE")
                                .font(.caption2)
                                .fontWeight(.black)
                                .tracking(2)
                                .foregroundStyle(Brand.Color.accent)
                                VStack(spacing: 30) {
                        NeuralRestHUD(
                            heartRate: healthKit.currentHeartRate,
                            timeRemaining: restRemaining,
                            recoveryScore: calculateRecoveryScore(),
                            steeringMessage: getSteeringMessage()
                        )
                        .padding(.top, 40)
                        
                        VStack(spacing: 4) {
                            Text("UP NEXT:")
                                .font(.system(size: 10, weight: .black))
                                .foregroundStyle(Brand.Color.accent.opacity(0.6))
                            Text(ex.name?.uppercased() ?? "NEXT PROTOCOL")
                                .font(.system(size: 24, weight: .black))
                                .italic()
                                .foregroundStyle(.white)
                        }
                    }
                    
                    Spacer()
                        } else {
                            Text("REST PHASE")
                                .font(.caption)
                                .fontWeight(.black)
                                .tracking(3)
                                .foregroundStyle(Color.accentColor)
                            
                            Text("\(restRemaining)")
                                .font(.system(size: 96, weight: .black, design: .rounded))
                                .italic()
                                .foregroundStyle(.white)
                                .shadow(color: .accentColor.opacity(0.5), radius: 20)
                            
                            Text("SECONDS")
                                .font(.headline)
                                .fontWeight(.bold)
                                .foregroundStyle(Color.accentColor)
                        }
                        
                        VStack(spacing: 4) {
                            Text("UP NEXT:")
                                .font(.caption2)
                                .fontWeight(.bold)
                                .foregroundStyle(.white.opacity(0.5))
                                .padding(.top, 30)
                            Text(ex.name ?? "Next Exercise")
                                .font(.title3)
                                .fontWeight(.black)
                                .foregroundStyle(.white)
                        }
                    }
                    
                    Spacer()
                    
                    Button(action: advanceRest) {
                        let isOptimal = (healthKit.currentHeartRate ?? 0) <= recoveryTarget
                        Text(isOptimal ? "ENGAGE NEXT SET" : "RECOVERY OVERRIDE")
                            .font(.system(size: 14, weight: .black))
                            .frame(maxWidth: .infinity)
                            .padding()
                            .background(isOptimal ? Brand.Color.accent : Color.white.opacity(0.05))
                            .foregroundStyle(isOptimal ? .black : .white)
                            .clipShape(Capsule())
                    }
                    .padding(.horizontal, 40)
                    .padding(.bottom, 40)
                    
                } else {
                    // Work UI
                    VStack(spacing: 20) {
                        // Title
                        VStack(spacing: 4) {
                            Text("SET \(setIndex + 1) OF \(ex.sets ?? 0)")
                                .font(.caption2)
                                .fontWeight(.black)
                                .tracking(2)
                                .foregroundStyle(Color.accentColor)
                            Text(ex.name ?? "Exercise")
                                .font(.system(size: 44, weight: .black, design: .default))
                                .italic()
                                .multilineTextAlignment(.center)
                                .foregroundStyle(.white)
                        }
                        
                        // Coaching Cues Table
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
                        }
                        .padding(.horizontal)
                        
                        // Targets
                        HStack(spacing: 12) {
                            VStack {
                                Text("TARGET")
                                    .font(.caption2)
                                    .fontWeight(.bold)
                                    .foregroundStyle(.white.opacity(0.6))
                                Text(ex.reps ?? "-")
                                    .font(.title2)
                                    .fontWeight(.black)
                                    .foregroundStyle(.white)
                            }
                            .frame(maxWidth: .infinity)
                            .padding()
                            .background(Color.white.opacity(0.05))
                            .clipShape(RoundedRectangle(cornerRadius: 16))
                            
                            VStack {
                                Text("INTENSITY")
                                    .font(.caption2)
                                    .fontWeight(.bold)
                                    .foregroundStyle(.white.opacity(0.6))
                                Text(ex.intensity ?? "Push")
                                    .font(.title2)
                                    .fontWeight(.black)
                                    .foregroundStyle(Color.accentColor)
                            }
                            .frame(maxWidth: .infinity)
                            .padding()
                            .background(Color.white.opacity(0.05))
                            .clipShape(RoundedRectangle(cornerRadius: 16))
                            
                            if let rir = ex.target_rir {
                                VStack {
                                    Text("RIR")
                                        .font(.caption2)
                                        .fontWeight(.bold)
                                        .foregroundStyle(.white.opacity(0.6))
                                    Text("\(rir)")
                                        .font(.title2)
                                        .fontWeight(.black)
                                        .foregroundStyle(.orange)
                                }
                                .frame(maxWidth: .infinity)
                                .padding()
                                .background(Color.white.opacity(0.05))
                                .clipShape(RoundedRectangle(cornerRadius: 16))
                            }
                        }
                        
                        // Inputs
                        VStack(alignment: .leading, spacing: 12) {
                            Text("LOG THIS SET")
                                .font(.caption2)
                                .fontWeight(.bold)
                                .tracking(1)
                                .foregroundStyle(.white.opacity(0.6))
                            
                            HStack(spacing: 12) {
                                HStack {
                                    Text("LBS")
                                        .font(.caption)
                                        .fontWeight(.bold)
                                        .foregroundStyle(.white.opacity(0.4))
                                    TextField("0", text: $currentWeightInput)
                                        .keyboardType(.decimalPad)
                                        .multilineTextAlignment(.trailing)
                                        .font(.title2.weight(.black))
                                        .foregroundStyle(.white)
                                }
                                .padding()
                                .background(Color.white.opacity(0.1))
                                .clipShape(RoundedRectangle(cornerRadius: 16))
                                .overlay(RoundedRectangle(cornerRadius: 16).stroke(Color.white.opacity(0.2), lineWidth: 1))
                                
                                HStack {
                                    Text("REPS")
                                        .font(.caption)
                                        .fontWeight(.bold)
                                        .foregroundStyle(.white.opacity(0.4))
                                    TextField(ex.reps?.components(separatedBy: "-").first ?? "0", text: $currentRepsInput)
                                        .keyboardType(.numberPad)
                                        .multilineTextAlignment(.trailing)
                                        .font(.title2.weight(.black))
                                        .foregroundStyle(.white)
                                }
                                .padding()
                                .background(Color.white.opacity(0.1))
                                .clipShape(RoundedRectangle(cornerRadius: 16))
                                .overlay(RoundedRectangle(cornerRadius: 16).stroke(Color.white.opacity(0.2), lineWidth: 1))
                            }
                        }
                    }
                    .padding(.horizontal, 20)
                    
                    Spacer().frame(height: 30)
                    
                    // Actions
                    VStack(spacing: 12) {
                        Button(action: { advanceSet() }) {
                            Text("LOG SET")
                                .font(.title3)
                                .fontWeight(.black)
                                .frame(maxWidth: .infinity)
                                .padding()
                                .background(Color.accentColor)
                                .foregroundStyle(.black)
                                .clipShape(Capsule())
                                .shadow(color: .accentColor.opacity(0.3), radius: 20, y: 10)
                        }
                        
                        HStack(spacing: 12) {
                            Button(action: { isFormCheckActive = true }) {
                                HStack {
                                    Image(systemName: "camera.viewfinder")
                                    Text("NEURAL FORM CHECK")
                                }
                                .font(.system(size: 10, weight: .black, design: .monospaced))
                                .padding(.vertical, 10)
                                .frame(maxWidth: .infinity)
                                .background(Color.white.opacity(0.05))
                                .foregroundStyle(Color.accentColor)
                                .clipShape(RoundedRectangle(cornerRadius: 12))
                                .overlay(RoundedRectangle(cornerRadius: 12).stroke(Color.accentColor.opacity(0.3), lineWidth: 1))
                            }
                            
                            Button(action: { isSwapOptionsVisible = true }) {
                                VStack(spacing: 4) {
                                    Text("AI OVERRIDE")
                                        .font(.system(size: 10, weight: .black, design: .monospaced))
                                        .foregroundStyle(.white.opacity(0.6))
                                }
                                .padding(.vertical, 10)
                                .frame(maxWidth: .infinity)
                                .background(Color.white.opacity(0.05))
                                .clipShape(RoundedRectangle(cornerRadius: 12))
                                .overlay(RoundedRectangle(cornerRadius: 12).stroke(Color.white.opacity(0.1), lineWidth: 1))
                            }
                        }
                    }
                    .padding(.horizontal, 20)
                    .padding(.bottom, 30)
                }
            }
        }
    }

    private var completedView: some View {
        ScrollView {
            VStack(spacing: 20) {
                Text("Workout complete!")
                    .font(.title)
                if saved {
                    Text("Saved to your log.")
                        .foregroundStyle(.green)
                }
                if insightLoading {
                    ProgressView("Getting insight…")
                } else if let insight = postWorkoutInsight {
                    Text(insight)
                        .font(.subheadline)
                        .padding()
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .background(Color.accentColor.opacity(0.1))
                        .clipShape(RoundedRectangle(cornerRadius: 12))
                }
            }
            .padding()
        }
    }

    private func loadPlan() async {
        guard let ds = dataService else { return }
        do {
            let plan = try await ds.fetchDailyPlan(dateLocal: DateHelpers.todayLocal)
            let list = plan?.training_plan?.exercises ?? []
            await MainActor.run {
                exercises = list
                loggedSets = Array(repeating: [], count: list.count)
                phase = list.isEmpty ? .completed : .overview
            }
        } catch {
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
            heartRate = 148 // Simulate high post-set HR
            recoveryTarget = 110 // Simulated PhD-level target
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
                let newEx = PlanExercise(name: rep, sets: res.replacement?.sets ?? ex?.sets, reps: res.replacement?.reps ?? ex?.reps, notes: res.replacement?.notes)
                
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
    
    private func selectedItems: [PhotosPickerItem] = [] // Temp holder for PhotosPicker

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

    private func saveAndGetInsight() async {
        guard let ds = dataService else { return }
        var log = WorkoutLog()
        log.date = DateHelpers.todayLocal
        log.workout_type = "Guided"
        log.duration_minutes = 45
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
        await channel.subscribe()
        
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
}

private extension Array {
    subscript(safe index: Int) -> Element? {
        indices.contains(index) ? self[index] : nil
    }
}
