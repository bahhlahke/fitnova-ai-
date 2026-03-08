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
    @State private var errorMessage: String?
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
                ProgressView("Initializing Synthesis…")
                    .frame(maxWidth: .infinity)
                    .padding()
                    .glassCard()
            } else if let b = briefing {
                VStack(alignment: .leading, spacing: 12) {
                    HStack {
                        Circle()
                            .fill(Brand.Color.accent)
                            .frame(width: 8, height: 8)
                            .opacity(0.8)
                        Text("AI Synthesis")
                            .font(.system(size: 10, weight: .black, design: .monospaced))
                            .textCase(.uppercase)
                            .tracking(2)
                            .foregroundStyle(Brand.Color.accent)
                    }
                    
                    if let brief = b.briefing, !brief.isEmpty {
                        Text("\"\(brief)\"")
                            .font(.subheadline)
                            .fontWeight(.medium)
                            .italic()
                            .foregroundStyle(.white)
                            .padding(.leading, 8)
                            .overlay(
                                Rectangle()
                                    .fill(Brand.Color.accent.opacity(0.5))
                                    .frame(width: 2),
                                alignment: .leading
                            )
                    }
                    
                    if let rationale = b.rationale, !rationale.isEmpty {
                        VStack(alignment: .leading, spacing: 4) {
                            Text("Causal Rationale")
                                .font(.system(size: 9, weight: .bold))
                                .textCase(.uppercase)
                                .tracking(1)
                                .foregroundStyle(.white.opacity(0.5))
                            
                            Text(rationale)
                                .font(.system(size: 11))
                                .foregroundStyle(.secondary)
                        }
                        .padding(10)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .background(Color.black.opacity(0.4))
                        .clipShape(RoundedRectangle(cornerRadius: 8))
                        .overlay(
                            RoundedRectangle(cornerRadius: 8)
                                .stroke(Color.white.opacity(0.05), lineWidth: 1)
                        )
                    }
                    
                    if let inputs = b.inputs, !inputs.isEmpty {
                        ScrollView(.horizontal, showsIndicators: false) {
                            HStack(spacing: 6) {
                                ForEach(inputs, id: \.self) { input in
                                    Text(input)
                                        .font(.system(size: 9, weight: .bold, design: .monospaced))
                                        .textCase(.uppercase)
                                        .foregroundStyle(Brand.Color.accent)
                                        .padding(.horizontal, 8)
                                        .padding(.vertical, 4)
                                        .background(Color.white.opacity(0.05))
                                        .clipShape(RoundedRectangle(cornerRadius: 4))
                                        .overlay(
                                            RoundedRectangle(cornerRadius: 4)
                                                .stroke(Color.white.opacity(0.1), lineWidth: 1)
                                        )
                                }
                            }
                        }
                    }
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding()
                .background(Brand.Color.accent.opacity(0.1))
                .clipShape(RoundedRectangle(cornerRadius: 12))
                .overlay(
                    RoundedRectangle(cornerRadius: 12)
                        .stroke(Brand.Color.accent.opacity(0.2), lineWidth: 1)
                )
            }
        } header: {
            Text("Command Center")
                .font(.headline)
        }
    }

    @ViewBuilder
    private var coachDeskCard: some View {
        if coachInsightsLoading && coachInsights.isEmpty {
             ProgressView("Synthesizing mastery insights…")
                .frame(maxWidth: .infinity)
                .padding()
                .glassCard()
        } else if !coachInsights.isEmpty {
            VStack(alignment: .leading, spacing: 16) {
                HStack {
                    Image(systemName: "shield.checkered")
                        .foregroundStyle(Brand.Color.accent)
                    Text("COACH'S DESK")
                        .font(.system(size: 10, weight: .black, design: .monospaced))
                        .textCase(.uppercase)
                        .tracking(2)
                        .foregroundStyle(Brand.Color.accent)
                    Spacer()
                }
                
                ForEach(coachInsights) { insight in
                    Button(action: { handleSteering(insight.cta_route) }) {
                        VStack(alignment: .leading, spacing: 6) {
                            HStack {
                                Text(insight.title)
                                    .font(.subheadline)
                                    .fontWeight(.black)
                                    .foregroundStyle(.white)
                                Spacer()
                                if insight.urgency == "high" {
                                    Text("CRITICAL")
                                        .font(.system(size: 8, weight: .black))
                                        .padding(.horizontal, 6)
                                        .padding(.vertical, 2)
                                        .background(Color.red.opacity(0.2))
                                        .foregroundStyle(.red)
                                        .clipShape(Capsule())
                                }
                            }
                            Text(insight.message)
                                .font(.caption)
                                .foregroundStyle(.white.opacity(0.7))
                                .lineLimit(3)
                        }
                        .padding()
                        .background(Color.white.opacity(0.03))
                        .clipShape(RoundedRectangle(cornerRadius: 12))
                        .overlay(RoundedRectangle(cornerRadius: 12).stroke(insight.urgency == "high" ? Color.red.opacity(0.3) : Color.white.opacity(0.05), lineWidth: 1))
                    }
                    .buttonStyle(.plain)
                }
            }
            .padding()
            .background(Brand.Color.accent.opacity(0.05))
            .clipShape(RoundedRectangle(cornerRadius: 16))
            .overlay(RoundedRectangle(cornerRadius: 16).stroke(Brand.Color.accent.opacity(0.1), lineWidth: 1))
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
        .glassCard()
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
        .glassCard()
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
    private var projectionCard: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("AI Projection")
                .font(.headline)
            if let p = projection, let proj12 = p.projected_12w {
                Text(String(format: "%.1f kg", proj12))
                    .font(.title2)
                    .fontWeight(.bold)
                if let conf = p.confidence {
                    Text("\(Int(conf * 100))% confidence")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
                if let proj4 = p.projected_4w {
                    Text("4-week: \(String(format: "%.1f", proj4)) kg")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            } else {
                Text("Log weight in Progress to unlock projection.")
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
            group.addTask { await loadBriefing() }
            group.addTask { await loadCoachDesk() }
            group.addTask { await loadPlan() }
            group.addTask { await loadPerformance() }
            group.addTask { await loadProjection() }
            group.addTask { await loadRetentionRisk() }
            group.addTask { await loadNudges() }
        }
    }

    private func loadProjection() async {
        do {
            let p = try await api.aiProjection(today: DateHelpers.todayLocal)
            await MainActor.run { projection = p }
        } catch {
            // Non-fatal
        }
    }

    private func loadRetentionRisk() async {
        do {
            let r = try await api.aiRetentionRisk(localDate: DateHelpers.todayLocal)
            await MainActor.run { retentionRisk = r }
        } catch {
            // Non-fatal
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
            // Non-fatal
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
            // In a real app, this might switch tabs. 
            // For this specific view, we'll trigger a modal for the guided workout.
            showingGuidedWorkout = true
        case "/coach":
            showingCoachChat = true
        default:
            // Could handle other routes like /history or /check-in
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
