//
//  LogWorkoutView.swift
//  Koda AI
//
//  Workout history list + quick log sheet. Premium card UI.
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

    private var api: KodaAPIService {
        KodaAPIService(getAccessToken: { auth.accessToken })
    }

    private static let workoutTypes = ["Strength", "Cardio", "HIIT", "Recovery", "Sports", "Other"]

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 14) {
                if loading && logs.isEmpty {
                    VStack(spacing: 12) {
                        ShimmerCard(height: 88)
                        ShimmerCard(height: 88)
                        ShimmerCard(height: 88)
                    }
                } else if logs.isEmpty {
                    PremiumStateCard(
                        title: "No workouts logged yet.",
                        detail: "Tap + to log your first session.",
                        symbol: "dumbbell"
                    )
                } else {
                    ForEach(Array(logs.enumerated()), id: \.offset) { index, log in
                        workoutRow(log, index: index)
                    }
                }

                if let err = errorMessage {
                    Label(err, systemImage: "exclamationmark.triangle.fill")
                        .font(.caption)
                        .foregroundStyle(Brand.Color.danger)
                        .padding(.horizontal, 4)
                }
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 20)
        }
        .fnBackground()
        .navigationTitle("Workouts")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .primaryAction) {
                Button {
                    showQuickLog = true
                } label: {
                    Image(systemName: "plus")
                        .font(.headline.weight(.bold))
                        .foregroundStyle(Brand.Color.accent)
                }
            }
        }
        .refreshable { await load() }
        .task { await load() }
        .sheet(isPresented: $showQuickLog) {
            quickLogSheet
        }
    }

    private func workoutRow(_ log: WorkoutLog, index: Int) -> some View {
        HStack(spacing: 14) {
            Image(systemName: iconFor(type: log.workout_type))
                .font(.title3.weight(.semibold))
                .foregroundStyle(Brand.Color.accent)
                .frame(width: 44, height: 44)
                .background(
                    Circle()
                        .fill(Brand.Color.surfaceRaised)
                        .overlay(Circle().stroke(Brand.Color.border, lineWidth: 1))
                )

            VStack(alignment: .leading, spacing: 4) {
                Text(log.workout_type ?? "Workout")
                    .font(.headline)
                    .foregroundStyle(.white)
                HStack(spacing: 10) {
                    if let d = log.duration_minutes {
                        Label("\(d) min", systemImage: "clock")
                            .font(.caption.weight(.semibold))
                            .foregroundStyle(Brand.Color.muted)
                    }
                    if let date = log.date {
                        Text(formattedDate(date))
                            .font(.caption)
                            .foregroundStyle(Brand.Color.muted)
                    }
                }
                if let n = log.notes, !n.isEmpty {
                    Text(n)
                        .font(.caption)
                        .foregroundStyle(Brand.Color.muted)
                        .lineLimit(1)
                }
            }
            Spacer()

            Button {
                Task { await deleteLog(at: index) }
            } label: {
                Image(systemName: "trash")
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(Brand.Color.muted)
                    .padding(8)
            }
        }
        .padding(16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(
            RoundedRectangle(cornerRadius: 20, style: .continuous)
                .fill(Brand.Color.surfaceRaised)
                .overlay(
                    RoundedRectangle(cornerRadius: 20, style: .continuous)
                        .stroke(Brand.Color.border, lineWidth: 1)
                )
        )
    }

    private var quickLogSheet: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    // Duration
                    VStack(alignment: .leading, spacing: 8) {
                        Text("DURATION (MIN)")
                            .font(.system(size: 10, weight: .black, design: .monospaced))
                            .tracking(1.2)
                            .foregroundStyle(Brand.Color.accent)
                        TextField("30", text: $quickDuration)
                            .keyboardType(.numberPad)
                            .font(.title2.weight(.bold))
                            .foregroundStyle(.white)
                            .padding(14)
                            .background(
                                RoundedRectangle(cornerRadius: 16, style: .continuous)
                                    .fill(Brand.Color.surfaceRaised)
                                    .overlay(RoundedRectangle(cornerRadius: 16, style: .continuous)
                                        .stroke(Brand.Color.border, lineWidth: 1))
                            )
                    }

                    // Type
                    VStack(alignment: .leading, spacing: 8) {
                        Text("TYPE")
                            .font(.system(size: 10, weight: .black, design: .monospaced))
                            .tracking(1.2)
                            .foregroundStyle(Brand.Color.accent)
                        LazyVGrid(columns: Array(repeating: .init(.flexible()), count: 3), spacing: 10) {
                            ForEach(Self.workoutTypes, id: \.self) { type in
                                Button {
                                    quickType = type
                                    HapticEngine.selection()
                                } label: {
                                    Text(type)
                                        .font(.subheadline.weight(.semibold))
                                        .foregroundStyle(quickType == type ? .black : .white)
                                        .frame(maxWidth: .infinity)
                                        .padding(.vertical, 12)
                                        .background(
                                            RoundedRectangle(cornerRadius: 14, style: .continuous)
                                                .fill(quickType == type ? Brand.Color.accent : Brand.Color.surfaceRaised)
                                                .overlay(
                                                    RoundedRectangle(cornerRadius: 14, style: .continuous)
                                                        .stroke(quickType == type ? Brand.Color.accent : Brand.Color.border, lineWidth: 1)
                                                )
                                        )
                                }
                                .buttonStyle(.plain)
                            }
                        }
                    }

                    // Notes
                    VStack(alignment: .leading, spacing: 8) {
                        Text("NOTES (OPTIONAL)")
                            .font(.system(size: 10, weight: .black, design: .monospaced))
                            .tracking(1.2)
                            .foregroundStyle(Brand.Color.accent)
                        TextField("How did it feel?", text: $quickNotes, axis: .vertical)
                            .lineLimit(3...5)
                            .font(.body)
                            .foregroundStyle(.white)
                            .padding(14)
                            .background(
                                RoundedRectangle(cornerRadius: 16, style: .continuous)
                                    .fill(Brand.Color.surfaceRaised)
                                    .overlay(RoundedRectangle(cornerRadius: 16, style: .continuous)
                                        .stroke(Brand.Color.border, lineWidth: 1))
                            )
                    }

                    Button {
                        Task { await saveQuickLog() }
                    } label: {
                        Label(saving ? "Saving…" : "Save Workout", systemImage: "checkmark.circle.fill")
                            .frame(maxWidth: .infinity)
                    }
                    .buttonStyle(PremiumActionButtonStyle())
                    .disabled(saving || Int(quickDuration) == nil)
                }
                .padding(20)
            }
            .fnBackground()
            .navigationTitle("Quick Log")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { showQuickLog = false }
                        .foregroundStyle(Brand.Color.muted)
                }
            }
        }
        .presentationDetents([.large])
    }

    private func iconFor(type: String?) -> String {
        switch type?.lowercased() {
        case "cardio":   return "figure.run"
        case "hiit":     return "bolt.fill"
        case "recovery": return "heart.fill"
        case "sports":   return "sportscourt.fill"
        default:         return "dumbbell.fill"
        }
    }

    private func formattedDate(_ iso: String) -> String {
        let f = DateFormatter()
        f.dateFormat = "yyyy-MM-dd"
        guard let d = f.date(from: iso) else { return iso }
        f.dateStyle = .medium
        f.timeStyle = .none
        return f.string(from: d)
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
            _ = try? await api.analyticsProcessPRs()
            _ = try? await api.awardsCheck()
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

    private func deleteLog(at index: Int) async {
        guard let ds = dataService, index < logs.count,
              let logId = logs[index].log_id, !logId.isEmpty else { return }
        try? await ds.deleteWorkoutLog(logId: logId)
        await load()
    }
}
