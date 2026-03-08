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
                            if let err = errorMessage {
                                Text(err)
                                    .font(.caption)
                                    .foregroundStyle(.red)
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
                                .font(.caption2)
                            Text(d.day_label ?? "—")
                                .font(.caption)
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
        guard let s = dateLocal, let d = ISO8601DateFormatter().date(from: s + "T00:00:00Z") else { return "—" }
        let f = DateFormatter()
        f.dateFormat = "EEE"
        f.timeZone = TimeZone.current
        return f.string(from: d)
    }

    @ViewBuilder
    private func dayDetailCard(_ day: WeeklyPlanDay) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(day.date_local ?? "")
                .font(.caption)
                .foregroundStyle(.secondary)
            Text(day.focus ?? "Training")
                .font(.headline)
            if let dur = day.target_duration_minutes {
                Text("\(dur) min")
                    .font(.subheadline)
            }
            if let r = day.rationale, !r.isEmpty {
                Text(r)
                    .font(.caption)
                    .foregroundStyle(.secondary)
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
            }
        }
        .padding()
        .frame(maxWidth: .infinity, alignment: .leading)
        .glassCard()
    }
    
    @ViewBuilder
    private var adaptDaySection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Button("Adapt this day") {
                withAnimation { isAdapting.toggle() }
            }
            .font(.subheadline)
            .buttonStyle(.bordered)
            
            if isAdapting {
                HStack {
                    TextField("E.g., I only have 20 mins...", text: $adaptInput)
                        .textFieldStyle(.roundedBorder)
                        .disabled(adaptLoading)
                    
                    Button("Adapt") {
                        Task { await adaptDay() }
                    }
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
            .buttonStyle(.borderedProminent)
        }
        .frame(maxWidth: .infinity)
        .padding()
    }

    @ViewBuilder
    private var weeklyInsightCard: some View {
        if insightLoading {
            ProgressView()
                .frame(maxWidth: .infinity)
                .padding()
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
        guard !adaptInput.isEmpty else { return }
        adaptLoading = true
        errorMessage = nil
        defer { adaptLoading = false }
        
        do {
            // Simplified call leveraging existing adaptDay endpoint footprint
            let res = try await api.planAdaptDay(minutesAvailable: nil, location: adaptInput, soreness: nil, intensity: nil, equipmentContext: nil)
            
            await MainActor.run {
                let updatedPlan = res.plan
                let mappedExercises = updatedPlan.training_plan?.exercises?.map { ex in
                    WeeklyPlanExercise(name: ex.name, equipment: nil, sets: ex.sets, reps: ex.reps, coaching_cue: ex.notes)
                }
                
                let updatedDay = WeeklyPlanDay(date_local: updatedPlan.date_local, day_label: selectedDay?.day_label, focus: selectedDay?.focus, intensity: selectedDay?.intensity, target_duration_minutes: updatedPlan.training_plan?.exercises != nil ? 45 : 0, rationale: selectedDay?.rationale, equipment_context: selectedDay?.equipment_context, exercises: mappedExercises)
                
                if let index = weeklyPlan?.days?.firstIndex(where: { $0.date_local == selectedDay?.date_local }) {
                    weeklyPlan?.days?[index] = updatedDay
                    selectedDay = updatedDay
                    adaptInput = ""
                    isAdapting = false
                }
            }
        } catch {
            await MainActor.run { errorMessage = error.localizedDescription }
        }
    }
}
