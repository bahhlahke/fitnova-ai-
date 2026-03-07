//
//  HomeView.swift
//  Koda AI
//

import SwiftUI

struct HomeView: View {
    @EnvironmentObject var auth: SupabaseService
    @State private var plan: DailyPlan?
    @State private var isLoading = false
    @State private var errorMessage: String?

    private var api: KodaAPIService {
        KodaAPIService(getAccessToken: { await auth.accessToken })
    }

    var body: some View {
        NavigationStack {
            Group {
                if isLoading && plan == nil {
                    ProgressView("Loading your plan…")
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else {
                    ScrollView {
                        VStack(alignment: .leading, spacing: 20) {
                            if let err = errorMessage {
                                Text(err)
                                    .font(.caption)
                                    .foregroundStyle(.red)
                                    .padding()
                            }
                            if let p = plan {
                                DailyPlanCard(plan: p)
                            } else {
                                Button("Generate today's plan") { fetchDailyPlan() }
                                    .buttonStyle(.borderedProminent)
                            }
                        }
                        .padding()
                    }
                }
            }
            .navigationTitle("Home")
            .refreshable { await loadPlan() }
            .task { await loadPlan() }
        }
    }

    private func loadPlan() async {
        isLoading = true
        errorMessage = nil
        do {
            let response = try await api.planDaily()
            plan = response.plan
        } catch {
            errorMessage = error.localizedDescription
        }
        isLoading = false
    }

    private func fetchDailyPlan() {
        Task { await loadPlan() }
    }
}

struct DailyPlanCard: View {
    let plan: DailyPlan

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Plan for \(plan.date_local)")
                .font(.headline)
            if let notes = plan.safety_notes, !notes.isEmpty {
                Text(notes.joined(separator: "\n"))
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
            if let nutrition = plan.nutrition_plan {
                Text("Calories: \(nutrition.calories_target ?? 0) · P: \(nutrition.protein_g ?? 0)g")
                    .font(.subheadline)
            }
            if let exercises = plan.training_plan?.exercises, !exercises.isEmpty {
                ForEach(Array(exercises.enumerated()), id: \.offset) { _, ex in
                    Text("• \(ex.name ?? "Exercise") — \(ex.sets ?? 0) sets × \(ex.reps ?? "-")")
                        .font(.subheadline)
                }
            }
        }
        .padding()
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color(.systemGray6))
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }
}
