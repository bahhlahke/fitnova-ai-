//
//  GuidedWorkoutView.swift
//  Koda AI
//
//  Guided workout from today's plan: exercises → sets → rest → save. Optional swap exercise.
//

import SwiftUI

struct GuidedWorkoutView: View {
    @EnvironmentObject var auth: SupabaseService
    @State private var exercises: [PlanExercise] = []
    @State private var exerciseIndex = 0
    @State private var setIndex = 0
    @State private var phase: Phase = .loading
    @State private var restRemaining = 0
    @State private var errorMessage: String?
    @State private var saved = false
    @State private var postWorkoutInsight: String?
    @State private var insightLoading = false

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
        }
        .navigationTitle("Guided workout")
        .task { await loadPlan() }
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
        VStack(spacing: 24) {
            if phase == .rest {
                Text("Rest")
                    .font(.title)
                Text("\(restRemaining)s")
                    .font(.largeTitle)
                    .monospacedDigit()
            } else {
                let ex = exercises[safe: exerciseIndex] ?? PlanExercise(name: nil, sets: nil, reps: nil, notes: nil)
                Text(ex.name ?? "Exercise")
                    .font(.title2)
                Text("Set \(setIndex + 1) of \(ex.sets ?? 0)")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                Text(ex.reps ?? "—")
                    .font(.title3)
                HStack(spacing: 16) {
                    Button("Swap exercise") {
                        Task { await swapExercise() }
                    }
                    .buttonStyle(.bordered)
                    Button("Done set") {
                        advanceSet()
                    }
                    .buttonStyle(.borderedProminent)
                }
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
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
        let ex = exercises[safe: exerciseIndex]
        let sets = ex?.sets ?? 1
        if setIndex + 1 >= sets {
            if exerciseIndex + 1 >= exercises.count {
                phase = .completed
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
            for i in (0..<restSeconds).reversed() {
                try? await Task.sleep(nanoseconds: 1_000_000_000)
                await MainActor.run { restRemaining = i }
                if i == 0 {
                    await MainActor.run { phase = .work }
                    break
                }
            }
        }
    }

    private func swapExercise() async {
        let ex = exercises[safe: exerciseIndex]
        guard let name = ex?.name else { return }
        do {
            let res = try await api.planSwapExercise(currentExercise: name, reason: "preference", location: "gym", sets: ex?.sets, reps: ex?.reps, intensity: nil)
            if let rep = res.replacement?.name, exerciseIndex < exercises.count {
                let newEx = PlanExercise(name: rep, sets: res.replacement?.sets ?? ex?.sets, reps: res.replacement?.reps ?? ex?.reps, notes: res.replacement?.notes)
                await MainActor.run {
                    exercises[exerciseIndex] = newEx
                }
            }
        } catch { }
    }

    private func saveAndGetInsight() async {
        guard let ds = dataService else { return }
        var log = WorkoutLog()
        log.date = DateHelpers.todayLocal
        log.workout_type = "Guided"
        log.duration_minutes = 45
        log.exercises = exercises.enumerated().map { i, ex in
            WorkoutExerciseEntry(name: ex.name, sets: ex.sets, reps: ex.reps, weight_kg: nil, rpe: nil)
        }
        try? await ds.insertWorkoutLog(log)
        await MainActor.run { saved = true }
        insightLoading = true
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
