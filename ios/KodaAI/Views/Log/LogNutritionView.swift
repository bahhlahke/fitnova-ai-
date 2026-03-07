//
//  LogNutritionView.swift
//  Koda AI
//
//  Nutrition log by date, targets, add meal (text/analyze), parity with web /log/nutrition.
//

import SwiftUI

struct LogNutritionView: View {
    @EnvironmentObject var auth: SupabaseService
    @State private var selectedDate = DateHelpers.todayLocal
    @State private var nutritionLog: NutritionLog?
    @State private var target: NutritionTarget?
    @State private var loading = false
    @State private var errorMessage: String?
    @State private var showAddMeal = false
    @State private var mealText = ""
    @State private var analyzeLoading = false
    @State private var analyzedMeal: AnalyzeMealResponse?

    private var api: KodaAPIService {
        KodaAPIService(getAccessToken: { await auth.accessToken })
    }

    private var dataService: KodaDataService? {
        guard let uid = auth.currentUserId else { return nil }
        return KodaDataService(client: auth.supabaseClient, userId: uid)
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                if let err = errorMessage {
                    Text(err)
                        .font(.caption)
                        .foregroundStyle(.red)
                        .padding()
                }
                targetsCard
                mealsCard
            }
            .padding()
        }
        .navigationTitle("Nutrition")
        .refreshable { await load() }
        .task { await load() }
        .sheet(isPresented: $showAddMeal) {
            addMealSheet
        }
    }

    @ViewBuilder
    private var targetsCard: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Daily targets")
                .font(.headline)
            if let t = target {
                HStack(spacing: 16) {
                    if let c = t.calorie_target { textTarget("Cal", "\(c)") }
                    if let p = t.protein_target_g { textTarget("Protein", "\(p)g") }
                    if let c = t.carbs_target_g { textTarget("Carbs", "\(c)g") }
                    if let f = t.fat_target_g { textTarget("Fat", "\(f)g") }
                }
            } else {
                Text("No targets set.")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }
        }
        .padding()
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color(.systemGray6))
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }

    private func textTarget(_ label: String, _ value: String) -> some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(label)
                .font(.caption)
                .foregroundStyle(.secondary)
            Text(value)
                .font(.subheadline)
                .fontWeight(.semibold)
        }
    }

    @ViewBuilder
    private var mealsCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text("Meals — \(selectedDate)")
                    .font(.headline)
                Spacer()
                Button("Add meal") { showAddMeal = true }
                    .font(.caption)
            }
            if loading && nutritionLog == nil {
                ProgressView()
                    .frame(maxWidth: .infinity)
                    .padding()
            } else if let meals = nutritionLog?.meals, !meals.isEmpty {
                ForEach(Array(meals.enumerated()), id: \.offset) { _, m in
                    HStack {
                        Text(m.name ?? "Meal")
                        Spacer()
                        if let c = m.calories { Text("\(c) cal") }
                    }
                    .font(.subheadline)
                }
                if let tot = nutritionLog?.total_calories {
                    Text("Total: \(tot) cal")
                        .font(.subheadline)
                        .fontWeight(.semibold)
                }
            } else {
                Text("No meals logged for this day.")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }
        }
        .padding()
        .background(Color(.systemGray6))
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }

    private var addMealSheet: some View {
        NavigationStack {
            VStack(alignment: .leading, spacing: 16) {
                TextField("Describe the meal (e.g. chicken salad, 2 eggs)", text: $mealText, axis: .vertical)
                    .textFieldStyle(.roundedBorder)
                    .lineLimit(2...4)
                if analyzeLoading {
                    ProgressView()
                } else if let a = analyzedMeal {
                    if let n = a.name { Text(n).font(.headline) }
                    if let c = a.calories { Text("\(c) cal") }
                    if let p = a.protein_g { Text("P: \(p)g") }
                }
                Spacer()
            }
            .padding()
            .navigationTitle("Add meal")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") {
                        showAddMeal = false
                        mealText = ""
                        analyzedMeal = nil
                    }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Analyze") {
                        Task { await analyzeMeal() }
                    }
                    .disabled(analyzeLoading || mealText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                }
            }
        }
    }

    private func load() async {
        guard let ds = dataService else { return }
        loading = true
        defer { loading = false }
        do {
            let l = try await ds.fetchNutritionLog(date: selectedDate)
            await MainActor.run { nutritionLog = l }
            let tr = try await api.nutritionTargetsGet()
            await MainActor.run { target = tr.target }
        } catch {
            await MainActor.run { errorMessage = error.localizedDescription }
        }
    }

    private func analyzeMeal() async {
        let text = mealText.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !text.isEmpty else { return }
        analyzeLoading = true
        analyzedMeal = nil
        defer { analyzeLoading = false }
        do {
            let res = try await api.aiAnalyzeMeal(text: text, imageBase64: nil)
            await MainActor.run { analyzedMeal = res }
            // TODO: append to today's nutrition log and upsert via dataService
        } catch {
            await MainActor.run { errorMessage = error.localizedDescription }
        }
    }
}
