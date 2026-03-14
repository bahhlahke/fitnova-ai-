//
//  CoachView.swift
//  Koda AI
//

import SwiftUI

struct CoachView: View {
    @EnvironmentObject var auth: SupabaseService
    @StateObject private var healthKit = HealthKitService.shared
    @State private var input = ""
    @State private var messages: [MessageContent] = []
    @State private var isLoading = false
    @State private var hasLoadedHistory = false
    @State private var launchTrainingPlan: TrainingPlan?
    @State private var showingGuidedWorkout = false
    @State private var weeklyInsight: String?
    @State private var briefingRationale: String?
    @State private var progressInsight: String?
    @State private var activeEscalation: ActiveEscalationState?
    @State private var trustSignalsLoaded = false
    @State private var liveSignalTask: Task<Void, Never>?

    struct MessageContent: Identifiable {
        let id = UUID()
        let role: String
        let text: String
        let action: AIAction?
        let timestamp = Date()
    }

    private var api: KodaAPIService {
        KodaAPIService(getAccessToken: { auth.accessToken })
    }

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                ScrollViewReader { proxy in
                    ScrollView {
                        LazyVStack(alignment: .leading, spacing: 16) {
                            PremiumHeroCard(
                                title: "Coach",
                                subtitle: "Clear direction, fast tradeoffs, and direct routes into execution. Ask for the decision you need.",
                                eyebrow: "Adaptive Channel"
                            ) {
                                VStack(alignment: .leading, spacing: 14) {
                                    HStack(spacing: 10) {
                                        PremiumMetricPill(label: "Mode", value: "Adaptive")
                                        PremiumMetricPill(label: "Focus", value: "Daily Loop")
                                        PremiumMetricPill(label: "Response", value: isLoading ? "Live" : "Ready")
                                        PremiumMetricPill(label: "Wearables", value: liveWearableStatusLabel)
                                    }

                                    if messages.isEmpty {
                                        coachPromptStrip
                                    } else {
                                        HStack(spacing: 12) {
                                            coachStat(label: "Messages", value: "\(messages.count)")
                                            coachStat(label: "Assistant", value: "\(messages.filter { $0.role != "user" }.count)")
                                            coachStat(label: "Routes", value: "\(messages.filter { $0.action != nil }.count)")
                                        }
                                    }
                                }
                            }

                            trustSignalCards

                            if messages.isEmpty {
                                emptyStateCard
                            } else {
                                ForEach(messages) { m in
                                    MessageBubble(message: m)
                                        .id(m.id)
                                }
                            }

                            if isLoading {
                                PremiumRowCard {
                                    HStack(spacing: 12) {
                                        Image(systemName: "sparkles")
                                            .font(.system(size: 14, weight: .bold))
                                            .foregroundStyle(Color.black)
                                            .frame(width: 34, height: 34)
                                            .background(Circle().fill(Brand.Color.accent))
                                            .overlay(Circle().stroke(Brand.Color.accent.opacity(0.2), lineWidth: 1))
                                        VStack(alignment: .leading, spacing: 6) {
                                            Text("KODA COACH")
                                                .font(.system(size: 11, weight: .black, design: .monospaced))
                                                .tracking(1.1)
                                                .foregroundStyle(Brand.Color.accent)
                                            TypingIndicatorView()
                                        }
                                    }
                                }
                                .id("typing-indicator")
                            }
                        }
                        .padding(.horizontal, 16)
                        .padding(.top, 12)
                        .padding(.bottom, 120)
                    }
                    .scrollDismissesKeyboard(.interactively)
                    .onChange(of: messages.count) { _, _ in
                        if let last = messages.last {
                            withAnimation(.easeOut(duration: 0.2)) {
                                proxy.scrollTo(last.id, anchor: .bottom)
                            }
                        }
                    }
                    .onChange(of: isLoading) { _, loading in
                        if loading {
                            withAnimation(.easeOut(duration: 0.2)) {
                                proxy.scrollTo("typing-indicator", anchor: .bottom)
                            }
                        }
                    }
                }

                coachComposer
            }
            .fnBackground()
            .navigationTitle("Coach")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                if !messages.isEmpty {
                    ToolbarItem(placement: .navigationBarLeading) {
                        Button {
                            withAnimation { messages = [] }
                        } label: {
                            Label("Clear", systemImage: "trash")
                                .foregroundStyle(Brand.Color.muted)
                        }
                    }
                }
                ToolbarItem(placement: .primaryAction) {
                    NavigationLink("Support") {
                        CoachEscalateView()
                    }
                }
            }
        }
        .task {
            await startLiveCoachSignals()
            if !hasLoadedHistory {
                hasLoadedHistory = true
                await fetchHistory()
                await loadTrustSignals()
            }
        }
        .onDisappear {
            stopLiveCoachSignals()
        }
        .fullScreenCover(isPresented: $showingGuidedWorkout) {
            NavigationStack {
                GuidedWorkoutView(trainingPlan: launchTrainingPlan)
            }
            .ignoresSafeArea()
        }
        .onReceive(NotificationCenter.default.publisher(for: NSNotification.Name("StartGuidedWorkoutFromCoach"))) { note in
            if let trainingPlan = note.userInfo?["trainingPlan"] as? TrainingPlan {
                launchTrainingPlan = trainingPlan
                showingGuidedWorkout = true
            } else if let exercises = note.userInfo?["exercises"] as? [PlanExercise], !exercises.isEmpty {
                launchTrainingPlan = TrainingPlan(focus: "Coach Session", duration_minutes: 45, exercises: exercises)
                showingGuidedWorkout = true
            } else {
                launchTrainingPlan = nil
                showingGuidedWorkout = true
            }
        }
    }

    private func send() {
        send(text: input)
    }

    private func send(text rawText: String) {
        let text = rawText.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !text.isEmpty else { return }
        HapticEngine.selection()
        messages.append(MessageContent(role: "user", text: text, action: nil))
        input = ""
        isLoading = true
        Task {
            do {
                await healthKit.refreshLiveCoachingSignals()
                let wearableContext = wearableContextPayload(sessionPhase: "coach_chat")
                let response = try await requestCoachReply(
                    message: text,
                    wearableContext: wearableContext
                )
                await MainActor.run {
                    messages.append(
                        MessageContent(
                            role: "assistant",
                            text: response.reply,
                            action: preferredCoachAction(from: response)
                        )
                    )
                }
            } catch {
                let fallback = await fallbackCoachReply(for: text, error: error)
                await MainActor.run {
                    messages.append(
                        MessageContent(
                            role: "assistant",
                            text: fallback.reply,
                            action: preferredCoachAction(from: fallback)
                        )
                    )
                }
            }
            await MainActor.run { isLoading = false }
        }
    }

    private func sendSuggestion(_ suggestion: String) {
        send(text: suggestion)
    }

    private func preferredCoachAction(from response: AIReplyResponse) -> AIAction? {
        var orderedActions: [AIAction] = []
        if let action = response.action {
            orderedActions.append(action)
        }
        if let actions = response.actions {
            orderedActions.append(contentsOf: actions)
        }

        if let guidedAction = orderedActions.first(where: { $0.isGuidedWorkoutLaunchAction }) {
            return guidedAction
        }
        return orderedActions.first
    }

    private func requestCoachReply(
        message: String,
        wearableContext: AIWearableContextPayload?
    ) async throws -> AIReplyResponse {
        var lastError: Error?
        for attempt in 0..<2 {
            do {
                return try await api.aiRespond(
                    message: message,
                    wearableContext: wearableContext
                )
            } catch let error as KodaAPIError {
                lastError = error
                let shouldRetry: Bool
                switch error {
                case .http(let status, _) where status >= 500:
                    shouldRetry = true
                case .invalidResponse, .unknown:
                    shouldRetry = true
                default:
                    shouldRetry = false
                }
                if shouldRetry && attempt == 0 {
                    try? await Task.sleep(nanoseconds: 600_000_000)
                    continue
                }
                throw error
            } catch {
                lastError = error
                if attempt == 0 {
                    try? await Task.sleep(nanoseconds: 600_000_000)
                    continue
                }
                throw error
            }
        }
        throw lastError ?? KodaAPIError.unknown
    }

    private func fallbackCoachReply(for userMessage: String, error: Error) async -> AIReplyResponse {
        #if DEBUG
        print("coach_fallback_triggered: \(error.localizedDescription)")
        #endif
        let lowercased = userMessage.lowercased()
        let workoutIntentKeywords = ["workout", "train", "training", "session", "lift", "guided"]
        let requestedWorkoutFlow = workoutIntentKeywords.contains { lowercased.contains($0) }

        if requestedWorkoutFlow,
           let fallbackPlan = try? await api.planDaily(todayConstraints: nil).plan.training_plan,
           let exercises = fallbackPlan.exercises,
           !exercises.isEmpty {
            return AIReplyResponse(
                reply: "Coach channel is temporarily unavailable, but I generated today's guided workout so you can keep moving. Tap below to start.",
                action: AIAction(type: "plan_daily", payload: AIActionPayload(training_plan: fallbackPlan)),
                actions: nil
            )
        }

        return AIReplyResponse(
            reply: "Coach channel is temporarily unavailable right now. Retry in a moment. If it keeps happening, open Support and we'll escalate immediately.",
            action: nil,
            actions: nil
        )
    }
    
    private func fetchHistory() async {
        do {
            let response = try await api.aiHistory()
            if let hist = response.history, !hist.isEmpty {
                await MainActor.run {
                    self.messages = hist.map { MessageContent(role: $0.role, text: $0.content, action: nil) }
                }
            }
        } catch {
            print("Failed to fetch history: \(error)")
        }
    }

    private func loadTrustSignals() async {
        async let weekly = try? api.aiWeeklyInsight()
        async let briefing = try? api.aiBriefing(localDate: DateHelpers.todayLocal)
        async let progress = try? api.aiProgressInsight()
        async let escalation = try? api.coachEscalateActive()

        let weeklyInsightResponse = await weekly
        let briefingResponse = await briefing
        let progressResponse = await progress
        let escalationResponse = await escalation

        await MainActor.run {
            weeklyInsight = weeklyInsightResponse?.insight
            briefingRationale = briefingResponse?.rationale
            progressInsight = progressResponse?.insight
            activeEscalation = escalationResponse?.active
            trustSignalsLoaded = true
        }
    }

    private var liveWearableStatusLabel: String {
        if let hr = healthKit.currentHeartRate {
            return "\(hr)bpm"
        }
        if let steps = healthKit.todaySteps {
            return "\(steps / 1000)k steps"
        }
        return "Idle"
    }

    private var liveWearableSummary: String? {
        var parts: [String] = []
        if let hr = healthKit.currentHeartRate {
            parts.append("Live HR \(hr)bpm")
        }
        if let steps = healthKit.todaySteps {
            parts.append("Steps \(steps)")
        }
        if let hrv = healthKit.todayHRV {
            if let delta = healthKit.hrvDelta {
                let sign = delta >= 0 ? "+" : ""
                parts.append("HRV \(Int(hrv.rounded()))ms (\(sign)\(Int(delta.rounded())) vs 7d)")
            } else {
                parts.append("HRV \(Int(hrv.rounded()))ms")
            }
        }
        return parts.isEmpty ? nil : parts.joined(separator: " • ")
    }

    private func wearableContextPayload(sessionPhase: String) -> AIWearableContextPayload? {
        guard let snapshot = healthKit.liveSnapshot(sessionPhase: sessionPhase) else {
            return nil
        }

        return AIWearableContextPayload(
            provider: snapshot.provider,
            currentHeartRate: snapshot.currentHeartRate,
            todaySteps: snapshot.todaySteps,
            todayHRV: snapshot.todayHRV,
            hrvBaseline: snapshot.hrvBaseline,
            hrvDelta: snapshot.hrvDelta,
            sessionPhase: snapshot.sessionPhase,
            recoveryTargetHeartRate: snapshot.recoveryTargetHeartRate,
            signalCapturedAt: snapshot.signalCapturedAt
        )
    }

    private func startLiveCoachSignals() async {
        healthKit.startHeartRateStreaming()
        await healthKit.refreshLiveCoachingSignals()
        liveSignalTask?.cancel()
        liveSignalTask = Task {
            while !Task.isCancelled {
                try? await Task.sleep(nanoseconds: 45_000_000_000)
                guard !Task.isCancelled else { break }
                await healthKit.refreshLiveCoachingSignals()
            }
        }
    }

    private func stopLiveCoachSignals() {
        liveSignalTask?.cancel()
        liveSignalTask = nil
        healthKit.stopHeartRateStreaming()
    }

    @ViewBuilder
    private var trustSignalCards: some View {
        if weeklyInsight != nil || briefingRationale != nil || progressInsight != nil || activeEscalation != nil {
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 10) {
                    if let weeklyInsight, !weeklyInsight.isEmpty {
                        trustSignalCard(
                            title: "Weekly Coach Recap",
                            body: weeklyInsight,
                            symbol: "calendar.badge.clock",
                            accent: Brand.Color.accent
                        )
                    }
                    if let briefingRationale, !briefingRationale.isEmpty {
                        trustSignalCard(
                            title: "Plan Rationale",
                            body: briefingRationale,
                            symbol: "brain.head.profile",
                            accent: .white
                        )
                    }
                    if let progressInsight, !progressInsight.isEmpty {
                        trustSignalCard(
                            title: "Progress Loop",
                            body: progressInsight,
                            symbol: "chart.line.uptrend.xyaxis",
                            accent: Brand.Color.success
                        )
                    }
                    if let liveWearableSummary {
                        trustSignalCard(
                            title: "Live Wearable Signal",
                            body: liveWearableSummary,
                            symbol: "heart.text.square",
                            accent: Brand.Color.warning
                        )
                    }
                    if let escalation = activeEscalation {
                        trustSignalCard(
                            title: "Coach Escalation SLA",
                            body: escalationSummary(for: escalation),
                            symbol: escalation.status == "assigned" ? "person.crop.circle.badge.checkmark" : "clock.badge.exclamationmark",
                            accent: escalationAccent(for: escalation)
                        )
                    }
                }
                .padding(.horizontal, 2)
            }
        } else if !trustSignalsLoaded {
            ShimmerCard(height: 120)
        } else {
            PremiumRowCard {
                HStack(spacing: 10) {
                    Image(systemName: "shield")
                        .foregroundStyle(Brand.Color.muted)
                    Text("Trust signals will appear here once coach telemetry is available.")
                        .font(.caption)
                        .foregroundStyle(Brand.Color.muted)
                }
            }
        }
    }

    private func trustSignalCard(title: String, body: String, symbol: String, accent: Color) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack(spacing: 8) {
                Image(systemName: symbol)
                    .font(.caption.weight(.bold))
                    .foregroundStyle(accent)
                Text(title.uppercased())
                    .font(.system(size: 9, weight: .black, design: .monospaced))
                    .tracking(1.1)
                    .foregroundStyle(accent.opacity(0.95))
            }

            Text(body)
                .font(.caption)
                .foregroundStyle(.white.opacity(0.86))
                .fixedSize(horizontal: false, vertical: true)

            Spacer(minLength: 0)
        }
        .frame(width: 250, alignment: .topLeading)
        .padding(14)
        .background(
            RoundedRectangle(cornerRadius: 16, style: .continuous)
                .fill(Brand.Color.surfaceRaised.opacity(0.9))
                .overlay(
                    RoundedRectangle(cornerRadius: 16, style: .continuous)
                        .stroke(Brand.Color.borderStrong, lineWidth: 1)
                )
        )
    }

    private func escalationSummary(for escalation: ActiveEscalationState) -> String {
        var parts: [String] = []
        if let topic = escalation.topic, !topic.isEmpty {
            parts.append(topic)
        }
        if let status = escalation.status, !status.isEmpty {
            parts.append("Status: \(status.capitalized)")
        }
        if let due = escalation.sla_due_at {
            parts.append("SLA: \(relativeSlaLabel(for: due))")
        }
        if let latest = escalation.latest_message?.body, !latest.isEmpty {
            parts.append("Latest: \(latest)")
        }
        return parts.joined(separator: "\n")
    }

    private func escalationAccent(for escalation: ActiveEscalationState) -> Color {
        guard let dueAt = escalation.sla_due_at,
              let dueDate = ISO8601DateFormatter().date(from: dueAt) else {
            return Brand.Color.accent
        }
        let remaining = dueDate.timeIntervalSinceNow
        if remaining <= 0 { return Brand.Color.danger }
        if remaining <= 15 * 60 { return Brand.Color.warning }
        return Brand.Color.success
    }

    private func relativeSlaLabel(for isoDate: String) -> String {
        guard let dueDate = ISO8601DateFormatter().date(from: isoDate) else { return "Pending" }
        let remaining = Int(dueDate.timeIntervalSinceNow)
        if remaining <= 0 {
            return "Overdue"
        }
        let hours = remaining / 3600
        let minutes = (remaining % 3600) / 60
        if hours > 0 {
            return "\(hours)h \(minutes)m remaining"
        }
        return "\(max(minutes, 1))m remaining"
    }
    
    private var emptyStateCard: some View {
        VStack(alignment: .leading, spacing: 18) {
            HStack(alignment: .top, spacing: 14) {
                Image(systemName: "sparkles.rectangle.stack.fill")
                    .font(.system(size: 26, weight: .bold))
                    .foregroundStyle(Brand.Color.accent)
                    .frame(width: 46, height: 46)
                    .background(
                        Circle()
                            .fill(Brand.Color.accent.opacity(0.14))
                    )
                VStack(alignment: .leading, spacing: 6) {
                    Text("Start with a decision, not a vague prompt.")
                        .font(.headline)
                        .foregroundStyle(.white)
                    Text("Koda is strongest when the request is operational: adapt the session, review recovery risk, rebuild meals, or route you into a guided workout.")
                        .font(.subheadline)
                        .foregroundStyle(Brand.Color.muted)
                        .fixedSize(horizontal: false, vertical: true)
                }
            }

            VStack(alignment: .leading, spacing: 10) {
                Text("TRY ONE")
                    .font(.system(size: 10, weight: .black, design: .monospaced))
                    .tracking(1.2)
                    .foregroundStyle(Brand.Color.accent)
                coachPromptStrip
            }
        }
        .frame(maxWidth: .infinity)
        .padding(20)
        .premiumCard()
    }

    private var coachComposer: some View {
        VStack(spacing: 12) {
            if messages.isEmpty {
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 10) {
                        ForEach(coachSuggestions, id: \.self) { suggestion in
                            Button(action: { sendSuggestion(suggestion) }) {
                                Text(suggestion)
                                    .font(.caption.weight(.semibold))
                                    .foregroundStyle(.white)
                                    .padding(.horizontal, 14)
                                    .padding(.vertical, 10)
                                    .background(
                                        Capsule()
                                            .fill(Brand.Color.surfaceRaised)
                                            .overlay(Capsule().stroke(Brand.Color.borderStrong, lineWidth: 1))
                                    )
                            }
                        }
                    }
                    .padding(.horizontal, 4)
                }
            }

            HStack(alignment: .bottom, spacing: 12) {
                VStack(alignment: .leading, spacing: 8) {
                    Text("Message coach")
                        .font(.system(size: 10, weight: .black, design: .monospaced))
                        .tracking(1.2)
                        .foregroundStyle(Brand.Color.accent)
                    TextField("Ask for the exact adjustment or call you need…", text: $input, axis: .vertical)
                        .lineLimit(1...5)
                        .font(.body)
                        .foregroundStyle(.white)
                }
                .padding(.horizontal, 16)
                .padding(.vertical, 14)
                .background(
                    RoundedRectangle(cornerRadius: 22, style: .continuous)
                        .fill(Brand.Color.surfaceRaised)
                        .overlay(
                            RoundedRectangle(cornerRadius: 22, style: .continuous)
                                .stroke(Brand.Color.borderStrong, lineWidth: 1)
                        )
                )

                Button(action: send) {
                    Label("Send", systemImage: "arrow.up")
                        .labelStyle(.iconOnly)
                        .font(.headline.weight(.bold))
                        .frame(width: 52, height: 52)
                }
                .buttonStyle(PremiumActionButtonStyle())
                .frame(width: 52)
                .disabled(isLoading || input.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
            }
        }
        .padding(.horizontal, 16)
        .padding(.top, 12)
        .padding(.bottom, 12)
        .background(
            Rectangle()
                .fill(.ultraThinMaterial)
                .ignoresSafeArea(edges: .bottom)
        )
    }

    private var coachPromptStrip: some View {
        VStack(alignment: .leading, spacing: 10) {
            ForEach(coachSuggestions.prefix(3), id: \.self) { suggestion in
                Button(action: { sendSuggestion(suggestion) }) {
                    HStack(spacing: 10) {
                        Image(systemName: "arrow.up.right")
                            .font(.caption.weight(.bold))
                            .foregroundStyle(Brand.Color.accent)
                        Text(suggestion)
                            .font(.subheadline.weight(.semibold))
                            .foregroundStyle(.white)
                        Spacer()
                    }
                    .padding(14)
                    .background(
                        RoundedRectangle(cornerRadius: 18, style: .continuous)
                            .fill(Brand.Color.surfaceRaised.opacity(0.95))
                            .overlay(
                                RoundedRectangle(cornerRadius: 18, style: .continuous)
                                    .stroke(Brand.Color.borderStrong, lineWidth: 1)
                            )
                    )
                }
            }
        }
    }

    private func coachStat(label: String, value: String) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(label.uppercased())
                .font(.system(size: 9, weight: .black, design: .monospaced))
                .foregroundStyle(Brand.Color.muted)
            Text(value)
                .font(.headline.weight(.bold))
                .foregroundStyle(.white)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(12)
        .background(
            RoundedRectangle(cornerRadius: 16, style: .continuous)
                .fill(Brand.Color.surfaceRaised.opacity(0.8))
                .overlay(
                    RoundedRectangle(cornerRadius: 16, style: .continuous)
                        .stroke(Brand.Color.borderStrong, lineWidth: 1)
                )
        )
    }

    private let coachSuggestions = [
        "Adapt today’s workout around shoulder discomfort.",
        "Build tonight’s meals around my protein target.",
        "Explain whether I should train or recover today.",
        "Turn today’s plan into a guided workout."
    ]
}

struct MessageBubble: View {
    let message: CoachView.MessageContent

    var body: some View {
        VStack(alignment: message.role == "user" ? .trailing : .leading, spacing: 10) {
            HStack(alignment: .top, spacing: 12) {
                if message.role == "assistant" {
                    coachAvatar(symbol: "sparkles", filled: true)
                } else {
                    Spacer(minLength: 0)
                }

                VStack(alignment: .leading, spacing: 10) {
                    HStack(spacing: 8) {
                        Text(message.role == "user" ? "You" : "Koda Coach")
                            .font(.system(size: 11, weight: .black, design: .monospaced))
                            .tracking(1.1)
                            .foregroundStyle(message.role == "user" ? Color.black.opacity(0.72) : Brand.Color.accent)
                        if message.action != nil && message.role != "user" {
                            Text("ROUTABLE")
                                .font(.system(size: 9, weight: .black, design: .monospaced))
                                .tracking(1.1)
                                .foregroundStyle(Brand.Color.accent)
                                .padding(.horizontal, 8)
                                .padding(.vertical, 4)
                                .background(
                                    Capsule()
                                        .fill(Brand.Color.accent.opacity(0.12))
                                )
                        }
                    }

                    CoachMarkdownText(text: message.text, isUser: message.role == "user")
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(16)
                .background(message.role == "user" ? Brand.Color.accent : Brand.Color.surfaceRaised)
                .overlay(
                    RoundedRectangle(cornerRadius: 22, style: .continuous)
                        .stroke(message.role == "user" ? Brand.Color.accent.opacity(0.24) : Brand.Color.borderStrong, lineWidth: 1)
                )
                .clipShape(RoundedRectangle(cornerRadius: 22, style: .continuous))

                if message.role == "user" {
                    coachAvatar(symbol: "person.fill", filled: false)
                } else {
                    Spacer(minLength: 0)
                }
            }
            
            if let action = message.action, action.type == "video_demo", let urlStr = action.payload?.video_url, let url = URL(string: urlStr) {
                VStack(alignment: .leading, spacing: 8) {
                    HStack(spacing: 6) {
                        Image(systemName: "play.rectangle.fill")
                            .font(.caption2)
                        Text("ELITE DEMONSTRATION: \(action.payload?.exercise_name?.uppercased() ?? "EXERCISE")")
                            .font(.system(size: 8, weight: .black))
                            .tracking(1)
                    }
                    .foregroundStyle(Brand.Color.accent)
                    
                    CinemaPlayerView(videoURL: url)
                        .frame(height: 300)
                        .clipShape(RoundedRectangle(cornerRadius: 12))
                        .overlay(
                            RoundedRectangle(cornerRadius: 12)
                                .stroke(Brand.Color.accent.opacity(0.3), lineWidth: 1)
                        )
                }
                .padding(.leading, message.role == "assistant" ? 58 : 0)
                .padding(.top, 4)
            }

            if let action = message.action, action.isGuidedWorkoutLaunchAction {
                WorkoutSteeringButton(
                    trainingPlan: action.payload?.training_plan,
                    parityGuard: action.payload?.parity_guard,
                    allowFallbackLaunch: true
                )
                    .padding(.leading, message.role == "assistant" ? 58 : 0)
            }

            Text(message.timestamp, style: .time)
                .font(.system(size: 10))
                .foregroundStyle(Brand.Color.muted)
                .padding(.leading, message.role == "assistant" ? 58 : 0)
                .padding(.trailing, message.role == "user" ? 58 : 0)
                .frame(maxWidth: .infinity, alignment: message.role == "user" ? .trailing : .leading)
        }
    }

    private func coachAvatar(symbol: String, filled: Bool) -> some View {
        Image(systemName: symbol)
            .font(.system(size: 14, weight: .bold))
            .foregroundStyle(filled ? Color.black : Brand.Color.accent)
            .frame(width: 34, height: 34)
            .background(
                Circle()
                    .fill(filled ? Brand.Color.accent : Brand.Color.surfaceRaised)
            )
            .overlay(
                Circle()
                    .stroke(filled ? Brand.Color.accent.opacity(0.2) : Brand.Color.borderStrong, lineWidth: 1)
            )
    }
}

struct WorkoutSteeringButton: View {
    let trainingPlan: TrainingPlan?
    let parityGuard: WorkoutParityGuard?
    let allowFallbackLaunch: Bool
    @State private var showingParityApproval = false

    private var requiresApproval: Bool {
        parityGuard?.requires_approval == true
    }

    var body: some View {
        if let trainingPlan, let exercises = trainingPlan.exercises, !exercises.isEmpty {
            VStack(alignment: .leading, spacing: 8) {
                if requiresApproval {
                    Label("Koda parity review required before launch", systemImage: "shield.lefthalf.filled")
                        .font(.system(size: 10, weight: .black, design: .monospaced))
                        .foregroundStyle(Brand.Color.warning)
                        .padding(.horizontal, 10)
                        .padding(.vertical, 6)
                        .background(
                            Capsule()
                                .fill(Brand.Color.warning.opacity(0.12))
                                .overlay(Capsule().stroke(Brand.Color.warning.opacity(0.28), lineWidth: 1))
                        )
                }

                Button {
                    if requiresApproval {
                        showingParityApproval = true
                    } else {
                        startWorkout(trainingPlan: trainingPlan, exercises: exercises)
                    }
                } label: {
                    HStack {
                        Image(systemName: requiresApproval ? "checkmark.shield.fill" : "play.fill")
                        Text(requiresApproval ? "Review Plan Diff" : "Start Guided Workout")
                    }
                    .font(.system(size: 13, weight: .black))
                    .padding(.horizontal, 18)
                    .padding(.vertical, 14)
                    .frame(maxWidth: .infinity)
                    .background(Brand.Color.accent)
                    .foregroundStyle(.black)
                    .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
                }
            }
            .padding(.horizontal, 2)
            .padding(.top, 8)
            .sheet(isPresented: $showingParityApproval) {
                parityApprovalSheet(trainingPlan: trainingPlan, exercises: exercises)
            }
        } else if allowFallbackLaunch {
            Button {
                startFallbackWorkout()
            } label: {
                HStack {
                    Image(systemName: "play.fill")
                    Text("Open Guided Workout")
                }
                .font(.system(size: 13, weight: .black))
                .padding(.horizontal, 18)
                .padding(.vertical, 14)
                .frame(maxWidth: .infinity)
                .background(Brand.Color.accent)
                .foregroundStyle(.black)
                .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
            }
            .padding(.horizontal, 2)
            .padding(.top, 8)
        }
    }

    private func startWorkout(trainingPlan: TrainingPlan, exercises: [PlanExercise]) {
        NotificationCenter.default.post(
            name: NSNotification.Name("StartGuidedWorkoutFromCoach"),
            object: nil,
            userInfo: ["trainingPlan": trainingPlan, "exercises": exercises]
        )
    }

    private func startFallbackWorkout() {
        NotificationCenter.default.post(
            name: NSNotification.Name("StartGuidedWorkoutFromCoach"),
            object: nil
        )
    }

    private func parityApprovalSheet(trainingPlan: TrainingPlan, exercises: [PlanExercise]) -> some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 14) {
                    PremiumHeroCard(
                        title: "Workout Parity Review",
                        subtitle: "Koda detected meaningful differences from the baseline coach logic. Review before launching.",
                        eyebrow: "Approval Required"
                    ) {
                        HStack(spacing: 10) {
                            PremiumMetricPill(label: "Diffs", value: "\(parityGuard?.divergence_count ?? parityGuard?.diffs?.count ?? 0)")
                            PremiumMetricPill(label: "Status", value: "Pending")
                        }
                    }

                    if let summary = parityGuard?.summary, !summary.isEmpty {
                        PremiumRowCard {
                            Text(summary)
                                .font(.subheadline)
                                .foregroundStyle(.white)
                                .fixedSize(horizontal: false, vertical: true)
                        }
                    }

                    if let diffs = parityGuard?.diffs, !diffs.isEmpty {
                        ForEach(Array(diffs.enumerated()), id: \.offset) { _, diff in
                            PremiumRowCard {
                                VStack(alignment: .leading, spacing: 8) {
                                    Text(diff.exercise_name ?? "Exercise")
                                        .font(.headline.weight(.bold))
                                        .foregroundStyle(.white)
                                    if let changed = diff.changed_fields, !changed.isEmpty {
                                        Text("Changed: \(changed.joined(separator: ", "))")
                                            .font(.caption.weight(.semibold))
                                            .foregroundStyle(Brand.Color.warning)
                                    }
                                    if let baseline = diff.baseline_summary, !baseline.isEmpty {
                                        Text("Baseline: \(baseline)")
                                            .font(.caption)
                                            .foregroundStyle(Brand.Color.muted)
                                    }
                                    if let candidate = diff.candidate_summary, !candidate.isEmpty {
                                        Text("Candidate: \(candidate)")
                                            .font(.caption)
                                            .foregroundStyle(.white.opacity(0.8))
                                    }
                                }
                            }
                        }
                    }

                    Button("Approve And Start Guided Workout") {
                        showingParityApproval = false
                        startWorkout(trainingPlan: trainingPlan, exercises: exercises)
                    }
                    .buttonStyle(PremiumActionButtonStyle())
                }
                .padding(16)
            }
            .fnBackground()
            .navigationTitle("Plan Approval")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") {
                        showingParityApproval = false
                    }
                }
            }
        }
    }
}

private extension AIAction {
    var isGuidedWorkoutLaunchAction: Bool {
        if type == "plan_daily" || type == "plan_generated" || type == "update_workout_plan" {
            return true
        }

        if let route = targetRoute?.lowercased(), route.contains("/log/workout/guided") {
            return true
        }

        if let exercises = payload?.training_plan?.exercises, !exercises.isEmpty {
            return true
        }

        return false
    }
}

struct CoachMarkdownText: View {
    let text: String
    let isUser: Bool

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            ForEach(Array(parsedLines.enumerated()), id: \.offset) { _, line in
                switch line.kind {
                case .heading:
                    Text(line.text)
                        .font(.headline.weight(.bold))
                        .foregroundStyle(isUser ? Color.black : .white)
                case .bullet:
                    HStack(alignment: .top, spacing: 8) {
                        Text("•")
                            .foregroundStyle(isUser ? Color.black.opacity(0.72) : Brand.Color.accent)
                        Text(line.text)
                            .foregroundStyle(isUser ? Color.black : .white)
                            .frame(maxWidth: .infinity, alignment: .leading)
                    }
                case .body:
                    Text(line.text)
                        .foregroundStyle(isUser ? Color.black : .white)
                }
            }
        }
        .font(.body)
        .multilineTextAlignment(.leading)
        .textSelection(.enabled)
    }

    private var parsedLines: [RenderedLine] {
        let source = normalizedMarkdown
        let lines = source.components(separatedBy: .newlines)
        var rendered: [RenderedLine] = []

        for rawLine in lines {
            let trimmed = rawLine.trimmingCharacters(in: .whitespaces)
            guard !trimmed.isEmpty else { continue }

            if let headingMatch = trimmed.range(of: #"^#{1,6}\s+"#, options: .regularExpression) {
                let value = cleanedInlineMarkdown(String(trimmed[headingMatch.upperBound...]))
                if !value.isEmpty {
                    rendered.append(RenderedLine(kind: .heading, text: value))
                }
                continue
            }

            if let bulletMatch = trimmed.range(of: #"^[-*]\s+"#, options: .regularExpression) {
                let value = cleanedInlineMarkdown(String(trimmed[bulletMatch.upperBound...]))
                if !value.isEmpty {
                    rendered.append(RenderedLine(kind: .bullet, text: value))
                }
                continue
            }

            let numberedLine = trimmed.replacingOccurrences(
                of: #"^(\d+)\.\s+"#,
                with: "$1. ",
                options: .regularExpression
            )
            let value = cleanedInlineMarkdown(numberedLine)
            if !value.isEmpty {
                rendered.append(RenderedLine(kind: .body, text: value))
            }
        }

        return rendered.isEmpty ? [RenderedLine(kind: .body, text: cleanedInlineMarkdown(source))] : rendered
    }

    private var normalizedMarkdown: String {
        text
            .replacingOccurrences(of: "\r\n", with: "\n")
            .replacingOccurrences(of: "```", with: "")
            .replacingOccurrences(
                of: #"(?m)^(#{1,6})(\S)"#,
                with: "$1 $2",
                options: .regularExpression
            )
    }

    private func cleanedInlineMarkdown(_ value: String) -> String {
        value
            .replacingOccurrences(
                of: #"\*\*(.*?)\*\*"#,
                with: "$1",
                options: .regularExpression
            )
            .replacingOccurrences(
                of: #"__(.*?)__"#,
                with: "$1",
                options: .regularExpression
            )
            .replacingOccurrences(
                of: #"`([^`]+)`"#,
                with: "$1",
                options: .regularExpression
            )
            .replacingOccurrences(
                of: #"(?m)^#{1,6}\s*"#,
                with: "",
                options: .regularExpression
            )
            .trimmingCharacters(in: .whitespacesAndNewlines)
    }

    private struct RenderedLine {
        enum Kind {
            case heading
            case bullet
            case body
        }

        let kind: Kind
        let text: String
    }
}

struct TypingIndicatorView: View {
    @State private var animating = false

    var body: some View {
        HStack(spacing: 5) {
            ForEach(0..<3, id: \.self) { i in
                Circle()
                    .fill(Brand.Color.accent)
                    .frame(width: 7, height: 7)
                    .opacity(animating ? 1.0 : 0.3)
                    .scaleEffect(animating ? 1.0 : 0.55)
                    .animation(
                        .easeInOut(duration: 0.5)
                            .repeatForever(autoreverses: true)
                            .delay(Double(i) * 0.17),
                        value: animating
                    )
            }
        }
        .onAppear { animating = true }
    }
}
