//
//  HomeView.swift
//  Koda AI
//
//  Simplified home screen: greeting, today's plan, coach brief, quick actions.
//

import SwiftUI

struct HomeView: View {
    @EnvironmentObject var auth: SupabaseService
    @StateObject private var healthKit = HealthKitService.shared

    // MARK: - Data

    @State private var dailyPlan: DailyPlan?
    @State private var profile: UserProfile?
    @State private var briefing: AIBriefingResponse?
    @State private var nudges: [CoachNudge] = []
    @State private var weeklyInsight: String?

    // MARK: - Load phase

    @State private var criticalPhaseLoading = false
    @State private var errorMessage: String?

    // MARK: - UI state

    @State private var showingGuidedWorkout = false
    @State private var showingCoachChat = false
    @State private var showingCheckIn = false
    @State private var showingLogNutrition = false
    @State private var generating = false
    @State private var refreshTask: Task<Void, Never>?
    @Namespace private var workoutNamespace

    // MARK: - HRV adaptive plan state

    @State private var adaptiveReason: String?
    @State private var isAdaptingPlan = false

    // MARK: - Services

    private var api: KodaAPIService {
        KodaAPIService(getAccessToken: { auth.accessToken })
    }

    private var dataService: KodaDataService? {
        guard let uid = auth.currentUserId else { return nil }
        return KodaDataService(client: auth.supabaseClient, userId: uid)
    }

    // MARK: - Computed

    private var greetingName: String {
        if let name = profile?.display_name, !name.isEmpty {
            return name.components(separatedBy: " ").first ?? name
        }
        return "Athlete"
    }

    private var greetingLine: String {
        let hour = Calendar.current.component(.hour, from: Date())
        switch hour {
        case 5..<12: return "Good morning, \(greetingName)."
        case 12..<17: return "Good afternoon, \(greetingName)."
        default:      return "Good evening, \(greetingName)."
        }
    }

    var body: some View {
        ZStack {
            NavigationStack {
                ScrollView {
                    VStack(alignment: .leading, spacing: 24) {
                        greetingSection
                        if let reason = adaptiveReason {
                            hrvAdaptiveBanner(reason: reason)
                        }
                        todayWorkoutSection
                        if let b = briefing, let text = b.briefing, !text.isEmpty {
                            briefingSection(text: text)
                        }
                        if let wi = weeklyInsight, !wi.isEmpty {
                            weeklyInsightSection(text: wi)
                        }
                        if !nudges.isEmpty {
                            nudgesSection
                        }
                        quickActionsSection
                    }
                    .padding(.horizontal, 16)
                    .padding(.top, 12)
                    .padding(.bottom, 40)
                }
                .background {
                    ZStack {
                        Color.black.ignoresSafeArea()
                        Image("DashboardHero")
                            .resizable()
                            .aspectRatio(contentMode: .fill)
                            .ignoresSafeArea()
                            .opacity(0.18)
                        LinearGradient(
                            colors: [.black, .black.opacity(0.7), .clear],
                            startPoint: .bottom, endPoint: .top
                        )
                        .ignoresSafeArea()
                    }
                }
                .navigationTitle("Home")
                .navigationBarTitleDisplayMode(.large)
                .toolbarColorScheme(.dark, for: .navigationBar)
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
                .sheet(isPresented: $showingCoachChat) {
                    CoachView()
                }
                .sheet(isPresented: $showingCheckIn) {
                    CheckInView()
                        .onDisappear { Task { await loadAll() } }
                }
                .sheet(isPresented: $showingLogNutrition) {
                    LogNutritionView()
                }
                .onReceive(NotificationCenter.default.publisher(for: NSNotification.Name("StartGuidedWorkoutFromCoach"))) { note in
                    handleCoachWorkoutLaunch(note)
                }
            }

            // Hero workout overlay — same ZStack so matchedGeometryEffect works.
            if showingGuidedWorkout, let plan = dailyPlan?.training_plan {
                NavigationStack {
                    GuidedWorkoutView(trainingPlan: plan)
                }
                .matchedGeometryEffect(id: "workout-hero", in: workoutNamespace)
                .ignoresSafeArea()
                .transition(.asymmetric(
                    insertion: .scale(scale: 0.94, anchor: .bottom).combined(with: .opacity),
                    removal:   .scale(scale: 0.94, anchor: .bottom).combined(with: .opacity)
                ))
                .zIndex(10)
            }
        }
    }

    // MARK: - Sections

    private var greetingSection: some View {
        VStack(alignment: .leading, spacing: 6) {
            if criticalPhaseLoading && profile == nil {
                ShimmerCard(height: 56)
            } else {
                Text(greetingLine)
                    .font(.system(size: 28, weight: .black))
                    .foregroundStyle(.white)
                if let level = profile?.activity_level, !level.isEmpty {
                    Text(level.uppercased())
                        .font(.system(size: 11, weight: .black, design: .monospaced))
                        .tracking(1.4)
                        .foregroundStyle(Brand.Color.accent)
                }
            }
        }
    }

    private var todayWorkoutSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("TODAY")
                .font(.system(size: 10, weight: .black, design: .monospaced))
                .tracking(1.4)
                .foregroundStyle(Brand.Color.accent)

            if criticalPhaseLoading && dailyPlan == nil {
                ShimmerCard(height: 140)
            } else if let plan = dailyPlan?.training_plan {
                workoutCard(plan: plan)
            } else {
                emptyWorkoutCard
            }
        }
    }

    private func workoutCard(plan: TrainingPlan) -> some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack(alignment: .top) {
                VStack(alignment: .leading, spacing: 6) {
                    Text(plan.focus ?? "Training Session")
                        .font(.title3.weight(.black))
                        .foregroundStyle(.white)
                        .lineLimit(2)
                    HStack(spacing: 12) {
                        if let mins = plan.duration_minutes {
                            Label("\(mins) min", systemImage: "clock")
                                .font(.caption.weight(.semibold))
                                .foregroundStyle(Brand.Color.muted)
                        }
                        if let count = plan.exercises?.count, count > 0 {
                            Label("\(count) exercises", systemImage: "list.bullet")
                                .font(.caption.weight(.semibold))
                                .foregroundStyle(Brand.Color.muted)
                        }
                    }
                }
                Spacer()
                Image(systemName: "dumbbell.fill")
                    .font(.title2)
                    .foregroundStyle(Brand.Color.accent.opacity(0.7))
            }
            Button {
                withAnimation(.spring(response: 0.45, dampingFraction: 0.82)) {
                    showingGuidedWorkout = true
                }
            } label: {
                Label("Start Guided Session", systemImage: "play.fill")
                    .frame(maxWidth: .infinity)
            }
            .matchedGeometryEffect(id: "workout-hero", in: workoutNamespace)
            .buttonStyle(PremiumActionButtonStyle())
        }
        .padding(20)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(
            RoundedRectangle(cornerRadius: 24, style: .continuous)
                .fill(.ultraThinMaterial)
                .overlay(
                    RoundedRectangle(cornerRadius: 24, style: .continuous)
                        .stroke(Brand.Color.accent.opacity(0.25), lineWidth: 1)
                )
        )
    }

    private var emptyWorkoutCard: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack {
                VStack(alignment: .leading, spacing: 6) {
                    Text("No session planned yet.")
                        .font(.title3.weight(.bold))
                        .foregroundStyle(.white)
                    Text("Generate an adaptive plan based on your goals and history.")
                        .font(.subheadline)
                        .foregroundStyle(Brand.Color.muted)
                        .fixedSize(horizontal: false, vertical: true)
                }
                Spacer()
                Image(systemName: "sparkles")
                    .font(.title2)
                    .foregroundStyle(Brand.Color.accent.opacity(0.6))
            }
            Button {
                Task { await generatePlan() }
            } label: {
                Label(generating ? "Generating…" : "Generate Today's Plan", systemImage: "wand.and.stars")
                    .frame(maxWidth: .infinity)
            }
            .buttonStyle(PremiumActionButtonStyle())
            .disabled(generating)
            if let err = errorMessage {
                Text(err)
                    .font(.caption)
                    .foregroundStyle(Brand.Color.danger)
            }
        }
        .padding(20)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(
            RoundedRectangle(cornerRadius: 24, style: .continuous)
                .fill(Brand.Color.surfaceRaised)
                .overlay(
                    RoundedRectangle(cornerRadius: 24, style: .continuous)
                        .stroke(Brand.Color.border, lineWidth: 1)
                )
        )
    }

    private func briefingSection(text: String) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("COACH BRIEF")
                .font(.system(size: 10, weight: .black, design: .monospaced))
                .tracking(1.4)
                .foregroundStyle(Brand.Color.accent)
            Text(text)
                .font(.subheadline)
                .foregroundStyle(.white.opacity(0.85))
                .fixedSize(horizontal: false, vertical: true)
        }
        .padding(18)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(
            RoundedRectangle(cornerRadius: 20, style: .continuous)
                .fill(Brand.Color.surfaceRaised)
                .overlay(
                    RoundedRectangle(cornerRadius: 20, style: .continuous)
                        .stroke(Brand.Color.border, lineWidth: 1)
                )
        )
    }

    private func weeklyInsightSection(text: String) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("WEEKLY INSIGHT")
                .font(.system(size: 10, weight: .black, design: .monospaced))
                .tracking(1.4)
                .foregroundStyle(Brand.Color.success)
            Text(text)
                .font(.subheadline)
                .foregroundStyle(.white.opacity(0.85))
                .fixedSize(horizontal: false, vertical: true)
        }
        .padding(18)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(
            RoundedRectangle(cornerRadius: 20, style: .continuous)
                .fill(Brand.Color.success.opacity(0.07))
                .overlay(
                    RoundedRectangle(cornerRadius: 20, style: .continuous)
                        .stroke(Brand.Color.success.opacity(0.25), lineWidth: 1)
                )
        )
    }

    @ViewBuilder
    private var nudgesSection: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("NUDGES")
                .font(.system(size: 10, weight: .black, design: .monospaced))
                .tracking(1.4)
                .foregroundStyle(Brand.Color.accent)
            ForEach(Array(nudges.prefix(2).enumerated()), id: \.offset) { _, nudge in
                if let msg = nudge.message {
                    HStack {
                        Image(systemName: "bell.badge.fill")
                            .font(.caption)
                            .foregroundStyle(Brand.Color.warning)
                        Text(msg)
                            .font(.subheadline)
                            .foregroundStyle(.white.opacity(0.85))
                            .frame(maxWidth: .infinity, alignment: .leading)
                        Button("×") {
                            Task { await ackNudge(nudge) }
                        }
                        .font(.title3)
                        .foregroundStyle(Brand.Color.muted)
                    }
                    .padding(14)
                    .background(
                        RoundedRectangle(cornerRadius: 16, style: .continuous)
                            .fill(Brand.Color.warning.opacity(0.08))
                            .overlay(
                                RoundedRectangle(cornerRadius: 16, style: .continuous)
                                    .stroke(Brand.Color.warning.opacity(0.2), lineWidth: 1)
                            )
                    )
                }
            }
        }
    }

    private var quickActionsSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("QUICK ACTIONS")
                .font(.system(size: 10, weight: .black, design: .monospaced))
                .tracking(1.4)
                .foregroundStyle(Brand.Color.accent)
            HStack(spacing: 12) {
                quickActionButton(title: "Ask\nCoach", icon: "message.fill") {
                    showingCoachChat = true
                }
                quickActionButton(title: "Check\nIn", icon: "checkmark.circle.fill") {
                    showingCheckIn = true
                }
                quickActionButton(title: "Log\nNutrition", icon: "fork.knife") {
                    showingLogNutrition = true
                }
            }
        }
    }

    private func quickActionButton(title: String, icon: String, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            VStack(spacing: 8) {
                Image(systemName: icon)
                    .font(.title3.weight(.semibold))
                    .foregroundStyle(Brand.Color.accent)
                    .frame(width: 52, height: 52)
                    .background(
                        Circle()
                            .fill(Brand.Color.surfaceRaised)
                            .overlay(Circle().stroke(Brand.Color.border, lineWidth: 1))
                    )
                Text(title)
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(.white.opacity(0.8))
                    .multilineTextAlignment(.center)
            }
            .frame(maxWidth: .infinity)
        }
        .buttonStyle(.plain)
    }

    // MARK: - Data loading

    private func loadAll() async {
        errorMessage = nil
        criticalPhaseLoading = true
        await withTaskGroup(of: Void.self) { group in
            group.addTask { await self.loadProfile() }
            group.addTask { await self.loadPlan() }
            group.addTask { await self.loadBriefing() }
        }
        criticalPhaseLoading = false
        // Secondary phase — non-blocking background loads
        async let _nudges: () = loadNudges()
        async let _insight: () = loadWeeklyInsight()
        async let _hrv: () = checkAndApplyHRVAdaptation()
        _ = await (_nudges, _insight, _hrv)
        // Schedule streak-at-risk notification for 20:00 if not already done today
        NotificationService.shared.scheduleStreakAtRiskNotification()
    }

    private func loadProfile() async {
        guard let ds = dataService else { return }
        let p = try? await ds.fetchProfile()
        await MainActor.run { self.profile = p }
        // Request notification permission once per install
        let kNotifRequested = "koda.notificationsRequested"
        if !UserDefaults.standard.bool(forKey: kNotifRequested) {
            await NotificationService.shared.requestAuthorization()
            NotificationService.shared.scheduleDailyPlanNotification()
            UserDefaults.standard.set(true, forKey: kNotifRequested)
        }
    }

    private func loadBriefing() async {
        let res = try? await api.aiBriefing(localDate: DateHelpers.todayLocal)
        await MainActor.run { briefing = res }
    }

    private func loadPlan() async {
        if let cached = PlanCache.shared.loadDailyPlan() {
            await MainActor.run { dailyPlan = cached }
        }
        guard let ds = dataService else { return }
        let fresh = try? await ds.fetchDailyPlan(dateLocal: DateHelpers.todayLocal)
        if let plan = fresh {
            PlanCache.shared.storeDailyPlan(plan)
        }
        await MainActor.run { dailyPlan = fresh ?? dailyPlan }
    }

    private func loadNudges() async {
        guard let ds = dataService else { return }
        let n = try? await ds.fetchNudges(dateLocal: nil, unacknowledgedOnly: true, limit: 2)
        await MainActor.run { nudges = n ?? [] }
    }

    private func loadWeeklyInsight() async {
        let res = try? await api.aiWeeklyInsight()
        await MainActor.run { weeklyInsight = res?.insight }
    }

    private func generatePlan() async {
        generating = true
        defer { generating = false }
        errorMessage = nil
        do {
            let res = try await api.planDaily(todayConstraints: nil)
            await MainActor.run { dailyPlan = res.plan }
        } catch {
            await MainActor.run { errorMessage = "Could not generate plan. Try again." }
        }
    }

    private func ackNudge(_ nudge: CoachNudge) async {
        guard let id = nudge.nudge_id, !id.isEmpty else { return }
        _ = try? await api.coachNudgeAck(nudgeId: id)
        await loadNudges()
    }

    // MARK: - HRV Adaptive Plan

    private func checkAndApplyHRVAdaptation() async {
        let (todayHRV, baseline) = await healthKit.computeHRVStatus()
        guard let today = todayHRV, let base = baseline, base > 0 else { return }
        // Trigger recovery adaptation when today's HRV is < 80% of 7-day baseline
        guard today < base * 0.80 else { return }
        isAdaptingPlan = true
        defer { isAdaptingPlan = false }
        do {
            let res = try await api.planAdaptDay(
                minutesAvailable: nil,
                location: nil,
                soreness: "Elevated recovery demand (low HRV: \(Int(today))ms vs \(Int(base))ms baseline)",
                intensity: "recovery",
                equipmentContext: nil
            )
            await MainActor.run {
                dailyPlan = res.plan
                adaptiveReason = "HRV is \(Int(today))ms (\(Int((today / base) * 100))% of baseline). Your plan has been adapted for recovery."
            }
        } catch {
            print("[Koda] HRV adaptation: \(error)")
        }
    }

    private func hrvAdaptiveBanner(reason: String) -> some View {
        HStack(alignment: .top, spacing: 12) {
            Image(systemName: "waveform.path.ecg")
                .font(.title3)
                .foregroundStyle(Brand.Color.warning)
            VStack(alignment: .leading, spacing: 4) {
                Text("ADAPTIVE RECOVERY MODE")
                    .font(.system(size: 10, weight: .black, design: .monospaced))
                    .tracking(1.2)
                    .foregroundStyle(Brand.Color.warning)
                Text(reason)
                    .font(.subheadline)
                    .foregroundStyle(.white.opacity(0.85))
                    .fixedSize(horizontal: false, vertical: true)
            }
            Spacer()
            Button {
                withAnimation { adaptiveReason = nil }
            } label: {
                Image(systemName: "xmark")
                    .font(.caption.weight(.bold))
                    .foregroundStyle(Brand.Color.muted)
            }
            .buttonStyle(.plain)
        }
        .padding(16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(
            RoundedRectangle(cornerRadius: 18, style: .continuous)
                .fill(Brand.Color.warning.opacity(0.08))
                .overlay(
                    RoundedRectangle(cornerRadius: 18, style: .continuous)
                        .stroke(Brand.Color.warning.opacity(0.3), lineWidth: 1)
                )
        )
        .transition(.move(edge: .top).combined(with: .opacity))
        .animation(.spring(response: 0.4, dampingFraction: 0.8), value: adaptiveReason)
    }

    private func handleCoachWorkoutLaunch(_ note: NotificationCenter.Publisher.Output) {
        if let trainingPlan = note.userInfo?["trainingPlan"] as? TrainingPlan {
            dailyPlan = DailyPlan(
                date_local: DateHelpers.todayLocal,
                training_plan: trainingPlan,
                nutrition_plan: nil,
                safety_notes: nil
            )
            showingCoachChat = false
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.4) {
                withAnimation(.spring(response: 0.45, dampingFraction: 0.82)) {
                    showingGuidedWorkout = true
                }
            }
        } else if let exercises = note.userInfo?["exercises"] as? [PlanExercise], !exercises.isEmpty {
            dailyPlan = DailyPlan(
                date_local: DateHelpers.todayLocal,
                training_plan: TrainingPlan(focus: "Coach Session", duration_minutes: 45, exercises: exercises),
                nutrition_plan: nil,
                safety_notes: nil
            )
            showingCoachChat = false
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.4) {
                withAnimation(.spring(response: 0.45, dampingFraction: 0.82)) {
                    showingGuidedWorkout = true
                }
            }
        }
    }
}
