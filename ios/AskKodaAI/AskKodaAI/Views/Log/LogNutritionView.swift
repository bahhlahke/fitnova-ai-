//
//  LogNutritionView.swift
//  Koda AI
//
//  Nutrition log by date — targets, meals list, AI insight, suggestions. Premium card UI.
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
    @State private var barcodeText = ""
    @State private var analyzeLoading = false
    @State private var analyzedMeal: AnalyzeMealResponse?
    @State private var nutritionInsight: String?
    @State private var suggestions: [MealSuggestion] = []
    @State private var editingMealIndex: Int?
    @State private var showEditMealSheet = false
    @State private var editMealName = ""
    @State private var editMealCal = ""
    @State private var editMealProtein = ""
    @State private var editMealCarbs = ""
    @State private var editMealFat = ""
    private let hydrationGoalLiters = 2.5

    private var api: KodaAPIService { KodaAPIService(getAccessToken: { auth.accessToken }) }
    private var dataService: KodaDataService? {
        guard let uid = auth.currentUserId else { return nil }
        return KodaDataService(client: auth.supabaseClient, userId: uid)
    }

    private var calorieProgress: Double {
        guard let cal = nutritionLog?.total_calories, let t = target?.calorie_target, t > 0 else { return 0 }
        return min(Double(cal) / Double(t), 1.0)
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 18) {
                if let err = errorMessage {
                    Label(err, systemImage: "exclamationmark.triangle.fill")
                        .font(.caption).foregroundStyle(Brand.Color.danger).padding(.horizontal, 4)
                }
                targetsCard
                hydrationCard
                mealsCard
                insightCard
                suggestionsCard
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 20)
        }
        .fnBackground()
        .navigationTitle("Nutrition")
        .navigationBarTitleDisplayMode(.inline)
        .refreshable { await load() }
        .task { await load() }
        .sheet(isPresented: $showAddMeal) { addMealSheet }
        .sheet(isPresented: $showEditMealSheet) { editMealSheet }
    }

    // MARK: - Cards

    @ViewBuilder
    private var targetsCard: some View {
        VStack(alignment: .leading, spacing: 14) {
            Text("DAILY TARGETS")
                .font(.system(size: 10, weight: .black, design: .monospaced))
                .tracking(1.4).foregroundStyle(Brand.Color.accent)

            if let t = target {
                HStack(spacing: 0) {
                    macroStat("Cal",     value: nutritionLog?.total_calories.map { "\($0)" } ?? "—", goal: t.calorie_target.map { "\($0)" })
                    Spacer()
                    macroStat("Protein", value: nutritionLog?.protein_g.map { "\($0)g" } ?? "—",    goal: t.protein_target_g.map { "\($0)g" })
                    Spacer()
                    macroStat("Carbs",   value: nutritionLog?.carbs_g.map { "\($0)g" } ?? "—",      goal: t.carbs_target_g.map { "\($0)g" })
                    Spacer()
                    macroStat("Fat",     value: nutritionLog?.fat_g.map { "\($0)g" } ?? "—",        goal: t.fat_target_g.map { "\($0)g" })
                }
                if let t = target?.calorie_target, t > 0 {
                    GeometryReader { geo in
                        ZStack(alignment: .leading) {
                            Capsule().fill(Brand.Color.surfaceRaised)
                            Capsule()
                                .fill(calorieProgress >= 1 ? Brand.Color.success : Brand.Color.accent)
                                .frame(width: max(geo.size.width * calorieProgress, 4))
                        }
                    }
                    .frame(height: 6)
                    Text("\(Int(calorieProgress * 100))% of calorie goal")
                        .font(.caption).foregroundStyle(Brand.Color.muted)
                }
            } else if loading {
                ShimmerCard(height: 60)
            } else {
                Text("No nutrition targets set.")
                    .font(.subheadline).foregroundStyle(Brand.Color.muted)
            }
        }
        .padding(18).frame(maxWidth: .infinity, alignment: .leading)
        .background(RoundedRectangle(cornerRadius: 20, style: .continuous).fill(Brand.Color.surfaceRaised)
            .overlay(RoundedRectangle(cornerRadius: 20, style: .continuous).stroke(Brand.Color.border, lineWidth: 1)))
    }

    private func macroStat(_ label: String, value: String, goal: String?) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(label.uppercased()).font(.system(size: 9, weight: .black, design: .monospaced)).foregroundStyle(Brand.Color.muted)
            Text(value).font(.title3.weight(.black)).foregroundStyle(.white)
            if let g = goal { Text("/ \(g)").font(.caption).foregroundStyle(Brand.Color.muted) }
        }
    }

    @ViewBuilder
    private var hydrationCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("HYDRATION").font(.system(size: 10, weight: .black, design: .monospaced)).tracking(1.4).foregroundStyle(Brand.Color.accent)
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text("\((nutritionLog?.hydration_liters ?? 0), specifier: "%.1f") L").font(.title2.weight(.black)).foregroundStyle(.white)
                    Text("of \(hydrationGoalLiters, specifier: "%.1f") L goal").font(.caption).foregroundStyle(Brand.Color.muted)
                }
                Spacer()
                HStack(spacing: 10) {
                    Button { Task { await addHydration(0.5) } } label: {
                        Text("+0.5 L").font(.caption.weight(.bold)).foregroundStyle(Brand.Color.accent)
                            .padding(.horizontal, 12).padding(.vertical, 8)
                            .background(Capsule().fill(Brand.Color.accent.opacity(0.14))
                                .overlay(Capsule().stroke(Brand.Color.accent.opacity(0.3), lineWidth: 1)))
                    }
                    Button { Task { await setHydration(0) } } label: {
                        Text("Reset").font(.caption.weight(.bold)).foregroundStyle(Brand.Color.muted)
                            .padding(.horizontal, 12).padding(.vertical, 8)
                            .background(Capsule().fill(Brand.Color.surfaceRaised)
                                .overlay(Capsule().stroke(Brand.Color.border, lineWidth: 1)))
                    }
                }
            }
        }
        .padding(18).frame(maxWidth: .infinity, alignment: .leading)
        .background(RoundedRectangle(cornerRadius: 20, style: .continuous).fill(Brand.Color.surfaceRaised)
            .overlay(RoundedRectangle(cornerRadius: 20, style: .continuous).stroke(Brand.Color.border, lineWidth: 1)))
    }

    @ViewBuilder
    private var mealsCard: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack {
                Text("MEALS").font(.system(size: 10, weight: .black, design: .monospaced)).tracking(1.4).foregroundStyle(Brand.Color.accent)
                Spacer()
                Button("+ Add") { showAddMeal = true }.font(.caption.weight(.bold)).foregroundStyle(Brand.Color.accent)
            }
            if loading && nutritionLog == nil {
                ShimmerCard(height: 60)
            } else if let meals = nutritionLog?.meals, !meals.isEmpty {
                VStack(spacing: 8) {
                    ForEach(Array(meals.enumerated()), id: \.offset) { idx, m in
                        HStack {
                            VStack(alignment: .leading, spacing: 3) {
                                Text(m.name ?? "Meal").font(.subheadline.weight(.semibold)).foregroundStyle(.white)
                                HStack(spacing: 6) {
                                    if let c = m.calories { mealBadge("\(c) cal") }
                                    if let p = m.protein_g { mealBadge("\(p)g P") }
                                    if let c = m.carbs_g { mealBadge("\(c)g C") }
                                }
                            }
                            Spacer()
                            HStack(spacing: 4) {
                                Button { openEditMeal(at: idx) } label: {
                                    Image(systemName: "pencil").font(.caption.weight(.semibold)).foregroundStyle(Brand.Color.muted).padding(8)
                                }
                                Button { Task { await deleteMeal(at: idx) } } label: {
                                    Image(systemName: "trash").font(.caption.weight(.semibold)).foregroundStyle(Brand.Color.danger.opacity(0.7)).padding(8)
                                }
                            }
                        }
                        .padding(12)
                        .background(RoundedRectangle(cornerRadius: 14, style: .continuous).fill(Color.white.opacity(0.05))
                            .overlay(RoundedRectangle(cornerRadius: 14, style: .continuous).stroke(Brand.Color.border, lineWidth: 1)))
                    }
                }
                if let tot = nutritionLog?.total_calories {
                    HStack { Spacer(); Text("Total: \(tot) cal").font(.subheadline.weight(.bold)).foregroundStyle(.white) }
                }
            } else {
                Text("No meals logged. Tap + Add to start.").font(.subheadline).foregroundStyle(Brand.Color.muted)
            }
        }
        .padding(18).frame(maxWidth: .infinity, alignment: .leading)
        .background(RoundedRectangle(cornerRadius: 20, style: .continuous).fill(Brand.Color.surfaceRaised)
            .overlay(RoundedRectangle(cornerRadius: 20, style: .continuous).stroke(Brand.Color.border, lineWidth: 1)))
    }

    private func mealBadge(_ text: String) -> some View {
        Text(text).font(.system(size: 10, weight: .bold)).foregroundStyle(Brand.Color.muted)
            .padding(.horizontal, 6).padding(.vertical, 3)
            .background(Capsule().fill(Color.white.opacity(0.07)))
    }

    @ViewBuilder
    private var insightCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("NUTRITION INSIGHT").font(.system(size: 10, weight: .black, design: .monospaced)).tracking(1.4).foregroundStyle(Brand.Color.accent)
            if let insight = nutritionInsight, !insight.isEmpty {
                Text(insight).font(.subheadline).foregroundStyle(.white.opacity(0.85)).fixedSize(horizontal: false, vertical: true)
            } else {
                Button { Task { await loadNutritionInsight() } } label: {
                    Label("Get today's insight", systemImage: "sparkles").frame(maxWidth: .infinity)
                }
                .buttonStyle(PremiumActionButtonStyle(filled: false))
            }
        }
        .padding(18).frame(maxWidth: .infinity, alignment: .leading)
        .background(RoundedRectangle(cornerRadius: 20, style: .continuous).fill(Brand.Color.accent.opacity(0.07))
            .overlay(RoundedRectangle(cornerRadius: 20, style: .continuous).stroke(Brand.Color.accent.opacity(0.2), lineWidth: 1)))
    }

    @ViewBuilder
    private var suggestionsCard: some View {
        VStack(alignment: .leading, spacing: 14) {
            Text("MEAL SUGGESTIONS").font(.system(size: 10, weight: .black, design: .monospaced)).tracking(1.4).foregroundStyle(Brand.Color.accent)
            if suggestions.isEmpty {
                Button { Task { await loadSuggestions() } } label: {
                    Label("Suggest meals for today", systemImage: "lightbulb").frame(maxWidth: .infinity)
                }
                .buttonStyle(PremiumActionButtonStyle(filled: false))
            } else {
                VStack(spacing: 8) {
                    ForEach(Array(suggestions.prefix(3).enumerated()), id: \.offset) { _, s in
                        HStack {
                            Text(s.name ?? "Meal").font(.subheadline.weight(.semibold)).foregroundStyle(.white)
                            Spacer()
                            if let c = s.calories { Text("\(c) cal").font(.caption.weight(.bold)).foregroundStyle(Brand.Color.muted) }
                        }
                        .padding(12)
                        .background(RoundedRectangle(cornerRadius: 14, style: .continuous).fill(Color.white.opacity(0.05))
                            .overlay(RoundedRectangle(cornerRadius: 14, style: .continuous).stroke(Brand.Color.border, lineWidth: 1)))
                    }
                }
            }
        }
        .padding(18).frame(maxWidth: .infinity, alignment: .leading)
        .background(RoundedRectangle(cornerRadius: 20, style: .continuous).fill(Brand.Color.surfaceRaised)
            .overlay(RoundedRectangle(cornerRadius: 20, style: .continuous).stroke(Brand.Color.border, lineWidth: 1)))
    }

    // MARK: - Sheets

    private var addMealSheet: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    labeledField("DESCRIBE THE MEAL", placeholder: "e.g. grilled chicken with rice", text: $mealText, keyboard: .default, multiline: true)
                    HStack(spacing: 10) {
                        labeledField("OR SCAN BARCODE", placeholder: "Barcode number", text: $barcodeText, keyboard: .numberPad, multiline: false)
                        Button("Look up") { Task { await lookupBarcode() } }
                            .buttonStyle(PremiumActionButtonStyle(filled: false))
                            .disabled(barcodeText.isEmpty || analyzeLoading)
                            .padding(.top, 24)
                    }
                    if analyzeLoading {
                        HStack { Spacer(); ProgressView().tint(Brand.Color.accent); Spacer() }
                    } else if let a = analyzedMeal {
                        VStack(alignment: .leading, spacing: 10) {
                            Text("ANALYSIS").font(.system(size: 10, weight: .black, design: .monospaced)).tracking(1.2).foregroundStyle(Brand.Color.accent)
                            VStack(alignment: .leading, spacing: 6) {
                                if let n = a.name { Text(n).font(.headline).foregroundStyle(.white) }
                                HStack(spacing: 8) {
                                    if let c = a.calories { mealBadge("\(c) cal") }
                                    if let p = a.protein_g { mealBadge("\(p)g P") }
                                    if let c = a.carbs_g { mealBadge("\(c)g C") }
                                    if let f = a.fat_g { mealBadge("\(f)g F") }
                                }
                            }
                            .padding(14)
                            .background(RoundedRectangle(cornerRadius: 16, style: .continuous).fill(Brand.Color.accent.opacity(0.08))
                                .overlay(RoundedRectangle(cornerRadius: 16, style: .continuous).stroke(Brand.Color.accent.opacity(0.2), lineWidth: 1)))
                            Button { Task { await addAnalyzedMealToLog() } } label: {
                                Label("Add to log", systemImage: "plus.circle.fill").frame(maxWidth: .infinity)
                            }
                            .buttonStyle(PremiumActionButtonStyle())
                        }
                    }
                }
                .padding(20)
            }
            .fnBackground()
            .navigationTitle("Add Meal").navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { showAddMeal = false; mealText = ""; barcodeText = ""; analyzedMeal = nil }
                        .foregroundStyle(Brand.Color.muted)
                }
                ToolbarItem(placement: .confirmationAction) {
                    if analyzedMeal == nil {
                        Button("Analyze") { Task { await analyzeMeal() } }
                            .foregroundStyle(Brand.Color.accent)
                            .disabled(analyzeLoading || mealText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                    }
                }
            }
        }
    }

    private var editMealSheet: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    labeledField("NAME", placeholder: "Meal name", text: $editMealName, keyboard: .default, multiline: false)
                    labeledField("CALORIES", placeholder: "0", text: $editMealCal, keyboard: .numberPad, multiline: false)
                    labeledField("PROTEIN (G)", placeholder: "0", text: $editMealProtein, keyboard: .numberPad, multiline: false)
                    labeledField("CARBS (G)", placeholder: "0", text: $editMealCarbs, keyboard: .numberPad, multiline: false)
                    labeledField("FAT (G)", placeholder: "0", text: $editMealFat, keyboard: .numberPad, multiline: false)
                    Button { Task { await saveEditedMeal() } } label: {
                        Label("Save Changes", systemImage: "checkmark.circle.fill").frame(maxWidth: .infinity)
                    }
                    .buttonStyle(PremiumActionButtonStyle())
                }
                .padding(20)
            }
            .fnBackground()
            .navigationTitle("Edit Meal").navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { editingMealIndex = nil; showEditMealSheet = false }
                        .foregroundStyle(Brand.Color.muted)
                }
            }
        }
        .onAppear {
            if let i = editingMealIndex, let meals = nutritionLog?.meals, i < meals.count {
                let m = meals[i]
                editMealName = m.name ?? ""
                editMealCal = m.calories.map { String($0) } ?? ""
                editMealProtein = m.protein_g.map { String($0) } ?? ""
                editMealCarbs = m.carbs_g.map { String($0) } ?? ""
                editMealFat = m.fat_g.map { String($0) } ?? ""
            }
        }
    }

    @ViewBuilder
    private func labeledField(_ label: String, placeholder: String, text: Binding<String>, keyboard: UIKeyboardType, multiline: Bool) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(label).font(.system(size: 10, weight: .black, design: .monospaced)).tracking(1.2).foregroundStyle(Brand.Color.accent)
            if multiline {
                TextField(placeholder, text: text, axis: .vertical)
                    .lineLimit(2...4).keyboardType(keyboard).font(.body).foregroundStyle(.white)
                    .padding(14)
                    .background(RoundedRectangle(cornerRadius: 16, style: .continuous).fill(Brand.Color.surfaceRaised)
                        .overlay(RoundedRectangle(cornerRadius: 16, style: .continuous).stroke(Brand.Color.border, lineWidth: 1)))
            } else {
                TextField(placeholder, text: text)
                    .keyboardType(keyboard).font(.body).foregroundStyle(.white)
                    .padding(14)
                    .background(RoundedRectangle(cornerRadius: 16, style: .continuous).fill(Brand.Color.surfaceRaised)
                        .overlay(RoundedRectangle(cornerRadius: 16, style: .continuous).stroke(Brand.Color.border, lineWidth: 1)))
            }
        }
    }

    // MARK: - Actions

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

    private func addHydration(_ amount: Double) async { await setHydration((nutritionLog?.hydration_liters ?? 0) + amount) }

    private func setHydration(_ liters: Double) async {
        guard let ds = dataService else { return }
        do {
            var log = try await ds.fetchNutritionLog(date: selectedDate) ?? NutritionLog()
            log.date = selectedDate; log.hydration_liters = liters
            if log.meals == nil { log.meals = [] }
            if log.total_calories == nil { log.total_calories = 0 }
            try await ds.upsertNutritionLog(log)
            await MainActor.run { nutritionLog?.hydration_liters = liters }
        } catch { await MainActor.run { errorMessage = error.localizedDescription } }
    }

    private func loadNutritionInsight() async {
        let res = try? await api.aiNutritionInsight(dateLocal: selectedDate)
        await MainActor.run { nutritionInsight = res?.insight }
    }

    private func loadSuggestions() async {
        let res = try? await api.aiMealSuggestions()
        await MainActor.run { suggestions = res?.suggestions ?? [] }
    }

    private func openEditMeal(at index: Int) { editingMealIndex = index; showEditMealSheet = true }

    private func analyzeMeal() async {
        let text = mealText.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !text.isEmpty else { return }
        analyzeLoading = true; analyzedMeal = nil
        defer { analyzeLoading = false }
        do {
            let res = try await api.aiAnalyzeMeal(text: text, imageBase64: nil)
            await MainActor.run { analyzedMeal = res }
        } catch { await MainActor.run { errorMessage = error.localizedDescription } }
    }

    private func addAnalyzedMealToLog() async {
        guard let a = analyzedMeal, let ds = dataService else { return }
        var meal = MealEntry(); meal.name = a.name; meal.calories = a.calories
        meal.protein_g = a.protein_g; meal.carbs_g = a.carbs_g; meal.fat_g = a.fat_g
        do {
            var log = try await ds.fetchNutritionLog(date: selectedDate) ?? NutritionLog()
            log.date = selectedDate
            var meals = log.meals ?? []; meals.append(meal); log.meals = meals
            log.total_calories = meals.compactMap(\.calories).reduce(0, +)
            log.protein_g = meals.compactMap(\.protein_g).reduce(0, +)
            log.carbs_g = meals.compactMap(\.carbs_g).reduce(0, +)
            log.fat_g = meals.compactMap(\.fat_g).reduce(0, +)
            try await ds.upsertNutritionLog(log); _ = try? await api.awardsCheck()
            await MainActor.run { analyzedMeal = nil; mealText = ""; barcodeText = ""; showAddMeal = false }
            await load()
        } catch { await MainActor.run { errorMessage = error.localizedDescription } }
    }

    private func deleteMeal(at index: Int) async {
        guard let ds = dataService, var log = nutritionLog, var meals = log.meals, index < meals.count else { return }
        meals.remove(at: index); log.meals = meals
        log.total_calories = meals.compactMap(\.calories).reduce(0, +)
        log.protein_g = meals.compactMap(\.protein_g).reduce(0, +)
        log.carbs_g = meals.compactMap(\.carbs_g).reduce(0, +)
        log.fat_g = meals.compactMap(\.fat_g).reduce(0, +)
        do { try await ds.upsertNutritionLog(log); await MainActor.run { nutritionLog = log } }
        catch { await MainActor.run { errorMessage = error.localizedDescription } }
    }

    private func saveEditedMeal() async {
        guard let ds = dataService, let idx = editingMealIndex,
              var log = nutritionLog, var meals = log.meals, idx < meals.count else {
            await MainActor.run { editingMealIndex = nil }; return
        }
        var m = meals[idx]; m.name = editMealName.isEmpty ? nil : editMealName
        m.calories = Int(editMealCal); m.protein_g = Int(editMealProtein)
        m.carbs_g = Int(editMealCarbs); m.fat_g = Int(editMealFat)
        meals[idx] = m; log.meals = meals
        log.total_calories = meals.compactMap(\.calories).reduce(0, +)
        log.protein_g = meals.compactMap(\.protein_g).reduce(0, +)
        log.carbs_g = meals.compactMap(\.carbs_g).reduce(0, +)
        log.fat_g = meals.compactMap(\.fat_g).reduce(0, +)
        do {
            try await ds.upsertNutritionLog(log)
            await MainActor.run { nutritionLog = log; editingMealIndex = nil; showEditMealSheet = false }
        } catch { await MainActor.run { errorMessage = error.localizedDescription } }
    }

    private func lookupBarcode() async {
        let code = barcodeText.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !code.isEmpty else { return }
        analyzeLoading = true; defer { analyzeLoading = false }
        do {
            let res = try await api.nutritionBarcode(barcode: code)
            guard let nut = res.nutrition else { await MainActor.run { errorMessage = "Product not found" }; return }
            let parts = [nut.brand, nut.name].compactMap { $0 }.filter { !$0.isEmpty }
            let name = parts.isEmpty ? (nut.name ?? "Scanned product") : parts.joined(separator: " ")
            await MainActor.run {
                analyzedMeal = AnalyzeMealResponse(name: name, calories: nut.calories,
                    protein_g: nut.protein.map { Int($0) }, carbs_g: nut.carbs.map { Int($0) },
                    fat_g: nut.fat.map { Int($0) }, confidence: 1)
            }
        } catch { await MainActor.run { errorMessage = "Barcode lookup failed" } }
    }
}
