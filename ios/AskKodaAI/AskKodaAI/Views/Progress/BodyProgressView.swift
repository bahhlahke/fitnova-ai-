//
//  BodyProgressView.swift
//  Koda AI
//
//  Progress list, add entry (weight, body fat, measurements), parity with web /progress and /progress/add.
//

import SwiftUI

struct BodyProgressView: View {
    @EnvironmentObject var auth: SupabaseService
    @State private var entries: [ProgressEntry] = []
    @State private var loading = false
    @State private var errorMessage: String?
    @State private var showAdd = false
    @State private var addWeight = ""
    @State private var addBodyFat = ""
    @State private var addNotes = ""
    @State private var saving = false
    @State private var progressInsight: String?
    @State private var progressInsightLoading = false
    @State private var evolutionaryNarrative: String?
    @State private var narrativeLoading = false
    @State private var projection: DashboardProjectionResponse?

    private var dataService: KodaDataService? {
        guard let uid = auth.currentUserId else { return nil }
        return KodaDataService(client: auth.supabaseClient, userId: uid)
    }

    private var api: KodaAPIService {
        KodaAPIService(getAccessToken: { auth.accessToken })
    }

    // MARK: - Derived stats
    private var latestWeight: Double? { entries.first?.weight_kg }
    private var latestBodyFat: Double? { entries.first?.body_fat_percent }
    private var weightChange: Double? {
        guard entries.count >= 2, let latest = entries.first?.weight_kg, let prev = entries[1].weight_kg else { return nil }
        return latest - prev
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    PremiumHeroCard(
                        title: "Body Composition",
                        subtitle: "Track weight, body fat, and measurements to visualize your physique transformation over time.",
                        eyebrow: "Progress"
                    ) {
                        HStack(spacing: 10) {
                            if let w = latestWeight {
                                PremiumMetricPill(label: "Weight", value: String(format: "%.1f kg", w))
                            }
                            if let bf = latestBodyFat {
                                PremiumMetricPill(label: "Body Fat", value: String(format: "%.1f%%", bf))
                            }
                            if let delta = weightChange {
                                let sign = delta >= 0 ? "+" : ""
                                PremiumMetricPill(label: "Δ", value: "\(sign)\(String(format: "%.1f", delta)) kg")
                            }
                        }
                    }

                    // Evolutionary Narrative
                    if narrativeLoading {
                        ShimmerCard(height: 120)
                    } else if let narrative = evolutionaryNarrative, !narrative.isEmpty {
                        PremiumRowCard {
                            VStack(alignment: .leading, spacing: 12) {
                                HStack(spacing: 8) {
                                    Image(systemName: "history.circle.fill")
                                        .foregroundStyle(Brand.Color.accent)
                                    Text("EVOLUTIONARY NARRATIVE")
                                        .font(.system(size: 11, weight: .black, design: .monospaced))
                                        .tracking(1.4)
                                        .foregroundStyle(Brand.Color.accent)
                                }
                                Text(narrative)
                                    .font(.subheadline)
                                    .fontWeight(.medium)
                                    .foregroundStyle(.white)
                                    .lineSpacing(4)
                            }
                            .padding(.vertical, 8)
                        }
                    }

                    // 12-week projection
                    if let p = projection, let proj12 = p.projected_12w {
                        PremiumRowCard {
                            HStack {
                                VStack(alignment: .leading, spacing: 4) {
                                    Text("12-WEEK PROJECTION")
                                        .font(.system(size: 11, weight: .black, design: .monospaced))
                                        .tracking(1.2)
                                        .foregroundStyle(Brand.Color.accent)
                                    Text("Based on current trajectory")
                                        .font(.caption)
                                        .foregroundStyle(Brand.Color.muted)
                                }
                                Spacer()
                                Text(String(format: "%.1f kg", proj12))
                                    .font(.system(size: 28, weight: .black, design: .rounded))
                                    .foregroundStyle(Brand.Color.success)
                            }
                        }
                    }

                    // Body comp scan + trophy room
                    PremiumRowCard {
                        NavigationLink {
                            BodyCompScanView()
                        } label: {
                            HStack {
                                Image(systemName: "camera.viewfinder")
                                    .font(.title3)
                                    .foregroundStyle(Brand.Color.accent)
                                VStack(alignment: .leading, spacing: 4) {
                                    Text("Body Comp Scan")
                                        .font(.headline)
                                        .foregroundStyle(.white)
                                    Text("AI-powered visual body composition analysis")
                                        .font(.caption)
                                        .foregroundStyle(Brand.Color.muted)
                                }
                                Spacer()
                                Image(systemName: "chevron.right")
                                    .font(.caption.weight(.bold))
                                    .foregroundStyle(Brand.Color.muted)
                            }
                        }
                    }

                    TrophyRoomView()

                    // History
                    if loading && entries.isEmpty {
                        ShimmerCard(height: 80)
                        ShimmerCard(height: 80)
                        ShimmerCard(height: 80)
                    } else if entries.isEmpty {
                        PremiumRowCard {
                            VStack(spacing: 8) {
                                Image(systemName: "chart.line.uptrend.xyaxis")
                                    .font(.title)
                                    .foregroundStyle(Brand.Color.muted)
                                Text("No progress entries yet.")
                                    .font(.subheadline)
                                    .foregroundStyle(Brand.Color.muted)
                                Text("Add your first weight entry to start tracking trends.")
                                    .font(.caption)
                                    .foregroundStyle(Brand.Color.muted)
                                    .multilineTextAlignment(.center)
                            }
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 12)
                        }
                    } else {
                        VStack(alignment: .leading, spacing: 12) {
                            PremiumSectionHeader("History", eyebrow: "\(entries.count) entries")
                            ForEach(entries, id: \.track_id) { e in
                                progressEntryCard(e)
                            }
                        }
                    }
                }
                .padding(.horizontal, 16)
                .padding(.vertical, 20)
            }
            .fnBackground()
            .navigationTitle("Progress")
            .navigationBarTitleDisplayMode(.inline)
            .refreshable {
                await load()
                await loadInsightAndProjection()
            }
            .task {
                await load()
                await loadInsightAndProjection()
            }
            .toolbar {
                ToolbarItem(placement: .primaryAction) {
                    Button {
                        showAdd = true
                    } label: {
                        Image(systemName: "plus")
                            .fontWeight(.bold)
                    }
                }
            }
            .sheet(isPresented: $showAdd) {
                addEntrySheet
            }
        }
    }

    // MARK: - Entry Card

    private func progressEntryCard(_ e: ProgressEntry) -> some View {
        PremiumRowCard {
            HStack(alignment: .top, spacing: 12) {
                VStack(alignment: .leading, spacing: 4) {
                    Text(formattedDate(e.date))
                        .font(.caption)
                        .foregroundStyle(Brand.Color.muted)
                    if let w = e.weight_kg {
                        Text(String(format: "%.1f kg", w))
                            .font(.system(size: 22, weight: .black, design: .rounded))
                            .foregroundStyle(.white)
                    }
                    if let n = e.notes, !n.isEmpty {
                        Text(n)
                            .font(.caption)
                            .foregroundStyle(Brand.Color.muted)
                    }
                }
                Spacer()
                if let bf = e.body_fat_percent {
                    VStack(alignment: .trailing, spacing: 2) {
                        Text("BODY FAT")
                            .font(.system(size: 9, weight: .black, design: .monospaced))
                            .tracking(1)
                            .foregroundStyle(Brand.Color.muted)
                        Text(String(format: "%.1f%%", bf))
                            .font(.headline.weight(.bold))
                            .foregroundStyle(Brand.Color.accent)
                    }
                }
            }
        }
    }

    private func formattedDate(_ s: String?) -> String {
        guard let s else { return "" }
        let parser = DateFormatter()
        parser.dateFormat = "yyyy-MM-dd"
        parser.timeZone = TimeZone(identifier: "UTC")
        guard let d = parser.date(from: s) else { return s }
        let formatter = DateFormatter()
        formatter.dateStyle = .medium
        formatter.timeStyle = .none
        return formatter.string(from: d)
    }

    // MARK: - Add Sheet

    private var addEntrySheet: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    PremiumHeroCard(
                        title: "Log Progress Entry",
                        subtitle: "Track your weight and body composition over time.",
                        eyebrow: "New Entry"
                    ) { EmptyView() }

                    PremiumRowCard {
                        VStack(alignment: .leading, spacing: 16) {
                            Text("WEIGHT")
                                .font(.system(size: 11, weight: .black, design: .monospaced))
                                .tracking(1.2)
                                .foregroundStyle(Brand.Color.accent)
                            HStack(spacing: 10) {
                                Image(systemName: "scalemass.fill")
                                    .foregroundStyle(Brand.Color.accent)
                                TextField("Weight in kg (e.g. 82.5)", text: $addWeight)
                                    .keyboardType(.decimalPad)
                                    .font(.body)
                                    .foregroundStyle(.white)
                            }
                            .padding(14)
                            .background(
                                RoundedRectangle(cornerRadius: 14)
                                    .fill(Brand.Color.surfaceRaised)
                                    .overlay(RoundedRectangle(cornerRadius: 14).stroke(Brand.Color.borderStrong, lineWidth: 1))
                            )
                        }
                    }

                    PremiumRowCard {
                        VStack(alignment: .leading, spacing: 16) {
                            Text("BODY FAT % (OPTIONAL)")
                                .font(.system(size: 11, weight: .black, design: .monospaced))
                                .tracking(1.2)
                                .foregroundStyle(Brand.Color.accent)
                            HStack(spacing: 10) {
                                Image(systemName: "percent")
                                    .foregroundStyle(Brand.Color.accent)
                                TextField("Body fat percentage (e.g. 18.0)", text: $addBodyFat)
                                    .keyboardType(.decimalPad)
                                    .font(.body)
                                    .foregroundStyle(.white)
                            }
                            .padding(14)
                            .background(
                                RoundedRectangle(cornerRadius: 14)
                                    .fill(Brand.Color.surfaceRaised)
                                    .overlay(RoundedRectangle(cornerRadius: 14).stroke(Brand.Color.borderStrong, lineWidth: 1))
                            )
                        }
                    }

                    PremiumRowCard {
                        VStack(alignment: .leading, spacing: 16) {
                            Text("NOTES (OPTIONAL)")
                                .font(.system(size: 11, weight: .black, design: .monospaced))
                                .tracking(1.2)
                                .foregroundStyle(Brand.Color.accent)
                            TextField("e.g. Post morning weigh-in, well rested…", text: $addNotes, axis: .vertical)
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
                    }

                    Button {
                        Task { await saveEntry() }
                    } label: {
                        if saving {
                            HStack(spacing: 10) {
                                ProgressView().tint(.black).scaleEffect(0.85)
                                Text("Saving…")
                            }
                        } else {
                            Text("Save Entry")
                        }
                    }
                    .buttonStyle(PremiumActionButtonStyle())
                    .disabled(saving || addWeight.isEmpty)
                }
                .padding(.horizontal, 16)
                .padding(.vertical, 20)
            }
            .fnBackground()
            .navigationTitle("Add Entry")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") {
                        showAdd = false
                        addWeight = ""
                        addBodyFat = ""
                        addNotes = ""
                    }
                }
            }
        }
    }

    // MARK: - Data

    private func load() async {
        guard let ds = dataService else { return }
        loading = true
        defer { loading = false }
        do {
            let list = try await ds.fetchProgressEntries(limit: 100)
            await MainActor.run { entries = list }
        } catch {
            await MainActor.run { errorMessage = error.localizedDescription }
        }
    }

    private func loadInsightAndProjection() async {
        progressInsightLoading = true
        defer { progressInsightLoading = false }
        await withTaskGroup(of: Void.self) { group in
            group.addTask {
                do {
                    let res = try await api.aiProgressInsight()
                    await MainActor.run { progressInsight = res.insight }
                } catch {
                    print("[Koda] aiProgressInsight: \(error)")
                }
            }
            group.addTask {
                narrativeLoading = true
                do {
                    let res = try await api.evolutionaryNarrative(localDate: DateHelpers.todayLocal)
                    await MainActor.run { evolutionaryNarrative = res.narrative }
                } catch { }
                narrativeLoading = false
            }
            group.addTask {
                do {
                    let p = try await api.aiProjection(today: DateHelpers.todayLocal)
                    await MainActor.run { projection = p }
                } catch {
                    print("[Koda] aiProjection: \(error)")
                }
            }
        }
    }

    private func saveEntry() async {
        guard let ds = dataService else { return }
        saving = true
        defer { saving = false }
        var entry = ProgressEntry()
        entry.date = DateHelpers.todayLocal
        entry.weight_kg = Double(addWeight)
        entry.body_fat_percent = Double(addBodyFat).map { $0 > 0 ? $0 : nil } ?? nil
        entry.notes = addNotes.isEmpty ? nil : addNotes
        do {
            try await ds.insertProgressEntry(entry)
            await MainActor.run {
                showAdd = false
                addWeight = ""
                addBodyFat = ""
                addNotes = ""
            }
            await load()
            await loadInsightAndProjection()
        } catch {
            await MainActor.run { errorMessage = error.localizedDescription }
        }
    }
}
