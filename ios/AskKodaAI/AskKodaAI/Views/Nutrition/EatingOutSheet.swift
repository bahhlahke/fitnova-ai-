//
//  EatingOutSheet.swift
//  Koda AI
//
//  Sheet to log a restaurant/eating-out meal with AI nutrition estimation.
//

import SwiftUI

struct EatingOutSheet: View {
    @EnvironmentObject var auth: SupabaseService
    let dateLocal: String
    var onLogged: (() -> Void)?

    @State private var restaurantName = ""
    @State private var mealName = ""
    @State private var notes = ""
    @State private var estimatedResult: EatingOutLogResponse?
    @State private var estimating = false
    @State private var saving = false
    @State private var errorMessage: String?
    @Environment(\.dismiss) private var dismiss

    private var api: KodaAPIService {
        KodaAPIService(getAccessToken: { auth.accessToken })
    }

    private var canSubmit: Bool {
        !mealName.trimmingCharacters(in: .whitespaces).isEmpty
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    // Description
                    VStack(alignment: .leading, spacing: 6) {
                        Text("LOG A RESTAURANT MEAL")
                            .font(.system(size: 11, weight: .black, design: .monospaced))
                            .foregroundStyle(Brand.Color.muted)
                            .tracking(1.2)
                        Text("Describe what you ate and Koda AI will estimate the nutrition and add it to your daily log.")
                            .font(.caption)
                            .foregroundStyle(Brand.Color.muted)
                    }
                    .padding(14)
                    .background(Brand.Color.surfaceRaised)
                    .clipShape(RoundedRectangle(cornerRadius: 14))

                    // Inputs
                    VStack(spacing: 12) {
                        fieldRow(
                            label: "Restaurant (optional)",
                            placeholder: "e.g. Chipotle, McDonald's",
                            text: $restaurantName
                        )
                        fieldRow(
                            label: "What did you eat?",
                            placeholder: "e.g. Chicken burrito bowl with rice and black beans",
                            text: $mealName
                        )
                        fieldRow(
                            label: "Notes (optional)",
                            placeholder: "e.g. Extra cheese, no sour cream",
                            text: $notes
                        )
                    }

                    // Estimated nutrition result
                    if let result = estimatedResult {
                        nutritionResultCard(result)
                    }

                    // Error
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
                        .clipShape(RoundedRectangle(cornerRadius: 12))
                    }

                    // Action buttons
                    if estimatedResult == nil {
                        Button {
                            Task { await estimateNutrition() }
                        } label: {
                            HStack {
                                if estimating {
                                    ProgressView().tint(.black).scaleEffect(0.85)
                                } else {
                                    Image(systemName: "sparkles")
                                }
                                Text(estimating ? "Estimating…" : "Estimate Nutrition")
                                    .font(.system(size: 14, weight: .black))
                                Spacer()
                            }
                        }
                        .buttonStyle(PremiumActionButtonStyle())
                        .disabled(!canSubmit || estimating)
                    } else {
                        VStack(spacing: 10) {
                            Button {
                                Task { await saveLog() }
                            } label: {
                                HStack {
                                    if saving {
                                        ProgressView().tint(.black).scaleEffect(0.85)
                                    } else {
                                        Image(systemName: "checkmark.circle.fill")
                                    }
                                    Text(saving ? "Saving…" : "Add to Daily Log")
                                        .font(.system(size: 14, weight: .black))
                                    Spacer()
                                }
                            }
                            .buttonStyle(PremiumActionButtonStyle())
                            .disabled(saving)

                            Button {
                                estimatedResult = nil
                                errorMessage = nil
                            } label: {
                                Text("Re-estimate")
                                    .font(.system(size: 13, weight: .semibold))
                                    .foregroundStyle(Brand.Color.muted)
                                    .frame(maxWidth: .infinity)
                                    .padding(.vertical, 10)
                            }
                            .buttonStyle(.plain)
                        }
                    }
                }
                .padding(.horizontal, 16)
                .padding(.vertical, 20)
            }
            .fnBackground()
            .navigationTitle("Eating Out")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                        .foregroundStyle(Brand.Color.muted)
                }
            }
        }
    }

    // MARK: - Sub-views

    private func fieldRow(label: String, placeholder: String, text: Binding<String>) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(label)
                .font(.system(size: 11, weight: .black, design: .monospaced))
                .foregroundStyle(Brand.Color.muted)
                .tracking(1)
            TextField(placeholder, text: text, axis: .vertical)
                .font(.subheadline)
                .foregroundStyle(.white)
                .lineLimit(1...3)
                .padding(12)
                .background(Brand.Color.surfaceRaised)
                .clipShape(RoundedRectangle(cornerRadius: 12))
                .tint(Brand.Color.accent)
        }
    }

    private func nutritionResultCard(_ result: EatingOutLogResponse) -> some View {
        PremiumRowCard {
            VStack(alignment: .leading, spacing: 12) {
                HStack {
                    Text("ESTIMATED NUTRITION")
                        .font(.system(size: 11, weight: .black, design: .monospaced))
                        .foregroundStyle(Brand.Color.accent)
                        .tracking(1.2)
                    Spacer()
                    Image(systemName: "checkmark.circle.fill")
                        .foregroundStyle(.green)
                        .font(.subheadline)
                }

                HStack(spacing: 16) {
                    if let cal = result.calories {
                        macroColumn("Calories", "\(cal)", Brand.Color.accent)
                    }
                    if let p = result.protein_g {
                        macroColumn("Protein", "\(p)g", .green)
                    }
                    if let c = result.carbs_g {
                        macroColumn("Carbs", "\(c)g", .yellow)
                    }
                    if let f = result.fat_g {
                        macroColumn("Fat", "\(f)g", .orange)
                    }
                    Spacer()
                }

                Text("These values are AI estimates and may vary from actual nutrition. They will be added to your daily log.")
                    .font(.caption2)
                    .foregroundStyle(Brand.Color.muted)
                    .italic()
            }
        }
    }

    private func macroColumn(_ label: String, _ value: String, _ color: Color) -> some View {
        VStack(spacing: 3) {
            Text(value)
                .font(.system(size: 16, weight: .black, design: .monospaced))
                .foregroundStyle(color)
            Text(label)
                .font(.system(size: 9, weight: .bold, design: .monospaced))
                .foregroundStyle(Brand.Color.muted)
                .tracking(0.8)
        }
    }

    // MARK: - Actions

    private func estimateNutrition() async {
        estimating = true
        errorMessage = nil
        defer { estimating = false }
        do {
            let result = try await api.nutritionEatingOut(
                restaurantName: restaurantName.isEmpty ? nil : restaurantName,
                mealName: mealName,
                dateLocal: dateLocal,
                notes: notes.isEmpty ? nil : notes
            )
            await MainActor.run {
                estimatedResult = result
                HapticEngine.impact(.light)
            }
        } catch {
            await MainActor.run { errorMessage = error.localizedDescription }
        }
    }

    private func saveLog() async {
        saving = true
        defer { saving = false }
        // The eating-out API already persists on the estimate call.
        // We just dismiss and call the callback here.
        await MainActor.run {
            HapticEngine.notification(.success)
            onLogged?()
            dismiss()
        }
    }
}
