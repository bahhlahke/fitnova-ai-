//
//  MealPlanView.swift
//  Koda AI
//
//  Generate multi-day meal plan + grocery list via API. Premium card UI.
//

import SwiftUI

struct MealPlanView: View {
    @EnvironmentObject var auth: SupabaseService
    @State private var loading = false
    @State private var days: [RecipeGenDay] = []
    @State private var groceryList: [GroceryItem] = []
    @State private var durationDays = 7
    @State private var errorMessage: String?
    @State private var showGroceryList = false

    private var api: KodaAPIService { KodaAPIService(getAccessToken: { auth.accessToken }) }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 18) {
                // Config card
                VStack(alignment: .leading, spacing: 14) {
                    Text("PLAN LENGTH")
                        .font(.system(size: 10, weight: .black, design: .monospaced))
                        .tracking(1.4)
                        .foregroundStyle(Brand.Color.accent)

                    HStack {
                        Text("\(durationDays) days")
                            .font(.title2.weight(.black))
                            .foregroundStyle(.white)
                        Spacer()
                        HStack(spacing: 10) {
                            Button {
                                if durationDays > 3 { durationDays -= 1; HapticEngine.selection() }
                            } label: {
                                Image(systemName: "minus.circle.fill")
                                    .font(.title2)
                                    .foregroundStyle(durationDays > 3 ? Brand.Color.accent : Brand.Color.muted)
                            }
                            Button {
                                if durationDays < 14 { durationDays += 1; HapticEngine.selection() }
                            } label: {
                                Image(systemName: "plus.circle.fill")
                                    .font(.title2)
                                    .foregroundStyle(durationDays < 14 ? Brand.Color.accent : Brand.Color.muted)
                            }
                        }
                    }

                    Button {
                        Task { await generate() }
                    } label: {
                        Label(loading ? "Generating…" : "Generate \(durationDays)-Day Meal Plan", systemImage: "wand.and.stars")
                            .frame(maxWidth: .infinity)
                    }
                    .buttonStyle(PremiumActionButtonStyle())
                    .disabled(loading)
                }
                .padding(18)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(
                    RoundedRectangle(cornerRadius: 20, style: .continuous)
                        .fill(Brand.Color.surfaceRaised)
                        .overlay(RoundedRectangle(cornerRadius: 20, style: .continuous).stroke(Brand.Color.border, lineWidth: 1))
                )

                if let err = errorMessage {
                    Label(err, systemImage: "exclamationmark.triangle.fill")
                        .font(.caption).foregroundStyle(Brand.Color.danger).padding(.horizontal, 4)
                }

                if loading {
                    VStack(spacing: 12) {
                        ShimmerCard(height: 120)
                        ShimmerCard(height: 120)
                        ShimmerCard(height: 120)
                    }
                } else if !days.isEmpty {
                    // Grocery list toggle button
                    if !groceryList.isEmpty {
                        Button {
                            withAnimation { showGroceryList.toggle() }
                        } label: {
                            HStack {
                                Label("Grocery List (\(groceryList.count) items)", systemImage: "cart.fill")
                                    .font(.subheadline.weight(.semibold))
                                    .foregroundStyle(.white)
                                Spacer()
                                Image(systemName: showGroceryList ? "chevron.up" : "chevron.down")
                                    .font(.caption.weight(.bold))
                                    .foregroundStyle(Brand.Color.muted)
                            }
                            .padding(16)
                            .background(
                                RoundedRectangle(cornerRadius: 16, style: .continuous)
                                    .fill(Brand.Color.surfaceRaised)
                                    .overlay(RoundedRectangle(cornerRadius: 16, style: .continuous).stroke(Brand.Color.accent.opacity(0.3), lineWidth: 1))
                            )
                        }
                        .buttonStyle(.plain)

                        if showGroceryList {
                            VStack(spacing: 6) {
                                ForEach(Array(groceryList.enumerated()), id: \.offset) { _, g in
                                    HStack {
                                        Image(systemName: "checkmark.circle")
                                            .font(.caption.weight(.semibold))
                                            .foregroundStyle(Brand.Color.accent)
                                        Text(g.item ?? "")
                                            .font(.subheadline)
                                            .foregroundStyle(.white)
                                        Spacer()
                                        if let q = g.quantity, !q.isEmpty {
                                            Text(q)
                                                .font(.caption.weight(.semibold))
                                                .foregroundStyle(Brand.Color.muted)
                                        }
                                    }
                                    .padding(.horizontal, 4)
                                }
                            }
                            .padding(16)
                            .background(
                                RoundedRectangle(cornerRadius: 16, style: .continuous)
                                    .fill(Brand.Color.surfaceRaised.opacity(0.6))
                                    .overlay(RoundedRectangle(cornerRadius: 16, style: .continuous).stroke(Brand.Color.border, lineWidth: 1))
                            )
                        }
                    }

                    // Day-by-day plan
                    Text("MEAL PLAN")
                        .font(.system(size: 10, weight: .black, design: .monospaced))
                        .tracking(1.4)
                        .foregroundStyle(Brand.Color.accent)

                    VStack(spacing: 12) {
                        ForEach(Array(days.enumerated()), id: \.offset) { _, day in
                            if let date = day.date, let meals = day.meals, !meals.isEmpty {
                                VStack(alignment: .leading, spacing: 10) {
                                    Text(formattedDate(date))
                                        .font(.system(size: 10, weight: .black, design: .monospaced))
                                        .tracking(1.2)
                                        .foregroundStyle(Brand.Color.accent)

                                    VStack(spacing: 6) {
                                        ForEach(Array(meals.enumerated()), id: \.offset) { _, m in
                                            HStack {
                                                VStack(alignment: .leading, spacing: 2) {
                                                    Text(m.name ?? "Meal")
                                                        .font(.subheadline.weight(.semibold))
                                                        .foregroundStyle(.white)
                                                    if let type = m.meal_type {
                                                        Text(type.capitalized)
                                                            .font(.caption)
                                                            .foregroundStyle(Brand.Color.muted)
                                                    }
                                                }
                                                Spacer()
                                                if let cal = m.calories {
                                                    Text("\(cal) cal")
                                                        .font(.caption.weight(.bold))
                                                        .foregroundStyle(Brand.Color.muted)
                                                }
                                            }
                                            .padding(10)
                                            .background(
                                                RoundedRectangle(cornerRadius: 12, style: .continuous)
                                                    .fill(Color.white.opacity(0.05))
                                                    .overlay(RoundedRectangle(cornerRadius: 12, style: .continuous).stroke(Brand.Color.border, lineWidth: 1))
                                            )
                                        }
                                    }

                                    // Day calorie total
                                    let dayTotal = meals.compactMap(\.calories).reduce(0, +)
                                    if dayTotal > 0 {
                                        HStack {
                                            Spacer()
                                            Text("Day total: \(dayTotal) cal")
                                                .font(.caption.weight(.bold))
                                                .foregroundStyle(Brand.Color.muted)
                                        }
                                    }
                                }
                                .padding(16)
                                .frame(maxWidth: .infinity, alignment: .leading)
                                .background(
                                    RoundedRectangle(cornerRadius: 20, style: .continuous)
                                        .fill(Brand.Color.surfaceRaised)
                                        .overlay(RoundedRectangle(cornerRadius: 20, style: .continuous).stroke(Brand.Color.border, lineWidth: 1))
                                )
                            }
                        }
                    }
                }
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 20)
        }
        .fnBackground()
        .navigationTitle("Meal Plan")
        .navigationBarTitleDisplayMode(.inline)
    }

    private func formattedDate(_ iso: String) -> String {
        let f = DateFormatter()
        f.dateFormat = "yyyy-MM-dd"
        guard let d = f.date(from: iso) else { return iso }
        f.dateFormat = "EEEE, MMM d"
        return f.string(from: d).uppercased()
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
