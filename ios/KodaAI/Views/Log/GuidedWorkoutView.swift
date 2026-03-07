//
//  GuidedWorkoutView.swift
//  Koda AI
//
//  Guided/coached workout session.
//  • Loads from today's saved plan (default)
//  • OR accepts injected exercises from the Coach chat (chat-initiated sessions)
//  • Dark design parity with web interface
//  • Exercise → sets → rest countdown → save + post-workout insight
//

import SwiftUI

struct GuidedWorkoutView: View {
    @EnvironmentObject var auth: SupabaseService
    @Environment(\.dismiss) private var dismiss

    /// When launched from the Coach chat, exercises are passed directly.
    /// When nil, exercises are fetched from today's saved plan.
    var injectedExercises: [PlanExercise]?

    @State private var exercises: [PlanExercise] = []
    @State private var exerciseIndex = 0
    @State private var setIndex = 0
    @State private var phase: Phase = .loading
    @State private var restRemaining = 0
    @State private var errorMessage: String?
    @State private var saved = false
    @State private var postWorkoutInsight: String?
    @State private var insightLoading = false
    @State private var elapsedSeconds = 0
    @State private var elapsedTimer: Task<Void, Never>?

    private let restSeconds = 90
    private let accent = Color(red: 0.04, green: 0.85, blue: 0.77)
    private var api: KodaAPIService { KodaAPIService(getAccessToken: { await auth.accessToken }) }
    private var dataService: KodaDataService? {
        guard let uid = auth.currentUserId else { return nil }
        return KodaDataService(client: auth.supabaseClient, userId: uid)
    }

    enum Phase { case loading, overview, work, rest, completed }

    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()
            Group {
                switch phase {
                case .loading: loadingView
                case .overview: overviewView
                case .work: workView
                case .rest: restView
                case .completed: completedView
                }
            }
        }
        .navigationTitle("")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar { toolbarContent }
        .preferredColorScheme(.dark)
        .task { await loadExercises() }
        .onDisappear { elapsedTimer?.cancel() }
    }

    // MARK: – Loading

    private var loadingView: some View {
        VStack(spacing: 16) {
            ProgressView()
                .scaleEffect(1.4)
                .tint(accent)
            Text("LOADING SESSION")
                .font(.system(size: 11, weight: .black))
                .tracking(2)
                .foregroundColor(Color(white: 0.4))
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    // MARK: – Overview

    private var overviewView: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                // Header
                VStack(alignment: .leading, spacing: 6) {
                    Text("TODAY'S SESSION")
                        .font(.system(size: 10, weight: .black))
                        .tracking(3)
                        .foregroundColor(accent)
                    Text("\(exercises.count) Exercises")
                        .font(.system(size: 28, weight: .black))
                        .italic()
                        .foregroundColor(.white)
                }
                .padding(.top, 8)

                if let err = errorMessage {
                    Text(err)
                        .font(.system(size: 13, weight: .medium))
                        .foregroundColor(.red)
                        .padding()
                        .background(Color.red.opacity(0.1))
                        .clipShape(RoundedRectangle(cornerRadius: 12))
                }

                // Exercise list
                VStack(spacing: 10) {
                    ForEach(Array(exercises.enumerated()), id: \.offset) { i, ex in
                        HStack(spacing: 14) {
                            Text("\(i + 1)")
                                .font(.system(size: 13, weight: .black))
                                .foregroundColor(accent)
                                .frame(width: 28)
                            VStack(alignment: .leading, spacing: 2) {
                                Text(ex.name ?? "Exercise \(i + 1)")
                                    .font(.system(size: 15, weight: .bold))
                                    .foregroundColor(.white)
                                if let notes = ex.notes, !notes.isEmpty {
                                    Text(notes)
                                        .font(.system(size: 11, weight: .medium))
                                        .foregroundColor(Color(white: 0.45))
                                }
                            }
                            Spacer()
                            Text("\(ex.sets ?? 0) × \(ex.reps ?? "—")")
                                .font(.system(size: 13, weight: .black))
                                .foregroundColor(Color(white: 0.6))
                        }
                        .padding(.horizontal, 16)
                        .padding(.vertical, 12)
                        .background(Color(white: 0.07))
                        .clipShape(RoundedRectangle(cornerRadius: 14))
                        .overlay(RoundedRectangle(cornerRadius: 14).stroke(Color(white: 0.12), lineWidth: 1))
                    }
                }

                // Start button
                Button(action: startSession) {
                    HStack(spacing: 10) {
                        Image(systemName: "play.fill")
                            .font(.system(size: 14, weight: .black))
                        Text("START SESSION")
                            .font(.system(size: 14, weight: .black))
                            .tracking(2)
                    }
                    .foregroundColor(.black)
                    .frame(maxWidth: .infinity)
                    .frame(height: 56)
                    .background(exercises.isEmpty ? Color(white: 0.2) : accent)
                    .clipShape(RoundedRectangle(cornerRadius: 16))
                }
                .disabled(exercises.isEmpty)
                .padding(.top, 8)
            }
            .padding(.horizontal, 20)
            .padding(.bottom, 32)
        }
    }

    // MARK: – Work phase

    private var workView: some View {
        let ex = exercises[safe: exerciseIndex] ?? PlanExercise(name: nil, sets: nil, reps: nil, notes: nil)
        let totalSets = ex.sets ?? 1

        return VStack(spacing: 0) {
            // Progress bar
            GeometryReader { geo in
                ZStack(alignment: .leading) {
                    Color(white: 0.1)
                    accent.opacity(0.8)
                        .frame(width: geo.size.width * progressFraction)
                }
                .frame(height: 3)
            }
            .frame(height: 3)

            Spacer()

            VStack(spacing: 28) {
                // Exercise info
                VStack(spacing: 8) {
                    Text("EXERCISE \(exerciseIndex + 1) OF \(exercises.count)")
                        .font(.system(size: 10, weight: .black))
                        .tracking(3)
                        .foregroundColor(Color(white: 0.4))
                    Text(ex.name ?? "Exercise")
                        .font(.system(size: 32, weight: .black))
                        .italic()
                        .foregroundColor(.white)
                        .multilineTextAlignment(.center)
                }

                // Set + reps
                VStack(spacing: 6) {
                    Text("SET \(setIndex + 1) OF \(totalSets)")
                        .font(.system(size: 13, weight: .black))
                        .tracking(2)
                        .foregroundColor(accent)
                    Text(ex.reps ?? "—")
                        .font(.system(size: 48, weight: .black))
                        .foregroundColor(.white)
                    if let notes = ex.notes, !notes.isEmpty {
                        Text(notes)
                            .font(.system(size: 13, weight: .medium))
                            .foregroundColor(Color(white: 0.45))
                            .multilineTextAlignment(.center)
                            .padding(.horizontal, 32)
                    }
                }

                // Timer
                Text(formatElapsed())
                    .font(.system(size: 14, weight: .medium).monospacedDigit())
                    .foregroundColor(Color(white: 0.3))

                // Actions
                HStack(spacing: 16) {
                    Button(action: { Task { await swapExercise() } }) {
                        HStack(spacing: 6) {
                            Image(systemName: "arrow.triangle.2.circlepath")
                            Text("SWAP")
                                .tracking(1)
                        }
                        .font(.system(size: 12, weight: .black))
                        .foregroundColor(Color(white: 0.6))
                        .padding(.horizontal, 20)
                        .padding(.vertical, 14)
                        .background(Color(white: 0.1))
                        .clipShape(RoundedRectangle(cornerRadius: 14))
                        .overlay(RoundedRectangle(cornerRadius: 14).stroke(Color(white: 0.15), lineWidth: 1))
                    }

                    Button(action: advanceSet) {
                        Text("DONE SET")
                            .font(.system(size: 14, weight: .black))
                            .tracking(2)
                            .foregroundColor(.black)
                            .padding(.horizontal, 28)
                            .padding(.vertical, 14)
                            .background(accent)
                            .clipShape(RoundedRectangle(cornerRadius: 14))
                    }
                }
            }
            .padding(.horizontal, 32)

            Spacer()
        }
    }

    // MARK: – Rest phase

    private var restView: some View {
        VStack(spacing: 28) {
            Spacer()

            Text("REST")
                .font(.system(size: 12, weight: .black))
                .tracking(4)
                .foregroundColor(Color(white: 0.4))

            // Countdown ring
            ZStack {
                Circle()
                    .stroke(Color(white: 0.1), lineWidth: 8)
                Circle()
                    .trim(from: 0, to: CGFloat(restRemaining) / CGFloat(restSeconds))
                    .stroke(accent, style: StrokeStyle(lineWidth: 8, lineCap: .round))
                    .rotationEffect(.degrees(-90))
                    .animation(.linear(duration: 1), value: restRemaining)
                Text("\(restRemaining)")
                    .font(.system(size: 64, weight: .black).monospacedDigit())
                    .foregroundColor(.white)
            }
            .frame(width: 180, height: 180)

            Text("Next: \(exercises[safe: exerciseIndex + 1]?.name ?? exercises[safe: exerciseIndex]?.name ?? "—")")
                .font(.system(size: 14, weight: .semibold))
                .foregroundColor(Color(white: 0.5))

            Button(action: { phase = .work }) {
                Text("SKIP REST")
                    .font(.system(size: 12, weight: .black))
                    .tracking(2)
                    .foregroundColor(Color(white: 0.5))
                    .padding(.horizontal, 24)
                    .padding(.vertical, 12)
                    .background(Color(white: 0.08))
                    .clipShape(RoundedRectangle(cornerRadius: 12))
            }

            Spacer()
        }
    }

    // MARK: – Completed

    private var completedView: some View {
        ScrollView {
            VStack(spacing: 24) {
                // Success header
                VStack(spacing: 12) {
                    Image(systemName: "checkmark.circle.fill")
                        .font(.system(size: 64, weight: .black))
                        .foregroundColor(accent)
                    Text("SESSION COMPLETE")
                        .font(.system(size: 22, weight: .black))
                        .italic()
                        .tracking(2)
                        .foregroundColor(.white)
                    if saved {
                        Text("Saved to your log")
                            .font(.system(size: 13, weight: .semibold))
                            .foregroundColor(accent)
                    }
                    Text(formatElapsed())
                        .font(.system(size: 14, weight: .medium).monospacedDigit())
                        .foregroundColor(Color(white: 0.4))
                }
                .padding(.top, 32)

                // Post-workout insight
                if insightLoading {
                    ProgressView()
                        .tint(accent)
                        .padding()
                } else if let insight = postWorkoutInsight {
                    VStack(alignment: .leading, spacing: 10) {
                        Text("COACH INSIGHT")
                            .font(.system(size: 10, weight: .black))
                            .tracking(3)
                            .foregroundColor(accent)
                        Text(insight)
                            .font(.system(size: 14, weight: .medium))
                            .foregroundColor(.white)
                            .lineSpacing(4)
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(20)
                    .background(Color(white: 0.07))
                    .clipShape(RoundedRectangle(cornerRadius: 16))
                    .overlay(RoundedRectangle(cornerRadius: 16).stroke(accent.opacity(0.3), lineWidth: 1))
                    .padding(.horizontal, 20)
                }

                Button(action: { dismiss() }) {
                    Text("DONE")
                        .font(.system(size: 14, weight: .black))
                        .tracking(2)
                        .foregroundColor(.black)
                        .frame(maxWidth: .infinity)
                        .frame(height: 52)
                        .background(accent)
                        .clipShape(RoundedRectangle(cornerRadius: 14))
                }
                .padding(.horizontal, 20)
                .padding(.bottom, 32)
            }
        }
    }

    // MARK: – Toolbar

    @ToolbarContentBuilder
    private var toolbarContent: some ToolbarContent {
        ToolbarItem(placement: .principal) {
            Text(phase == .overview ? "COACHED SESSION" : phase == .completed ? "COMPLETE" : exercises[safe: exerciseIndex]?.name?.uppercased() ?? "")
                .font(.system(size: 12, weight: .black))
                .italic()
                .tracking(1.5)
                .foregroundColor(.white)
        }
    }

    // MARK: – Logic

    private func loadExercises() async {
        // If exercises were injected from chat, use them directly
        if let injected = injectedExercises, !injected.isEmpty {
            await MainActor.run {
                exercises = injected
                phase = .overview
            }
            return
        }
        // Otherwise load from today's saved plan
        guard let ds = dataService else {
            await MainActor.run { phase = .overview }
            return
        }
        do {
            let plan = try await ds.fetchDailyPlan(dateLocal: DateHelpers.todayLocal)
            let list = plan?.training_plan?.exercises ?? []
            await MainActor.run {
                exercises = list
                phase = list.isEmpty ? .overview : .overview
                if list.isEmpty { errorMessage = "No plan for today. Describe a workout in the Coach tab first." }
            }
        } catch {
            await MainActor.run {
                errorMessage = error.localizedDescription
                phase = .overview
            }
        }
    }

    private func startSession() {
        guard !exercises.isEmpty else { return }
        exerciseIndex = 0
        setIndex = 0
        elapsedSeconds = 0
        phase = .work
        startElapsedTimer()
    }

    private func startElapsedTimer() {
        elapsedTimer?.cancel()
        elapsedTimer = Task {
            while !Task.isCancelled {
                try? await Task.sleep(nanoseconds: 1_000_000_000)
                await MainActor.run { elapsedSeconds += 1 }
            }
        }
    }

    private var progressFraction: Double {
        let total = exercises.reduce(0) { $0 + ($1.sets ?? 1) }
        guard total > 0 else { return 0 }
        let done = exercises.prefix(exerciseIndex).reduce(0) { $0 + ($1.sets ?? 1) } + setIndex
        return Double(done) / Double(total)
    }

    private func formatElapsed() -> String {
        let m = elapsedSeconds / 60
        let s = elapsedSeconds % 60
        return String(format: "%d:%02d", m, s)
    }

    private func advanceSet() {
        let ex = exercises[safe: exerciseIndex]
        let totalSets = ex?.sets ?? 1
        if setIndex + 1 >= totalSets {
            if exerciseIndex + 1 >= exercises.count {
                phase = .completed
                elapsedTimer?.cancel()
                Task { await saveAndGetInsight() }
            } else {
                exerciseIndex += 1
                setIndex = 0
                startRest()
            }
        } else {
            setIndex += 1
            startRest()
        }
    }

    private func startRest() {
        phase = .rest
        restRemaining = restSeconds
        Task {
            for remaining in stride(from: restSeconds - 1, through: 0, by: -1) {
                try? await Task.sleep(nanoseconds: 1_000_000_000)
                guard phase == .rest else { break }
                await MainActor.run { restRemaining = remaining }
            }
            if phase == .rest {
                await MainActor.run { phase = .work }
            }
        }
    }

    private func swapExercise() async {
        let ex = exercises[safe: exerciseIndex]
        guard let name = ex?.name else { return }
        do {
            let res = try await api.planSwapExercise(
                currentExercise: name,
                reason: "preference",
                location: "gym",
                sets: ex?.sets,
                reps: ex?.reps,
                intensity: nil
            )
            if let rep = res.replacement?.name, exerciseIndex < exercises.count {
                let newEx = PlanExercise(
                    name: rep,
                    sets: res.replacement?.sets ?? ex?.sets,
                    reps: res.replacement?.reps ?? ex?.reps,
                    notes: res.replacement?.notes
                )
                await MainActor.run { exercises[exerciseIndex] = newEx }
            }
        } catch { }
    }

    private func saveAndGetInsight() async {
        guard let ds = dataService else { return }
        var log = WorkoutLog()
        log.date = DateHelpers.todayLocal
        log.workout_type = injectedExercises != nil ? "Chat-Initiated" : "Guided"
        log.duration_minutes = elapsedSeconds / 60
        log.exercises = exercises.map {
            WorkoutExerciseEntry(name: $0.name, sets: $0.sets, reps: $0.reps, weight_kg: nil, rpe: nil)
        }
        try? await ds.insertWorkoutLog(log)
        _ = try? await api.analyticsProcessPRs()
        _ = try? await api.awardsCheck()
        await MainActor.run { saved = true; insightLoading = true }
        let insight = try? await api.aiPostWorkoutInsight(dateLocal: DateHelpers.todayLocal)
        await MainActor.run {
            postWorkoutInsight = insight?.insight
            insightLoading = false
        }
    }
}

private extension Array {
    subscript(safe index: Int) -> Element? {
        indices.contains(index) ? self[index] : nil
    }
}
