//
//  VitalsView.swift
//  Koda AI
//
//  Readiness insight and recovery; parity with web /vitals.
//

import SwiftUI

struct VitalsView: View {
    @EnvironmentObject var auth: SupabaseService
    @ObservedObject private var healthKit = HealthKitService.shared
    @State private var readinessInsight: String?
    @State private var loading = false
    @State private var errorMessage: String?

    private var api: KodaAPIService {
        KodaAPIService(getAccessToken: { auth.accessToken })
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                // Hero
                PremiumHeroCard(
                    title: "Recovery & Readiness",
                    subtitle: "AI-powered daily readiness analysis based on your training load, check-ins, and biometrics.",
                    eyebrow: "Vitals"
                ) {
                    HStack(spacing: 10) {
                        if let hr = healthKit.currentHeartRate {
                            PremiumMetricPill(label: "HR", value: "\(hr) bpm")
                        }
                        if let steps = healthKit.todaySteps {
                            PremiumMetricPill(label: "Steps", value: "\(steps)")
                        }
                    }
                }

                // Error banner
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

                // HealthKit biometrics card
                PremiumRowCard {
                    VStack(alignment: .leading, spacing: 16) {
                        Text("BIOMETRICS")
                            .font(.system(size: 11, weight: .black, design: .monospaced))
                            .tracking(1.2)
                            .foregroundStyle(Brand.Color.accent)

                        HStack(spacing: 0) {
                            vitalPill(
                                icon: "heart.fill",
                                label: "Heart Rate",
                                value: healthKit.currentHeartRate.map { "\($0) bpm" } ?? "—",
                                color: .pink
                            )
                            Rectangle()
                                .fill(Brand.Color.border)
                                .frame(width: 1, height: 50)
                            vitalPill(
                                icon: "figure.walk",
                                label: "Steps Today",
                                value: healthKit.todaySteps.map { formattedSteps($0) } ?? "—",
                                color: Brand.Color.accent
                            )
                        }
                    }
                }

                // AI readiness insight
                if loading && readinessInsight == nil {
                    ShimmerCard(height: 96)
                } else if let insight = readinessInsight, !insight.isEmpty {
                    PremiumRowCard {
                        VStack(alignment: .leading, spacing: 10) {
                            HStack(spacing: 6) {
                                Image(systemName: "brain.head.profile")
                                    .foregroundStyle(Brand.Color.accent)
                                Text("AI READINESS INSIGHT")
                                    .font(.system(size: 11, weight: .black, design: .monospaced))
                                    .tracking(1.2)
                                    .foregroundStyle(Brand.Color.accent)
                            }
                            Text(insight)
                                .font(.subheadline)
                                .foregroundStyle(.white)
                                .italic()
                        }
                    }
                } else if !loading {
                    PremiumRowCard {
                        HStack(spacing: 12) {
                            Image(systemName: "exclamationmark.circle")
                                .font(.title3)
                                .foregroundStyle(Brand.Color.muted)
                            Text("Complete a check-in and log workouts to unlock your readiness insight.")
                                .font(.subheadline)
                                .foregroundStyle(Brand.Color.muted)
                        }
                        .padding(.vertical, 4)
                    }
                }

                // Muscle stress map
                MuscleStressVisualizer()
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 20)
        }
        .fnBackground()
        .navigationTitle("Vitals")
        .refreshable { await load() }
        .task { await load() }
    }

    // MARK: - Helpers

    private func vitalPill(icon: String, label: String, value: String, color: Color) -> some View {
        VStack(spacing: 6) {
            Image(systemName: icon)
                .font(.title3)
                .foregroundStyle(color)
            Text(value)
                .font(.system(size: 20, weight: .black, design: .rounded))
                .foregroundStyle(.white)
            Text(label)
                .font(.system(size: 10, weight: .medium))
                .foregroundStyle(Brand.Color.muted)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 14)
    }

    private func formattedSteps(_ steps: Int) -> String {
        steps >= 1000 ? String(format: "%.1fk", Double(steps) / 1000) : "\(steps)"
    }

    // MARK: - Data

    private func load() async {
        loading = true
        errorMessage = nil
        defer { loading = false }
        do {
            let res = try await api.aiReadinessInsight(localDate: DateHelpers.todayLocal)
            await MainActor.run { readinessInsight = res.insight }
        } catch {
            await MainActor.run {
                errorMessage = (error as? LocalizedError)?.errorDescription ?? error.localizedDescription
            }
        }
    }
}
