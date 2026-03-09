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

    private var api: KodaAPIService {
        KodaAPIService(getAccessToken: { auth.accessToken })
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
                hydrationCard
                mealsCard
                nutritionInsightCard
                mealSuggestionsCard
            }
            .padding()
        }
        .navigationTitle("Nutrition")
        .refreshable { await load() }
        .task { await load() }
        .sheet(isPresented: $showAddMeal) {
            addMealSheet
        }
        .sheet(isPresented: $showEditMealSheet) {
            editMealSheet
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
    private var hydrationCard: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Hydration")
                .font(.headline)
            HStack {
                Text("\((nutritionLog?.hydration_liters ?? 0), specifier: "%.1f") L")
                    .font(.title2)
                    .fontWeight(.semibold)
                Text("of \(hydrationGoalLiters, specifier: "%.1f") L goal")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                Spacer()
                Button("+0.5 L") { Task { await addHydration(0.5) } }
                    .font(.caption)
                Button("Reset") { Task { await setHydration(0) } }
                    .font(.caption)
            }
        }
        .padding()
        .background(Color(.systemGray6))
        .clipShape(RoundedRectangle(cornerRadius: 12))
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
                ForEach(Array(meals.enumerated()), id: \.offset) { idx, m in
                    HStack {
                        Text(m.name ?? "Meal")
                        Spacer()
                        if let c = m.calories { Text("\(c) cal") }
                        Button("Edit") { openEditMeal(at: idx) }
                            .font(.caption2)
                        Button("Delete", role: .destructive) { Task { await deleteMeal(at: idx) } }
                            .font(.caption2)
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

    @ViewBuilder
    private var nutritionInsightCard: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Today's nutrition insight")
                .font(.headline)
            if let insight = nutritionInsight, !insight.isEmpty {
                Text(insight)
                    .font(.subheadline)
                    .italic()
            } else {
                Button("Get insight") { Task { await loadNutritionInsight() } }
                    .font(.caption)
            }
        }
        .padding()
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color.accentColor.opacity(0.08))
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }

    @ViewBuilder
    private var mealSuggestionsCard: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Meal suggestions")
                .font(.headline)
            if suggestions.isEmpty {
                Button("Suggest meals") { Task { await loadSuggestions() } }
                    .font(.caption)
            } else {
                ForEach(Array(suggestions.prefix(3).enumerated()), id: \.offset) { _, s in
                    HStack {
                        Text(s.name ?? "Meal")
                        Spacer()
                        if let c = s.calories { Text("\(c) cal") }
                    }
                    .font(.subheadline)
                }
            }
        }
        .padding()
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color(.systemGray6))
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }

    private var editMealSheet: some View {
        NavigationStack {
            Form {
                TextField("Name", text: $editMealName)
                TextField("Calories", text: $editMealCal)
                    .keyboardType(.numberPad)
                TextField("Protein (g)", text: $editMealProtein)
                    .keyboardType(.numberPad)
                TextField("Carbs (g)", text: $editMealCarbs)
                    .keyboardType(.numberPad)
                TextField("Fat (g)", text: $editMealFat)
                    .keyboardType(.numberPad)
            }
            .navigationTitle("Edit meal")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") {
                        editingMealIndex = nil
                        showEditMealSheet = false
                    }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") { Task { await saveEditedMeal() } }
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

    private var addMealSheet: some View {
        NavigationStack {
            VStack(alignment: .leading, spacing: 16) {
                TextField("Describe the meal (e.g. chicken salad, 2 eggs)", text: $mealText, axis: .vertical)
                    .textFieldStyle(.roundedBorder)
                    .lineLimit(2...4)
                HStack {
                    TextField("Or scan barcode", text: $barcodeText)
                        .keyboardType(.numberPad)
                        .textFieldStyle(.roundedBorder)
                    Button("Look up") { Task { await lookupBarcode() } }
                        .disabled(barcodeText.isEmpty || analyzeLoading)
                }
                if analyzeLoading {
                    ProgressView()
                } else if let a = analyzedMeal {
                    if let n = a.name { Text(n).font(.headline) }
                    if let c = a.calories { Text("\(c) cal") }
                    if let p = a.protein_g { Text("P: \(p)g") }
                    Button("Add to log") {
                        Task { await addAnalyzedMealToLog() }
                    }
                    .buttonStyle(.borderedProminent)
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
                        barcodeText = ""
                        analyzedMeal = nil
                    }
                }
                ToolbarItem(placement: .confirmationAction) {
                    if analyzedMeal != nil {
                        Button("Add to log") {
                            Task { await addAnalyzedMealToLog() }
                        }
                    } else {
                        Button("Analyze") {
                            Task { await analyzeMeal() }
                        }
                        .disabled(analyzeLoading || mealText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                    }
                }
            }
        }
    }

    private func addAnalyzedMealToLog() async {
        guard let a = analyzedMeal, let ds = dataService else { return }
        var meal = MealEntry()
        meal.name = a.name
        meal.calories = a.calories
        meal.protein_g = a.protein_g
        meal.carbs_g = a.carbs_g
        meal.fat_g = a.fat_g
        do {
            var log = try await ds.fetchNutritionLog(date: selectedDate) ?? NutritionLog()
            log.date = selectedDate
            var meals = log.meals ?? []
            meals.append(meal)
            log.meals = meals
            log.total_calories = meals.compactMap(\.calories).reduce(0, +)
            log.protein_g = meals.compactMap(\.protein_g).reduce(0, +)
            log.carbs_g = meals.compactMap(\.carbs_g).reduce(0, +)
            log.fat_g = meals.compactMap(\.fat_g).reduce(0, +)
            try await ds.upsertNutritionLog(log)
            _ = try? await api.awardsCheck()
            await MainActor.run {
                errorMessage = nil
                analyzedMeal = nil
                mealText = ""
                barcodeText = ""
                showAddMeal = false
            }
            await load()
        } catch {
            await MainActor.run { errorMessage = (error as? LocalizedError)?.errorDescription ?? error.localizedDescription }
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

    private func addHydration(_ amount: Double) async {
        guard dataService != nil else { return }
        let current = nutritionLog?.hydration_liters ?? 0
        await setHydration(current + amount)
    }

    private func setHydration(_ liters: Double) async {
        guard let ds = dataService else { return }
        do {
            var log = try await ds.fetchNutritionLog(date: selectedDate) ?? NutritionLog()
            log.date = selectedDate
            log.hydration_liters = liters
            if log.meals == nil { log.meals = [] }
            if log.total_calories == nil { log.total_calories = 0 }
            try await ds.upsertNutritionLog(log)
            await MainActor.run { nutritionLog?.hydration_liters = liters }
        } catch {
            await MainActor.run { errorMessage = error.localizedDescription }
        }
    }

    private func loadNutritionInsight() async {
        do {
            let res = try await api.aiNutritionInsight(dateLocal: selectedDate)
            await MainActor.run { nutritionInsight = res.insight }
        } catch { }
    }

    private func loadSuggestions() async {
        do {
            let res = try await api.aiMealSuggestions()
            await MainActor.run { suggestions = res.suggestions ?? [] }
        } catch { }
    }

    private func openEditMeal(at index: Int) {
        editingMealIndex = index
        showEditMealSheet = true
    }

    private func deleteMeal(at index: Int) async {
        guard let ds = dataService, var log = nutritionLog, var meals = log.meals, index < meals.count else { return }
        meals.remove(at: index)
        log.meals = meals
        log.total_calories = meals.compactMap(\.calories).reduce(0, +)
        log.protein_g = meals.compactMap(\.protein_g).reduce(0, +)
        log.carbs_g = meals.compactMap(\.carbs_g).reduce(0, +)
        log.fat_g = meals.compactMap(\.fat_g).reduce(0, +)
        do {
            try await ds.upsertNutritionLog(log)
            await MainActor.run { nutritionLog = log }
        } catch {
            await MainActor.run { errorMessage = error.localizedDescription }
        }
    }

    private func saveEditedMeal() async {
        guard let ds = dataService, let idx = editingMealIndex, var log = nutritionLog, var meals = log.meals, idx < meals.count else {
            await MainActor.run { editingMealIndex = nil }
            return
        }
        var m = meals[idx]
        m.name = editMealName.isEmpty ? nil : editMealName
        m.calories = Int(editMealCal)
        m.protein_g = Int(editMealProtein)
        m.carbs_g = Int(editMealCarbs)
        m.fat_g = Int(editMealFat)
        meals[idx] = m
        log.meals = meals
        log.total_calories = meals.compactMap(\.calories).reduce(0, +)
        log.protein_g = meals.compactMap(\.protein_g).reduce(0, +)
        log.carbs_g = meals.compactMap(\.carbs_g).reduce(0, +)
        log.fat_g = meals.compactMap(\.fat_g).reduce(0, +)
        do {
            try await ds.upsertNutritionLog(log)
            await MainActor.run {
                nutritionLog = log
                editingMealIndex = nil
                showEditMealSheet = false
            }
        } catch {
            await MainActor.run { errorMessage = error.localizedDescription }
        }
    }

    private func lookupBarcode() async {
        let code = barcodeText.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !code.isEmpty else { return }
        analyzeLoading = true
        defer { analyzeLoading = false }
        do {
            let res = try await api.nutritionBarcode(barcode: code)
            guard let nut = res.nutrition else {
                await MainActor.run { errorMessage = "Product not found" }
                return
            }
            let name = ([nut.brand, nut.name].compactMap { $0 }.filter { !$0.isEmpty }.joined(separator: " ")).isEmpty ? (nut.name ?? "Scanned product") : ([nut.brand, nut.name].compactMap { $0 }.filter { !$0.isEmpty }.joined(separator: " "))
            let proteinG = nut.protein.map { Int($0) }
            let carbsG = nut.carbs.map { Int($0) }
            let fatG = nut.fat.map { Int($0) }
            await MainActor.run {
                analyzedMeal = AnalyzeMealResponse(
                    name: name,
                    calories: nut.calories,
                    protein_g: proteinG,
                    carbs_g: carbsG,
                    fat_g: fatG,
                    confidence: 1
                )
            }
        } catch {
            await MainActor.run { errorMessage = (error as? LocalizedError)?.errorDescription ?? "Barcode lookup failed" }
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
            // Only update state — user must tap "Add to log" to confirm and save.
            await MainActor.run { analyzedMeal = res }
        } catch {
            await MainActor.run { errorMessage = (error as? LocalizedError)?.errorDescription ?? error.localizedDescription }
        }
    }
}
