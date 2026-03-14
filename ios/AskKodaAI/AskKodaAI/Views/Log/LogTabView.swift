//
//  LogTabView.swift
//  Koda AI
//

import SwiftUI

struct LogTabView: View {
    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 18) {
                    PremiumHeroCard(
                        title: "Capture the work while the signal is fresh.",
                        subtitle: "Jump into guided training, log nutrition, or review the history that is steering the next plan.",
                        eyebrow: "Execution"
                    ) {
                        HStack(spacing: 10) {
                            PremiumMetricPill(label: "Workout", value: "Guided")
                            PremiumMetricPill(label: "Nutrition", value: "Logged")
                        }
                    }

                    NavigationLink {
                        MotionLabView()
                    } label: {
                        PremiumRowCard {
                            VStack(alignment: .leading, spacing: 14) {
                                HStack {
                                    VStack(alignment: .leading, spacing: 6) {
                                        Text("Featured")
                                            .font(.system(size: 11, weight: .black, design: .monospaced))
                                            .foregroundStyle(Brand.Color.accent)
                                        Text("Realtime Motion Lab")
                                            .font(.title3.weight(.black))
                                            .foregroundStyle(.white)
                                        Text("Get live form cues, rep counting, and camera-derived velocity without breaking the workout flow.")
                                            .font(.subheadline)
                                            .foregroundStyle(Brand.Color.muted)
                                    }
                                    Spacer()
                                    Image(systemName: "video.badge.checkmark")
                                        .font(.system(size: 28, weight: .bold))
                                        .foregroundStyle(Brand.Color.accent)
                                }

                                HStack(spacing: 10) {
                                    PremiumMetricPill(label: "Coach", value: "Live")
                                    PremiumMetricPill(label: "Rep Count", value: "Auto")
                                    PremiumMetricPill(label: "Velocity", value: "Tracked")
                                }

                                HStack {
                                    Text("Open Motion Lab")
                                        .font(.subheadline.weight(.bold))
                                        .foregroundStyle(.white)
                                    Spacer()
                                    Image(systemName: "arrow.right")
                                        .foregroundStyle(Brand.Color.accent)
                                }
                            }
                        }
                    }
                    .buttonStyle(.plain)

                    logSection(
                        title: "Workout",
                        rows: [
                            logRow(title: "Log workout", subtitle: "Quick capture plus recent sessions", icon: "figure.strengthtraining.traditional", destination: AnyView(LogWorkoutView())),
                            logRow(title: "Guided workout", subtitle: "Follow today's adaptive session", icon: "play.circle.fill", destination: AnyView(GuidedWorkoutView())),
                            logRow(title: "Motion Lab", subtitle: "Run a fast form check", icon: "video.badge.checkmark", destination: AnyView(MotionLabView()))
                        ]
                    )

                    logSection(
                        title: "Nutrition",
                        rows: [
                            logRow(title: "Log nutrition", subtitle: "Meals, targets, and insight", icon: "fork.knife", destination: AnyView(LogNutritionView())),
                            logRow(title: "Fridge scanner", subtitle: "Turn ingredients into a fast plan", icon: "camera.viewfinder", destination: AnyView(FridgeScannerView())),
                            logRow(title: "Meal plan", subtitle: "Generate the next few days", icon: "list.bullet.rectangle.portrait", destination: AnyView(MealPlanView()))
                        ]
                    )

                    logSection(
                        title: "History",
                        rows: [
                            logRow(title: "Workouts & nutrition", subtitle: "Review the trend line and edit recent logs", icon: "clock.arrow.circlepath", destination: AnyView(HistoryView()))
                        ]
                    )
                }
                .padding(.horizontal, 16)
                .padding(.vertical, 20)
            }
            .fnBackground()
            .navigationTitle("Log")
        }
    }

    private func logSection(title: String, rows: [AnyView]) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(title)
                .font(.headline)
                .foregroundStyle(.white)
            VStack(spacing: 0) {
                ForEach(Array(rows.enumerated()), id: \.offset) { index, row in
                    row
                    if index < rows.count - 1 {
                        Rectangle()
                            .fill(Brand.Color.border)
                            .frame(height: 1)
                    }
                }
            }
            .padding(.horizontal, 18)
            .premiumCard()
        }
    }

    private func logRow(title: String, subtitle: String, icon: String, destination: AnyView) -> AnyView {
        AnyView(
            NavigationLink {
                destination
            } label: {
                HStack(spacing: 14) {
                    Image(systemName: icon)
                        .font(.headline)
                        .foregroundStyle(Brand.Color.accent)
                        .frame(width: 28)
                    VStack(alignment: .leading, spacing: 4) {
                        Text(title)
                            .font(.headline)
                            .foregroundStyle(.white)
                        Text(subtitle)
                            .font(.caption)
                            .foregroundStyle(Brand.Color.muted)
                    }
                    Spacer()
                    Image(systemName: "chevron.right")
                        .font(.caption.weight(.bold))
                        .foregroundStyle(Brand.Color.muted)
                }
                .padding(.vertical, 16)
            }
        )
    }
}
