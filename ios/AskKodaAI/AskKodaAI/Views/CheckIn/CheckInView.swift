//
//  CheckInView.swift
//  Koda AI
//
//  Daily check-in: energy, sleep, soreness, adherence. Premium design.
//  Loads today's existing check-in on appear so users can review / update.
//

import SwiftUI

struct CheckInView: View {
    @EnvironmentObject var auth: SupabaseService
    @Environment(\.dismiss) var dismiss

    @State private var energyScore = 5
    @State private var sleepHours = ""
    @State private var sorenessNotes = ""
    @State private var adherenceScore = 5
    @State private var saving = false
    @State private var loading = false
    @State private var errorMessage: String?
    @State private var saved = false
    @State private var alreadyCheckedIn = false
    @State private var pivotLoading = false
    @State private var pivotMessage: String?

    private var dataService: KodaDataService? {
        guard let uid = auth.currentUserId else { return nil }
        return KodaDataService(client: auth.supabaseClient, userId: uid)
    }

    private var api: KodaAPIService {
        KodaAPIService(getAccessToken: { await auth.accessToken })
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    PremiumHeroCard(
                        title: "Daily check-in",
                        subtitle: "Signal today's readiness so Koda can calibrate your protocol in real time.",
                        eyebrow: "Recovery Loop"
                    ) {
                        HStack(spacing: 10) {
                            PremiumMetricPill(label: "Energy", value: "\(energyScore)/10")
                            PremiumMetricPill(label: "Adherence", value: "\(adherenceScore)/10")
                        }
                    }

                    if loading {
                        ShimmerCard(height: 80)
                        ShimmerCard(height: 80)
                    } else {
                        energyCard
                        sleepCard
                        sorenessCard
                        adherenceCard
                    }

                    errorSection
                    recoveryPivotSection

                    if !loading {
                        submitButton
                    }
                }
                .padding(.horizontal, 16)
                .padding(.vertical, 20)
            }
            .fnBackground()
            .navigationTitle("Check-in")
            .navigationBarTitleDisplayMode(.inline)
            .task { await loadExistingCheckIn() }
        }
    }

    @ViewBuilder
    private var recoveryPivotSection: some View {
        if saved {
            VStack(spacing: 16) {
                savedStatusHeader
                
                if energyScore <= 3 && pivotMessage == nil {
                    pivotRecommendationCard
                }

                if let msg = pivotMessage {
                    pivotFeedbackToast(msg)
                }
            }
            .padding(.vertical, 16)
            .background(Brand.Color.surfaceRaised.opacity(0.5))
            .clipShape(RoundedRectangle(cornerRadius: 20))
        }
    }

    private var savedStatusHeader: some View {
        HStack(spacing: 10) {
            Image(systemName: "checkmark.circle.fill")
                .foregroundStyle(Brand.Color.success)
            Text("Check-in saved.")
                .font(.subheadline.weight(.semibold))
                .foregroundStyle(Brand.Color.success)
        }
        .padding(.horizontal, 16)
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    private var pivotRecommendationCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Circle().fill(Brand.Color.warning).frame(width: 8, height: 8)
                Text("RECOVERY PIVOT RECOMMENDED")
                    .font(.system(size: 10, weight: .black, design: .monospaced))
                    .foregroundStyle(Brand.Color.warning)
            }

            Text("Your energy is red-lined. Tap below to pivot today's protocol to active recovery.")
                .font(.caption)
                .foregroundStyle(Brand.Color.muted)

            Button {
                Task { await pivotPlan() }
            } label: {
                pivotButtonContent
            }
            .padding(.vertical, 10)
            .frame(maxWidth: .infinity)
            .background(Brand.Color.accent.opacity(0.1))
            .clipShape(Capsule())
            .overlay(Capsule().stroke(Brand.Color.accent.opacity(0.3), lineWidth: 1))
        }
        .padding(16)
        .background(Brand.Color.surfaceRaised)
        .clipShape(RoundedRectangle(cornerRadius: 16))
        .overlay(RoundedRectangle(cornerRadius: 16).stroke(Brand.Color.warning.opacity(0.2), lineWidth: 1))
    }

    @ViewBuilder
    private var pivotButtonContent: some View {
        if pivotLoading {
            ProgressView().tint(Brand.Color.accent)
        } else {
            Text("Pivot Protocol Now")
                .font(.caption.weight(.black))
                .textCase(.uppercase)
                .foregroundStyle(Brand.Color.accent)
        }
    }

    private func pivotFeedbackToast(_ msg: String) -> some View {
        Text(msg)
            .font(.caption.weight(.bold))
            .foregroundStyle(Brand.Color.accent)
            .padding(12)
            .background(Brand.Color.accent.opacity(0.1))
            .clipShape(RoundedRectangle(cornerRadius: 12))
    }

    @ViewBuilder
    private var submitButton: some View {
        Button {
            Task { await save() }
        } label: {
            if saving {
                HStack(spacing: 10) {
                    ProgressView().tint(.black).scaleEffect(0.85)
                    Text("Saving…")
                }
            } else {
                Text(alreadyCheckedIn ? "Update Check-in" : "Save Check-in")
            }
        }
        .buttonStyle(PremiumActionButtonStyle())
        .disabled(saving)
        .padding(.top, 4)
    }

    @ViewBuilder
    private var errorSection: some View {
        if let err = errorMessage {
            HStack(spacing: 10) {
                Image(systemName: "exclamationmark.triangle.fill")
                    .foregroundStyle(Brand.Color.danger)
                Text(err)
                    .font(.caption)
                    .foregroundStyle(Brand.Color.danger)
            }
            .padding(14)
            .background(Brand.Color.danger.opacity(0.1))
            .clipShape(RoundedRectangle(cornerRadius: 14))
        }
    }

    // MARK: - Energy Card

    private var energyCard: some View {
        PremiumRowCard {
            VStack(alignment: .leading, spacing: 14) {
                HStack {
                    Text("ENERGY LEVEL")
                        .font(.system(size: 11, weight: .black, design: .monospaced))
                        .tracking(1.2)
                        .foregroundStyle(Brand.Color.accent)
                    Spacer()
                    Text("\(energyScore)")
                        .font(.system(size: 36, weight: .black, design: .rounded))
                        .foregroundStyle(energyColor)
                }

                Text(energyLabel)
                    .font(.subheadline)
                    .foregroundStyle(Brand.Color.muted)

                Slider(
                    value: Binding(get: { Double(energyScore) }, set: { energyScore = Int($0); HapticEngine.selection() }),
                    in: 1...10,
                    step: 1
                )
                .tint(energyColor)

                HStack {
                    Text("Exhausted")
                        .font(.caption2)
                        .foregroundStyle(Brand.Color.muted)
                    Spacer()
                    Text("Peak energy")
                        .font(.caption2)
                        .foregroundStyle(Brand.Color.muted)
                }

                HStack(spacing: 8) {
                    ForEach(quickEnergyOptions, id: \.score) { opt in
                        Button {
                            energyScore = opt.score
                            HapticEngine.impact(.light)
                        } label: {
                            Text(opt.label)
                                .font(.caption.weight(.semibold))
                                .foregroundStyle(energyScore == opt.score ? .black : .white)
                                .padding(.horizontal, 12)
                                .padding(.vertical, 8)
                                .background(
                                    Capsule()
                                        .fill(energyScore == opt.score ? Brand.Color.accent : Brand.Color.surfaceRaised)
                                        .overlay(Capsule().stroke(Brand.Color.borderStrong, lineWidth: 1))
                                )
                        }
                    }
                }
            }
        }
    }

    // MARK: - Sleep Card

    private var sleepCard: some View {
        PremiumRowCard {
            VStack(alignment: .leading, spacing: 14) {
                HStack {
                    Text("SLEEP")
                        .font(.system(size: 11, weight: .black, design: .monospaced))
                        .tracking(1.2)
                        .foregroundStyle(Brand.Color.accent)
                    Spacer()
                    if let h = Double(sleepHours), h > 0 {
                        Text("\(h, specifier: "%.1f") hrs")
                            .font(.system(size: 28, weight: .black, design: .rounded))
                            .foregroundStyle(sleepColor(h))
                    }
                }

                HStack(spacing: 10) {
                    Image(systemName: "moon.fill")
                        .foregroundStyle(Brand.Color.accent)
                    TextField("Hours slept (e.g. 7.5)", text: $sleepHours)
                        .keyboardType(.decimalPad)
                        .font(.body)
                        .foregroundStyle(.white)
                }
                .padding(14)
                .background(
                    RoundedRectangle(cornerRadius: 14)
                        .fill(Brand.Color.surfaceRaised)
                        .overlay(RoundedRectangle(cornerRadius: 14).stroke(Brand.Color.borderStrong, lineWidth: 1))
                )

                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 8) {
                        ForEach(["5", "6", "7", "7.5", "8", "9"], id: \.self) { preset in
                            Button {
                                sleepHours = preset
                                HapticEngine.impact(.light)
                            } label: {
                                Text("\(preset)h")
                                    .font(.caption.weight(.semibold))
                                    .foregroundStyle(sleepHours == preset ? .black : .white)
                                    .padding(.horizontal, 12)
                                    .padding(.vertical, 8)
                                    .background(
                                        Capsule()
                                            .fill(sleepHours == preset ? Brand.Color.accent : Brand.Color.surfaceRaised)
                                            .overlay(Capsule().stroke(Brand.Color.borderStrong, lineWidth: 1))
                                    )
                            }
                        }
                    }
                }
            }
        }
    }

    // MARK: - Soreness Card

    private var sorenessCard: some View {
        PremiumRowCard {
            VStack(alignment: .leading, spacing: 14) {
                Text("SORENESS / NOTES")
                    .font(.system(size: 11, weight: .black, design: .monospaced))
                    .tracking(1.2)
                    .foregroundStyle(Brand.Color.accent)

                TextField("e.g. mild lower body DOMS, left shoulder tight", text: $sorenessNotes, axis: .vertical)
                    .lineLimit(2...4)
                    .font(.body)
                    .foregroundStyle(.white)
                    .padding(14)
                    .background(
                        RoundedRectangle(cornerRadius: 14)
                            .fill(Brand.Color.surfaceRaised)
                            .overlay(RoundedRectangle(cornerRadius: 14).stroke(Brand.Color.borderStrong, lineWidth: 1))
                    )

                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 8) {
                        ForEach(["Feeling great", "Minor soreness", "Significant soreness", "Injured area"], id: \.self) { preset in
                            Button {
                                sorenessNotes = preset
                                HapticEngine.impact(.light)
                            } label: {
                                Text(preset)
                                    .font(.caption.weight(.semibold))
                                    .foregroundStyle(.white)
                                    .padding(.horizontal, 12)
                                    .padding(.vertical, 8)
                                    .background(
                                        Capsule()
                                            .fill(Brand.Color.surfaceRaised)
                                            .overlay(Capsule().stroke(Brand.Color.borderStrong, lineWidth: 1))
                                    )
                            }
                        }
                    }
                }
            }
        }
    }

    // MARK: - Adherence Card

    private var adherenceCard: some View {
        PremiumRowCard {
            VStack(alignment: .leading, spacing: 14) {
                HStack {
                    Text("ADHERENCE TO PLAN")
                        .font(.system(size: 11, weight: .black, design: .monospaced))
                        .tracking(1.2)
                        .foregroundStyle(Brand.Color.accent)
                    Spacer()
                    Text("\(adherenceScore)")
                        .font(.system(size: 36, weight: .black, design: .rounded))
                        .foregroundStyle(adherenceColor)
                }

                Text(adherenceLabel)
                    .font(.subheadline)
                    .foregroundStyle(Brand.Color.muted)

                Slider(
                    value: Binding(get: { Double(adherenceScore) }, set: { adherenceScore = Int($0); HapticEngine.selection() }),
                    in: 1...10,
                    step: 1
                )
                .tint(adherenceColor)

                HStack {
                    Text("Off track")
                        .font(.caption2)
                        .foregroundStyle(Brand.Color.muted)
                    Spacer()
                    Text("Flawless execution")
                        .font(.caption2)
                        .foregroundStyle(Brand.Color.muted)
                }
            }
        }
    }

    // MARK: - Helpers

    private var energyColor: Color {
        switch energyScore {
        case 1...3: return Brand.Color.danger
        case 4...6: return Brand.Color.warning
        default: return Brand.Color.success
        }
    }

    private var adherenceColor: Color {
        switch adherenceScore {
        case 1...3: return Brand.Color.danger
        case 4...6: return Brand.Color.warning
        default: return Brand.Color.success
        }
    }

    private var energyLabel: String {
        switch energyScore {
        case 1...2: return "Severely fatigued — recovery priority"
        case 3...4: return "Low energy — consider a light session or rest"
        case 5...6: return "Moderate — standard execution"
        case 7...8: return "High energy — push your targets"
        default: return "Peak readiness — optimal training day"
        }
    }

    private var adherenceLabel: String {
        switch adherenceScore {
        case 1...3: return "Significant gaps in today's plan"
        case 4...6: return "Partial adherence — some adjustments made"
        case 7...8: return "Strong adherence — minor deviations"
        default: return "Perfect execution — protocol followed"
        }
    }

    private func sleepColor(_ h: Double) -> Color {
        switch h {
        case ..<5: return Brand.Color.danger
        case 5..<7: return Brand.Color.warning
        default: return Brand.Color.success
        }
    }

    private struct QuickEnergyOption { let score: Int; let label: String }
    private let quickEnergyOptions: [QuickEnergyOption] = [
        QuickEnergyOption(score: 3, label: "Tired"),
        QuickEnergyOption(score: 5, label: "Okay"),
        QuickEnergyOption(score: 7, label: "Good"),
        QuickEnergyOption(score: 9, label: "Great")
    ]

    // MARK: - Data

    private func loadExistingCheckIn() async {
        guard let ds = dataService else { return }
        loading = true
        defer { loading = false }
        do {
            if let existing = try await ds.fetchCheckIn(dateLocal: DateHelpers.todayLocal) {
                await MainActor.run {
                    energyScore = existing.energy_score ?? 5
                    adherenceScore = existing.adherence_score ?? 5
                    sleepHours = existing.sleep_hours.map { String(format: "%.1f", $0) } ?? ""
                    sorenessNotes = existing.soreness_notes ?? ""
                    alreadyCheckedIn = true
                }
            }
        } catch {
            // Non-critical — user can still submit a fresh check-in
        }
    }

    private func save() async {
        guard let ds = dataService else { return }
        saving = true
        errorMessage = nil
        saved = false
        defer { saving = false }
        var checkIn = CheckIn()
        checkIn.date_local = DateHelpers.todayLocal
        checkIn.energy_score = energyScore
        checkIn.sleep_hours = Double(sleepHours)
        checkIn.soreness_notes = sorenessNotes.isEmpty ? nil : sorenessNotes
        checkIn.adherence_score = adherenceScore
        do {
            try await ds.upsertCheckIn(checkIn)
            await MainActor.run {
                saved = true
                alreadyCheckedIn = true
            }
            HapticEngine.notification(.success)
        } catch {
            await MainActor.run { errorMessage = error.localizedDescription }
        }
    }

    private func pivotPlan() async {
        pivotLoading = true
        errorMessage = nil
        defer { pivotLoading = false }
        do {
            _ = try await api.planAdaptDay(
                userMessage: "Low energy recovery pivot. Adjust for high fatigue.",
                focus: "Recovery",
                intensity: "low",
                targetDuration: 30,
                goals: [],
                currentExercises: [],
                dateLocal: DateHelpers.todayLocal
            )
            await MainActor.run {
                pivotMessage = "Protocol adapted. New objective: Recovery."
                NotificationCenter.default.post(name: NSNotification.Name("DashboardDataChanged"), object: nil)
            }
            HapticEngine.notification(.success)
        } catch {
            await MainActor.run { errorMessage = "Pivot failed: \(error.localizedDescription)" }
        }
    }
}
