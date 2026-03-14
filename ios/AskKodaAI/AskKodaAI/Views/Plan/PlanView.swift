//
//  PlanView.swift
//  Koda AI
//
//  Weekly plan, today's detail, adapt day, swap exercise (parity with web /plan).
//

import SwiftUI

struct PlanView: View {
    @EnvironmentObject var auth: SupabaseService
    @State private var weeklyPlan: WeeklyPlan?
    @State private var selectedDay: WeeklyPlanDay?
    @State private var loading = false
    @State private var errorMessage: String?
    @State private var weeklyInsight: String?
    @State private var insightLoading = false
    
    // Adapt Day state
    @State private var isAdapting = false
    @State private var adaptInput = ""
    @State private var adaptLoading = false

    // Guided workout launch
    @State private var showingGuidedWorkout = false
    @State private var workoutPlan: TrainingPlan?

    private var api: KodaAPIService {
        KodaAPIService(getAccessToken: { auth.accessToken })
    }

    var body: some View {
        NavigationStack {
            Group {
                if loading && weeklyPlan == nil {
                    ProgressView("Loading plan…")
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else {
                    ScrollView {
                        VStack(alignment: .leading, spacing: 20) {
                            PremiumHeroCard(
                                title: "Your week is already sequenced.",
                                subtitle: "Choose the day, inspect the rationale, and compress the session only when reality changes.",
                                eyebrow: "Plan"
                            ) {
                                HStack(spacing: 10) {
                                    PremiumMetricPill(label: "Week", value: weeklyPlan?.cycle_goal ?? "Adaptive")
                                    PremiumMetricPill(label: "Mode", value: selectedDay?.intensity ?? "Live")
                                }
                            }
                            if let err = errorMessage {
                                Text(err)
                                    .font(.caption)
                                    .foregroundStyle(Brand.Color.danger)
                                    .padding()
                            }
                            if let plan = weeklyPlan, let days = plan.days, !days.isEmpty {
                                weekDaysRow(days: days)
                                if let day = selectedDay ?? days.first(where: { $0.date_local == DateHelpers.todayLocal }) ?? days.first {
                                    dayDetailCard(day)
                                    adaptDaySection
                                }
                            } else {
                                emptyPlanView
                            }
                            weeklyInsightCard
                        }
                        .padding()
                    }
                }
            }
            .fnBackground()
            .navigationTitle("Plan")
            .refreshable { await loadPlan() }
            .task { await loadPlan() }
            .onReceive(NotificationCenter.default.publisher(for: NSNotification.Name("AppEnteredForeground"))) { _ in
                Task { await loadPlan() }
            }
            .fullScreenCover(isPresented: $showingGuidedWorkout) {
                if let plan = workoutPlan {
                    NavigationStack {
                        GuidedWorkoutView(trainingPlan: plan)
                    }
                }
            }
        }
    }

    private func weekDaysRow(days: [WeeklyPlanDay]) -> some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 12) {
                ForEach(Array(days.enumerated()), id: \.offset) { _, d in
                    let isToday = d.date_local == DateHelpers.todayLocal
                    Button {
                        selectedDay = d
                    } label: {
                        VStack(spacing: 4) {
                            Text(dayLabel(d.date_local))
                                .font(.system(size: 10, weight: .bold, design: .monospaced))
                            Text(dayNumber(d.date_local))
                                .font(.system(size: 14, weight: .black, design: .rounded))
                                .fontWeight(isToday ? .bold : .regular)
                        }
                        .frame(width: 56)
                        .padding(.vertical, 8)
                        .background(selectedDay?.date_local == d.date_local || isToday ? Brand.Color.accent.opacity(0.15) : Brand.Color.surface)
                        .cornerRadius(8)
                        .overlay(
                            RoundedRectangle(cornerRadius: 8)
                                .stroke(selectedDay?.date_local == d.date_local || isToday ? Brand.Color.accent.opacity(0.5) : Brand.Color.border, lineWidth: 1)
                        )
                    }
                    .buttonStyle(.plain)
                }
            }
        }
    }

    private func dayLabel(_ dateLocal: String?) -> String {
        guard let s = dateLocal else { return "—" }
        let parser = DateFormatter()
        parser.dateFormat = "yyyy-MM-dd"
        parser.timeZone = TimeZone(identifier: "UTC")
        guard let d = parser.date(from: s) else { return "—" }
        let formatter = DateFormatter()
        formatter.dateFormat = "EEE"
        formatter.timeZone = TimeZone(identifier: "UTC")
        return formatter.string(from: d).uppercased()
    }

    private func dayNumber(_ dateLocal: String?) -> String {
        guard let s = dateLocal else { return "—" }
        let parts = s.components(separatedBy: "-")
        return parts.last ?? "—"
    }

    @ViewBuilder
    private func dayDetailCard(_ day: WeeklyPlanDay) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(day.date_local ?? "")
                .font(.caption)
                .foregroundStyle(.secondary)
            Text(day.focus ?? "Training")
                .font(.headline)
                .lineLimit(1)
                .minimumScaleFactor(0.8)
            if let dur = day.target_duration_minutes {
                Text("\(dur) min")
                    .font(.subheadline)
            }
            if let r = day.rationale, !r.isEmpty {
                Text(r)
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .fixedSize(horizontal: false, vertical: true)
                    .lineLimit(4)
            }
            if let exercises = day.exercises, !exercises.isEmpty {
                ForEach(Array(exercises.enumerated()), id: \.offset) { _, ex in
                    HStack {
                        Text(ex.name ?? "Exercise")
                        Spacer()
                        Text("\(ex.sets ?? 0)×\(ex.reps ?? "-")")
                            .foregroundStyle(.secondary)
                    }
                    .font(.subheadline)
                }

                Button {
                    workoutPlan = trainingPlanForDay(day)
                    showingGuidedWorkout = true
                } label: {
                    Label("Start Guided Workout", systemImage: "play.fill")
                }
                .buttonStyle(PremiumActionButtonStyle())
                .padding(.top, 8)
            }
        }
        .padding()
        .frame(maxWidth: .infinity, alignment: .leading)
        .glassCard()
    }

    private func trainingPlanForDay(_ day: WeeklyPlanDay) -> TrainingPlan {
        let planExercises = (day.exercises ?? []).map { ex in
            PlanExercise(
                name: ex.name, sets: ex.sets, reps: ex.reps,
                intensity: nil, notes: ex.coaching_cue,
                tempo: nil, breathing: nil, intent: nil,
                rationale: nil, target_rir: nil, target_load_kg: nil,
                video_url: nil, cinema_video_url: nil, image_url: nil
            )
        }
        return TrainingPlan(
            focus: day.focus ?? "Training",
            duration_minutes: day.target_duration_minutes,
            exercises: planExercises
        )
    }
    
    @ViewBuilder
    private var adaptDaySection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Button("Adapt this day") {
                withAnimation { isAdapting.toggle() }
            }
            .font(.subheadline)
            .buttonStyle(PremiumActionButtonStyle(filled: false))
            
            if isAdapting {
                HStack {
                    TextField("E.g., I only have 20 mins...", text: $adaptInput)
                        .textFieldStyle(.roundedBorder)
                        .disabled(adaptLoading)
                    
                    Button("Adapt") {
                        Task { await adaptDay() }
                    }
                    .buttonStyle(PremiumActionButtonStyle())
                    .disabled(adaptInput.isEmpty || adaptLoading)
                }
                
                if adaptLoading {
                    ProgressView("Adapting...")
                        .font(.caption)
                }
            }
        }
        .padding(.top, 8)
    }

    private var emptyPlanView: some View {
        VStack(spacing: 12) {
            Text("No weekly plan yet.")
                .foregroundStyle(.secondary)
            Button("Generate weekly plan") {
                Task { await refreshPlan() }
            }
            .buttonStyle(PremiumActionButtonStyle())
        }
        .frame(maxWidth: .infinity)
        .padding()
    }

    @ViewBuilder
    private var weeklyInsightCard: some View {
        if insightLoading {
            ShimmerCard(height: 80)
                .padding(.horizontal)
        } else if let insight = weeklyInsight, !insight.isEmpty {
            VStack(alignment: .leading, spacing: 8) {
                Text("Weekly Insight")
                    .font(.headline)
                Text(insight)
                    .font(.subheadline)
            }
            .padding()
            .background(Color.accentColor.opacity(0.1))
            .clipShape(RoundedRectangle(cornerRadius: 12))
        }
    }

    private func loadPlan() async {
        loading = true
        errorMessage = nil
        defer { loading = false }
        do {
            let res = try await api.planWeekly(refresh: false)
            await MainActor.run {
                weeklyPlan = res.plan
                if let days = res.plan?.days, selectedDay == nil {
                    selectedDay = days.first(where: { $0.date_local == DateHelpers.todayLocal }) ?? days.first
                }
            }
            await loadWeeklyInsight()
        } catch {
            await MainActor.run { errorMessage = error.localizedDescription }
        }
    }

    private func refreshPlan() async {
        loading = true
        errorMessage = nil
        defer { loading = false }
        do {
            let res = try await api.planWeekly(refresh: true)
            await MainActor.run { weeklyPlan = res.plan }
        } catch {
            await MainActor.run { errorMessage = error.localizedDescription }
        }
    }

    private func loadWeeklyInsight() async {
        insightLoading = true
        defer { insightLoading = false }
        do {
            let res = try await api.aiWeeklyInsight()
            await MainActor.run { weeklyInsight = res.insight }
        } catch { }
    }
    
    private func adaptDay() async {
        guard !adaptInput.isEmpty, let day = selectedDay else { return }
        adaptLoading = true
        errorMessage = nil
        defer { adaptLoading = false }
        
        do {
            let mappedExercises = (day.exercises ?? []).map { ex in
                AnyCodable(value: ["name": ex.name, "sets": ex.sets, "reps": ex.reps])
            }
            
            let res = try await api.planAdaptDay(
                userMessage: adaptInput,
                focus: day.focus ?? "Training",
                intensity: day.intensity ?? "standard",
                targetDuration: day.target_duration_minutes ?? 45,
                goals: [weeklyPlan?.cycle_goal].compactMap { $0 },
                currentExercises: mappedExercises,
                dateLocal: day.date_local
            )
            
            await MainActor.run {
                if let updatedPlan = res.plan {
                    let updatedDay = WeeklyPlanDay(
                        date_local: updatedPlan.date_local,
                        day_label: day.day_label,
                        focus: updatedPlan.training_plan?.focus ?? day.focus,
                        intensity: day.intensity,
                        target_duration_minutes: updatedPlan.training_plan?.duration_minutes ?? day.target_duration_minutes,
                        rationale: updatedPlan.safety_notes?.joined(separator: ". ") ?? day.rationale,
                        equipment_context: day.equipment_context,
                        exercises: updatedPlan.training_plan?.exercises?.map { ex in
                            WeeklyPlanExercise(name: ex.name, equipment: nil, sets: ex.sets, reps: ex.reps, coaching_cue: ex.notes)
                        }
                    )
                    
                    if let index = weeklyPlan?.days?.firstIndex(where: { $0.date_local == day.date_local }) {
                        weeklyPlan?.days?[index] = updatedDay
                        selectedDay = updatedDay
                    }
                }
                adaptInput = ""
                isAdapting = false
            }
        } catch {
            await MainActor.run { errorMessage = error.localizedDescription }
        }
    }
}
