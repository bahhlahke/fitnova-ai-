//
//  MealPlanView.swift
//  Koda AI
//
//  Generate meal plan + grocery list via API. Parity with web /nutrition/meal-plan.
//

import SwiftUI

struct MealPlanView: View {
    @EnvironmentObject var auth: SupabaseService
    @State private var loading = false
    @State private var days: [RecipeGenDay] = []
    @State private var groceryList: [GroceryItem] = []
    @State private var durationDays = 7
    @State private var errorMessage: String?
    @State private var expandedDayIndex: Int? = nil

    private var api: KodaAPIService {
        KodaAPIService(getAccessToken: { auth.accessToken })
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                PremiumHeroCard(
                    title: "AI Meal Plan",
                    subtitle: "Generate a personalised meal schedule and grocery list tailored to your nutrition targets.",
                    eyebrow: "Nutrition"
                ) {
                    HStack(spacing: 10) {
                        PremiumMetricPill(label: "Days", value: "\(durationDays)")
                        PremiumMetricPill(label: "Meals", value: "\(days.reduce(0) { $0 + ($1.meals?.count ?? 0) })")
                    }
                }

                // Duration picker
                PremiumRowCard {
                    VStack(alignment: .leading, spacing: 10) {
                        Text("Plan duration")
                            .font(.headline)
                            .foregroundStyle(.white)
                        HStack(spacing: 10) {
                            ForEach([3, 5, 7, 10, 14], id: \.self) { d in
                                Button {
                                    durationDays = d
                                } label: {
                                    Text("\(d)d")
                                        .font(.system(size: 13, weight: .bold, design: .monospaced))
                                        .foregroundStyle(durationDays == d ? .black : Brand.Color.muted)
                                        .padding(.horizontal, 12)
                                        .padding(.vertical, 8)
                                        .background(
                                            Capsule().fill(durationDays == d ? Brand.Color.accent : Brand.Color.surfaceRaised)
                                        )
                                }
                                .buttonStyle(.plain)
                                .accessibilityLabel("\(d)-day meal plan")
                                .accessibilityAddTraits(durationDays == d ? .isSelected : [])
                            }
                        }
                    }
                }

                Button {
                    Task { await generate() }
                } label: {
                    HStack {
                        if loading {
                            ProgressView().tint(.black)
                        } else {
                            Image(systemName: "sparkles")
                            Text("Generate meal plan")
                        }
                        Spacer()
                    }
                }
                .buttonStyle(PremiumActionButtonStyle())
                .disabled(loading)

                if loading && days.isEmpty {
                    ShimmerCard(height: 120)
                    ShimmerCard(height: 120)
                    ShimmerCard(height: 80)
                }

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

                // Meal plan days
                if !days.isEmpty {
                    PremiumSectionHeader("Meal plan")

                    ForEach(Array(days.enumerated()), id: \.offset) { idx, day in
                        dayCard(day, index: idx)
                    }
                }

                // Grocery list
                if !groceryList.isEmpty {
                    PremiumSectionHeader("Grocery list")

                    let grouped = groupedGroceries()
                    ForEach(grouped.keys.sorted(), id: \.self) { category in
                        PremiumRowCard {
                            VStack(alignment: .leading, spacing: 8) {
                                Text(category.capitalized)
                                    .font(.system(size: 11, weight: .black, design: .monospaced))
                                    .foregroundStyle(Brand.Color.accent)
                                    .tracking(1.2)

                                ForEach(grouped[category] ?? [], id: \.item) { g in
                                    HStack {
                                        Image(systemName: "checkmark.circle")
                                            .font(.caption)
                                            .foregroundStyle(Brand.Color.muted)
                                        Text(g.item ?? "")
                                            .font(.subheadline)
                                            .foregroundStyle(.white)
                                        Spacer()
                                        if let qty = g.quantity, !qty.isEmpty {
                                            Text(qty)
                                                .font(.caption)
                                                .foregroundStyle(Brand.Color.muted)
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 20)
        }
        .fnBackground()
        .navigationTitle("Meal plan")
        .navigationBarTitleDisplayMode(.inline)
    }

    // MARK: - Day Card

    private func dayCard(_ day: RecipeGenDay, index: Int) -> some View {
        let isExpanded = expandedDayIndex == index
        let meals = day.meals ?? []
        let totalCal = meals.compactMap(\.calories).reduce(0, +)

        return Button {
            withAnimation(.easeInOut(duration: 0.2)) {
                expandedDayIndex = isExpanded ? nil : index
            }
        } label: {
            PremiumRowCard {
                VStack(alignment: .leading, spacing: 0) {
                    HStack(spacing: 12) {
                        ZStack {
                            RoundedRectangle(cornerRadius: 10)
                                .fill(Brand.Color.accent.opacity(0.15))
                                .frame(width: 44, height: 44)
                            Text("\(index + 1)")
                                .font(.system(size: 16, weight: .black, design: .monospaced))
                                .foregroundStyle(Brand.Color.accent)
                        }

                        VStack(alignment: .leading, spacing: 4) {
                            Text(formattedDate(day.date))
                                .font(.headline)
                                .foregroundStyle(.white)
                            HStack(spacing: 6) {
                                Text("\(meals.count) meals")
                                    .font(.caption)
                                    .foregroundStyle(Brand.Color.muted)
                                if totalCal > 0 {
                                    Text("·")
                                        .foregroundStyle(Brand.Color.muted)
                                    Text("\(totalCal) cal")
                                        .font(.caption)
                                        .foregroundStyle(Brand.Color.muted)
                                }
                            }
                        }
                        Spacer()
                        Image(systemName: isExpanded ? "chevron.up" : "chevron.down")
                            .font(.caption.weight(.bold))
                            .foregroundStyle(Brand.Color.muted)
                    }

                    if isExpanded && !meals.isEmpty {
                        VStack(alignment: .leading, spacing: 10) {
                            Rectangle()
                                .fill(Brand.Color.border)
                                .frame(height: 1)
                                .padding(.vertical, 10)

                            ForEach(Array(meals.enumerated()), id: \.offset) { _, meal in
                                mealRow(meal)
                                    .padding(.bottom, 6)
                            }
                        }
                    }
                }
            }
        }
        .buttonStyle(.plain)
    }

    private func mealRow(_ meal: RecipeGenMeal) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack {
                Text(meal.name ?? "Meal")
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(.white)
                Spacer()
                if let cal = meal.calories {
                    Text("\(cal) cal")
                        .font(.system(size: 11, weight: .bold, design: .monospaced))
                        .foregroundStyle(Brand.Color.accent)
                }
            }
            HStack(spacing: 8) {
                if let p = meal.protein {
                    macroPill("P", "\(p)g", .green)
                }
                if let c = meal.carbs {
                    macroPill("C", "\(c)g", .yellow)
                }
                if let f = meal.fat {
                    macroPill("F", "\(f)g", .orange)
                }
            }
            if let recipe = meal.recipe, !recipe.isEmpty {
                Text(recipe)
                    .font(.caption)
                    .foregroundStyle(Brand.Color.muted)
                    .lineLimit(3)
            }
        }
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

    // MARK: - Helpers

    private func formattedDate(_ iso: String?) -> String {
        guard let iso else { return "Day" }
        let p = DateFormatter()
        p.dateFormat = "yyyy-MM-dd"
        guard let d = p.date(from: iso) else { return iso }
        let f = DateFormatter()
        f.dateFormat = "EEE, MMM d"
        return f.string(from: d)
    }

    private func groupedGroceries() -> [String: [GroceryItem]] {
        var result: [String: [GroceryItem]] = [:]
        for g in groceryList {
            let cat = g.category ?? "Other"
            result[cat, default: []].append(g)
        }
        return result
    }

    // MARK: - Data

    private func generate() async {
        loading = true
        days = []
        groceryList = []
        errorMessage = nil
        expandedDayIndex = nil
        defer { loading = false }
        do {
            let formatter = DateFormatter()
            formatter.dateFormat = "yyyy-MM-dd"
            let start = formatter.string(from: Date())
            let res = try await api.aiRecipeGen(startDate: start, durationDays: durationDays)
            await MainActor.run {
                days = res.days ?? []
                groceryList = res.grocery_list ?? []
                HapticEngine.notification(.success)
            }
        } catch {
            await MainActor.run { errorMessage = error.localizedDescription }
        }
    }
}
