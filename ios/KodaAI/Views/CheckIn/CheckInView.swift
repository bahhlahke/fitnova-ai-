//
//  CheckInView.swift
//  Koda AI
//
//  Daily check-in: energy, sleep, soreness, adherence. Parity with web /check-in.
//

import SwiftUI

struct CheckInView: View {
    @EnvironmentObject var auth: SupabaseService
    @State private var energyScore = 5
    @State private var sleepHours = ""
    @State private var sorenessNotes = ""
    @State private var adherenceScore = 5
    @State private var saving = false
    @State private var errorMessage: String?
    @State private var saved = false

    private var dataService: KodaDataService? {
        guard let uid = auth.currentUserId else { return nil }
        return KodaDataService(client: auth.supabaseClient, userId: uid)
    }

    var body: some View {
        NavigationStack {
            Form {
                Section("Energy (1–10)") {
                    Slider(value: Binding(get: { Double(energyScore) }, set: { energyScore = Int($0) }), in: 1...10, step: 1)
                    Text("\(energyScore)")
                }
                Section("Sleep (hours)") {
                    TextField("e.g. 7.5", text: $sleepHours)
                        .keyboardType(.decimalPad)
                }
                Section("Soreness / notes") {
                    TextField("e.g. mild lower body", text: $sorenessNotes, axis: .vertical)
                        .lineLimit(2...4)
                }
                Section("Adherence (1–10)") {
                    Slider(value: Binding(get: { Double(adherenceScore) }, set: { adherenceScore = Int($0) }), in: 1...10, step: 1)
                    Text("\(adherenceScore)")
                }
                if let err = errorMessage {
                    Section {
                        Text(err)
                            .foregroundStyle(.red)
                            .font(.caption)
                    }
                }
                if saved {
                    Section {
                        Text("Check-in saved.")
                            .foregroundStyle(.green)
                    }
                }
            }
            .navigationTitle("Daily check-in")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") {
                        Task { await save() }
                    }
                    .disabled(saving)
                }
            }
        }
    }

    private func save() async {
        guard let ds = dataService else { return }
        saving = true
        errorMessage = nil
        saved = false
        defer { saving = false }
        var checkIn = CheckIn()
        checkIn.date_local = DateHelpers.todayLocal
        checkIn.energy_score = energyScore
        checkIn.sleep_hours = Double(sleepHours)
        checkIn.soreness_notes = sorenessNotes.isEmpty ? nil : sorenessNotes
        checkIn.adherence_score = adherenceScore
        do {
            try await ds.upsertCheckIn(checkIn)
            await MainActor.run { saved = true }
        } catch {
            await MainActor.run { errorMessage = error.localizedDescription }
        }
    }
}
