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

    private var dataService: KodaDataService? {
        guard let uid = auth.currentUserId else { return nil }
        return KodaDataService(client: auth.supabaseClient, userId: uid)
    }

    var body: some View {
        NavigationStack {
            Group {
                if loading && entries.isEmpty {
                    ProgressView("Loading progress…")
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else {
                    List {
                        Section {
                            NavigationLink("Body comp scan") { BodyCompScanView() }
                        }
                        Section("History") {
                            ForEach(entries, id: \.track_id) { e in
                                progressRow(e)
                            }
                        }
                    }
                }
            }
            .navigationTitle("Progress")
            .refreshable { await load() }
            .task { await load() }
            .toolbar {
                ToolbarItem(placement: .primaryAction) {
                    Button("Add") { showAdd = true }
                }
            }
            .sheet(isPresented: $showAdd) {
                addEntrySheet
            }
        }
    }

    private func progressRow(_ e: ProgressEntry) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(e.date ?? "")
                .font(.caption)
                .foregroundStyle(.secondary)
            HStack(spacing: 12) {
                if let w = e.weight_kg { Text("\(w) kg") }
                if let b = e.body_fat_percent { Text("\(b)% BF") }
            }
            .font(.subheadline)
            if let n = e.notes, !n.isEmpty {
                Text(n)
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
        }
        .padding(.vertical, 4)
    }

    private var addEntrySheet: some View {
        NavigationStack {
            Form {
                TextField("Weight (kg)", text: $addWeight)
                    .keyboardType(.decimalPad)
                TextField("Body fat %", text: $addBodyFat)
                    .keyboardType(.decimalPad)
                TextField("Notes", text: $addNotes, axis: .vertical)
                    .lineLimit(2...4)
            }
            .navigationTitle("Add entry")
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
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") {
                        Task { await saveEntry() }
                    }
                    .disabled(saving || addWeight.isEmpty)
                }
            }
        }
    }

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
        } catch {
            await MainActor.run { errorMessage = error.localizedDescription }
        }
    }
}
