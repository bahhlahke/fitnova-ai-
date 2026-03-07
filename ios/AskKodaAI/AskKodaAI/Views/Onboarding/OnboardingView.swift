//
//  OnboardingView.swift
//  Koda AI
//
//  Multi-step onboarding: name, age, sex, height, weight, goals, injuries, diet. Saves to profile + onboarding.
//

import SwiftUI

struct OnboardingView: View {
    @EnvironmentObject var auth: SupabaseService
    @State private var step = 0
    @State private var name = ""
    @State private var age = ""
    @State private var sex = "male"
    @State private var heightCm = ""
    @State private var weightKg = ""
    @State private var goals: [String] = []
    @State private var injuries = ""
    @State private var diet = "balanced"
    @State private var saving = false
    @State private var errorMessage: String?
    var onComplete: (() -> Void)?

    private var dataService: KodaDataService? {
        guard let uid = auth.currentUserId else { return nil }
        return KodaDataService(client: auth.supabaseClient, userId: uid)
    }

    var body: some View {
        NavigationStack {
            Form {
                if step == 0 {
                    Section("About you") {
                        TextField("Name", text: $name)
                        TextField("Age", text: $age)
                            .keyboardType(.numberPad)
                        Picker("Sex", selection: $sex) {
                            Text("Male").tag("male")
                            Text("Female").tag("female")
                            Text("Other").tag("other")
                        }
                    }
                }
                if step == 1 {
                    Section("Body") {
                        TextField("Height (cm)", text: $heightCm)
                            .keyboardType(.decimalPad)
                        TextField("Weight (kg)", text: $weightKg)
                            .keyboardType(.decimalPad)
                    }
                }
                if step == 2 {
                    Section("Goals") {
                        Text("e.g. Build muscle, Lose fat (comma-separated)")
                            .font(.caption)
                        TextField("Goals", text: Binding(get: { goals.joined(separator: ", ") }, set: { goals = $0.split(separator: ",").map { String($0.trimmingCharacters(in: .whitespaces)) }.filter { !$0.isEmpty } }))
                    }
                }
                if step == 3 {
                    Section("Injuries / limitations") {
                        TextField("e.g. lower back pain", text: $injuries, axis: .vertical)
                            .lineLimit(2...4)
                    }
                    Section("Diet") {
                        Picker("Preference", selection: $diet) {
                            Text("Balanced").tag("balanced")
                            Text("Low carb").tag("low_carb")
                            Text("High protein").tag("high_protein")
                            Text("Vegetarian").tag("vegetarian")
                        }
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
            .navigationTitle("Onboarding")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    if step > 0 {
                        Button("Back") { step -= 1 }
                    }
                }
                ToolbarItem(placement: .confirmationAction) {
                    if step < 3 {
                        Button("Next") { step += 1 }
                    } else {
                        Button("Finish") {
                            Task { await save() }
                        }
                        .disabled(saving)
                    }
                }
            }
        }
    }

    private func save() async {
        guard let ds = dataService else { return }
        saving = true
        errorMessage = nil
        defer { saving = false }
        var profile = UserProfile()
        profile.display_name = name.isEmpty ? nil : name
        profile.age = Int(age)
        profile.sex = sex
        profile.height_cm = Double(heightCm)
        profile.weight_kg = Double(weightKg)
        profile.goals = goals.isEmpty ? nil : goals
        profile.injuries_limitations = injuries.isEmpty ? nil : injuries
        profile.dietary_preferences = [diet]
        do {
            try await ds.upsertProfile(profile)
            var onboarding = OnboardingRow()
            onboarding.completed_at = ISO8601DateFormatter().string(from: Date())
            onboarding.responses = ["goals": AnyCodable(value: goals as [String]), "diet": AnyCodable(value: diet)]
            try await ds.upsertOnboarding(onboarding)
            await MainActor.run { onComplete?() }
        } catch {
            await MainActor.run { errorMessage = error.localizedDescription }
        }
    }
}
