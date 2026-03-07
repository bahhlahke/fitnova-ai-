//
//  HomeView.swift
//  Koda AI
//
//  Dashboard parity: briefing, today's plan, performance, nudges, quick actions.
//

import SwiftUI


struct HomeView: View {
    @EnvironmentObject var auth: SupabaseService
    @State private var briefing: String?
    @State private var briefingLoading = false
    @State private var dailyPlan: DailyPlan?
    @State private var planLoading = false
    @State private var performance: PerformanceResponse?
    @State private var performanceLoading = false
    @State private var nudges: [CoachNudge] = []
    @State private var nudgesLoading = false
    @State private var errorMessage: String?
    @State private var generating = false
    @State private var refreshTask: Task<Void, Never>?

    private var api: KodaAPIService {
        KodaAPIService(getAccessToken: { await auth.accessToken })
    }

    private var dataService: KodaDataService? {
        guard let uid = auth.currentUserId else { return nil }
        return KodaDataService(client: auth.supabaseClient, userId: uid)
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    if let err = errorMessage {
                        errorBanner(err)
                    }
                    briefingCard
                    todayPlanCard
                    performanceCard
                    nudgesCard
                }
                .padding()
            }
            .navigationTitle("Home")
            .refreshable { await loadAll() }
            .task { await loadAll() }
        }
    }

    private func errorBanner(_ message: String) -> some View {
        HStack {
            Text(message)
                .font(.caption)
                .foregroundStyle(.red)
            Spacer()
            Button("Dismiss") { errorMessage = nil }
                .font(.caption)
        }
        .padding()
        .background(Color.red.opacity(0.1))
        .clipShape(RoundedRectangle(cornerRadius: 8))
    }

    @ViewBuilder
    private var briefingCard: some View {
        Section {
            if briefingLoading {
                ProgressView("Briefing…")
                    .frame(maxWidth: .infinity)
                    .padding()
            } else if let b = briefing, !b.isEmpty {
                VStack(alignment: .leading, spacing: 8) {
                    Text("Performance Briefing")
                        .font(.caption)
                        .fontWeight(.bold)
                        .foregroundStyle(.secondary)
                    Text(b)
                        .font(.subheadline)
                        .italic()
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding()
                .background(Color.accentColor.opacity(0.1))
                .clipShape(RoundedRectangle(cornerRadius: 12))
            }
        } header: {
            Text("Command Center")
                .font(.headline)
        }
    }

    @ViewBuilder
    private var todayPlanCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text("Today's Plan")
                    .font(.headline)
                Spacer()
                if dailyPlan == nil && !planLoading {
                    Button(action: { Task { await generatePlan() } }) {
                        if generating {
                            ProgressView()
                                .scaleEffect(0.8)
                        } else {
                            Text("Generate")
                                .font(.caption)
                        }
                    }
                    .disabled(generating)
                }
            }
            if planLoading && dailyPlan == nil {
                ProgressView()
                    .frame(maxWidth: .infinity)
                    .padding()
            } else if let p = dailyPlan {
                DailyPlanCard(plan: p)
            } else {
                Text("No plan for today. Tap Generate to create one.")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .padding()
            }
        }
        .padding()
        .background(Color(.systemGray6))
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }

    @ViewBuilder
    private var performanceCard: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("14-Day Performance")
                .font(.headline)
            if performanceLoading && performance == nil {
                ProgressView()
                    .frame(maxWidth: .infinity)
                    .padding()
            } else if let p = performance {
                HStack(spacing: 16) {
                    stat("Workout days", value: "\(p.workout_days ?? 0)")
                    stat("Minutes", value: "\(p.workout_minutes ?? 0)")
                    stat("Set volume", value: "\(p.set_volume ?? 0)")
                }
                .padding(.vertical, 4)
            }
        }
        .padding()
        .background(Color(.systemGray6))
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }

    private func stat(_ label: String, value: String) -> some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(label)
                .font(.caption)
                .foregroundStyle(.secondary)
            Text(value)
                .font(.subheadline)
                .fontWeight(.semibold)
        }
    }

    @ViewBuilder
    private var nudgesCard: some View {
        if nudges.isEmpty && !nudgesLoading { return EmptyView() }
        VStack(alignment: .leading, spacing: 8) {
            Text("Coach Nudges")
                .font(.headline)
            if nudgesLoading {
                ProgressView()
                    .frame(maxWidth: .infinity)
                    .padding()
            } else {
                ForEach(Array(nudges.prefix(3).enumerated()), id: \.offset) { _, nudge in
                    if let msg = nudge.message {
                        Text(msg)
                            .font(.caption)
                            .padding(8)
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .background(Color.orange.opacity(0.1))
                            .clipShape(RoundedRectangle(cornerRadius: 8))
                    }
                }
            }
        }
        .padding()
        .background(Color(.systemGray6))
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }

    private func loadAll() async {
        errorMessage = nil
        await withTaskGroup(of: Void.self) { group in
            group.addTask { await loadBriefing() }
            group.addTask { await loadPlan() }
            group.addTask { await loadPerformance() }
            group.addTask { await loadNudges() }
        }
    }

    private func loadBriefing() async {
        briefingLoading = true
        defer { briefingLoading = false }
        do {
            let res = try await api.aiBriefing(localDate: DateHelpers.todayLocal)
            await MainActor.run { briefing = res.briefing }
        } catch {
            await MainActor.run { errorMessage = error.localizedDescription }
        }
    }

    private func loadPlan() async {
        planLoading = true
        defer { planLoading = false }
        guard let ds = dataService else { return }
        do {
            let p = try await ds.fetchDailyPlan(dateLocal: DateHelpers.todayLocal)
            await MainActor.run { dailyPlan = p }
        } catch {
            await MainActor.run { errorMessage = error.localizedDescription }
        }
    }

    private func loadPerformance() async {
        performanceLoading = true
        defer { performanceLoading = false }
        do {
            let p = try await api.analyticsPerformance()
            await MainActor.run { performance = p }
        } catch {
            await MainActor.run { errorMessage = error.localizedDescription }
        }
    }

    private func loadNudges() async {
        nudgesLoading = true
        defer { nudgesLoading = false }
        guard let ds = dataService else { return }
        do {
            let n = try await ds.fetchNudges(dateLocal: nil, unacknowledgedOnly: true, limit: 5)
            await MainActor.run { nudges = n }
        } catch {
            // Non-fatal
        }
    }

    private func generatePlan() async {
        generating = true
        defer { generating = false }
        errorMessage = nil
        do {
            let res = try await api.planDaily(todayConstraints: nil)
            await MainActor.run { dailyPlan = res.plan }
        } catch {
            await MainActor.run { errorMessage = error.localizedDescription }
        }
    }
}
