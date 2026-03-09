//
//  HomeView.swift
//  Koda AI
//
//  Dashboard parity: briefing, today's plan, performance, nudges, quick actions.
//

import SwiftUI

struct HomeView: View {
    @EnvironmentObject var auth: SupabaseService
    @StateObject private var healthKit = HealthKitService.shared

    // MARK: - Data

    @State private var briefing: AIBriefingResponse?
    @State private var dailyPlan: DailyPlan?
    @State private var performance: PerformanceResponse?
    @State private var nudges: [CoachNudge] = []
    @State private var projection: DashboardProjectionResponse?
    @State private var retentionRisk: RetentionRiskResponse?
    @State private var coachInsights: [CoachInsight] = []
    @State private var profile: UserProfile?
    @State private var todayCheckIn: CheckIn?

    // MARK: - Load phase

    /// Single source of truth for above-the-fold loading state.
    /// Replaces 9 individual `xxxLoading` booleans that caused staggered layout shifts.
    @State private var criticalPhaseLoading = false
    @State private var errorMessage: String?

    // MARK: - Derived

    /// Readiness score derived from today's check-in (0–1).
    private var readinessScore: Double {
        guard let checkIn = todayCheckIn else { return 0.0 }
        let energy = Double(checkIn.energy_score ?? 5) / 10.0
        let adherence = Double(checkIn.adherence_score ?? 5) / 10.0
        return min(1.0, max(0.0, (energy * 0.7) + (adherence * 0.3)))
    }

    // MARK: - UI state

    @State private var showingVisionModal = false
    @State private var showingGuidedWorkout = false
    @State private var showingCoachChat = false
    @State private var generating = false
    @State private var refreshTask: Task<Void, Never>?

    // MARK: - Services (resolved once, not per-render)

    private var api: KodaAPIService {
        KodaAPIService(getAccessToken: { auth.accessToken })
    }

    private var dataService: KodaDataService? {
        guard let uid = auth.currentUserId else { return nil }
        return KodaDataService(client: auth.supabaseClient, userId: uid)
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    PremiumHeroCard(
                        title: "Today's coaching desk is live.",
                        subtitle: "Your next best session, recovery posture, and intervention triggers are already organized below.",
                        eyebrow: profile?.display_name ?? "Home"
                    ) {
                        HStack(spacing: 10) {
                            PremiumMetricPill(label: "Readiness", value: "\(Int(readinessScore * 100))%")
                            PremiumMetricPill(label: "Protocol", value: profile?.activity_level ?? "Titanium")
                        }
                    }
                    
                    if let err = errorMessage {
                        errorBanner(err)
                    }
                    
                    BioSyncHUD(
                        readinessScore: readinessScore,
                        activeSquad: profile?.activity_level ?? "Titanium Hypertrophy",
                        heartRate: healthKit.currentHeartRate
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
            .background {
                ZStack {
                    Image("DashboardHero")
                        .resizable()
                        .aspectRatio(contentMode: .fill)
                        .ignoresSafeArea()
                        .opacity(0.3)
                    
                    LinearGradient(
                        colors: [.black, .black.opacity(0.8), .clear],
                        startPoint: .bottom,
                        endPoint: .top
                    )
                    .ignoresSafeArea()
                }
            }
            .navigationTitle("Home")
            .navigationBarTitleDisplayMode(.large)
            .refreshable {
                refreshTask?.cancel()
                refreshTask = Task { await loadAll() }
                await refreshTask?.value
            }
            .task {
                refreshTask?.cancel()
                refreshTask = Task { await loadAll() }
                await refreshTask?.value
            }
            .onReceive(NotificationCenter.default.publisher(for: NSNotification.Name("AppEnteredForeground"))) { _ in
                refreshTask?.cancel()
                refreshTask = Task { await loadAll() }
            }
            .fullScreenCover(isPresented: $showingGuidedWorkout) {
                if let plan = dailyPlan?.training_plan {
                    GuidedWorkoutView(trainingPlan: plan)
                }
            }
            .sheet(isPresented: $showingCoachChat) {
                CoachView()
            }
            .onReceive(NotificationCenter.default.publisher(for: NSNotification.Name("StartGuidedWorkoutFromCoach"))) { note in
                if let trainingPlan = note.userInfo?["trainingPlan"] as? TrainingPlan {
                    if dailyPlan == nil {
                        dailyPlan = DailyPlan(
                            date_local: DateHelpers.todayLocal,
                            training_plan: trainingPlan,
                            nutrition_plan: nil,
                            safety_notes: nil
                        )
                    } else {
                        dailyPlan = DailyPlan(
                            date_local: dailyPlan?.date_local,
                            training_plan: trainingPlan,
                            nutrition_plan: dailyPlan?.nutrition_plan,
                            safety_notes: dailyPlan?.safety_notes
                        )
                    }
                    showingCoachChat = false
                    DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
                        showingGuidedWorkout = true
                    }
                } else if let exercises = note.userInfo?["exercises"] as? [PlanExercise] {
                    if dailyPlan == nil {
                        dailyPlan = DailyPlan(
                            date_local: DateHelpers.todayLocal,
                            training_plan: TrainingPlan(
                                focus: "Coach Session",
                                duration_minutes: 45,
                                exercises: exercises
                            ),
                            nutrition_plan: nil,
                            safety_notes: nil
                        )
                    } else {
                        let current = dailyPlan?.training_plan
                        dailyPlan = DailyPlan(
                            date_local: dailyPlan?.date_local,
                            training_plan: TrainingPlan(
                                focus: current?.focus ?? "Coach Session",
                                duration_minutes: current?.duration_minutes ?? 45,
                                exercises: exercises
                            ),
                            nutrition_plan: dailyPlan?.nutrition_plan,
                            safety_notes: dailyPlan?.safety_notes
                        )
                    }
                    showingCoachChat = false
                    DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
                        showingGuidedWorkout = true
                    }
                }
            }
        }
    }

    private func errorBanner(_ message: String) -> some View {
        HStack {
            Text(message)
                .font(.caption)
                .foregroundStyle(Brand.Color.danger)
            Spacer()
            Button("Dismiss") { errorMessage = nil }
                .font(.caption)
        }
        .padding()
        .background(Brand.Color.danger.opacity(0.12))
        .clipShape(RoundedRectangle(cornerRadius: 14))
    }

    @ViewBuilder
    private var briefingCard: some View {
        if criticalPhaseLoading && briefing == nil {
            ShimmerCard(height: 120)
        } else {
        VStack(alignment: .leading, spacing: 8) {
            Text("AI Performance Briefing")
                .font(.headline)
            if let b = briefing {
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
        } // end criticalPhaseLoading guard
    }

    @ViewBuilder
    private var coachDeskCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Coach's Desk")
                .font(.headline)
            if coachInsights.isEmpty {
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
                                    .buttonStyle(PremiumActionButtonStyle())
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
        if criticalPhaseLoading && dailyPlan == nil {
            ShimmerCard(height: 140)
        } else {
        VStack(alignment: .leading, spacing: 12) {
            Text("Daily Protocol")
                .font(.headline)
            if let plan = dailyPlan {
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
                    .buttonStyle(PremiumActionButtonStyle())
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
                    .buttonStyle(PremiumActionButtonStyle())
                }
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding()
        .glassCard()
        } // end criticalPhaseLoading guard
    }

    @ViewBuilder
    private var performanceCard: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Neural Performance")
                .font(.headline)
            if let p = performance {
                HStack(spacing: 20) {
                    statBox(label: "VOL", value: "\(p.set_volume ?? 0)")
                    statBox(label: "MIN", value: "\(p.workout_minutes ?? 0)")
                    let balStr = p.push_pull_balance != nil ? String(format: "%.2f", p.push_pull_balance!) : "N/A"
                    statBox(label: "BAL", value: balStr)
                }
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding()
        .glassCard()
    }

    private func statBox(label: String, value: String) -> some View {
        PremiumMetricPill(label: label, value: value)
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
        if nudges.isEmpty {
            EmptyView()
        } else {
            VStack(alignment: .leading, spacing: 8) {
                Text("Coach Nudges")
                    .font(.headline)
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

        // Phase 1: above-the-fold critical path — show shimmers until these resolve.
        criticalPhaseLoading = true
        await withTaskGroup(of: Void.self) { group in
            group.addTask { await self.loadProfile() }
            group.addTask { await self.loadCheckIn() }
            group.addTask { await self.loadBriefing() }
            group.addTask { await self.loadPlan() }
        }
        criticalPhaseLoading = false

        // Phase 2: below-the-fold — arrive whenever they're ready, no layout shift.
        async let _perf: () = loadPerformance()
        async let _nudges: () = loadNudges()
        async let _proj: () = loadProjection()
        async let _risk: () = loadRetentionRisk()
        async let _desk: () = loadCoachDesk()
        _ = await (_perf, _nudges, _proj, _risk, _desk)
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
        do {
            let res = try await api.aiBriefing(localDate: DateHelpers.todayLocal)
            await MainActor.run { briefing = res }
        } catch {
            await MainActor.run { errorMessage = error.localizedDescription }
        }
    }

    private func loadCoachDesk() async {
        do {
            let res = try await api.aiCoachDesk()
            await MainActor.run { coachInsights = res.insights ?? [] }
        } catch {
            // Supplementary — "Systems nominal" fallback shown when empty
        }
    }

    private func loadPlan() async {
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
        do {
            let p = try await api.analyticsPerformance()
            await MainActor.run { performance = p }
        } catch {
            // Supplementary — card is hidden when nil
        }
    }

    private func ackNudge(_ nudge: CoachNudge) async {
        guard let id = nudge.nudge_id, !id.isEmpty else { return }
        _ = try? await api.coachNudgeAck(nudgeId: id)
        await loadNudges()
    }

    private func loadNudges() async {
        guard let ds = dataService else { return }
        do {
            let n = try await ds.fetchNudges(dateLocal: nil, unacknowledgedOnly: true, limit: 5)
            await MainActor.run { nudges = n }
        } catch {
            // Supplementary — card hidden when list is empty
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
            print("Generate Plan decode error: \(error)")
            await MainActor.run { errorMessage = error.localizedDescription }
        }
    }
}
