//
//  MealSwapSheet.swift
//  Koda AI
//
//  Sheet to swap a single meal in the active plan with AI-generated alternatives.
//

import SwiftUI

struct MealSwapSheet: View {
    @EnvironmentObject var auth: SupabaseService
    let planId: String
    let dayDate: String
    let mealIndex: Int
    let currentMeal: RecipeGenMeal
    var onSwapped: (MealSwapOption) -> Void

    @State private var options: [MealSwapOption] = []
    @State private var loading = true
    @State private var confirming: String? = nil
    @State private var errorMessage: String?
    @Environment(\.dismiss) private var dismiss

    private var api: KodaAPIService {
        KodaAPIService(getAccessToken: { auth.accessToken })
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    // Current meal summary
                    VStack(alignment: .leading, spacing: 6) {
                        Text("Replacing")
                            .font(.system(size: 11, weight: .black, design: .monospaced))
                            .foregroundStyle(Brand.Color.muted)
                            .tracking(1.2)
                        Text(currentMeal.name ?? "Meal")
                            .font(.headline)
                            .foregroundStyle(.white)
                        HStack(spacing: 8) {
                            macroPill("P", "\(currentMeal.protein ?? 0)g", .green)
                            macroPill("C", "\(currentMeal.carbs ?? 0)g", .yellow)
                            macroPill("F", "\(currentMeal.fat ?? 0)g", .orange)
                            if let cal = currentMeal.calories {
                                Text("\(cal) cal")
                                    .font(.system(size: 11, weight: .bold, design: .monospaced))
                                    .foregroundStyle(Brand.Color.accent)
                            }
                        }
                    }
                    .padding(14)
                    .background(Brand.Color.surfaceRaised)
                    .clipShape(RoundedRectangle(cornerRadius: 14))

                    if loading {
                        VStack(spacing: 12) {
                            ShimmerCard(height: 100)
                            ShimmerCard(height: 100)
                            ShimmerCard(height: 100)
                        }
                        Text("Finding alternatives…")
                            .font(.caption)
                            .foregroundStyle(Brand.Color.muted)
                            .frame(maxWidth: .infinity)
                    } else if let err = errorMessage {
                        HStack(spacing: 10) {
                            Image(systemName: "exclamationmark.triangle.fill")
                                .foregroundStyle(Brand.Color.danger)
                            Text(err)
                                .font(.caption)
                                .foregroundStyle(Brand.Color.danger)
                        }
                        .padding(14)
                        .background(Brand.Color.danger.opacity(0.1))
                        .clipShape(RoundedRectangle(cornerRadius: 12))
                    } else {
                        PremiumSectionHeader("Alternatives")

                        ForEach(options) { option in
                            optionCard(option)
                        }

                        if options.isEmpty {
                            Text("No alternatives generated. Try again.")
                                .font(.caption)
                                .foregroundStyle(Brand.Color.muted)
                                .frame(maxWidth: .infinity)
                        }
                    }
                }
                .padding(.horizontal, 16)
                .padding(.vertical, 20)
            }
            .fnBackground()
            .navigationTitle("Swap Meal")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                        .foregroundStyle(Brand.Color.muted)
                }
            }
        }
        .task { await loadOptions() }
    }

    // MARK: - Option Card

    private func optionCard(_ option: MealSwapOption) -> some View {
        PremiumRowCard {
            VStack(alignment: .leading, spacing: 10) {
                HStack(alignment: .top) {
                    VStack(alignment: .leading, spacing: 4) {
                        if let type = option.meal_type {
                            mealTypeBadge(type)
                        }
                        Text(option.name ?? "Meal")
                            .font(.subheadline.weight(.semibold))
                            .foregroundStyle(.white)
                        if let prep = option.prep_time_minutes {
                            Text("⏱ \(prep) min")
                                .font(.caption)
                                .foregroundStyle(Brand.Color.muted)
                        }
                    }
                    Spacer()
                    if let cal = option.calories {
                        Text("\(cal) cal")
                            .font(.system(size: 12, weight: .bold, design: .monospaced))
                            .foregroundStyle(Brand.Color.accent)
                    }
                }

                HStack(spacing: 8) {
                    if let p = option.protein { macroPill("P", "\(p)g", .green) }
                    if let c = option.carbs { macroPill("C", "\(c)g", .yellow) }
                    if let f = option.fat { macroPill("F", "\(f)g", .orange) }
                }

                if let rationale = option.goal_alignment_rationale, !rationale.isEmpty {
                    Text("Coach: \(rationale)")
                        .font(.system(size: 10, weight: .semibold))
                        .foregroundStyle(Brand.Color.accent)
                        .italic()
                } else if let reason = option.reason, !reason.isEmpty {
                    Text(reason)
                        .font(.caption)
                        .foregroundStyle(Brand.Color.muted)
                        .italic()
                }

                if let url = option.recipe_url, let source = option.recipe_source {
                    Link(destination: URL(string: url)!) {
                        HStack(spacing: 4) {
                            Text("Full Recipe on \(source)")
                            Image(systemName: "arrow.up.right")
                        }
                        .font(.system(size: 11, weight: .bold))
                        .foregroundStyle(Brand.Color.accent)
                    }
                }

                Button {
                    Task { await confirmSwap(option) }
                } label: {
                    HStack {
                        if confirming == option.id {
                            ProgressView().tint(.black).scaleEffect(0.8)
                        } else {
                            Image(systemName: "checkmark")
                        }
                        Text(confirming == option.id ? "Saving…" : "Use This")
                            .font(.system(size: 12, weight: .black))
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 10)
                    .background(Brand.Color.accent)
                    .foregroundStyle(.black)
                    .clipShape(RoundedRectangle(cornerRadius: 10))
                }
                .buttonStyle(.plain)
                .disabled(confirming != nil)
            }
        }
    }

    // MARK: - Helpers

    private func mealTypeBadge(_ type: String) -> some View {
        let (color, label): (Color, String) = switch type {
        case "breakfast": (.orange, "Breakfast")
        case "lunch": (.blue, "Lunch")
        case "snack": (.green, "Snack")
        default: (.purple, "Dinner")
        }
        return Text(label)
            .font(.system(size: 9, weight: .black, design: .monospaced))
            .foregroundStyle(color)
            .padding(.horizontal, 7)
            .padding(.vertical, 3)
            .background(color.opacity(0.15))
            .clipShape(Capsule())
    }

    private func macroPill(_ label: String, _ value: String, _ color: Color) -> some View {
        HStack(spacing: 3) {
            Text(label)
                .font(.system(size: 9, weight: .black, design: .monospaced))
                .foregroundStyle(color.opacity(0.8))
            Text(value)
                .font(.system(size: 10, weight: .semibold, design: .monospaced))
                .foregroundStyle(color)
        }
        .padding(.horizontal, 7)
        .padding(.vertical, 3)
        .background(color.opacity(0.12))
        .clipShape(Capsule())
    }

    // MARK: - Data

    private func loadOptions() async {
        loading = true
        errorMessage = nil
        defer { loading = false }
        do {
            let res = try await api.aiMealSwapOptions(
                planId: planId,
                dayDate: dayDate,
                mealIndex: mealIndex,
                currentMeal: currentMeal
            )
            await MainActor.run { options = res.options ?? [] }
        } catch {
            await MainActor.run { errorMessage = error.localizedDescription }
        }
    }

    private func confirmSwap(_ option: MealSwapOption) async {
        confirming = option.id
        defer { confirming = nil }
        do {
            try await api.aiMealSwapConfirm(
                planId: planId,
                dayDate: dayDate,
                mealIndex: mealIndex,
                newMeal: option
            )
            await MainActor.run {
                HapticEngine.notification(.success)
                onSwapped(option)
                dismiss()
            }
        } catch {
            await MainActor.run { errorMessage = error.localizedDescription }
        }
    }
}
