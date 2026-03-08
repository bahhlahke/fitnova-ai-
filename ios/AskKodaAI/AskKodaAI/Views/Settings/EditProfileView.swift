//
//  EditProfileView.swift
//  Koda AI
//
//  Edit profile fields; parity with web settings profile form.
//

import SwiftUI

struct EditProfileView: View {
    @EnvironmentObject var auth: SupabaseService
    @State private var displayName = ""
    @State private var age = ""
    @State private var sex = "male"
    @State private var heightCm = ""
    @State private var weightKg = ""
    @State private var goalsText = ""
    @State private var activityLevel = "moderate"
    @State private var saving = false
    @State private var experienceLevel = "beginner"
    @State private var motivationalDriver = "health"
    @State private var errorMessage: String?

    private var dataService: KodaDataService? {
        guard let uid = auth.currentUserId else { return nil }
        return KodaDataService(client: auth.supabaseClient, userId: uid)
    }

    var body: some View {
        Form {
            Section("Profile") {
                TextField("Name", text: $displayName)
                TextField("Age", text: $age)
                    .keyboardType(.numberPad)
                Picker("Sex", selection: $sex) {
                    Text("Male").tag("male")
                    Text("Female").tag("female")
                    Text("Other").tag("other")
                }
                TextField("Height (cm)", text: $heightCm)
                    .keyboardType(.decimalPad)
                TextField("Weight (kg)", text: $weightKg)
                    .keyboardType(.decimalPad)
            }
            Section("Goals") {
                TextField("e.g. Build muscle, Lose fat", text: $goalsText, axis: .vertical)
                    .lineLimit(2...4)
            }
            Section("Activity") {
                Picker("Level", selection: $activityLevel) {
                    Text("Sedentary").tag("sedentary")
                    Text("Light").tag("light")
                    Text("Moderate").tag("moderate")
                    Text("Active").tag("active")
                }
            }
            Section("Identity") {
                Picker("Experience", selection: $experienceLevel) {
                    Text("Beginner").tag("beginner")
                    Text("Intermediate").tag("intermediate")
                    Text("Advanced").tag("advanced")
                }
                Picker("Primary Motivator", selection: $motivationalDriver) {
                    Text("Health & Longevity").tag("health")
                    Text("Athletic Performance").tag("performance")
                    Text("Body Composition").tag("aesthetics")
                    Text("Stress Relief").tag("stress")
                }
            }
            if let err = errorMessage {
                Section {
                    Text(err)
                        .foregroundStyle(.red)
                        .font(.caption)
                }
            }
        }
        .navigationTitle("Edit profile")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .confirmationAction) {
                Button("Save") {
                    Task { await save() }
                }
                .disabled(saving)
            }
        }
        .task { await load() }
    }

    private func load() async {
        guard let ds = dataService else { return }
        do {
            let p = try await ds.fetchProfile()
            await MainActor.run {
                displayName = p?.display_name ?? ""
                age = p?.age.map { String($0) } ?? ""
                sex = p?.sex ?? "male"
                heightCm = p?.height_cm.map { String(format: "%.0f", $0) } ?? ""
                weightKg = p?.weight_kg.map { String(format: "%.1f", $0) } ?? ""
                goalsText = (p?.goals ?? []).joined(separator: ", ")
                activityLevel = p?.activity_level ?? "moderate"
                experienceLevel = p?.experience_level ?? "beginner"
                motivationalDriver = p?.motivational_driver ?? "health"
            }
        } catch { }
    }

    private func save() async {
        guard let ds = dataService else { return }
        saving = true
        errorMessage = nil
        defer { saving = false }
        do {
            var p = try await ds.fetchProfile() ?? UserProfile()
            p.display_name = displayName.isEmpty ? nil : displayName
            p.age = Int(age)
            p.sex = sex
            p.height_cm = Double(heightCm.replacingOccurrences(of: ",", with: "."))
            p.weight_kg = Double(weightKg.replacingOccurrences(of: ",", with: "."))
            p.goals = goalsText.split(separator: ",").map { String($0.trimmingCharacters(in: .whitespaces)) }.filter { !$0.isEmpty }
            if p.goals?.isEmpty == true { p.goals = nil }
            p.activity_level = activityLevel
            p.experience_level = experienceLevel
            p.motivational_driver = motivationalDriver
            try await ds.upsertProfile(p)
        } catch {
            await MainActor.run { errorMessage = error.localizedDescription }
        }
    }
}
