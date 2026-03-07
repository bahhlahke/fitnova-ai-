//
//  LogWorkoutView.swift
//  Koda AI
//
//  List workouts, quick log (duration/type/notes), parity with web /log/workout.
//

import SwiftUI

struct LogWorkoutView: View {
    @EnvironmentObject var auth: SupabaseService
    @State private var logs: [WorkoutLog] = []
    @State private var loading = false
    @State private var errorMessage: String?
    @State private var showQuickLog = false
    @State private var quickDuration = "30"
    @State private var quickType = "Strength"
    @State private var quickNotes = ""
    @State private var saving = false

    private var dataService: KodaDataService? {
        guard let uid = auth.currentUserId else { return nil }
        return KodaDataService(client: auth.supabaseClient, userId: uid)
    }

    private static let workoutTypes = ["Strength", "Cardio", "HIIT", "Recovery", "Sports", "Other"]

    var body: some View {
        Group {
            if loading && logs.isEmpty {
                ProgressView("Loading workouts…")
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else {
                List {
                    Section {
                        ForEach(logs, id: \.log_id) { log in
                            workoutRow(log)
                        }
                    }
                }
                .overlay(alignment: .bottomTrailing) {
                    Button {
                        showQuickLog = true
                    } label: {
                        Image(systemName: "plus.circle.fill")
                            .font(.title)
                            .padding()
                    }
                }
            }
        }
        .navigationTitle("Workouts")
        .refreshable { await load() }
        .task { await load() }
        .sheet(isPresented: $showQuickLog) {
            quickLogSheet
        }
        .alert("Error", isPresented: .constant(errorMessage != nil)) {
            Button("OK") { errorMessage = nil }
        } message: {
            Text(errorMessage ?? "")
        }
    }

    private func workoutRow(_ log: WorkoutLog) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(log.date ?? "")
                .font(.caption)
                .foregroundStyle(.secondary)
            Text(log.workout_type ?? "Workout")
                .font(.headline)
            if let d = log.duration_minutes {
                Text("\(d) min")
                    .font(.subheadline)
            }
            if let n = log.notes, !n.isEmpty {
                Text(n)
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
        }
        .padding(.vertical, 4)
    }

    private var quickLogSheet: some View {
        NavigationStack {
            Form {
                TextField("Duration (min)", text: $quickDuration)
                    .keyboardType(.numberPad)
                Picker("Type", selection: $quickType) {
                    ForEach(Self.workoutTypes, id: \.self) { t in
                        Text(t).tag(t)
                    }
                }
                TextField("Notes", text: $quickNotes, axis: .vertical)
                    .lineLimit(3...6)
            }
            .navigationTitle("Quick log")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { showQuickLog = false }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") {
                        Task { await saveQuickLog() }
                    }
                    .disabled(saving || Int(quickDuration) == nil)
                }
            }
        }
        .presentationDetents([.medium])
    }

    private func load() async {
        guard let ds = dataService else { return }
        loading = true
        defer { loading = false }
        do {
            let list = try await ds.fetchWorkoutLogs(limit: 50)
            await MainActor.run { logs = list }
        } catch {
            await MainActor.run { errorMessage = error.localizedDescription }
        }
    }

    private func saveQuickLog() async {
        guard let ds = dataService else { return }
        let mins = Int(quickDuration) ?? 30
        saving = true
        defer { saving = false }
        do {
            var log = WorkoutLog()
            log.date = DateHelpers.todayLocal
            log.workout_type = quickType
            log.duration_minutes = mins
            log.notes = quickNotes.isEmpty ? nil : quickNotes
            try await ds.insertWorkoutLog(log)
            await MainActor.run {
                showQuickLog = false
                quickDuration = "30"
                quickType = "Strength"
                quickNotes = ""
            }
            await load()
        } catch {
            await MainActor.run { errorMessage = error.localizedDescription }
        }
    }
}
