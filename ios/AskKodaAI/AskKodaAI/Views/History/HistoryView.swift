//
//  HistoryView.swift
//  Koda AI
//
//  Workout and nutrition history with tabs; parity with web /history.
//

import SwiftUI

struct HistoryView: View {
    @EnvironmentObject var auth: SupabaseService
    @State private var tab: HistoryTab = .workouts
    @State private var workouts: [WorkoutLog] = []
    @State private var nutritionLogs: [NutritionLog] = []
    @State private var loading = false
    @State private var expandedWorkoutId: String?
    @State private var expandedNutritionDate: String?
    @State private var editingWorkoutId: String?
    @State private var editWorkoutData: (type: String, duration: String, notes: String) = ("strength", "", "")
    @State private var workoutSaveStatus: SaveStatus = .idle
    @State private var errorMessage: String?

    private var dataService: KodaDataService? {
        guard let uid = auth.currentUserId else { return nil }
        return KodaDataService(client: auth.supabaseClient, userId: uid)
    }

    private static let workoutTypes = ["strength", "cardio", "mobility", "other"]

    enum HistoryTab: String, CaseIterable {
        case workouts = "Workouts"
        case nutrition = "Nutrition"
    }

    enum SaveStatus {
        case idle, saving, error
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            Picker("History", selection: $tab) {
                ForEach(HistoryTab.allCases, id: \.self) { t in
                    Text(t.rawValue).tag(t)
                }
            }
            .pickerStyle(.segmented)

            if let err = errorMessage {
                Text(err)
                    .font(.caption)
                    .foregroundStyle(.red)
                    .padding(8)
            }

            if loading && workouts.isEmpty && nutritionLogs.isEmpty {
                ProgressView("Loading…")
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 40)
            } else if tab == .workouts {
                workoutsList
            } else {
                nutritionList
            }
        }
        .padding()
        .navigationTitle("History")
        .refreshable { await load() }
        .task { await load() }
    }

    private var workoutsList: some View {
        Group {
            if workouts.isEmpty {
                Text("No workouts yet. Log a session from the Log tab.")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 24)
            } else {
                List {
                    ForEach(Array(workouts.enumerated()), id: \.offset) { _, w in
                        workoutRow(w)
                    }
                }
                .listStyle(.plain)
            }
        }
    }

    private func workoutRow(_ w: WorkoutLog) -> some View {
        let logId = w.log_id ?? ""
        let isExpanded = expandedWorkoutId == logId
        let isEditing = editingWorkoutId == logId
        return VStack(alignment: .leading, spacing: 0) {
            Button {
                withAnimation(.easeInOut(duration: 0.2)) {
                    expandedWorkoutId = isExpanded ? nil : logId
                }
            } label: {
                HStack {
                    VStack(alignment: .leading, spacing: 4) {
                        Text(w.date ?? "")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                        Text(w.workout_type ?? "Workout")
                            .font(.headline)
                        if let d = w.duration_minutes {
                            Text("\(d) min")
                                .font(.subheadline)
                                .foregroundStyle(.secondary)
                        }
                    }
                    Spacer()
                    Image(systemName: isExpanded ? "chevron.down" : "chevron.right")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
                .padding(.vertical, 8)
            }
            .buttonStyle(.plain)

            if isExpanded {
                if isEditing {
                    editWorkoutForm(log: w)
                } else {
                    VStack(alignment: .leading, spacing: 8) {
                        ForEach(Array((w.exercises ?? []).enumerated()), id: \.offset) { _, e in
                            HStack {
                                Text(e.name ?? "Exercise")
                                    .font(.subheadline)
                                Spacer()
                                Text("\(e.sets ?? 0) x \(e.reps ?? "?")")
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                            }
                        }
                        if let n = w.notes, !n.isEmpty {
                            Text(n)
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                        Button("Edit") {
                            editingWorkoutId = logId
                            editWorkoutData = (
                                w.workout_type ?? "strength",
                                w.duration_minutes.map { String($0) } ?? "",
                                w.notes ?? ""
                            )
                        }
                        .font(.caption)
                    }
                    .padding(.vertical, 8)
                    .padding(.leading, 8)
                }
            }
        }
    }

    private func editWorkoutForm(log: WorkoutLog) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            Picker("Type", selection: $editWorkoutData.type) {
                ForEach(Self.workoutTypes, id: \.self) { t in
                    Text(t).tag(t)
                }
            }
            .pickerStyle(.menu)
            TextField("Duration (min)", text: $editWorkoutData.duration)
                .keyboardType(.numberPad)
            TextField("Notes", text: $editWorkoutData.notes, axis: .vertical)
                .lineLimit(2...4)
            HStack(spacing: 12) {
                Button("Update") {
                    Task { await saveWorkoutEdit(logId: log.log_id ?? "") }
                }
                .disabled(workoutSaveStatus == .saving)
                Button("Cancel") {
                    editingWorkoutId = nil
                }
            }
            if workoutSaveStatus == .error {
                Text("Update failed.")
                    .font(.caption)
                    .foregroundStyle(.red)
            }
        }
        .padding()
    }

    private var nutritionList: some View {
        Group {
            if nutritionLogs.isEmpty {
                Text("No nutrition logged yet.")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 24)
            } else {
                List {
                    ForEach(Array(nutritionLogs.enumerated()), id: \.offset) { _, log in
                        nutritionRow(log)
                    }
                }
                .listStyle(.plain)
            }
        }
    }

    private func nutritionRow(_ log: NutritionLog) -> some View {
        let date = log.date ?? ""
        let isExpanded = expandedNutritionDate == date
        return VStack(alignment: .leading, spacing: 0) {
            Button {
                withAnimation(.easeInOut(duration: 0.2)) {
                    expandedNutritionDate = isExpanded ? nil : date
                }
            } label: {
                HStack {
                    VStack(alignment: .leading, spacing: 4) {
                        Text(date)
                            .font(.caption)
                            .foregroundStyle(.secondary)
                        if let cal = log.total_calories {
                            Text("\(cal) cal")
                                .font(.headline)
                        }
                    }
                    Spacer()
                    Image(systemName: isExpanded ? "chevron.down" : "chevron.right")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
                .padding(.vertical, 8)
            }
            .buttonStyle(.plain)

            if isExpanded {
                VStack(alignment: .leading, spacing: 6) {
                    ForEach(Array((log.meals ?? []).enumerated()), id: \.offset) { _, m in
                        HStack {
                            Text(m.name ?? "Meal")
                                .font(.subheadline)
                            Spacer()
                            if let c = m.calories {
                                Text("\(c) cal")
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                            }
                        }
                    }
                }
                .padding(.vertical, 8)
                .padding(.leading, 8)
            }
        }
    }

    private func load() async {
        guard let ds = dataService else { return }
        loading = true
        defer { loading = false }
        do {
            async let w: [WorkoutLog] = ds.fetchWorkoutLogs(limit: 100)
            async let n: [NutritionLog] = ds.fetchNutritionLogs(limit: 100)
            let (workoutsList, nutritionList) = try await (w, n)
            await MainActor.run {
                workouts = workoutsList
                nutritionLogs = nutritionList
                errorMessage = nil
            }
        } catch {
            await MainActor.run { errorMessage = error.localizedDescription }
        }
    }

    private func saveWorkoutEdit(logId: String) async {
        guard let ds = dataService, !logId.isEmpty else { return }
        workoutSaveStatus = .saving
        defer { workoutSaveStatus = .idle }
        do {
            var log = workouts.first(where: { $0.log_id == logId }) ?? WorkoutLog()
            log.workout_type = editWorkoutData.type
            log.duration_minutes = Int(editWorkoutData.duration)
            log.notes = editWorkoutData.notes.isEmpty ? nil : editWorkoutData.notes
            try await ds.updateWorkoutLog(logId: logId, log)
            await MainActor.run {
                if let i = workouts.firstIndex(where: { $0.log_id == logId }) {
                    workouts[i].workout_type = log.workout_type
                    workouts[i].duration_minutes = log.duration_minutes
                    workouts[i].notes = log.notes
                }
                editingWorkoutId = nil
            }
        } catch {
            await MainActor.run { workoutSaveStatus = .error }
        }
    }
}
