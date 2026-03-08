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
        VStack(alignment: .leading, spacing: 8) {
            if let training = plan.training_plan, let exercises = training.exercises, !exercises.isEmpty {
                Text("Training")
                    .font(.subheadline.weight(.semibold))
                ForEach(Array(exercises.enumerated()), id: \.offset) { _, ex in
                    HStack(alignment: .top) {
                        Text(ex.name ?? "Exercise")
                            .font(.subheadline)
                        Spacer()
                        if let sets = ex.sets, let reps = ex.reps {
                            Text("\(sets)×\(reps)")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                    }
                    if let notes = ex.notes, !notes.isEmpty {
                        Text(notes)
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                }
            }
            if let nutrition = plan.nutrition_plan {
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
            if let notes = plan.safety_notes, !notes.isEmpty {
                Text("Safety")
                    .font(.subheadline.weight(.semibold))
                ForEach(notes, id: \.self) { note in
                    Text(note)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }
        }
        .padding()
        .frame(maxWidth: .infinity, alignment: .leading)
        .glassCard()
    }
}
