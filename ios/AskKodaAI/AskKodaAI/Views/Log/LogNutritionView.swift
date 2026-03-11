//
//  LogNutritionView.swift
//  Koda AI
//
//  Nutrition log by date, targets, add meal (text/image/barcode), macro progress bars,
//  AI insight, meal suggestions. Full parity with web /log/nutrition.
//

import SwiftUI
import PhotosUI

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
    @State private var insightLoading = false
    @State private var suggestions: [MealSuggestion] = []
    @State private var suggestionsLoading = false
    @State private var editingMealIndex: Int?
    @State private var showEditMealSheet = false
    @State private var editMealName = ""
    @State private var editMealCal = ""
    @State private var editMealProtein = ""
    @State private var editMealCarbs = ""
    @State private var editMealFat = ""
    @State private var selectedPhotoItem: PhotosPickerItem?
    @State private var capturedImageBase64: String?
    private let hydrationGoalLiters = 2.5

    private var api: KodaAPIService {
        KodaAPIService(getAccessToken: { auth.accessToken })
    }

    private var dataService: KodaDataService? {
        guard let uid = auth.currentUserId else { return nil }
        return KodaDataService(client: auth.supabaseClient, userId: uid)
    }

    // MARK: - Computed macro totals

    private var totalCalories: Int { nutritionLog?.total_calories ?? 0 }
    private var totalProtein: Int { nutritionLog?.protein_g ?? 0 }
    private var totalCarbs: Int { nutritionLog?.carbs_g ?? 0 }
    private var totalFat: Int { nutritionLog?.fat_g ?? 0 }
    private var hydrationLiters: Double { nutritionLog?.hydration_liters ?? 0 }

    private var calTarget: Int { target?.calorie_target ?? 0 }
    private var proteinTarget: Int { target?.protein_target_g ?? 0 }
    private var carbsTarget: Int { target?.carbs_target_g ?? 0 }
    private var fatTarget: Int { target?.fat_target_g ?? 0 }

    private var displayDate: String {
        guard let d = ISO8601DateFormatter().date(from: selectedDate + "T00:00:00") else { return selectedDate }
        let f = DateFormatter()
        f.dateFormat = "EEE, MMM d"
        f.timeZone = TimeZone.current
        return f.string(from: d)
    }

    private var isToday: Bool { selectedDate == DateHelpers.todayLocal }

    // MARK: - Body

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                // Hero header
                PremiumHeroCard(
                    title: "Nutrition",
                    subtitle: "Track every macro, stay on target, and get AI meal guidance built around your plan.",
                    eyebrow: "Daily Fuel"
                ) {
                    dateSelectorRow
                }

                if let err = errorMessage {
                    HStack {
                        Image(systemName: "exclamationmark.triangle.fill")
                            .foregroundStyle(Brand.Color.danger)
                        Text(err)
                            .font(.caption)
                            .foregroundStyle(Brand.Color.danger)
                        Spacer()
                        Button("Dismiss") { errorMessage = nil }
                            .font(.caption2)
                            .foregroundStyle(Brand.Color.muted)
                    }
                    .padding(14)
                    .background(Brand.Color.danger.opacity(0.1))
                    .clipShape(RoundedRectangle(cornerRadius: 14))
                }

                macroRingsCard
                hydrationCard
                mealsCard
                nutritionInsightCard
                mealSuggestionsCard
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 20)
        }
        .fnBackground()
        .navigationTitle("Nutrition")
        .navigationBarTitleDisplayMode(.inline)
        .refreshable { await load() }
        .task { await load() }
        .sheet(isPresented: $showAddMeal) {
            addMealSheet
        }
        .sheet(isPresented: $showEditMealSheet) {
            editMealSheet
        }
    }

    // MARK: - Date Selector

    private var dateSelectorRow: some View {
        HStack(spacing: 12) {
            Button {
                shiftDate(by: -1)
            } label: {
                Image(systemName: "chevron.left")
                    .font(.headline.weight(.bold))
                    .foregroundStyle(.white)
                    .frame(width: 36, height: 36)
                    .background(
                        Circle()
                            .fill(Brand.Color.surfaceRaised)
                            .overlay(Circle().stroke(Brand.Color.borderStrong, lineWidth: 1))
                    )
            }

            Text(displayDate)
                .font(.headline.weight(.bold))
                .foregroundStyle(.white)
                .frame(maxWidth: .infinity)

            Button {
                shiftDate(by: 1)
            } label: {
                Image(systemName: "chevron.right")
                    .font(.headline.weight(.bold))
                    .foregroundStyle(isToday ? Brand.Color.muted : .white)
                    .frame(width: 36, height: 36)
                    .background(
                        Circle()
                            .fill(isToday ? Brand.Color.surfaceRaised.opacity(0.5) : Brand.Color.surfaceRaised)
                            .overlay(Circle().stroke(Brand.Color.borderStrong, lineWidth: 1))
                    )
            }
            .disabled(isToday)
        }
    }

    // MARK: - Macro Rings Card

    @ViewBuilder
    private var macroRingsCard: some View {
        PremiumRowCard {
            VStack(alignment: .leading, spacing: 16) {
                HStack {
                    Text("MACROS")
                        .font(.system(size: 11, weight: .black, design: .monospaced))
                        .tracking(1.2)
                        .foregroundStyle(Brand.Color.accent)
                    Spacer()
                    if loading && nutritionLog == nil {
                        ProgressView().tint(Brand.Color.accent).scaleEffect(0.8)
                    }
                }

                // Calorie headline
                if calTarget > 0 {
                    VStack(alignment: .leading, spacing: 6) {
                        HStack {
                            Text("\(totalCalories)")
                                .font(.system(size: 40, weight: .black, design: .rounded))
                                .foregroundStyle(.white)
                            Text("/ \(calTarget) kcal")
                                .font(.subheadline)
                                .foregroundStyle(Brand.Color.muted)
                                .padding(.top, 14)
                        }
                        macroBar(
                            value: Double(totalCalories),
                            target: Double(calTarget),
                            color: calorieBarColor
                        )
                    }
                } else {
                    HStack {
                        Text("\(totalCalories)")
                            .font(.system(size: 40, weight: .black, design: .rounded))
                            .foregroundStyle(.white)
                        Text("kcal")
                            .font(.subheadline)
                            .foregroundStyle(Brand.Color.muted)
                            .padding(.top, 14)
                    }
                }

                // Protein / Carbs / Fat pills
                HStack(spacing: 12) {
                    macroPill(label: "PROTEIN", current: totalProtein, target: proteinTarget, color: Brand.Color.accent)
                    macroPill(label: "CARBS", current: totalCarbs, target: carbsTarget, color: Color(hex: "818CF8"))
                    macroPill(label: "FAT", current: totalFat, target: fatTarget, color: Brand.Color.warning)
                }
            }
        }
    }

    private var calorieBarColor: Color {
        guard calTarget > 0 else { return Brand.Color.accent }
        let ratio = Double(totalCalories) / Double(calTarget)
        if ratio > 1.1 { return Brand.Color.danger }
        if ratio > 0.9 { return Brand.Color.success }
        return Brand.Color.accent
    }

    private func macroBar(value: Double, target: Double, color: Color) -> some View {
        GeometryReader { geo in
            ZStack(alignment: .leading) {
                Capsule()
                    .fill(Color.white.opacity(0.08))
                Capsule()
                    .fill(color)
                    .frame(width: target > 0 ? min(geo.size.width * CGFloat(value / target), geo.size.width) : 0)
            }
        }
        .frame(height: 8)
    }

    private func macroPill(label: String, current: Int, target: Int, color: Color) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(label)
                .font(.system(size: 9, weight: .black, design: .monospaced))
                .foregroundStyle(color)
            HStack(alignment: .lastTextBaseline, spacing: 3) {
                Text("\(current)")
                    .font(.system(size: 20, weight: .black, design: .rounded))
                    .foregroundStyle(.white)
                if target > 0 {
                    Text("/\(target)g")
                        .font(.caption)
                        .foregroundStyle(Brand.Color.muted)
                } else {
                    Text("g")
                        .font(.caption)
                        .foregroundStyle(Brand.Color.muted)
                }
            }
            if target > 0 {
                macroBar(value: Double(current), target: Double(target), color: color)
                    .frame(height: 4)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(12)
        .background(
            RoundedRectangle(cornerRadius: 16, style: .continuous)
                .fill(color.opacity(0.08))
                .overlay(
                    RoundedRectangle(cornerRadius: 16, style: .continuous)
                        .stroke(color.opacity(0.2), lineWidth: 1)
                )
        )
    }

    // MARK: - Hydration Card

    @ViewBuilder
    private var hydrationCard: some View {
        PremiumRowCard {
            VStack(alignment: .leading, spacing: 12) {
                HStack {
                    Text("HYDRATION")
                        .font(.system(size: 11, weight: .black, design: .monospaced))
                        .tracking(1.2)
                        .foregroundStyle(Brand.Color.accent)
                    Spacer()
                    Text("\(hydrationLiters, specifier: "%.1f") / \(hydrationGoalLiters, specifier: "%.1f") L")
                        .font(.subheadline.weight(.bold))
                        .foregroundStyle(.white)
                }

                GeometryReader { geo in
                    ZStack(alignment: .leading) {
                        Capsule().fill(Color.white.opacity(0.08))
                        Capsule()
                            .fill(LinearGradient(colors: [Color(hex: "38BDF8"), Color(hex: "0EA5E9")], startPoint: .leading, endPoint: .trailing))
                            .frame(width: min(geo.size.width * CGFloat(hydrationLiters / hydrationGoalLiters), geo.size.width))
                    }
                }
                .frame(height: 10)

                HStack(spacing: 10) {
                    Button("+0.25 L") { Task { await addHydration(0.25) } }
                        .buttonStyle(HydrationButtonStyle())
                    Button("+0.5 L") { Task { await addHydration(0.5) } }
                        .buttonStyle(HydrationButtonStyle())
                    Button("+1 L") { Task { await addHydration(1.0) } }
                        .buttonStyle(HydrationButtonStyle())
                    Spacer()
                    Button("Reset") { Task { await setHydration(0) } }
                        .font(.caption.weight(.semibold))
                        .foregroundStyle(Brand.Color.muted)
                }
            }
        }
    }

    // MARK: - Meals Card

    @ViewBuilder
    private var mealsCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text("MEALS")
                    .font(.system(size: 11, weight: .black, design: .monospaced))
                    .tracking(1.2)
                    .foregroundStyle(Brand.Color.accent)
                Spacer()
                Button {
                    showAddMeal = true
                } label: {
                    HStack(spacing: 6) {
                        Image(systemName: "plus")
                            .font(.caption.weight(.black))
                        Text("Add")
                            .font(.caption.weight(.bold))
                    }
                    .foregroundStyle(.black)
                    .padding(.horizontal, 14)
                    .padding(.vertical, 8)
                    .background(Capsule().fill(Brand.Color.accent))
                }
            }

            if loading && nutritionLog == nil {
                VStack(spacing: 10) {
                    ShimmerCard(height: 60)
                    ShimmerCard(height: 60)
                }
            } else if let meals = nutritionLog?.meals, !meals.isEmpty {
                VStack(spacing: 1) {
                    ForEach(Array(meals.enumerated()), id: \.offset) { idx, m in
                        mealRow(meal: m, index: idx)
                        if idx < meals.count - 1 {
                            Rectangle()
                                .fill(Brand.Color.border)
                                .frame(height: 1)
                        }
                    }
                }
                .padding(.horizontal, 18)
                .premiumCard()
            } else {
                PremiumStateCard(
                    title: "No meals logged",
                    detail: "Add your first meal with text, photo, or barcode scan.",
                    symbol: "fork.knife"
                )
            }
        }
    }

    private func mealRow(meal: MealEntry, index: Int) -> some View {
        HStack(alignment: .center, spacing: 12) {
            VStack(alignment: .leading, spacing: 4) {
                Text(meal.name ?? "Meal")
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(.white)
                HStack(spacing: 10) {
                    if let p = meal.protein_g, p > 0 {
                        macroTag("\(p)g P", Brand.Color.accent)
                    }
                    if let c = meal.carbs_g, c > 0 {
                        macroTag("\(c)g C", Color(hex: "818CF8"))
                    }
                    if let f = meal.fat_g, f > 0 {
                        macroTag("\(f)g F", Brand.Color.warning)
                    }
                }
            }
            Spacer()
            VStack(alignment: .trailing, spacing: 4) {
                if let c = meal.calories {
                    Text("\(c)")
                        .font(.headline.weight(.black))
                        .foregroundStyle(.white)
                    Text("kcal")
                        .font(.caption2)
                        .foregroundStyle(Brand.Color.muted)
                }
            }
            Menu {
                Button("Edit") { openEditMeal(at: index) }
                Button("Delete", role: .destructive) { Task { await deleteMeal(at: index) } }
            } label: {
                Image(systemName: "ellipsis")
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(Brand.Color.muted)
                    .frame(width: 28, height: 28)
                    .background(Circle().fill(Brand.Color.surfaceRaised))
            }
        }
        .padding(.vertical, 14)
    }

    private func macroTag(_ text: String, _ color: Color) -> some View {
        Text(text)
            .font(.system(size: 10, weight: .bold))
            .foregroundStyle(color)
            .padding(.horizontal, 7)
            .padding(.vertical, 3)
            .background(Capsule().fill(color.opacity(0.12)))
    }

    // MARK: - Nutrition Insight Card

    @ViewBuilder
    private var nutritionInsightCard: some View {
        PremiumRowCard {
            VStack(alignment: .leading, spacing: 12) {
                HStack {
                    Text("AI NUTRITION INSIGHT")
                        .font(.system(size: 11, weight: .black, design: .monospaced))
                        .tracking(1.2)
                        .foregroundStyle(Brand.Color.accent)
                    Spacer()
                    if insightLoading {
                        ProgressView().tint(Brand.Color.accent).scaleEffect(0.8)
                    }
                }

                if let insight = nutritionInsight, !insight.isEmpty {
                    Text(insight)
                        .font(.subheadline)
                        .foregroundStyle(.white.opacity(0.9))
                        .fixedSize(horizontal: false, vertical: true)
                } else if !insightLoading {
                    Button {
                        Task { await loadNutritionInsight() }
                    } label: {
                        HStack(spacing: 8) {
                            Image(systemName: "sparkles")
                            Text("Generate today's insight")
                        }
                        .font(.subheadline.weight(.semibold))
                        .foregroundStyle(Brand.Color.accent)
                    }
                }
            }
        }
    }

    // MARK: - Meal Suggestions Card

    @ViewBuilder
    private var mealSuggestionsCard: some View {
        PremiumRowCard {
            VStack(alignment: .leading, spacing: 12) {
                HStack {
                    Text("MEAL SUGGESTIONS")
                        .font(.system(size: 11, weight: .black, design: .monospaced))
                        .tracking(1.2)
                        .foregroundStyle(Brand.Color.accent)
                    Spacer()
                    if suggestionsLoading {
                        ProgressView().tint(Brand.Color.accent).scaleEffect(0.8)
                    }
                }

                if suggestions.isEmpty && !suggestionsLoading {
                    Button {
                        Task { await loadSuggestions() }
                    } label: {
                        HStack(spacing: 8) {
                            Image(systemName: "lightbulb")
                            Text("Suggest meals for my targets")
                        }
                        .font(.subheadline.weight(.semibold))
                        .foregroundStyle(Brand.Color.accent)
                    }
                } else {
                    ForEach(Array(suggestions.prefix(3).enumerated()), id: \.offset) { _, s in
                        HStack {
                            VStack(alignment: .leading, spacing: 3) {
                                Text(s.name ?? "Meal")
                                    .font(.subheadline.weight(.semibold))
                                    .foregroundStyle(.white)
                                if let desc = s.note, !desc.isEmpty {
                                    Text(desc)
                                        .font(.caption)
                                        .foregroundStyle(Brand.Color.muted)
                                        .lineLimit(2)
                                }
                            }
                            Spacer()
                            if let c = s.calories {
                                Text("\(c) kcal")
                                    .font(.caption.weight(.bold))
                                    .foregroundStyle(Brand.Color.muted)
                            }
                        }
                        .padding(.vertical, 6)
                    }
                }
            }
        }
    }

    // MARK: - Add Meal Sheet

    private var addMealSheet: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    // Photo capture option
                    VStack(alignment: .leading, spacing: 8) {
                        Text("PHOTO ANALYSIS")
                            .font(.system(size: 11, weight: .black, design: .monospaced))
                            .tracking(1.2)
                            .foregroundStyle(Brand.Color.accent)
                        PhotosPicker(selection: $selectedPhotoItem, matching: .images) {
                            HStack(spacing: 10) {
                                Image(systemName: capturedImageBase64 != nil ? "photo.fill.on.rectangle.fill" : "camera.viewfinder")
                                    .font(.headline)
                                    .foregroundStyle(capturedImageBase64 != nil ? Brand.Color.success : Brand.Color.accent)
                                Text(capturedImageBase64 != nil ? "Photo ready — tap Analyze" : "Take or choose a food photo")
                                    .font(.subheadline.weight(.semibold))
                                    .foregroundStyle(capturedImageBase64 != nil ? Brand.Color.success : .white)
                                Spacer()
                                if capturedImageBase64 != nil {
                                    Button {
                                        capturedImageBase64 = nil
                                        selectedPhotoItem = nil
                                    } label: {
                                        Image(systemName: "xmark.circle.fill")
                                            .foregroundStyle(Brand.Color.muted)
                                    }
                                }
                            }
                            .padding(14)
                            .background(
                                RoundedRectangle(cornerRadius: 14)
                                    .fill(Brand.Color.surfaceRaised)
                                    .overlay(RoundedRectangle(cornerRadius: 14).stroke(Brand.Color.borderStrong, lineWidth: 1))
                            )
                        }
                        .onChange(of: selectedPhotoItem) { _, item in
                            Task {
                                guard let item, let data = try? await item.loadTransferable(type: Data.self) else { return }
                                let base64 = "data:image/jpeg;base64,\(data.base64EncodedString())"
                                await MainActor.run { capturedImageBase64 = base64 }
                            }
                        }
                    }

                    // Text description
                    VStack(alignment: .leading, spacing: 8) {
                        Text("DESCRIBE THE MEAL")
                            .font(.system(size: 11, weight: .black, design: .monospaced))
                            .tracking(1.2)
                            .foregroundStyle(Brand.Color.accent)
                        TextField("e.g. chicken breast, rice, broccoli...", text: $mealText, axis: .vertical)
                            .lineLimit(2...4)
                            .font(.body)
                            .foregroundStyle(.white)
                            .padding(14)
                            .background(
                                RoundedRectangle(cornerRadius: 14)
                                    .fill(Brand.Color.surfaceRaised)
                                    .overlay(RoundedRectangle(cornerRadius: 14).stroke(Brand.Color.borderStrong, lineWidth: 1))
                            )
                    }

                    // Barcode lookup
                    VStack(alignment: .leading, spacing: 8) {
                        Text("BARCODE LOOKUP")
                            .font(.system(size: 11, weight: .black, design: .monospaced))
                            .tracking(1.2)
                            .foregroundStyle(Brand.Color.accent)
                        HStack(spacing: 10) {
                            TextField("Enter barcode number", text: $barcodeText)
                                .keyboardType(.numberPad)
                                .font(.body)
                                .foregroundStyle(.white)
                                .padding(14)
                                .background(
                                    RoundedRectangle(cornerRadius: 14)
                                        .fill(Brand.Color.surfaceRaised)
                                        .overlay(RoundedRectangle(cornerRadius: 14).stroke(Brand.Color.borderStrong, lineWidth: 1))
                                )
                            Button("Look up") {
                                Task { await lookupBarcode() }
                            }
                            .disabled(barcodeText.trimmingCharacters(in: .whitespaces).isEmpty || analyzeLoading)
                            .font(.subheadline.weight(.bold))
                            .foregroundStyle(.black)
                            .padding(.horizontal, 14)
                            .padding(.vertical, 14)
                            .background(Capsule().fill(Brand.Color.accent))
                        }
                    }

                    // Loading state
                    if analyzeLoading {
                        HStack(spacing: 12) {
                            ProgressView().tint(Brand.Color.accent)
                            Text("Analyzing nutritional content…")
                                .font(.subheadline)
                                .foregroundStyle(Brand.Color.muted)
                        }
                        .padding(14)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .background(
                            RoundedRectangle(cornerRadius: 14)
                                .fill(Brand.Color.surfaceRaised)
                        )
                    }

                    // Analysis result
                    if let a = analyzedMeal {
                        analyzedMealCard(a)
                    }
                }
                .padding(20)
            }
            .fnBackground()
            .navigationTitle("Add Meal")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") {
                        dismissAddSheet()
                    }
                }
                ToolbarItem(placement: .confirmationAction) {
                    if analyzedMeal != nil {
                        Button("Add to log") {
                            Task { await addAnalyzedMealToLog() }
                        }
                        .disabled(analyzeLoading)
                        .font(.subheadline.weight(.bold))
                    } else {
                        Button("Analyze") {
                            Task { await analyzeMeal() }
                        }
                        .disabled(analyzeLoading || (mealText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty && capturedImageBase64 == nil))
                        .font(.subheadline.weight(.bold))
                    }
                }
            }
        }
        .presentationDetents([.large])
    }

    private func analyzedMealCard(_ a: AnalyzeMealResponse) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("ANALYSIS RESULT")
                .font(.system(size: 11, weight: .black, design: .monospaced))
                .tracking(1.2)
                .foregroundStyle(Brand.Color.success)

            if let name = a.name {
                Text(name)
                    .font(.headline.weight(.bold))
                    .foregroundStyle(.white)
            }

            HStack(spacing: 12) {
                if let c = a.calories {
                    analyzedMacroPill(label: "CAL", value: "\(c)", color: Brand.Color.accent)
                }
                if let p = a.protein_g {
                    analyzedMacroPill(label: "PRO", value: "\(p)g", color: Brand.Color.success)
                }
                if let c = a.carbs_g {
                    analyzedMacroPill(label: "CARB", value: "\(c)g", color: Color(hex: "818CF8"))
                }
                if let f = a.fat_g {
                    analyzedMacroPill(label: "FAT", value: "\(f)g", color: Brand.Color.warning)
                }
            }

            if let conf = a.confidence {
                Text("AI confidence: \(Int(conf * 100))%")
                    .font(.caption)
                    .foregroundStyle(Brand.Color.muted)
            }

            Button {
                Task { await addAnalyzedMealToLog() }
            } label: {
                Text("Add to Log")
            }
            .buttonStyle(PremiumActionButtonStyle())
        }
        .padding(16)
        .background(
            RoundedRectangle(cornerRadius: 18)
                .fill(Brand.Color.success.opacity(0.08))
                .overlay(RoundedRectangle(cornerRadius: 18).stroke(Brand.Color.success.opacity(0.25), lineWidth: 1))
        )
    }

    private func analyzedMacroPill(label: String, value: String, color: Color) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(label)
                .font(.system(size: 9, weight: .black, design: .monospaced))
                .foregroundStyle(color)
            Text(value)
                .font(.headline.weight(.black))
                .foregroundStyle(.white)
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 10)
        .background(
            RoundedRectangle(cornerRadius: 12)
                .fill(color.opacity(0.1))
                .overlay(RoundedRectangle(cornerRadius: 12).stroke(color.opacity(0.2), lineWidth: 1))
        )
    }

    // MARK: - Edit Meal Sheet

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
            .navigationTitle("Edit Meal")
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

    // MARK: - Data Actions

    private func load() async {
        guard let ds = dataService else { return }
        loading = true
        defer { loading = false }
        do {
            async let logResult = ds.fetchNutritionLog(date: selectedDate)
            async let targetResult = api.nutritionTargetsGet()
            let (l, tr) = try await (logResult, targetResult)
            await MainActor.run {
                nutritionLog = l
                target = tr.target
            }
        } catch {
            await MainActor.run { errorMessage = error.localizedDescription }
        }
    }

    private func shiftDate(by days: Int) {
        guard let d = ISO8601DateFormatter().date(from: selectedDate + "T00:00:00"),
              let newDate = Calendar.current.date(byAdding: .day, value: days, to: d) else { return }
        let fmt = DateFormatter()
        fmt.dateFormat = "yyyy-MM-dd"
        fmt.timeZone = TimeZone.current
        let newStr = fmt.string(from: newDate)
        // Don't go into the future
        if newStr > DateHelpers.todayLocal { return }
        selectedDate = newStr
        nutritionLog = nil
        nutritionInsight = nil
        suggestions = []
        Task { await load() }
    }

    private func addHydration(_ amount: Double) async {
        let current = nutritionLog?.hydration_liters ?? 0
        await setHydration(min(current + amount, hydrationGoalLiters * 2))
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
            HapticEngine.impact(.light)
        } catch {
            await MainActor.run { errorMessage = error.localizedDescription }
        }
    }

    private func analyzeMeal() async {
        let text = mealText.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !text.isEmpty || capturedImageBase64 != nil else { return }
        analyzeLoading = true
        analyzedMeal = nil
        defer { analyzeLoading = false }
        do {
            let res = try await api.aiAnalyzeMeal(text: text.isEmpty ? nil : text, imageBase64: capturedImageBase64)
            await MainActor.run { analyzedMeal = res }
        } catch {
            await MainActor.run { errorMessage = (error as? LocalizedError)?.errorDescription ?? error.localizedDescription }
        }
    }

    private func addAnalyzedMealToLog() async {
        guard let a = analyzedMeal, let ds = dataService else { return }
        analyzeLoading = true
        defer { analyzeLoading = false }
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
            await MainActor.run { dismissAddSheet() }
            HapticEngine.notification(.success)
            await load()
        } catch {
            await MainActor.run { errorMessage = (error as? LocalizedError)?.errorDescription ?? error.localizedDescription }
        }
    }

    private func dismissAddSheet() {
        showAddMeal = false
        mealText = ""
        barcodeText = ""
        analyzedMeal = nil
        capturedImageBase64 = nil
        selectedPhotoItem = nil
    }

    private func loadNutritionInsight() async {
        insightLoading = true
        defer { insightLoading = false }
        do {
            let res = try await api.aiNutritionInsight(dateLocal: selectedDate)
            await MainActor.run { nutritionInsight = res.insight }
        } catch {
            await MainActor.run { errorMessage = "Could not load insight. Try again." }
        }
    }

    private func loadSuggestions() async {
        suggestionsLoading = true
        defer { suggestionsLoading = false }
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
            HapticEngine.impact(.medium)
        } catch {
            await MainActor.run { errorMessage = error.localizedDescription }
        }
    }

    private func saveEditedMeal() async {
        guard let ds = dataService, let idx = editingMealIndex,
              var log = nutritionLog, var meals = log.meals, idx < meals.count else {
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
                await MainActor.run { errorMessage = "Product not found for barcode \(code)." }
                return
            }
            let parts = [nut.brand, nut.name].compactMap { $0 }.filter { !$0.isEmpty }
            let name = parts.isEmpty ? "Scanned product" : parts.joined(separator: " ")
            await MainActor.run {
                analyzedMeal = AnalyzeMealResponse(
                    name: name,
                    calories: nut.calories,
                    protein_g: nut.protein.map { Int($0) },
                    carbs_g: nut.carbs.map { Int($0) },
                    fat_g: nut.fat.map { Int($0) },
                    confidence: 1
                )
            }
        } catch {
            await MainActor.run { errorMessage = (error as? LocalizedError)?.errorDescription ?? "Barcode lookup failed" }
        }
    }
}

// MARK: - Hydration Button Style

private struct HydrationButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.caption.weight(.bold))
            .foregroundStyle(.white)
            .padding(.horizontal, 12)
            .padding(.vertical, 8)
            .background(
                Capsule()
                    .fill(Color(hex: "0EA5E9").opacity(0.18))
                    .overlay(Capsule().stroke(Color(hex: "0EA5E9").opacity(0.3), lineWidth: 1))
            )
            .opacity(configuration.isPressed ? 0.7 : 1)
    }
}
