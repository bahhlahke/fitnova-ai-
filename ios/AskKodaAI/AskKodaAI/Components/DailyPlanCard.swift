//
//  DailyPlanCard.swift
//  AskKodaAI
//
//  Displays today's daily plan (training + nutrition) in a card.
//

import SwiftUI

struct DailyPlanCard: View {
    let plan: DailyPlan

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            if let training = plan.training_plan {
                VStack(alignment: .leading, spacing: 8) {
                    if let focus = training.focus, !focus.isEmpty {
                        Text(focus)
                            .font(.title3.weight(.bold))
                            .foregroundStyle(.primary)
                    }
                    
                    if let exercises = training.exercises, !exercises.isEmpty {
                        Text("Training")
                            .font(.subheadline.weight(.semibold))
                        ForEach(Array(exercises.enumerated()), id: \.offset) { _, ex in
                            VStack(alignment: .leading, spacing: 4) {
                                HStack(alignment: .top) {
                                    Text(ex.name ?? "Exercise")
                                        .font(.subheadline)
                                    Spacer()
                                    if let sets = ex.sets, let reps = ex.reps {
                                        Text("\(sets)×\(reps)")
                                            .font(.subheadline.weight(.medium))
                                            .foregroundStyle(.primary)
                                    }
                                }
                                if let rpe = ex.intensity, !rpe.isEmpty {
                                     Text(rpe)
                                        .font(.caption2)
                                        .padding(.horizontal, 6)
                                        .padding(.vertical, 2)
                                        .background(Color.secondary.opacity(0.2))
                                        .clipShape(Capsule())
                                }
                                if let notes = ex.notes, !notes.isEmpty {
                                    Text(notes)
                                        .font(.caption)
                                        .foregroundStyle(.secondary)
                                }
                            }
                        }
                    }
                }
            }
            
            if let nutrition = plan.nutrition_plan {
                VStack(alignment: .leading, spacing: 4) {
                    Text("Nutrition")
                        .font(.subheadline.weight(.semibold))
                    if let cal = nutrition.calories_target {
                        Text("Calories: \(cal)")
                            .font(.subheadline)
                    }
                    if let pro = nutrition.protein_g {
                        Text("Protein: \(pro)g")
                            .font(.subheadline)
                    }
                }
                .padding(.top, 4)
            }
            
            if let notes = plan.safety_notes, !notes.isEmpty {
                VStack(alignment: .leading, spacing: 4) {
                    Text("Safety")
                        .font(.subheadline.weight(.semibold))
                    ForEach(notes, id: \.self) { note in
                        Text(note)
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                }
                .padding(.top, 4)
            }
        }
        .padding()
        .frame(maxWidth: .infinity, alignment: .leading)
        .glassCard()
    }
}
