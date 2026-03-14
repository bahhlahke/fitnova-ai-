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

    private var api: KodaAPIService {
        KodaAPIService(getAccessToken: { auth.accessToken })
    }

    private static let workoutTypes = ["Strength", "Cardio", "HIIT", "Recovery", "Sports", "Other"]

    // MARK: - Body

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                if loading && logs.isEmpty {
                    ShimmerCard(height: 80)
                    ShimmerCard(height: 80)
                    ShimmerCard(height: 80)
                } else if logs.isEmpty {
                    PremiumRowCard {
                        VStack(spacing: 8) {
                            Image(systemName: "figure.strengthtraining.traditional")
                                .font(.title)
                                .foregroundStyle(Brand.Color.muted)
                            Text("No workouts logged yet.")
                                .font(.subheadline)
                                .foregroundStyle(Brand.Color.muted)
                            Text("Tap + to log your first session.")
                                .font(.caption)
                                .foregroundStyle(Brand.Color.muted)
                        }
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 12)
                    }
                } else {
                    ForEach(logs.indices, id: \.self) { i in
                        workoutCard(logs[i])
                    }
                }

                if let err = errorMessage {
                    HStack(spacing: 10) {
                        Image(systemName: "exclamationmark.triangle.fill")
                            .foregroundStyle(Brand.Color.danger)
                        Text(err)
                            .font(.caption)
                            .foregroundStyle(Brand.Color.danger)
                    }
                    .padding(14)
                    .background(Brand.Color.danger.opacity(0.1))
                    .clipShape(RoundedRectangle(cornerRadius: 14))
                }
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 20)
        }
        .fnBackground()
        .navigationTitle("Workouts")
        .refreshable { await load() }
        .task { await load() }
        .toolbar {
            ToolbarItem(placement: .primaryAction) {
                Button {
                    showQuickLog = true
                } label: {
                    Image(systemName: "plus")
                        .fontWeight(.bold)
                }
            }
        }
        .sheet(isPresented: $showQuickLog) {
            quickLogSheet
        }
    }

    // MARK: - Workout Card

    private func workoutCard(_ log: WorkoutLog) -> some View {
        PremiumRowCard {
            HStack(alignment: .top, spacing: 12) {
                // Type badge
                ZStack {
                    RoundedRectangle(cornerRadius: 12)
                        .fill(Brand.Color.accent.opacity(0.15))
                        .frame(width: 48, height: 48)
                    Image(systemName: workoutIcon(log.workout_type))
                        .font(.title3.weight(.bold))
                        .foregroundStyle(Brand.Color.accent)
                }

                VStack(alignment: .leading, spacing: 4) {
                    Text(log.workout_type ?? "Workout")
                        .font(.headline)
                        .foregroundStyle(.white)
                    HStack(spacing: 8) {
                        if let d = log.duration_minutes {
                            Label("\(d) min", systemImage: "clock")
                                .font(.caption)
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
                            .lineLimit(2)
                            .padding(.top, 2)
                    }
                }
                Spacer()
            }
        }
    }

    private func workoutIcon(_ type: String?) -> String {
        switch type?.lowercased() {
        case "strength": return "dumbbell.fill"
        case "cardio": return "heart.circle.fill"
        case "hiit": return "bolt.fill"
        case "recovery": return "leaf.fill"
        case "sports": return "sportscourt.fill"
        default: return "figure.run"
        }
    }

    private func formattedDate(_ s: String) -> String {
        let parser = DateFormatter()
        parser.dateFormat = "yyyy-MM-dd"
        parser.timeZone = TimeZone(identifier: "UTC")
        guard let d = parser.date(from: s) else { return s }
        let formatter = DateFormatter()
        formatter.dateStyle = .medium
        formatter.timeStyle = .none
        return formatter.string(from: d)
    }

    // MARK: - Quick Log Sheet

    private var quickLogSheet: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    PremiumHeroCard(
                        title: "Log Workout",
                        subtitle: "Record today's session to keep your protocol and analytics in sync.",
                        eyebrow: "Quick Log"
                    ) { EmptyView() }

                    PremiumRowCard {
                        VStack(alignment: .leading, spacing: 16) {
                            Text("WORKOUT TYPE")
                                .font(.system(size: 11, weight: .black, design: .monospaced))
                                .tracking(1.2)
                                .foregroundStyle(Brand.Color.accent)

                            ScrollView(.horizontal, showsIndicators: false) {
                                HStack(spacing: 10) {
                                    ForEach(Self.workoutTypes, id: \.self) { t in
                                        Button {
                                            quickType = t
                                            HapticEngine.impact(.light)
                                        } label: {
                                            Text(t)
                                                .font(.caption.weight(.semibold))
                                                .foregroundStyle(quickType == t ? .black : .white)
                                                .padding(.horizontal, 14)
                                                .padding(.vertical, 10)
                                                .background(
                                                    Capsule()
                                                        .fill(quickType == t ? Brand.Color.accent : Brand.Color.surfaceRaised)
                                                        .overlay(Capsule().stroke(Brand.Color.borderStrong, lineWidth: 1))
                                                )
                                        }
                                    }
                                }
                            }
                        }
                    }

                    PremiumRowCard {
                        VStack(alignment: .leading, spacing: 16) {
                            HStack {
                                Text("DURATION")
                                    .font(.system(size: 11, weight: .black, design: .monospaced))
                                    .tracking(1.2)
                                    .foregroundStyle(Brand.Color.accent)
                                Spacer()
                                if let mins = Int(quickDuration) {
                                    Text("\(mins) min")
                                        .font(.system(size: 28, weight: .black, design: .rounded))
                                        .foregroundStyle(.white)
                                }
                            }

                            HStack(spacing: 10) {
                                Image(systemName: "clock.fill")
                                    .foregroundStyle(Brand.Color.accent)
                                TextField("Duration in minutes", text: $quickDuration)
                                    .keyboardType(.numberPad)
                                    .font(.body)
                                    .foregroundStyle(.white)
                            }
                            .padding(14)
                            .background(
                                RoundedRectangle(cornerRadius: 14)
                                    .fill(Brand.Color.surfaceRaised)
                                    .overlay(RoundedRectangle(cornerRadius: 14).stroke(Brand.Color.borderStrong, lineWidth: 1))
                            )

                            ScrollView(.horizontal, showsIndicators: false) {
                                HStack(spacing: 8) {
                                    ForEach(["20", "30", "45", "60", "75", "90"], id: \.self) { preset in
                                        Button {
                                            quickDuration = preset
                                            HapticEngine.impact(.light)
                                        } label: {
                                            Text("\(preset)m")
                                                .font(.caption.weight(.semibold))
                                                .foregroundStyle(quickDuration == preset ? .black : .white)
                                                .padding(.horizontal, 12)
                                                .padding(.vertical, 8)
                                                .background(
                                                    Capsule()
                                                        .fill(quickDuration == preset ? Brand.Color.accent : Brand.Color.surfaceRaised)
                                                        .overlay(Capsule().stroke(Brand.Color.borderStrong, lineWidth: 1))
                                                )
                                        }
                                    }
                                }
                            }
                        }
                    }

                    PremiumRowCard {
                        VStack(alignment: .leading, spacing: 16) {
                            Text("NOTES (OPTIONAL)")
                                .font(.system(size: 11, weight: .black, design: .monospaced))
                                .tracking(1.2)
                                .foregroundStyle(Brand.Color.accent)
                            TextField("How did it feel? Any PRs or notable moments…", text: $quickNotes, axis: .vertical)
                                .lineLimit(2...4)
                                .font(.body)
                                .foregroundStyle(.white)
                                .padding(14)
                                .background(
                                    RoundedRectangle(cornerRadius: 14)
                                        .fill(Brand.Color.surfaceRaised)
                                        .overlay(RoundedRectangle(cornerRadius: 14).stroke(Brand.Color.borderStrong, lineWidth: 1))
                                )
                        }
                    }

                    Button {
                        Task { await saveQuickLog() }
                    } label: {
                        if saving {
                            HStack(spacing: 10) {
                                ProgressView().tint(.black).scaleEffect(0.85)
                                Text("Saving…")
                            }
                        } else {
                            Text("Save Workout")
                        }
                    }
                    .buttonStyle(PremiumActionButtonStyle())
                    .disabled(saving || Int(quickDuration) == nil)
                }
                .padding(.horizontal, 16)
                .padding(.vertical, 20)
            }
            .fnBackground()
            .navigationTitle("Log Workout")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") {
                        showQuickLog = false
                        quickDuration = "30"
                        quickType = "Strength"
                        quickNotes = ""
                    }
                }
            }
        }
    }

    // MARK: - Data

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
            HapticEngine.notification(.success)
            await load()
        } catch {
            await MainActor.run { errorMessage = error.localizedDescription }
        }
    }
}
