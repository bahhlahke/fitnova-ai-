//
//  MealPlanView.swift
//  Koda AI
//
//  Full-featured AI meal plan with preferences, per-meal swap, eating-out logging,
//  persistent grocery checkboxes, custom items, cost estimates, and plan export.
//

import SwiftUI

// MARK: - Main View

struct MealPlanView: View {
    @EnvironmentObject var auth: SupabaseService

    // Plan state
    @State private var days: [RecipeGenDay] = []
    @State private var groceryList: [GroceryItem] = []
    @State private var planId: String?
    @State private var totalCostUsd: Double?
    @State private var loading = false
    @State private var errorMessage: String?
    @State private var syncingGrocery = false

    // Preferences
    @State private var preferences = MealPlanPreferences.default
    @State private var showPreferences = false

    // UI
    @State private var selectedTab: PlanTab = .plan
    @State private var expandedDayIndex: Int? = nil
    @State private var expandedMealKey: String? = nil // "dayIndex_mealIndex"

    // Sheets
    @State private var swapTarget: SwapTarget? = nil
    @State private var eatingOutDayDate: String? = nil
    @State private var showAddGroceryItem = false
    @State private var newGroceryItem = ""
    @State private var newGroceryCategory = "Other"

    private let durationOptions: [(label: String, days: Int)] = [
        ("1 Day", 1), ("3 Days", 3), ("1 Week", 7), ("2 Weeks", 14), ("30 Days", 30)
    ]

    private var api: KodaAPIService {
        KodaAPIService(getAccessToken: { auth.accessToken })
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                // Hero
                PremiumHeroCard(
                    title: "AI Meal Plan",
                    subtitle: "Personalised meal schedule and grocery list tailored to your nutrition targets.",
                    eyebrow: "Nutrition"
                ) {
                    HStack(spacing: 10) {
                        PremiumMetricPill(label: "Days", value: "\(preferences.duration_days)")
                        PremiumMetricPill(label: "Meals", value: "\(days.reduce(0) { $0 + ($1.meals?.count ?? 0) })")
                        if let cost = totalCostUsd {
                            PremiumMetricPill(label: "Est. Cost", value: String(format: "$%.0f", cost))
                        }
                    }
                }

                // Duration selector
                durationPicker

                // Preferences toggle
                preferencesSection

                // Generate button
                Button {
                    Task { await generate() }
                } label: {
                    HStack {
                        if loading {
                            ProgressView().tint(.black)
                        } else {
                            Image(systemName: "sparkles")
                            Text(days.isEmpty ? "Generate Meal Plan" : "Regenerate")
                        }
                        Spacer()
                    }
                }
                .buttonStyle(PremiumActionButtonStyle())
                .disabled(loading)

                // Loading shimmer
                if loading && days.isEmpty {
                    ShimmerCard(height: 120)
                    ShimmerCard(height: 120)
                    ShimmerCard(height: 80)
                }

                // Error
                if let err = errorMessage {
                    errorBanner(err)
                }

                // Content tabs
                if !days.isEmpty || !groceryList.isEmpty {
                    tabPicker

                    if selectedTab == .plan {
                        planContent
                    } else {
                        groceryContent
                    }
                }
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 20)
        }
        .fnBackground()
        .navigationTitle("Meal Plan")
        .navigationBarTitleDisplayMode(.inline)
        .sheet(item: $swapTarget) { target in
            MealSwapSheet(
                planId: target.planId,
                dayDate: target.dayDate,
                mealIndex: target.mealIndex,
                currentMeal: target.meal,
                onSwapped: { option in
                    applySwap(dayDate: target.dayDate, mealIndex: target.mealIndex, option: option)
                }
            )
            .environmentObject(auth)
        }
        .sheet(isPresented: Binding(
            get: { eatingOutDayDate != nil },
            set: { if !$0 { eatingOutDayDate = nil } }
        )) {
            EatingOutSheet(dateLocal: eatingOutDayDate ?? "", onLogged: nil)
                .environmentObject(auth)
        }
        .sheet(isPresented: $showAddGroceryItem) {
            addGrocerySheet
        }
    }

    // MARK: - Duration Picker

    private var durationPicker: some View {
        PremiumRowCard {
            VStack(alignment: .leading, spacing: 10) {
                Text("PLAN DURATION")
                    .font(.system(size: 11, weight: .black, design: .monospaced))
                    .foregroundStyle(Brand.Color.muted)
                    .tracking(1.2)
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 8) {
                        ForEach(durationOptions, id: \.days) { opt in
                            Button {
                                preferences.duration_days = opt.days
                            } label: {
                                Text(opt.label)
                                    .font(.system(size: 12, weight: .bold))
                                    .foregroundStyle(preferences.duration_days == opt.days ? .black : Brand.Color.muted)
                                    .padding(.horizontal, 14)
                                    .padding(.vertical, 8)
                                    .background(
                                        Capsule().fill(
                                            preferences.duration_days == opt.days
                                                ? Brand.Color.accent
                                                : Brand.Color.surfaceRaised
                                        )
                                    )
                            }
                            .buttonStyle(.plain)
                            .accessibilityAddTraits(preferences.duration_days == opt.days ? .isSelected : [])
                        }
                    }
                }
            }
        }
    }

    // MARK: - Preferences

    private var preferencesSection: some View {
        VStack(alignment: .leading, spacing: 0) {
            Button {
                withAnimation(.easeInOut(duration: 0.2)) { showPreferences.toggle() }
            } label: {
                PremiumRowCard {
                    HStack {
                        Image(systemName: "slider.horizontal.3")
                            .foregroundStyle(Brand.Color.accent)
                        Text("Preferences")
                            .font(.subheadline.weight(.semibold))
                            .foregroundStyle(.white)
                        Spacer()
                        Image(systemName: showPreferences ? "chevron.up" : "chevron.down")
                            .font(.caption.weight(.bold))
                            .foregroundStyle(Brand.Color.muted)
                    }
                }
            }
            .buttonStyle(.plain)

            if showPreferences {
                PreferencesPanelView(preferences: $preferences)
                    .transition(.opacity.combined(with: .move(edge: .top)))
            }
        }
    }

    // MARK: - Tab Picker

    enum PlanTab { case plan, grocery }

    private var tabPicker: some View {
        HStack(spacing: 0) {
            tabButton("Meal Plan", tab: .plan, icon: "fork.knife")
            tabButton("Grocery List", tab: .grocery, icon: "cart")
        }
        .background(Brand.Color.surfaceRaised)
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }

    private func tabButton(_ label: String, tab: PlanTab, icon: String) -> some View {
        Button {
            withAnimation { selectedTab = tab }
        } label: {
            HStack(spacing: 6) {
                Image(systemName: icon)
                    .font(.caption.weight(.semibold))
                Text(label)
                    .font(.system(size: 13, weight: .semibold))
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 10)
            .background(selectedTab == tab ? Brand.Color.accent : Color.clear)
            .foregroundStyle(selectedTab == tab ? .black : Brand.Color.muted)
            .clipShape(RoundedRectangle(cornerRadius: 12))
        }
        .buttonStyle(.plain)
    }

    // MARK: - Plan Content

    private var planContent: some View {
        VStack(alignment: .leading, spacing: 12) {
            PremiumSectionHeader("Meal Plan")

            ForEach(Array(days.enumerated()), id: \.offset) { dayIdx, day in
                dayCard(day, dayIndex: dayIdx)
            }
        }
    }

    private func dayCard(_ day: RecipeGenDay, dayIndex: Int) -> some View {
        let meals = day.meals ?? []
        let totalCal = meals.compactMap(\.calories).reduce(0, +)
        let totalP = meals.compactMap(\.protein).reduce(0, +)
        let totalC = meals.compactMap(\.carbs).reduce(0, +)
        let totalF = meals.compactMap(\.fat).reduce(0, +)
        let isExpanded = expandedDayIndex == dayIndex

        return VStack(alignment: .leading, spacing: 0) {
            // Day header
            Button {
                withAnimation(.easeInOut(duration: 0.2)) {
                    expandedDayIndex = isExpanded ? nil : dayIndex
                }
            } label: {
                PremiumRowCard {
                    VStack(alignment: .leading, spacing: 8) {
                        HStack(spacing: 12) {
                            ZStack {
                                RoundedRectangle(cornerRadius: 10)
                                    .fill(Brand.Color.accent.opacity(0.15))
                                    .frame(width: 44, height: 44)
                                Text("\(dayIndex + 1)")
                                    .font(.system(size: 16, weight: .black, design: .monospaced))
                                    .foregroundStyle(Brand.Color.accent)
                            }

                            VStack(alignment: .leading, spacing: 3) {
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
                                            .font(.caption.weight(.semibold))
                                            .foregroundStyle(Brand.Color.accent)
                                    }
                                }
                            }
                            Spacer()

                            HStack(spacing: 8) {
                                // Eating out button
                                Button {
                                    eatingOutDayDate = day.date ?? formattedDateISO(dayIndex)
                                } label: {
                                    Image(systemName: "fork.knife.circle")
                                        .font(.system(size: 18))
                                        .foregroundStyle(Brand.Color.muted)
                                }
                                .buttonStyle(.plain)

                                Image(systemName: isExpanded ? "chevron.up" : "chevron.down")
                                    .font(.caption.weight(.bold))
                                    .foregroundStyle(Brand.Color.muted)
                            }
                        }

                        // Macro summary bar
                        if totalCal > 0 {
                            HStack(spacing: 6) {
                                macroPill("P", "\(totalP)g", .green)
                                macroPill("C", "\(totalC)g", .yellow)
                                macroPill("F", "\(totalF)g", .orange)
                            }
                        }
                    }
                }
            }
            .buttonStyle(.plain)

            // Expanded meals
            if isExpanded {
                VStack(alignment: .leading, spacing: 8) {
                    ForEach(Array(meals.enumerated()), id: \.offset) { mealIdx, meal in
                        mealCard(meal, dayDate: day.date ?? "", dayIndex: dayIndex, mealIndex: mealIdx)
                    }
                }
                .padding(.leading, 8)
            }
        }
    }

    private func mealCard(_ meal: RecipeGenMeal, dayDate: String, dayIndex: Int, mealIndex: Int) -> some View {
        let key = "\(dayIndex)_\(mealIndex)"
        let isExpanded = expandedMealKey == key

        return PremiumRowCard {
            VStack(alignment: .leading, spacing: 10) {
                // Header row
                HStack(alignment: .top) {
                    VStack(alignment: .leading, spacing: 4) {
                        HStack(spacing: 6) {
                            if let type = meal.meal_type {
                                mealTypeBadge(type)
                            }
                            if let cuisine = meal.cuisine_type, !cuisine.isEmpty {
                                Text(cuisine)
                                    .font(.system(size: 9, weight: .semibold, design: .monospaced))
                                    .foregroundStyle(Brand.Color.muted)
                                    .padding(.horizontal, 6)
                                    .padding(.vertical, 3)
                                    .background(Brand.Color.surfaceRaised)
                                    .clipShape(Capsule())
                            }
                        }
                        Text(meal.name ?? "Meal")
                            .font(.subheadline.weight(.semibold))
                            .foregroundStyle(.white)
                        HStack(spacing: 10) {
                            if let prep = meal.prep_time_minutes {
                                Label("\(prep) min", systemImage: "timer")
                                    .font(.caption)
                                    .foregroundStyle(Brand.Color.muted)
                            }
                            if let cost = meal.estimated_cost_usd {
                                Text(String(format: "$%.2f", cost))
                                    .font(.system(size: 10, weight: .semibold, design: .monospaced))
                                    .foregroundStyle(Brand.Color.muted)
                            }
                        }
                    }
                    Spacer()
                    if let cal = meal.calories {
                        Text("\(cal) cal")
                            .font(.system(size: 12, weight: .bold, design: .monospaced))
                            .foregroundStyle(Brand.Color.accent)
                    }
                }

                if let rationale = meal.goal_alignment_rationale, !rationale.isEmpty {
                    Text("Coach: \(rationale)")
                        .font(.system(size: 11, weight: .semibold))
                        .foregroundStyle(Brand.Color.accent)
                        .padding(.vertical, 4)
                        .padding(.horizontal, 8)
                        .background(Brand.Color.accent.opacity(0.1))
                        .clipShape(RoundedRectangle(cornerRadius: 6))
                }

                // Macros
                HStack(spacing: 8) {
                    if let p = meal.protein { macroPill("P", "\(p)g", .green) }
                    if let c = meal.carbs { macroPill("C", "\(c)g", .yellow) }
                    if let f = meal.fat { macroPill("F", "\(f)g", .orange) }
                    if let fi = meal.fiber_g { macroPill("Fiber", String(format: "%.0fg", fi), .teal) }
                }

                // Expand / collapse recipe
                Button {
                    withAnimation(.easeInOut(duration: 0.2)) {
                        expandedMealKey = isExpanded ? nil : key
                    }
                } label: {
                    HStack(spacing: 4) {
                        Text(isExpanded ? "Hide recipe" : "View recipe")
                            .font(.caption.weight(.semibold))
                            .foregroundStyle(Brand.Color.accent)
                        Image(systemName: isExpanded ? "chevron.up" : "chevron.down")
                            .font(.system(size: 9, weight: .bold))
                            .foregroundStyle(Brand.Color.accent)
                    }
                }
                .buttonStyle(.plain)

                if isExpanded {
                    VStack(alignment: .leading, spacing: 8) {
                        if let recipe = meal.recipe, !recipe.isEmpty {
                            Text(recipe)
                                .font(.caption)
                                .foregroundStyle(Brand.Color.muted)
                        }

                        if let ingredients = meal.ingredients, !ingredients.isEmpty {
                            VStack(alignment: .leading, spacing: 4) {
                                Text("Ingredients")
                                    .font(.system(size: 10, weight: .black, design: .monospaced))
                                    .foregroundStyle(Brand.Color.muted)
                                    .tracking(1)

                                ForEach(ingredients, id: \.self) { ing in
                                    HStack(spacing: 6) {
                                        Circle()
                                            .fill(Brand.Color.accent)
                                            .frame(width: 4, height: 4)
                                        Text(ing)
                                            .font(.caption)
                                            .foregroundStyle(.white)
                                    }
                                }
                            }
                        }

                        if let url = meal.recipe_url, let source = meal.recipe_source {
                            Link(destination: URL(string: url)!) {
                                HStack(spacing: 6) {
                                    Image(systemName: "arrow.up.right.circle.fill")
                                    Text("Full Recipe on \(source)")
                                }
                                .font(.system(size: 12, weight: .bold))
                                .foregroundStyle(Brand.Color.accent)
                                .padding(.vertical, 8)
                                .padding(.horizontal, 12)
                                .background(Brand.Color.surfaceRaised)
                                .clipShape(RoundedRectangle(cornerRadius: 10))
                            }
                        }
                    }
                    .padding(.top, 4)
                }

                // Action buttons
                HStack(spacing: 8) {
                    // Swap
                    if let pid = planId {
                        Button {
                            swapTarget = SwapTarget(
                                planId: pid,
                                dayDate: dayDate,
                                mealIndex: mealIndex,
                                meal: meal
                            )
                        } label: {
                            HStack(spacing: 4) {
                                Image(systemName: "arrow.2.squarepath")
                                    .font(.system(size: 11, weight: .semibold))
                                Text("Swap")
                                    .font(.system(size: 12, weight: .semibold))
                            }
                            .foregroundStyle(Brand.Color.muted)
                            .padding(.horizontal, 12)
                            .padding(.vertical, 7)
                            .background(Brand.Color.surfaceRaised)
                            .clipShape(Capsule())
                        }
                        .buttonStyle(.plain)
                    }
                }
            }
        }
    }

    // MARK: - Grocery Content

    private var groceryContent: some View {
        VStack(alignment: .leading, spacing: 12) {
            // Header with total cost and export
            HStack {
                PremiumSectionHeader("Grocery List")
                Spacer()
                if let cost = totalCostUsd {
                    Text(String(format: "~$%.0f total", cost))
                        .font(.system(size: 11, weight: .bold, design: .monospaced))
                        .foregroundStyle(Brand.Color.accent)
                }
                Button {
                    Task { await syncGroceryList() }
                } label: {
                    if syncingGrocery {
                        ProgressView().tint(Brand.Color.accent)
                            .scaleEffect(0.7)
                    } else {
                        Image(systemName: "arrow.clockwise.circle")
                            .font(.subheadline)
                            .foregroundStyle(Brand.Color.accent)
                    }
                }
                .buttonStyle(.plain)
                .disabled(syncingGrocery)

                Button {
                    exportGroceryList()
                } label: {
                    Image(systemName: "square.and.arrow.up")
                        .font(.subheadline)
                        .foregroundStyle(Brand.Color.muted)
                }
                .buttonStyle(.plain)
            }

            // Grouped grocery items
            let grouped = groupedGroceries()
            let sortedCategories = categoryOrder.filter { grouped[$0] != nil }

            ForEach(sortedCategories, id: \.self) { category in
                groceryCategorySection(category, items: grouped[category] ?? [])
            }

            // Custom items (Other category if not already in order)
            let remaining = grouped.keys.filter { !categoryOrder.contains($0) }
            ForEach(remaining.sorted(), id: \.self) { category in
                groceryCategorySection(category, items: grouped[category] ?? [])
            }

            // Add item button
            Button {
                showAddGroceryItem = true
            } label: {
                HStack {
                    Image(systemName: "plus.circle.fill")
                        .foregroundStyle(Brand.Color.accent)
                    Text("Add Item")
                        .font(.system(size: 13, weight: .semibold))
                        .foregroundStyle(Brand.Color.accent)
                    Spacer()
                }
                .padding(12)
                .background(Brand.Color.accent.opacity(0.08))
                .clipShape(RoundedRectangle(cornerRadius: 12))
            }
            .buttonStyle(.plain)
        }
    }

    private func groceryCategorySection(_ category: String, items: [GroceryItem]) -> some View {
        PremiumRowCard {
            VStack(alignment: .leading, spacing: 10) {
                HStack {
                    Text(category.uppercased())
                        .font(.system(size: 10, weight: .black, design: .monospaced))
                        .foregroundStyle(Brand.Color.accent)
                        .tracking(1.2)
                    Spacer()
                    let catCost = items.compactMap(\.estimated_cost_usd).reduce(0, +)
                    if catCost > 0 {
                        Text(String(format: "$%.2f", catCost))
                            .font(.system(size: 10, weight: .semibold, design: .monospaced))
                            .foregroundStyle(Brand.Color.muted)
                    }
                }

                ForEach(Array(items.enumerated()), id: \.offset) { localIdx, item in
                    let globalIdx = groceryList.firstIndex { $0.item == item.item && $0.category == item.category } ?? localIdx
                    groceryItemRow(item, index: globalIdx)
                }
            }
        }
    }

    private func groceryItemRow(_ item: GroceryItem, index: Int) -> some View {
        HStack(spacing: 10) {
            // Checkbox
            Button {
                Task { await toggleGroceryItem(index: index) }
            } label: {
                Image(systemName: item.checked ? "checkmark.circle.fill" : "circle")
                    .font(.system(size: 18))
                    .foregroundStyle(item.checked ? Brand.Color.accent : Brand.Color.muted)
            }
            .buttonStyle(.plain)

            VStack(alignment: .leading, spacing: 2) {
                Text(item.item ?? "")
                    .font(.subheadline)
                    .foregroundStyle(item.checked ? Brand.Color.muted : .white)
                    .strikethrough(item.checked, color: Brand.Color.muted)
                if let qty = item.quantity, !qty.isEmpty {
                    Text(qty)
                        .font(.caption)
                        .foregroundStyle(Brand.Color.muted)
                }
                if let source = item.source_recipe_name, !source.isEmpty {
                    Text("for \(source)")
                        .font(.system(size: 9, weight: .semibold))
                        .foregroundStyle(Brand.Color.muted.opacity(0.7))
                }
            }

            Spacer()

            HStack(spacing: 8) {
                if let cost = item.estimated_cost_usd, cost > 0 {
                    Text(String(format: "$%.2f", cost))
                        .font(.system(size: 10, weight: .semibold, design: .monospaced))
                        .foregroundStyle(Brand.Color.muted)
                }
                if item.custom == true {
                    // Delete button for custom items
                    Button {
                        Task { await removeGroceryItem(index: index) }
                    } label: {
                        Image(systemName: "minus.circle")
                            .font(.caption)
                            .foregroundStyle(Brand.Color.danger)
                    }
                    .buttonStyle(.plain)
                }
            }
        }
    }

    // MARK: - Add Grocery Sheet

    private var addGrocerySheet: some View {
        NavigationStack {
            VStack(alignment: .leading, spacing: 16) {
                VStack(alignment: .leading, spacing: 6) {
                    Text("ITEM NAME")
                        .font(.system(size: 11, weight: .black, design: .monospaced))
                        .foregroundStyle(Brand.Color.muted)
                        .tracking(1)
                    TextField("e.g. Almond milk", text: $newGroceryItem)
                        .font(.subheadline)
                        .foregroundStyle(.white)
                        .padding(12)
                        .background(Brand.Color.surfaceRaised)
                        .clipShape(RoundedRectangle(cornerRadius: 12))
                        .tint(Brand.Color.accent)
                }

                VStack(alignment: .leading, spacing: 6) {
                    Text("CATEGORY")
                        .font(.system(size: 11, weight: .black, design: .monospaced))
                        .foregroundStyle(Brand.Color.muted)
                        .tracking(1)
                    Picker("Category", selection: $newGroceryCategory) {
                        ForEach(categoryOrder, id: \.self) { cat in
                            Text(cat).tag(cat)
                        }
                    }
                    .pickerStyle(.menu)
                    .padding(12)
                    .background(Brand.Color.surfaceRaised)
                    .clipShape(RoundedRectangle(cornerRadius: 12))
                    .tint(Brand.Color.accent)
                }

                Button {
                    Task { await addCustomGroceryItem() }
                } label: {
                    HStack {
                        Image(systemName: "plus.circle.fill")
                        Text("Add to List")
                            .font(.system(size: 14, weight: .black))
                        Spacer()
                    }
                }
                .buttonStyle(PremiumActionButtonStyle())
                .disabled(newGroceryItem.trimmingCharacters(in: .whitespaces).isEmpty)

                Spacer()
            }
            .padding(20)
            .fnBackground()
            .navigationTitle("Add Grocery Item")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { showAddGroceryItem = false }
                        .foregroundStyle(Brand.Color.muted)
                }
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

    private func errorBanner(_ message: String) -> some View {
        HStack(spacing: 10) {
            Image(systemName: "exclamationmark.triangle.fill")
                .foregroundStyle(Brand.Color.danger)
            Text(message)
                .font(.caption)
                .foregroundStyle(Brand.Color.danger)
        }
        .padding(14)
        .background(Brand.Color.danger.opacity(0.1))
        .clipShape(RoundedRectangle(cornerRadius: 14))
    }

    private func formattedDate(_ iso: String?) -> String {
        guard let iso else { return "Day" }
        let p = DateFormatter()
        p.dateFormat = "yyyy-MM-dd"
        guard let d = p.date(from: iso) else { return iso }
        let f = DateFormatter()
        f.dateFormat = "EEE, MMM d"
        return f.string(from: d)
    }

    private func formattedDateISO(_ dayOffset: Int) -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        let date = Calendar.current.date(byAdding: .day, value: dayOffset, to: Date()) ?? Date()
        return formatter.string(from: date)
    }

    private func groupedGroceries() -> [String: [GroceryItem]] {
        var result: [String: [GroceryItem]] = [:]
        for g in groceryList {
            let cat = g.category ?? "Other"
            result[cat, default: []].append(g)
        }
        return result
    }

    private let categoryOrder = [
        "Produce", "Meat & Seafood", "Dairy & Eggs",
        "Canned & Jarred", "Dry & Pantry", "Frozen",
        "Bakery", "Beverages", "Other"
    ]

    private func exportGroceryList() {
        var lines: [String] = ["GROCERY LIST", ""]
        let grouped = groupedGroceries()
        for category in categoryOrder where grouped[category] != nil {
            lines.append("## \(category)")
            for item in grouped[category] ?? [] {
                let qty = item.quantity.map { " - \($0)" } ?? ""
                lines.append("[ ] \(item.item ?? "")\(qty)")
            }
            lines.append("")
        }
        if let cost = totalCostUsd {
            lines.append(String(format: "Total estimated cost: $%.2f", cost))
        }
        let text = lines.joined(separator: "\n")
        UIPasteboard.general.string = text
        HapticEngine.notification(.success)
    }

    // MARK: - Swap

    private func applySwap(dayDate: String, mealIndex: Int, option: MealSwapOption) {
        guard let dayIdx = days.firstIndex(where: { $0.date == dayDate }) else { return }
        guard var meals = days[dayIdx].meals, mealIndex < meals.count else { return }

        // Convert MealSwapOption back to RecipeGenMeal shape for local state
        let updated = RecipeGenMeal(
            name: option.name,
            meal_type: option.meal_type,
            calories: option.calories,
            protein: option.protein,
            carbs: option.carbs,
            fat: option.fat,
            fiber_g: nil,
            sodium_mg: nil,
            recipe: option.recipe,
            ingredients: option.ingredients,
            prep_time_minutes: option.prep_time_minutes,
            servings: nil,
            cuisine_type: nil,
            estimated_cost_usd: nil
        )
        meals[mealIndex] = updated
        days[dayIdx] = RecipeGenDay(date: days[dayIdx].date, meals: meals)
        
        // Auto-sync grocery list after swap
        Task { await syncGroceryList() }
    }

    // MARK: - Grocery Actions

    private func toggleGroceryItem(index: Int) async {
        guard let pid = planId, index < groceryList.count else { return }
        let newChecked = !groceryList[index].checked
        groceryList[index].checked = newChecked
        do {
            try await api.nutritionGroceryToggle(planId: pid, itemIndex: index, checked: newChecked)
        } catch {
            // Revert on error
            await MainActor.run { groceryList[index].checked = !newChecked }
        }
    }

    private func syncGroceryList() async {
        guard let pid = planId, !days.isEmpty else { return }
        syncingGrocery = true
        defer { syncingGrocery = false }
        
        do {
            let res = try await api.nutritionGrocerySync(planId: pid, days: days)
            await MainActor.run {
                self.groceryList = res.grocery_list ?? []
                HapticEngine.impact(.medium)
            }
        } catch {
            await MainActor.run { errorMessage = "Sync failed: \(error.localizedDescription)" }
        }
    }

    private func removeGroceryItem(index: Int) async {
        guard let pid = planId, index < groceryList.count else { return }
        let removed = groceryList.remove(at: index)
        do {
            try await api.nutritionGroceryRemoveItem(planId: pid, itemIndex: index)
        } catch {
            await MainActor.run { groceryList.insert(removed, at: index) }
        }
    }

    private func addCustomGroceryItem() async {
        guard let pid = planId, !newGroceryItem.trimmingCharacters(in: .whitespaces).isEmpty else { return }
        let item = GroceryItem(
            item: newGroceryItem.trimmingCharacters(in: .whitespaces),
            category: newGroceryCategory,
            quantity: nil,
            estimated_cost_usd: nil,
            checked: false,
            custom: true
        )
        groceryList.append(item)
        showAddGroceryItem = false
        newGroceryItem = ""
        do {
            try await api.nutritionGroceryAddItem(planId: pid, item: item)
            HapticEngine.impact(.light)
        } catch {
            await MainActor.run { groceryList.removeLast() }
        }
    }

    // MARK: - Generate

    private func generate() async {
        loading = true
        days = []
        groceryList = []
        planId = nil
        totalCostUsd = nil
        errorMessage = nil
        expandedDayIndex = nil
        expandedMealKey = nil
        defer { loading = false }
        do {
            let formatter = DateFormatter()
            formatter.dateFormat = "yyyy-MM-dd"
            let start = formatter.string(from: Date())
            let res = try await api.aiRecipeGen(startDate: start, preferences: preferences)
            await MainActor.run {
                planId = res.planId
                let planDays = res.plan?.days ?? res.days ?? []
                days = planDays
                groceryList = res.plan?.grocery_list ?? res.grocery_list ?? []
                totalCostUsd = res.plan?.total_estimated_cost_usd
                if !planDays.isEmpty { expandedDayIndex = 0 }
                HapticEngine.notification(.success)
            }
        } catch {
            await MainActor.run { errorMessage = error.localizedDescription }
        }
    }
}

// MARK: - Supporting Types

struct SwapTarget: Identifiable {
    let id = UUID()
    let planId: String
    let dayDate: String
    let mealIndex: Int
    let meal: RecipeGenMeal
}

// MARK: - Preferences Panel

private struct PreferencesPanelView: View {
    @Binding var preferences: MealPlanPreferences

    private let dietaryOptions = ["Vegetarian", "Vegan", "Gluten-Free", "Dairy-Free", "Keto", "Paleo", "Halal", "Kosher"]
    private let cuisineOptions = ["American", "Mediterranean", "Mexican", "Asian", "Italian", "Indian", "Japanese", "Middle Eastern"]
    @State private var allergyInput = ""

    var body: some View {
        PremiumRowCard {
            VStack(alignment: .leading, spacing: 16) {

                // Dietary restrictions
                prefSection("Dietary Restrictions") {
                    FlowLayout(spacing: 8) {
                        ForEach(dietaryOptions, id: \.self) { option in
                            let selected = preferences.dietary_restrictions.contains(option)
                            Button {
                                if selected {
                                    preferences.dietary_restrictions.removeAll { $0 == option }
                                } else {
                                    preferences.dietary_restrictions.append(option)
                                }
                            } label: {
                                Text(option)
                                    .font(.system(size: 11, weight: .semibold))
                                    .foregroundStyle(selected ? .black : Brand.Color.muted)
                                    .padding(.horizontal, 10)
                                    .padding(.vertical, 5)
                                    .background(
                                        Capsule().fill(selected ? Brand.Color.accent : Brand.Color.surfaceRaised)
                                    )
                            }
                            .buttonStyle(.plain)
                        }
                    }
                }

                // Cuisine preferences
                prefSection("Cuisine Preferences") {
                    FlowLayout(spacing: 8) {
                        ForEach(cuisineOptions, id: \.self) { cuisine in
                            let selected = preferences.cuisine_preferences.contains(cuisine)
                            Button {
                                if selected {
                                    preferences.cuisine_preferences.removeAll { $0 == cuisine }
                                } else {
                                    preferences.cuisine_preferences.append(cuisine)
                                }
                            } label: {
                                Text(cuisine)
                                    .font(.system(size: 11, weight: .semibold))
                                    .foregroundStyle(selected ? .black : Brand.Color.muted)
                                    .padding(.horizontal, 10)
                                    .padding(.vertical, 5)
                                    .background(
                                        Capsule().fill(selected ? Brand.Color.accent : Brand.Color.surfaceRaised)
                                    )
                            }
                            .buttonStyle(.plain)
                        }
                    }
                }

                // Cooking skill
                prefSection("Cooking Skill") {
                    HStack(spacing: 8) {
                        ForEach(["beginner", "intermediate", "advanced"], id: \.self) { skill in
                            Button {
                                preferences.cooking_skill = skill
                            } label: {
                                Text(skill.capitalized)
                                    .font(.system(size: 11, weight: .semibold))
                                    .foregroundStyle(preferences.cooking_skill == skill ? .black : Brand.Color.muted)
                                    .padding(.horizontal, 10)
                                    .padding(.vertical, 6)
                                    .background(
                                        Capsule().fill(
                                            preferences.cooking_skill == skill
                                                ? Brand.Color.accent
                                                : Brand.Color.surfaceRaised
                                        )
                                    )
                            }
                            .buttonStyle(.plain)
                        }
                    }
                }

                // Prep time
                prefSection("Max Prep Time") {
                    HStack(spacing: 8) {
                        prepTimeButton("quick", label: "Quick\n< 15 min")
                        prepTimeButton("moderate", label: "Moderate\n15–30 min")
                        prepTimeButton("elaborate", label: "Elaborate\n30+ min")
                    }
                }

                // Meals per day
                prefSection("Meals Per Day") {
                    HStack(spacing: 8) {
                        ForEach([3, 4, 5, 6], id: \.self) { n in
                            Button {
                                preferences.meals_per_day = n
                            } label: {
                                Text("\(n)")
                                    .font(.system(size: 13, weight: .bold, design: .monospaced))
                                    .foregroundStyle(preferences.meals_per_day == n ? .black : Brand.Color.muted)
                                    .frame(width: 36, height: 36)
                                    .background(
                                        Circle().fill(
                                            preferences.meals_per_day == n
                                                ? Brand.Color.accent
                                                : Brand.Color.surfaceRaised
                                        )
                                    )
                            }
                            .buttonStyle(.plain)
                        }
                    }
                }

                // Servings per meal
                prefSection("Servings Per Meal") {
                    HStack(spacing: 8) {
                        servingsButton(1, label: "Just me")
                        servingsButton(2, label: "2 people")
                        servingsButton(4, label: "Meal prep ×4")
                    }
                }

                // Toggles
                VStack(spacing: 10) {
                    Toggle(isOn: $preferences.include_snacks) {
                        prefLabel("Include Snacks")
                    }
                    .tint(Brand.Color.accent)

                    Toggle(isOn: $preferences.meal_prep_mode) {
                        prefLabel("Batch Cook Mode")
                    }
                    .tint(Brand.Color.accent)
                }

                // Allergies
                prefSection("Allergies") {
                    VStack(alignment: .leading, spacing: 6) {
                        if !preferences.allergies.isEmpty {
                            FlowLayout(spacing: 6) {
                                ForEach(preferences.allergies, id: \.self) { allergy in
                                    HStack(spacing: 4) {
                                        Text(allergy)
                                            .font(.system(size: 11, weight: .semibold))
                                            .foregroundStyle(.white)
                                        Button {
                                            preferences.allergies.removeAll { $0 == allergy }
                                        } label: {
                                            Image(systemName: "xmark")
                                                .font(.system(size: 8, weight: .black))
                                                .foregroundStyle(Brand.Color.muted)
                                        }
                                        .buttonStyle(.plain)
                                    }
                                    .padding(.horizontal, 8)
                                    .padding(.vertical, 4)
                                    .background(Brand.Color.danger.opacity(0.15))
                                    .clipShape(Capsule())
                                }
                            }
                        }
                        HStack {
                            TextField("Add allergy (e.g. peanuts)", text: $allergyInput)
                                .font(.caption)
                                .foregroundStyle(.white)
                                .tint(Brand.Color.accent)
                                .onSubmit { addAllergy() }
                            Button {
                                addAllergy()
                            } label: {
                                Image(systemName: "plus.circle.fill")
                                    .foregroundStyle(Brand.Color.accent)
                            }
                            .buttonStyle(.plain)
                        }
                        .padding(10)
                        .background(Brand.Color.surfaceRaised)
                        .clipShape(RoundedRectangle(cornerRadius: 10))
                    }
                }
            }
        }
    }

    private func addAllergy() {
        let trimmed = allergyInput.trimmingCharacters(in: .whitespaces)
        guard !trimmed.isEmpty, !preferences.allergies.contains(trimmed) else { return }
        preferences.allergies.append(trimmed)
        allergyInput = ""
    }

    private func prepTimeButton(_ value: String, label: String) -> some View {
        let selected = preferences.prep_time_budget == value
        return Button {
            preferences.prep_time_budget = value
        } label: {
            Text(label)
                .font(.system(size: 10, weight: .semibold))
                .multilineTextAlignment(.center)
                .foregroundStyle(selected ? .black : Brand.Color.muted)
                .padding(.horizontal, 10)
                .padding(.vertical, 7)
                .frame(maxWidth: .infinity)
                .background(
                    RoundedRectangle(cornerRadius: 10)
                        .fill(selected ? Brand.Color.accent : Brand.Color.surfaceRaised)
                )
        }
        .buttonStyle(.plain)
    }

    private func servingsButton(_ n: Int, label: String) -> some View {
        let selected = preferences.servings_per_meal == n
        return Button {
            preferences.servings_per_meal = n
        } label: {
            Text(label)
                .font(.system(size: 10, weight: .semibold))
                .foregroundStyle(selected ? .black : Brand.Color.muted)
                .padding(.horizontal, 10)
                .padding(.vertical, 7)
                .frame(maxWidth: .infinity)
                .background(
                    RoundedRectangle(cornerRadius: 10)
                        .fill(selected ? Brand.Color.accent : Brand.Color.surfaceRaised)
                )
        }
        .buttonStyle(.plain)
    }

    private func prefSection<Content: View>(_ title: String, @ViewBuilder content: () -> Content) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            prefLabel(title)
            content()
        }
    }

    private func prefLabel(_ title: String) -> some View {
        Text(title)
            .font(.system(size: 11, weight: .black, design: .monospaced))
            .foregroundStyle(Brand.Color.muted)
            .tracking(0.8)
    }
}

// MARK: - FlowLayout

/// Simple wrapping HStack for tag pills.
private struct FlowLayout: Layout {
    var spacing: CGFloat = 8

    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        let result = FlowResult(width: proposal.width ?? 0, subviews: subviews, spacing: spacing)
        return result.size
    }

    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        let result = FlowResult(width: bounds.width, subviews: subviews, spacing: spacing)
        for (index, frame) in result.frames.enumerated() {
            subviews[index].place(at: CGPoint(x: bounds.minX + frame.minX, y: bounds.minY + frame.minY), proposal: ProposedViewSize(frame.size))
        }
    }

    private struct FlowResult {
        var frames: [CGRect] = []
        var size: CGSize = .zero

        init(width: CGFloat, subviews: LayoutSubviews, spacing: CGFloat) {
            var x: CGFloat = 0
            var y: CGFloat = 0
            var rowHeight: CGFloat = 0
            var maxX: CGFloat = 0

            for subview in subviews {
                let size = subview.sizeThatFits(.unspecified)
                if x + size.width > width, x > 0 {
                    x = 0
                    y += rowHeight + spacing
                    rowHeight = 0
                }
                frames.append(CGRect(x: x, y: y, width: size.width, height: size.height))
                rowHeight = max(rowHeight, size.height)
                x += size.width + spacing
                maxX = max(maxX, x - spacing)
            }
            self.size = CGSize(width: maxX, height: y + rowHeight)
        }
    }
}
