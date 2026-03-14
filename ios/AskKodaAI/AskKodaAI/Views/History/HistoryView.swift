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
    @State private var errorMessage: String?

    // Workout editing (separate @State vars to avoid tuple mutation issues)
    @State private var expandedWorkoutId: String?
    @State private var editingWorkoutId: String?
    @State private var editType = "Strength"
    @State private var editDuration = ""
    @State private var editNotes = ""
    @State private var workoutSaving = false

    // Nutrition editing
    @State private var expandedNutritionDate: String?
    @State private var editingNutritionDate: String?
    @State private var editCalories = ""
    @State private var editProtein = ""
    @State private var editCarbs = ""
    @State private var editFat = ""
    @State private var nutritionSaving = false

    private var dataService: KodaDataService? {
        guard let uid = auth.currentUserId else { return nil }
        return KodaDataService(client: auth.supabaseClient, userId: uid)
    }

    private static let workoutTypes = ["Strength", "Cardio", "HIIT", "Recovery", "Sports", "Other"]

    enum HistoryTab: String, CaseIterable {
        case workouts = "Workouts"
        case nutrition = "Nutrition"
    }

    private var historyTabs: [PremiumTabItem] {
        [
            PremiumTabItem(
                id: HistoryTab.workouts.rawValue,
                title: "Workouts",
                detail: "\(workouts.count)"
            ),
            PremiumTabItem(
                id: HistoryTab.nutrition.rawValue,
                title: "Nutrition",
                detail: "\(nutritionLogs.count)"
            ),
        ]
    }

    private var selectedTabId: Binding<String> {
        Binding(
            get: { tab.rawValue },
            set: { newValue in
                tab = HistoryTab(rawValue: newValue) ?? .workouts
            }
        )
    }

    // MARK: - Body

    var body: some View {
        VStack(spacing: 14) {
            PremiumHeroCard(
                title: "Training Archive",
                subtitle: "Review completed sessions, nutrition consistency, and edit logs so every coaching decision stays accurate.",
                eyebrow: "History"
            ) {
                HStack(spacing: 10) {
                    PremiumMetricPill(label: "Workout logs", value: "\(workouts.count)")
                    PremiumMetricPill(label: "Nutrition logs", value: "\(nutritionLogs.count)")
                }
            }
            .padding(.horizontal, 16)
            .padding(.top, 12)

            PremiumTabSwitcher(items: historyTabs, selectedId: selectedTabId)
                .padding(.horizontal, 16)

            if loading && workouts.isEmpty && nutritionLogs.isEmpty {
                ScrollView {
                    VStack(spacing: 12) {
                        ShimmerCard(height: 80)
                        ShimmerCard(height: 80)
                        ShimmerCard(height: 80)
                    }
                    .padding(16)
                }
            } else if tab == .workouts {
                workoutsTab
            } else {
                nutritionTab
            }
        }
        .fnBackground()
        .navigationTitle("History")
        .navigationBarTitleDisplayMode(.inline)
        .refreshable { await load() }
        .task { await load() }
    }

    // MARK: - Workouts Tab

    private var workoutsTab: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 12) {
                PremiumSectionHeader("Workout Sessions", eyebrow: "strength, cardio, recovery")

                if let err = errorMessage {
                    errorBanner(err)
                }

                if workouts.isEmpty && !loading {
                    PremiumRowCard {
                        VStack(spacing: 8) {
                            Image(systemName: "figure.strengthtraining.traditional")
                                .font(.title).foregroundStyle(Brand.Color.muted)
                            Text("No workouts logged yet.")
                                .font(.subheadline).foregroundStyle(Brand.Color.muted)
                        }
                        .frame(maxWidth: .infinity).padding(.vertical, 12)
                    }
                } else {
                    ForEach(workouts.indices, id: \.self) { i in
                        workoutCard(workouts[i])
                    }
                }
            }
            .padding(.horizontal, 16)
            .padding(.top, 2)
            .padding(.bottom, 20)
        }
    }

    private func workoutCard(_ w: WorkoutLog) -> some View {
        let logId = w.log_id ?? ""
        let isExpanded = expandedWorkoutId == logId
        let isEditing = editingWorkoutId == logId

        return PremiumRowCard {
            VStack(alignment: .leading, spacing: 0) {
                // Header row — tap to expand
                Button {
                    withAnimation(.spring(response: 0.35, dampingFraction: 0.8)) {
                        expandedWorkoutId = isExpanded ? nil : logId
                        if isEditing { editingWorkoutId = nil }
                    }
                } label: {
                    HStack(spacing: 12) {
                        ZStack {
                            RoundedRectangle(cornerRadius: 10)
                                .fill(Brand.Color.accent.opacity(0.15))
                                .frame(width: 44, height: 44)
                            Image(systemName: workoutIcon(w.workout_type))
                                .font(.body.weight(.bold))
                                .foregroundStyle(Brand.Color.accent)
                        }

                        VStack(alignment: .leading, spacing: 3) {
                            Text(w.workout_type ?? "Workout")
                                .font(.headline).foregroundStyle(.white)
                            HStack(spacing: 8) {
                                if let d = w.duration_minutes {
                                    Label("\(d) min", systemImage: "clock")
                                        .font(.caption).foregroundStyle(Brand.Color.muted)
                                }
                                if let date = w.date {
                                    Text(formattedDate(date))
                                        .font(.caption).foregroundStyle(Brand.Color.muted)
                                }
                            }
                        }
                        Spacer()
                        Image(systemName: isExpanded ? "chevron.down" : "chevron.right")
                            .font(.caption.weight(.bold))
                            .foregroundStyle(Brand.Color.muted)
                    }
                }
                .buttonStyle(.plain)

                // Expanded detail
                if isExpanded {
                    Divider().background(Brand.Color.border).padding(.vertical, 10)

                    if isEditing {
                        editWorkoutForm(logId: logId)
                    } else {
                        VStack(alignment: .leading, spacing: 8) {
                            ForEach(Array((w.exercises ?? []).enumerated()), id: \.offset) { _, e in
                                HStack {
                                    Text(e.name ?? "Exercise")
                                        .font(.subheadline).foregroundStyle(.white)
                                    Spacer()
                                    Text("\(e.sets ?? 0)×\(e.reps ?? "?")")
                                        .font(.caption).foregroundStyle(Brand.Color.muted)
                                }
                            }
                            if let n = w.notes, !n.isEmpty {
                                Text(n).font(.caption).foregroundStyle(Brand.Color.muted)
                                    .padding(.top, 2)
                            }
                            Button {
                                editType = w.workout_type.map { capitalize($0) } ?? "Strength"
                                editDuration = w.duration_minutes.map { String($0) } ?? ""
                                editNotes = w.notes ?? ""
                                editingWorkoutId = logId
                            } label: {
                                HStack(spacing: 4) {
                                    Image(systemName: "pencil")
                                    Text("Edit")
                                }
                                .font(.caption.weight(.semibold))
                                .foregroundStyle(Brand.Color.accent)
                            }
                            .padding(.top, 4)
                        }
                    }
                }
            }
        }
    }

    private func editWorkoutForm(logId: String) -> some View {
        VStack(alignment: .leading, spacing: 14) {
            Text("EDIT WORKOUT")
                .font(.system(size: 10, weight: .black, design: .monospaced))
                .tracking(1).foregroundStyle(Brand.Color.accent)

            // Type picker
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 8) {
                    ForEach(Self.workoutTypes, id: \.self) { t in
                        Button { editType = t; HapticEngine.selection() } label: {
                            Text(t)
                                .font(.caption.weight(.semibold))
                                .foregroundStyle(editType == t ? .black : .white)
                                .padding(.horizontal, 12).padding(.vertical, 8)
                                .background(
                                    Capsule().fill(editType == t ? Brand.Color.accent : Brand.Color.surfaceRaised)
                                        .overlay(Capsule().stroke(Brand.Color.borderStrong, lineWidth: 1))
                                )
                        }
                    }
                }
            }

            // Duration
            HStack(spacing: 10) {
                Image(systemName: "clock.fill").foregroundStyle(Brand.Color.accent)
                TextField("Duration (min)", text: $editDuration).keyboardType(.numberPad)
                    .font(.body).foregroundStyle(.white)
            }
            .padding(12)
            .background(RoundedRectangle(cornerRadius: 12).fill(Brand.Color.surfaceRaised)
                .overlay(RoundedRectangle(cornerRadius: 12).stroke(Brand.Color.borderStrong, lineWidth: 1)))

            // Notes
            TextField("Notes…", text: $editNotes, axis: .vertical).lineLimit(2...3)
                .font(.body).foregroundStyle(.white)
                .padding(12)
                .background(RoundedRectangle(cornerRadius: 12).fill(Brand.Color.surfaceRaised)
                    .overlay(RoundedRectangle(cornerRadius: 12).stroke(Brand.Color.borderStrong, lineWidth: 1)))

            HStack(spacing: 10) {
                Button {
                    Task { await saveWorkoutEdit(logId: logId) }
                } label: {
                    HStack(spacing: 6) {
                        if workoutSaving { ProgressView().scaleEffect(0.7).tint(.black) }
                        Text(workoutSaving ? "Saving…" : "Update")
                    }
                }
                .buttonStyle(PremiumActionButtonStyle(filled: true))
                .disabled(workoutSaving)

                Button("Cancel") { editingWorkoutId = nil }
                    .buttonStyle(PremiumActionButtonStyle(filled: false))
            }
        }
    }

    // MARK: - Nutrition Tab

    private var nutritionTab: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 12) {
                PremiumSectionHeader("Nutrition Logs", eyebrow: "macros and meal quality")

                if let err = errorMessage {
                    errorBanner(err)
                }

                if nutritionLogs.isEmpty && !loading {
                    PremiumRowCard {
                        VStack(spacing: 8) {
                            Image(systemName: "fork.knife")
                                .font(.title).foregroundStyle(Brand.Color.muted)
                            Text("No nutrition logged yet.")
                                .font(.subheadline).foregroundStyle(Brand.Color.muted)
                        }
                        .frame(maxWidth: .infinity).padding(.vertical, 12)
                    }
                } else {
                    ForEach(nutritionLogs.indices, id: \.self) { i in
                        nutritionCard(nutritionLogs[i])
                    }
                }
            }
            .padding(.horizontal, 16)
            .padding(.top, 2)
            .padding(.bottom, 20)
        }
    }

    private func nutritionCard(_ log: NutritionLog) -> some View {
        let date = log.date ?? ""
        let isExpanded = expandedNutritionDate == date
        let isEditing = editingNutritionDate == date

        return PremiumRowCard {
            VStack(alignment: .leading, spacing: 0) {
                // Header
                Button {
                    withAnimation(.spring(response: 0.35, dampingFraction: 0.8)) {
                        expandedNutritionDate = isExpanded ? nil : date
                        if isEditing { editingNutritionDate = nil }
                    }
                } label: {
                    HStack(spacing: 12) {
                        ZStack {
                            RoundedRectangle(cornerRadius: 10)
                                .fill(Brand.Color.success.opacity(0.15))
                                .frame(width: 44, height: 44)
                            Image(systemName: "fork.knife")
                                .font(.body.weight(.bold))
                                .foregroundStyle(Brand.Color.success)
                        }

                        VStack(alignment: .leading, spacing: 3) {
                            Text(formattedDate(date))
                                .font(.headline).foregroundStyle(.white)
                            if let cal = log.total_calories {
                                Text("\(cal) kcal")
                                    .font(.caption).foregroundStyle(Brand.Color.muted)
                            }
                        }
                        Spacer()
                        Image(systemName: isExpanded ? "chevron.down" : "chevron.right")
                            .font(.caption.weight(.bold))
                            .foregroundStyle(Brand.Color.muted)
                    }
                }
                .buttonStyle(.plain)

                // Expanded
                if isExpanded {
                    Divider().background(Brand.Color.border).padding(.vertical, 10)

                    if isEditing {
                        editNutritionForm(date: date, log: log)
                    } else {
                        VStack(alignment: .leading, spacing: 8) {
                            // Macro pills
                            HStack(spacing: 8) {
                                if let p = log.protein_g {
                                    macroPill(label: "Protein", value: "\(p)g", color: .blue)
                                }
                                if let c = log.carbs_g {
                                    macroPill(label: "Carbs", value: "\(c)g", color: .orange)
                                }
                                if let f = log.fat_g {
                                    macroPill(label: "Fat", value: "\(f)g", color: .yellow)
                                }
                            }

                            // Meals
                            ForEach(Array((log.meals ?? []).enumerated()), id: \.offset) { _, m in
                                HStack {
                                    Text(m.name ?? "Meal")
                                        .font(.subheadline).foregroundStyle(.white)
                                    Spacer()
                                    if let c = m.calories {
                                        Text("\(c) kcal")
                                            .font(.caption).foregroundStyle(Brand.Color.muted)
                                    }
                                }
                            }

                            Button {
                                editCalories = log.total_calories.map { String($0) } ?? ""
                                editProtein = log.protein_g.map { String(Int($0)) } ?? ""
                                editCarbs = log.carbs_g.map { String(Int($0)) } ?? ""
                                editFat = log.fat_g.map { String(Int($0)) } ?? ""
                                editingNutritionDate = date
                            } label: {
                                HStack(spacing: 4) {
                                    Image(systemName: "pencil")
                                    Text("Edit macros")
                                }
                                .font(.caption.weight(.semibold))
                                .foregroundStyle(Brand.Color.accent)
                            }
                            .padding(.top, 4)
                        }
                    }
                }
            }
        }
    }

    private func editNutritionForm(date: String, log: NutritionLog) -> some View {
        VStack(alignment: .leading, spacing: 14) {
            Text("EDIT MACROS")
                .font(.system(size: 10, weight: .black, design: .monospaced))
                .tracking(1).foregroundStyle(Brand.Color.accent)

            let fields: [(String, String, Binding<String>)] = [
                ("Calories", "kcal", $editCalories),
                ("Protein", "g", $editProtein),
                ("Carbs", "g", $editCarbs),
                ("Fat", "g", $editFat),
            ]
            ForEach(Array(fields.enumerated()), id: \.offset) { _, field in
                let (label, unit, binding) = field
                HStack(spacing: 10) {
                    Text(label)
                        .font(.subheadline.weight(.semibold))
                        .foregroundStyle(.white)
                        .frame(width: 70, alignment: .leading)
                    TextField("0", text: binding).keyboardType(.numberPad)
                        .font(.body).foregroundStyle(.white)
                    Text(unit).font(.caption).foregroundStyle(Brand.Color.muted)
                }
                .padding(12)
                .background(RoundedRectangle(cornerRadius: 12).fill(Brand.Color.surfaceRaised)
                    .overlay(RoundedRectangle(cornerRadius: 12).stroke(Brand.Color.borderStrong, lineWidth: 1)))
            }

            HStack(spacing: 10) {
                Button {
                    Task { await saveNutritionEdit(date: date, log: log) }
                } label: {
                    HStack(spacing: 6) {
                        if nutritionSaving { ProgressView().scaleEffect(0.7).tint(.black) }
                        Text(nutritionSaving ? "Saving…" : "Update")
                    }
                }
                .buttonStyle(PremiumActionButtonStyle(filled: true))
                .disabled(nutritionSaving)

                Button("Cancel") { editingNutritionDate = nil }
                    .buttonStyle(PremiumActionButtonStyle(filled: false))
            }
        }
    }

    // MARK: - Helper Views

    private func macroPill(label: String, value: String, color: Color) -> some View {
        VStack(spacing: 2) {
            Text(value).font(.caption.weight(.black)).foregroundStyle(color)
            Text(label).font(.system(size: 9)).foregroundStyle(Brand.Color.muted)
        }
        .padding(.horizontal, 10).padding(.vertical, 6)
        .background(color.opacity(0.12))
        .clipShape(RoundedRectangle(cornerRadius: 8))
    }

    private func errorBanner(_ err: String) -> some View {
        HStack(spacing: 10) {
            Image(systemName: "exclamationmark.triangle.fill").foregroundStyle(Brand.Color.danger)
            Text(err).font(.caption).foregroundStyle(Brand.Color.danger)
        }
        .padding(14)
        .background(Brand.Color.danger.opacity(0.1))
        .clipShape(RoundedRectangle(cornerRadius: 14))
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

    private func formattedDate(_ s: String?) -> String {
        guard let s else { return "" }
        let p = DateFormatter(); p.dateFormat = "yyyy-MM-dd"; p.timeZone = TimeZone(identifier: "UTC")
        guard let d = p.date(from: s) else { return s }
        let f = DateFormatter(); f.dateStyle = .medium; f.timeStyle = .none
        return f.string(from: d)
    }

    private func capitalize(_ s: String) -> String {
        s.prefix(1).uppercased() + s.dropFirst()
    }

    // MARK: - Data

    private func load() async {
        guard let ds = dataService else { return }
        loading = true
        defer { loading = false }
        do {
            async let w: [WorkoutLog] = ds.fetchWorkoutLogs(limit: 100)
            async let n: [NutritionLog] = ds.fetchNutritionLogs(limit: 100)
            let (wList, nList) = try await (w, n)
            await MainActor.run {
                workouts = wList
                nutritionLogs = nList
                errorMessage = nil
            }
        } catch {
            await MainActor.run { errorMessage = error.localizedDescription }
        }
    }

    private func saveWorkoutEdit(logId: String) async {
        guard let ds = dataService, !logId.isEmpty else { return }
        workoutSaving = true
        defer { workoutSaving = false }
        do {
            var log = workouts.first(where: { $0.log_id == logId }) ?? WorkoutLog()
            log.workout_type = editType
            log.duration_minutes = Int(editDuration)
            log.notes = editNotes.isEmpty ? nil : editNotes
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
            await MainActor.run { errorMessage = error.localizedDescription }
        }
    }

    private func saveNutritionEdit(date: String, log: NutritionLog) async {
        guard let ds = dataService, !date.isEmpty else { return }
        nutritionSaving = true
        defer { nutritionSaving = false }
        do {
            var updated = log
            updated.total_calories = Int(editCalories)
            updated.protein_g = Int(editProtein)
            updated.carbs_g = Int(editCarbs)
            updated.fat_g = Int(editFat)
            try await ds.upsertNutritionLog(updated)
            await MainActor.run {
                if let i = nutritionLogs.firstIndex(where: { $0.date == date }) {
                    nutritionLogs[i] = updated
                }
                editingNutritionDate = nil
            }
        } catch {
            await MainActor.run { errorMessage = error.localizedDescription }
        }
    }
}
