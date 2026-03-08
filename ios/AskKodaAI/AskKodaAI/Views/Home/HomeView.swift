//
//  HomeView.swift
//  Koda AI
//
//  Dashboard parity: briefing, today's plan, performance, nudges, quick actions.
//

import SwiftUI

struct HomeView: View {
    @EnvironmentObject var auth: SupabaseService
    @State private var briefing: AIBriefingResponse?
    @State private var briefingLoading = false
    @State private var dailyPlan: DailyPlan?
    @State private var planLoading = false
    @State private var performance: PerformanceResponse?
    @State private var performanceLoading = false
    @State private var nudges: [CoachNudge] = []
    @State private var nudgesLoading = false
    @State private var projection: DashboardProjectionResponse?
    @State private var retentionRisk: RetentionRiskResponse?
    @State private var coachInsights: [CoachInsight] = []
    @State private var coachInsightsLoading = false
    @State private var profile: UserProfile?
    @State private var todayCheckIn: CheckIn?
    @State private var errorMessage: String?

    /// Readiness score derived from today's check-in (0–1).
    /// Both energy_score and adherence_score are stored on a 1–10 scale.
    private var readinessScore: Double {
        guard let checkIn = todayCheckIn else { return 0.0 }
        let energy = Double(checkIn.energy_score ?? 5) / 10.0
        let adherence = Double(checkIn.adherence_score ?? 5) / 10.0
        return min(1.0, max(0.0, (energy * 0.7) + (adherence * 0.3)))
    }
    @State private var showingVisionModal = false
    @State private var showingGuidedWorkout = false
    @State private var showingCoachChat = false
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
                    HStack {
                        Image("KodaLogo")
                            .resizable()
                            .scaledToFit()
                            .frame(height: 32)
                        Spacer()
                    }
                    .padding(.bottom, 8)
                    
                    if let err = errorMessage {
                        errorBanner(err)
                    }
                    
                    BioSyncHUD(
                        readinessScore: readinessScore,
                        activeSquad: profile?.activity_level ?? "Titanium Hypertrophy"
                    )
                    
                    briefingCard
                    coachDeskCard
                    todayPlanCard
                    performanceCard
                    projectionCard
                    retentionRiskCard
                    nudgesCard
                }
                .padding()
            }
            .fnBackground()
            .navigationTitle("Home")
            .navigationBarTitleDisplayMode(.large)
            .refreshable { await loadAll() }
            .task { await loadAll() }
            .onReceive(NotificationCenter.default.publisher(for: NSNotification.Name("AppEnteredForeground"))) { _ in
                Task { await loadAll() }
            }
            .fullScreenCover(isPresented: $showingGuidedWorkout) {
                if let plan = dailyPlan?.training_plan {
                    GuidedWorkoutView(exercises: plan.exercises ?? [])
                }
            }
            .sheet(isPresented: $showingCoachChat) {
                CoachView()
            }
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
        VStack(alignment: .leading, spacing: 8) {
            Text("AI Performance Briefing")
                .font(.headline)
            if briefingLoading {
                ProgressView()
            } else if let b = briefing {
                Text(b.briefing ?? "No briefing content provided.")
                    .font(.subheadline)
                    .italic()
                if let rat = b.rationale {
                    Text(rat)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            } else {
                Text("No briefing available.")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding()
        .glassCard()
    }

    @ViewBuilder
    private var coachDeskCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Coach's Desk")
                .font(.headline)
            if coachInsightsLoading {
                ProgressView()
            } else if coachInsights.isEmpty {
                Text("Systems nominal. No active interventions.")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            } else {
                ForEach(coachInsights) { insight in
                    VStack(alignment: .leading, spacing: 4) {
                        HStack {
                            Text(insight.title)
                                .font(.subheadline)
                                .fontWeight(.bold)
                            Spacer()
                            if let cta = insight.cta_route {
                                Button("Execute") { handleSteering(cta) }
                                    .font(.caption)
                                    .buttonStyle(.borderedProminent)
                            }
                        }
                        Text(insight.message)
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                    .padding(8)
                    .background(Color.white.opacity(0.05))
                    .clipShape(RoundedRectangle(cornerRadius: 8))
                }
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding()
        .glassCard()
    }

    @ViewBuilder
    private var todayPlanCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Daily Protocol")
                .font(.headline)
            if planLoading {
                ProgressView()
            } else if let plan = dailyPlan {
                VStack(alignment: .leading, spacing: 4) {
                    Text(plan.training_plan?.focus ?? "Recovery")
                        .font(.subheadline)
                        .fontWeight(.bold)
                    Text("\(plan.training_plan?.duration_minutes ?? 0) min session")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                    
                    Button("Start Guided Session") {
                        showingGuidedWorkout = true
                    }
                    .buttonStyle(.borderedProminent)
                    .padding(.top, 8)
                }
            } else {
                VStack(spacing: 8) {
                    Text("No protocol active.")
                        .font(.subheadline)
                    Button("Generate Plan") {
                        Task { await generatePlan() }
                    }
                    .disabled(generating)
                    .buttonStyle(.bordered)
                }
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding()
        .glassCard()
    }

    @ViewBuilder
    private var performanceCard: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Neural Performance")
                .font(.headline)
            if performanceLoading {
                ProgressView()
            } else if let p = performance {
                HStack(spacing: 20) {
                    statBox(label: "VOL", value: "\(p.set_volume ?? 0)")
                    statBox(label: "MIN", value: "\(p.workout_minutes ?? 0)")
                    statBox(label: "BAL", value: p.push_pull_balance ?? "N/A")
                }
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding()
        .glassCard()
    }

    private func statBox(label: String, value: String) -> some View {
        VStack(alignment: .leading) {
            Text(label)
                .font(.caption2)
                .foregroundStyle(.secondary)
            Text(value)
                .font(.subheadline)
                .fontWeight(.bold)
        }
    }

    @ViewBuilder
    private var projectionCard: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Outcome Projection")
                .font(.headline)
            if let p = projection {
                if let p12 = p.projected_12w {
                    Text(String(format: "12-week projection: %.1f kg", p12))
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                } else {
                    Text("Predictive models stable.")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }
            } else {
                Text("Data synthesis in progress.")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding()
        .glassCard()
    }

    @ViewBuilder
    private var retentionRiskCard: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Retention Monitor")
                .font(.headline)
            if let r = retentionRisk {
                HStack(spacing: 8) {
                    if let level = r.risk_level, !level.isEmpty {
                        Text("\(level) risk")
                            .font(.caption)
                            .fontWeight(.semibold)
                            .padding(.horizontal, 8)
                            .padding(.vertical, 4)
                            .background(riskColor(level))
                            .clipShape(Capsule())
                    }
                    if let score = r.risk_score {
                        Text("\(Int(score * 100))%")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                }
                if let action = r.recommended_action, !action.isEmpty {
                    Text(action)
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }
            } else {
                Text("Stable — keep up your routine.")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding()
        .glassCard()
    }

    private func riskColor(_ level: String) -> Color {
        switch level.lowercased() {
        case "high": return Color.red.opacity(0.2)
        case "medium": return Color.orange.opacity(0.2)
        default: return Color.green.opacity(0.2)
        }
    }

    @ViewBuilder
    private var nudgesCard: some View {
        if nudges.isEmpty && !nudgesLoading {
            EmptyView()
        } else {
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
                            HStack {
                                Text(msg)
                                    .font(.caption)
                                    .frame(maxWidth: .infinity, alignment: .leading)
                                Button("Dismiss") {
                                    Task { await ackNudge(nudge) }
                                }
                                .font(.caption2)
                            }
                            .padding(8)
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .background(Color.orange.opacity(0.1))
                            .clipShape(RoundedRectangle(cornerRadius: 8))
                        }
                    }
                }
            }
            .padding()
            .glassCard()
        }
    }

    private func loadAll() async {
        errorMessage = nil
        await withTaskGroup(of: Void.self) { group in
            group.addTask { await loadProfile() }
            group.addTask { await loadCheckIn() }
            group.addTask { await loadBriefing() }
            group.addTask { await loadCoachDesk() }
            group.addTask { await loadPlan() }
            group.addTask { await loadPerformance() }
            group.addTask { await loadProjection() }
            group.addTask { await loadRetentionRisk() }
            group.addTask { await loadNudges() }
        }
    }

    private func loadProfile() async {
        guard let ds = dataService else { return }
        do {
            let p = try await ds.fetchProfile()
            await MainActor.run { self.profile = p }
        } catch {
            // Profile is non-critical; suppress error so other cards still render
        }
    }

    private func loadCheckIn() async {
        guard let ds = dataService else { return }
        do {
            let checkIn = try await ds.fetchCheckIn(dateLocal: DateHelpers.todayLocal)
            await MainActor.run { todayCheckIn = checkIn }
        } catch {
            // Check-in absence is normal; readinessScore falls back to 0
        }
    }

    private func loadProjection() async {
        do {
            let p = try await api.aiProjection(today: DateHelpers.todayLocal)
            await MainActor.run { projection = p }
        } catch {
            // Projection is supplementary; card shows a safe fallback message
        }
    }

    private func loadRetentionRisk() async {
        do {
            let r = try await api.aiRetentionRisk(localDate: DateHelpers.todayLocal)
            await MainActor.run { retentionRisk = r }
        } catch {
            // Retention risk is supplementary; card shows a safe fallback message
        }
    }

    private func loadBriefing() async {
        briefingLoading = true
        defer { briefingLoading = false }
        do {
            let res = try await api.aiBriefing(localDate: DateHelpers.todayLocal)
            await MainActor.run { briefing = res }
        } catch {
            await MainActor.run { errorMessage = error.localizedDescription }
        }
    }
    
    private func loadCoachDesk() async {
        coachInsightsLoading = true
        defer { coachInsightsLoading = false }
        do {
            let res = try await api.aiCoachDesk()
            await MainActor.run { coachInsights = res.insights ?? [] }
        } catch {
            // Coach desk is supplementary; card shows "Systems nominal" fallback
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

    private func handleSteering(_ route: String?) {
        guard let route = route else { return }
        switch route {
        case "/log/workout":
            showingGuidedWorkout = true
        case "/coach":
            showingCoachChat = true
        default:
            break
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

    private func ackNudge(_ nudge: CoachNudge) async {
        guard let id = nudge.nudge_id, !id.isEmpty else { return }
        _ = try? await api.coachNudgeAck(nudgeId: id)
        await loadNudges()
    }

    private func loadNudges() async {
        nudgesLoading = true
        defer { nudgesLoading = false }
        guard let ds = dataService else { return }
        do {
            let n = try await ds.fetchNudges(dateLocal: nil, unacknowledgedOnly: true, limit: 5)
            await MainActor.run { nudges = n }
        } catch {
            // Nudges are supplementary; card is hidden when the list is empty
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
