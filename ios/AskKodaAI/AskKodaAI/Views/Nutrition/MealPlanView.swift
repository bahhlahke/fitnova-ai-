//
//  MealPlanView.swift
//  Koda AI
//
//  Generate meal plan + grocery list via API.
//

import SwiftUI

struct MealPlanView: View {
    @EnvironmentObject var auth: SupabaseService
    @State private var loading = false
    @State private var days: [RecipeGenDay] = []
    @State private var groceryList: [GroceryItem] = []
    @State private var durationDays = 7
    @State private var errorMessage: String?

    private var api: KodaAPIService {
        KodaAPIService(getAccessToken: { auth.accessToken })
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                Stepper("Days: \(durationDays)", value: $durationDays, in: 3...14)
                Button("Generate meal plan") {
                    Task { await generate() }
                }
                .buttonStyle(.borderedProminent)
                .disabled(loading)

                if loading {
                    ProgressView()
                        .frame(maxWidth: .infinity)
                }
                if let err = errorMessage {
                    Text(err)
                        .font(.caption)
                        .foregroundStyle(.red)
                }
                if !days.isEmpty {
                    Text("Meal plan")
                        .font(.headline)
                    ForEach(Array(days.enumerated()), id: \.offset) { _, day in
                        if let date = day.date {
                            Text(date)
                                .font(.subheadline)
                                .fontWeight(.semibold)
                            ForEach(Array((day.meals ?? []).enumerated()), id: \.offset) { _, m in
                                Text("• \(m.name ?? "") — \(m.calories ?? 0) cal")
                                    .font(.caption)
                            }
                        }
                    }
                }
                if !groceryList.isEmpty {
                    Text("Grocery list")
                        .font(.headline)
                    ForEach(Array(groceryList.enumerated()), id: \.offset) { _, g in
                        Text("• \(g.item ?? "") (\(g.quantity ?? ""))")
                            .font(.caption)
                    }
                }
            }
            .padding()
        }
        .navigationTitle("Meal plan")
    }

    private func generate() async {
        loading = true
        days = []
        groceryList = []
        errorMessage = nil
        defer { loading = false }
        do {
            let start = ISO8601DateFormatter().string(from: Date()).prefix(10)
            let res = try await api.aiRecipeGen(startDate: String(start), durationDays: durationDays)
            await MainActor.run {
                days = res.days ?? []
                groceryList = res.grocery_list ?? []
            }
        } catch {
            await MainActor.run { errorMessage = error.localizedDescription }
        }
    }
}
