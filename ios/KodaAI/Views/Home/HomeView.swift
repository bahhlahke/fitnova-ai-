//
//  HomeView.swift
//  Koda AI
//
//  Dashboard: Command Center AI chat front-and-center, with signal cards below.
//  Dark design mirrors the web interface exactly.
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
    @State private var projection: DashboardProjectionResponse?
    @State private var retentionRisk: RetentionRiskResponse?
    @State private var errorMessage: String?
    @State private var generating = false

    // Inline AI chat state
    @State private var chatInput = ""
    @State private var chatMessages: [QuickChatMessage] = []
    @State private var chatLoading = false
    @State private var showFullCoach = false

    private let accent = Color(red: 0.04, green: 0.85, blue: 0.77)

    private var api: KodaAPIService {
        KodaAPIService(getAccessToken: { await auth.accessToken })
    }
    private var dataService: KodaDataService? {
        guard let uid = auth.currentUserId else { return nil }
        return KodaDataService(client: auth.supabaseClient, userId: uid)
    }

    var body: some View {
        NavigationStack {
            ZStack {
                Color.black.ignoresSafeArea()
                ScrollView(showsIndicators: false) {
                    VStack(alignment: .leading, spacing: 16) {
                        headerSection
                        commandCenterCard   // AI chat — primary real estate
                        statsRow
                        todayPlanCard
                        if let _ = briefing { briefingCard }
                        nudgesCard
                        projectionCard
                        retentionRiskCard
                    }
                    .padding(.horizontal, 16)
                    .padding(.bottom, 32)
                }
            }
            .navigationTitle("")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar { toolbarItems }
            .preferredColorScheme(.dark)
            .refreshable { await loadAll() }
            .task { await loadAll() }
            .navigationDestination(isPresented: $showFullCoach) {
                CoachView()
            }
        }
    }

    // MARK: – Header

    private var headerSection: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(greetingText)
                .font(.system(size: 11, weight: .black))
                .tracking(2)
                .foregroundColor(Color(white: 0.4))
                .padding(.top, 8)
            Text("COMMAND CENTER")
                .font(.system(size: 28, weight: .black))
                .italic()
                .foregroundColor(.white)
        }
    }

    private var greetingText: String {
        let hour = Calendar.current.component(.hour, from: Date())
        switch hour {
        case 5..<12: return "GOOD MORNING"
        case 12..<17: return "GOOD AFTERNOON"
        default: return "GOOD EVENING"
        }
    }

    // MARK: – Command Center / AI Chat

    private var commandCenterCard: some View {
        VStack(alignment: .leading, spacing: 0) {
            // Card header
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text("KODA AI")
                        .font(.system(size: 10, weight: .black))
                        .tracking(3)
                        .foregroundColor(accent)
                    Text("Ask me anything")
                        .font(.system(size: 15, weight: .semibold))
                        .foregroundColor(.white)
                }
                Spacer()
                // Pulse indicator
                ZStack {
                    Circle()
                        .fill(accent.opacity(0.3))
                        .frame(width: 28, height: 28)
                    Circle()
                        .fill(accent)
                        .frame(width: 10, height: 10)
                }
                Button(action: { showFullCoach = true }) {
                    Image(systemName: "arrow.up.right.circle")
                        .font(.system(size: 20))
                        .foregroundColor(Color(white: 0.4))
                }
            }
            .padding(.horizontal, 20)
            .padding(.vertical, 16)

            Divider().background(Color(white: 0.1))

            // Message thread (last 4 messages)
            if !chatMessages.isEmpty {
                VStack(spacing: 10) {
                    ForEach(chatMessages.suffix(4)) { msg in
                        HStack(alignment: .top, spacing: 10) {
                            if msg.isUser { Spacer(minLength: 32) }
                            Text(msg.text)
                                .font(.system(size: 13, weight: .medium))
                                .foregroundColor(msg.isUser ? .black : .white)
                                .padding(.horizontal, 14)
                                .padding(.vertical, 10)
                                .background(msg.isUser ? accent : Color(white: 0.1))
                                .clipShape(RoundedRectangle(cornerRadius: 16))
                            if !msg.isUser { Spacer(minLength: 32) }
                        }
                    }
                    if chatLoading {
                        HStack(spacing: 5) {
                            ForEach(0..<3) { i in
                                Circle()
                                    .fill(accent)
                                    .frame(width: 6, height: 6)
                            }
                        }
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding(.leading, 14)
                    }
                }
                .padding(.horizontal, 16)
                .padding(.vertical, 14)
            }

            // Quick action chips (shown when empty)
            if chatMessages.isEmpty {
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 8) {
                        ForEach(["Log a workout", "How am I doing?", "Build today's plan", "Log my meals"], id: \.self) { chip in
                            Button(action: { sendQuickChat(chip) }) {
                                Text(chip)
                                    .font(.system(size: 11, weight: .black))
                                    .tracking(0.5)
                                    .foregroundColor(.white)
                                    .padding(.horizontal, 14)
                                    .padding(.vertical, 9)
                                    .background(Color(white: 0.09))
                                    .clipShape(Capsule())
                                    .overlay(Capsule().stroke(Color(white: 0.16), lineWidth: 1))
                            }
                            .disabled(chatLoading)
                        }
                    }
                    .padding(.horizontal, 16)
                }
                .padding(.vertical, 14)
            }

            Divider().background(Color(white: 0.1))

            // Input row
            HStack(spacing: 10) {
                TextField("Ask your coach…", text: $chatInput)
                    .font(.system(size: 14, weight: .medium))
                    .foregroundColor(.white)
                    .submitLabel(.send)
                    .onSubmit { sendQuickChat(chatInput) }

                Button(action: { sendQuickChat(chatInput) }) {
                    Image(systemName: "arrow.up.circle.fill")
                        .font(.system(size: 28, weight: .black))
                        .foregroundColor(chatInput.trimmingCharacters(in: .whitespaces).isEmpty || chatLoading
                                         ? Color(white: 0.2) : accent)
                }
                .disabled(chatInput.trimmingCharacters(in: .whitespaces).isEmpty || chatLoading)
            }
            .padding(.horizontal, 20)
            .padding(.vertical, 14)
        }
        .background(Color(white: 0.05))
        .clipShape(RoundedRectangle(cornerRadius: 24))
        .overlay(RoundedRectangle(cornerRadius: 24).stroke(Color(white: 0.1), lineWidth: 1))
    }

    // MARK: – Stats row

    private var statsRow: some View {
        HStack(spacing: 10) {
            statCell(
                label: "WORKOUTS",
                value: performance.map { "\($0.workout_days ?? 0)" } ?? "—",
                sublabel: "14 days",
                loading: performanceLoading
            )
            statCell(
                label: "MINUTES",
                value: performance.map { "\($0.workout_minutes ?? 0)" } ?? "—",
                sublabel: "active",
                loading: performanceLoading
            )
            statCell(
                label: "VOLUME",
                value: performance.map { "\($0.set_volume ?? 0)" } ?? "—",
                sublabel: "total sets",
                loading: performanceLoading
            )
        }
    }

    private func statCell(label: String, value: String, sublabel: String, loading: Bool) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(label)
                .font(.system(size: 9, weight: .black))
                .tracking(1.5)
                .foregroundColor(Color(white: 0.35))
            if loading {
                ProgressView()
                    .scaleEffect(0.7)
                    .tint(accent)
                    .frame(height: 28)
            } else {
                Text(value)
                    .font(.system(size: 26, weight: .black))
                    .italic()
                    .foregroundColor(.white)
            }
            Text(sublabel)
                .font(.system(size: 10, weight: .medium))
                .foregroundColor(Color(white: 0.3))
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(14)
        .background(Color(white: 0.06))
        .clipShape(RoundedRectangle(cornerRadius: 16))
        .overlay(RoundedRectangle(cornerRadius: 16).stroke(Color(white: 0.09), lineWidth: 1))
    }

    // MARK: – Today's Plan

    private var todayPlanCard: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack {
                Text("TODAY'S PROTOCOL")
                    .font(.system(size: 10, weight: .black))
                    .tracking(2)
                    .foregroundColor(accent)
                Spacer()
                if dailyPlan == nil && !planLoading {
                    Button(action: { Task { await generatePlan() } }) {
                        if generating {
                            ProgressView().scaleEffect(0.7).tint(accent)
                        } else {
                            Text("GENERATE")
                                .font(.system(size: 10, weight: .black))
                                .tracking(1.5)
                                .foregroundColor(accent)
                        }
                    }
                    .disabled(generating)
                }
            }

            if planLoading {
                ProgressView().tint(accent).frame(maxWidth: .infinity)
            } else if let plan = dailyPlan, let training = plan.training_plan, let exercises = training.exercises {
                VStack(spacing: 8) {
                    ForEach(Array(exercises.prefix(4).enumerated()), id: \.offset) { i, ex in
                        HStack {
                            Text(ex.name ?? "Exercise \(i+1)")
                                .font(.system(size: 14, weight: .semibold))
                                .foregroundColor(.white)
                            Spacer()
                            Text("\(ex.sets ?? 0) × \(ex.reps ?? "—")")
                                .font(.system(size: 13, weight: .black))
                                .foregroundColor(Color(white: 0.45))
                        }
                        .padding(.horizontal, 14)
                        .padding(.vertical, 10)
                        .background(Color(white: 0.08))
                        .clipShape(RoundedRectangle(cornerRadius: 12))
                    }
                    if exercises.count > 4 {
                        Text("+ \(exercises.count - 4) more exercises")
                            .font(.system(size: 11, weight: .medium))
                            .foregroundColor(Color(white: 0.3))
                            .frame(maxWidth: .infinity, alignment: .leading)
                    }
                    // Start session CTA
                    NavigationLink(destination: GuidedWorkoutView()) {
                        HStack(spacing: 8) {
                            Image(systemName: "play.fill")
                            Text("START SESSION")
                                .tracking(1.5)
                        }
                        .font(.system(size: 12, weight: .black))
                        .foregroundColor(.black)
                        .frame(maxWidth: .infinity)
                        .frame(height: 46)
                        .background(accent)
                        .clipShape(RoundedRectangle(cornerRadius: 14))
                    }
                    .padding(.top, 4)
                }
            } else {
                Text("No session planned for today. Tap Generate or ask Coach Koda.")
                    .font(.system(size: 13, weight: .medium))
                    .foregroundColor(Color(white: 0.35))
            }
        }
        .padding(20)
        .background(Color(white: 0.05))
        .clipShape(RoundedRectangle(cornerRadius: 20))
        .overlay(RoundedRectangle(cornerRadius: 20).stroke(Color(white: 0.09), lineWidth: 1))
    }

    // MARK: – Briefing

    private var briefingCard: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("MORNING BRIEF")
                .font(.system(size: 10, weight: .black))
                .tracking(2)
                .foregroundColor(accent)
            if let b = briefing {
                Text(b)
                    .font(.system(size: 13, weight: .medium))
                    .foregroundColor(Color(white: 0.7))
                    .lineSpacing(3)
                    .italic()
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(20)
        .background(accent.opacity(0.07))
        .clipShape(RoundedRectangle(cornerRadius: 20))
        .overlay(RoundedRectangle(cornerRadius: 20).stroke(accent.opacity(0.2), lineWidth: 1))
    }

    // MARK: – Nudges

    @ViewBuilder
    private var nudgesCard: some View {
        if !nudges.isEmpty {
            VStack(alignment: .leading, spacing: 12) {
                Text("COACH NUDGES")
                    .font(.system(size: 10, weight: .black))
                    .tracking(2)
                    .foregroundColor(Color(red: 1, green: 0.65, blue: 0.0))
                ForEach(Array(nudges.prefix(3).enumerated()), id: \.offset) { _, nudge in
                    if let msg = nudge.message {
                        HStack {
                            Text(msg)
                                .font(.system(size: 13, weight: .medium))
                                .foregroundColor(.white)
                                .frame(maxWidth: .infinity, alignment: .leading)
                            Button(action: { Task { await ackNudge(nudge) } }) {
                                Image(systemName: "xmark.circle.fill")
                                    .foregroundColor(Color(white: 0.3))
                            }
                        }
                        .padding(14)
                        .background(Color(red: 1, green: 0.65, blue: 0.0).opacity(0.08))
                        .clipShape(RoundedRectangle(cornerRadius: 14))
                        .overlay(RoundedRectangle(cornerRadius: 14).stroke(Color(red: 1, green: 0.65, blue: 0.0).opacity(0.2), lineWidth: 1))
                    }
                }
            }
            .padding(20)
            .background(Color(white: 0.05))
            .clipShape(RoundedRectangle(cornerRadius: 20))
            .overlay(RoundedRectangle(cornerRadius: 20).stroke(Color(white: 0.09), lineWidth: 1))
        }
    }

    // MARK: – Projection

    @ViewBuilder
    private var projectionCard: some View {
        if let p = projection {
            VStack(alignment: .leading, spacing: 12) {
                Text("AI PROJECTION")
                    .font(.system(size: 10, weight: .black))
                    .tracking(2)
                    .foregroundColor(accent)
                HStack(spacing: 24) {
                    projStat(label: "12W TARGET", value: p.projected_12w.map { String(format: "%.1f kg", $0) } ?? "—")
                    projStat(label: "4W TARGET", value: p.projected_4w.map { String(format: "%.1f kg", $0) } ?? "—")
                    if let conf = p.confidence {
                        projStat(label: "CONFIDENCE", value: "\(Int(conf * 100))%")
                    }
                }
            }
            .padding(20)
            .background(Color(white: 0.05))
            .clipShape(RoundedRectangle(cornerRadius: 20))
            .overlay(RoundedRectangle(cornerRadius: 20).stroke(Color(white: 0.09), lineWidth: 1))
        }
    }

    private func projStat(label: String, value: String) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(label)
                .font(.system(size: 9, weight: .black))
                .tracking(1.5)
                .foregroundColor(Color(white: 0.3))
            Text(value)
                .font(.system(size: 20, weight: .black))
                .italic()
                .foregroundColor(.white)
        }
    }

    // MARK: – Retention Risk

    @ViewBuilder
    private var retentionRiskCard: some View {
        if let r = retentionRisk, let level = r.risk_level, level.lowercased() != "low" {
            VStack(alignment: .leading, spacing: 10) {
                HStack {
                    Text("RETENTION MONITOR")
                        .font(.system(size: 10, weight: .black))
                        .tracking(2)
                        .foregroundColor(riskAccent(level))
                    Spacer()
                    Text("\(level.uppercased()) RISK")
                        .font(.system(size: 10, weight: .black))
                        .tracking(1)
                        .foregroundColor(riskAccent(level))
                        .padding(.horizontal, 10)
                        .padding(.vertical, 5)
                        .background(riskAccent(level).opacity(0.15))
                        .clipShape(Capsule())
                }
                if let action = r.recommended_action {
                    Text(action)
                        .font(.system(size: 13, weight: .medium))
                        .foregroundColor(Color(white: 0.6))
                }
            }
            .padding(20)
            .background(Color(white: 0.05))
            .clipShape(RoundedRectangle(cornerRadius: 20))
            .overlay(RoundedRectangle(cornerRadius: 20).stroke(riskAccent(level).opacity(0.25), lineWidth: 1))
        }
    }

    private func riskAccent(_ level: String) -> Color {
        switch level.lowercased() {
        case "high": return .red
        case "medium": return Color(red: 1, green: 0.65, blue: 0.0)
        default: return accent
        }
    }

    // MARK: – Toolbar

    @ToolbarContentBuilder
    private var toolbarItems: some ToolbarContent {
        ToolbarItem(placement: .navigationBarTrailing) {
            NavigationLink(destination: SettingsView()) {
                Image(systemName: "person.crop.circle")
                    .font(.system(size: 18))
                    .foregroundColor(Color(white: 0.5))
            }
        }
    }

    // MARK: – Data loading

    private func loadAll() async {
        errorMessage = nil
        await withTaskGroup(of: Void.self) { group in
            group.addTask { await loadBriefing() }
            group.addTask { await loadPlan() }
            group.addTask { await loadPerformance() }
            group.addTask { await loadProjection() }
            group.addTask { await loadRetentionRisk() }
            group.addTask { await loadNudges() }
        }
    }

    private func loadBriefing() async {
        briefingLoading = true
        defer { briefingLoading = false }
        do {
            let res = try await api.aiBriefing(localDate: DateHelpers.todayLocal)
            await MainActor.run { briefing = res.briefing }
        } catch { }
    }

    private func loadPlan() async {
        planLoading = true
        defer { planLoading = false }
        guard let ds = dataService else { return }
        do {
            let p = try await ds.fetchDailyPlan(dateLocal: DateHelpers.todayLocal)
            await MainActor.run { dailyPlan = p }
        } catch { }
    }

    private func loadPerformance() async {
        performanceLoading = true
        defer { performanceLoading = false }
        do {
            let p = try await api.analyticsPerformance()
            await MainActor.run { performance = p }
        } catch { }
    }

    private func loadProjection() async {
        do {
            let p = try await api.aiProjection(today: DateHelpers.todayLocal)
            await MainActor.run { projection = p }
        } catch { }
    }

    private func loadRetentionRisk() async {
        do {
            let r = try await api.aiRetentionRisk(localDate: DateHelpers.todayLocal)
            await MainActor.run { retentionRisk = r }
        } catch { }
    }

    private func loadNudges() async {
        nudgesLoading = true
        defer { nudgesLoading = false }
        guard let ds = dataService else { return }
        do {
            let n = try await ds.fetchNudges(dateLocal: nil, unacknowledgedOnly: true, limit: 5)
            await MainActor.run { nudges = n }
        } catch { }
    }

    private func generatePlan() async {
        generating = true
        defer { generating = false }
        do {
            let res = try await api.planDaily(todayConstraints: nil)
            await MainActor.run { dailyPlan = res.plan }
        } catch {
            await MainActor.run { errorMessage = error.localizedDescription }
        }
    }

    private func ackNudge(_ nudge: CoachNudge) async {
        guard let id = nudge.nudge_id, !id.isEmpty else { return }
        _ = try? await api.coachNudgeAck(nudgeId: id)
        await loadNudges()
    }

    // MARK: – Inline chat

    private func sendQuickChat(_ text: String) {
        let trimmed = text.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty, !chatLoading else { return }
        chatInput = ""
        chatMessages.append(QuickChatMessage(text: trimmed, isUser: true))
        chatLoading = true
        Task {
            do {
                let res = try await api.aiRespond(message: trimmed, localDate: DateHelpers.todayLocal)
                await MainActor.run {
                    chatMessages.append(QuickChatMessage(text: res.reply, isUser: false))
                    chatLoading = false
                    // Refresh plan in case AI updated it
                    Task { await loadPlan() }
                }
            } catch {
                await MainActor.run {
                    chatMessages.append(QuickChatMessage(text: "Something went wrong. Try the Coach tab.", isUser: false))
                    chatLoading = false
                }
            }
        }
    }
}

// MARK: – Lightweight message type for dashboard chat

struct QuickChatMessage: Identifiable {
    let id = UUID()
    let text: String
    let isUser: Bool
}
