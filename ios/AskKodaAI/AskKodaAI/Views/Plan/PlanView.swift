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

    private var api: KodaAPIService {
        KodaAPIService(getAccessToken: { await auth.accessToken })
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
            .navigationTitle("Plan")
            .refreshable { await loadPlan() }
            .task { await loadPlan() }
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
                        .background(selectedDay?.date_local == d.date_local || isToday ? Color.accentColor.opacity(0.2) : Color(.systemGray6))
                        .clipShape(RoundedRectangle(cornerRadius: 8))
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
        .background(Color(.systemGray6))
        .clipShape(RoundedRectangle(cornerRadius: 12))
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
}
