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
    @State private var squad = "hypertrophy"
    @State private var experienceLevel = "beginner"
    @State private var motivationalDriver = "health"
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
                VStack(alignment: .leading, spacing: 16) {
                    HStack {
                        Spacer()
                        Image("KodaLogo")
                            .resizable()
                            .scaledToFit()
                            .frame(height: 44)
                        Spacer()
                    }

                    PremiumSectionHeader(
                        currentStepTitle,
                        eyebrow: "Onboarding \(step + 1)/6",
                        subtitle: "Shape Koda around your body, goals, and training identity before the first plan is generated."
                    )

                    ProgressView(value: Double(step + 1), total: 6)
                        .tint(Brand.Color.accent)
                }
                .listRowBackground(Color.clear)
                .listRowInsets(EdgeInsets(top: 10, leading: 0, bottom: 12, trailing: 0))
                
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
                if step == 4 {
                    VStack(alignment: .leading, spacing: 20) {
                        VStack(alignment: .leading, spacing: 4) {
                            Text("SQUAD PROTOCOL")
                                .font(.system(size: 10, weight: .black))
                                .foregroundStyle(Brand.Color.accent)
                            Text("Join a global cohort to synchronize performance metrics and masterclass data.")
                                .font(.caption2)
                                .foregroundStyle(.secondary)
                        }
                        .padding(.horizontal)
                        
                        EliteSelectionGrid(items: [
                            EliteSelectionItem(id: "hypertrophy", title: "Titanium Hypertrophy", subtitle: "Mechanical tension focus. Build absolute mass.", icon: "dumbbell.fill", imageURL: "https://images.pexels.com/photos/1552242/pexels-photo-1552242.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2"),
                            EliteSelectionItem(id: "endurance", title: "Aero Engine", subtitle: "Metabolic conditioning & VO2 max optimization.", icon: "bolt.heart.fill", imageURL: "https://images.pexels.com/photos/1552252/pexels-photo-1552252.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2"),
                            EliteSelectionItem(id: "hybrid", title: "Rogue Hybrid", subtitle: "The ultimate athlete. Strength meets endurance.", icon: "shield.fill", imageURL: "https://images.pexels.com/photos/6456108/pexels-photo-6456108.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2"),
                            EliteSelectionItem(id: "longevity", title: "Vitality Protocol", subtitle: "Sustainable health and biomechanical preservation.", icon: "leaf.fill", imageURL: "https://images.pexels.com/photos/4056723/pexels-photo-4056723.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2")
                        ], selection: $squad)
                    }
                    .listRowBackground(Color.clear)
                    .listRowInsets(EdgeInsets())
                }
                if step == 5 {
                    VStack(alignment: .leading, spacing: 20) {
                        Text("MASTER ORIENTATION")
                            .font(.system(size: 10, weight: .black))
                            .foregroundStyle(Brand.Color.accent)
                            .padding(.horizontal)
                        
                        EliteSelectionGrid(items: [
                            EliteSelectionItem(id: "beginner", title: "Initiate", subtitle: "New to the protocol. Establishing base mechanics.", icon: "seedling.fill", imageURL: nil),
                            EliteSelectionItem(id: "intermediate", title: "Specialist", subtitle: "Consistent output. Refining force production.", icon: "gauge.with.needle.fill", imageURL: nil),
                            EliteSelectionItem(id: "advanced", title: "Elite Master", subtitle: "Peak performance. Optimizing neurological limits.", icon: "crown.fill", imageURL: nil)
                        ], selection: $experienceLevel)
                    }
                    .listRowBackground(Color.clear)
                    .listRowInsets(EdgeInsets())
                }
                if let err = errorMessage {
                    Section {
                        Text(err)
                            .foregroundStyle(.red)
                            .font(.caption)
                    }
                }
            }
            .scrollContentBackground(.hidden)
            .background {
                Brand.Color.background.ignoresSafeArea()
            }
            .navigationTitle("Onboarding")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    if step > 0 {
                        Button("Back") { step -= 1 }
                    }
                }
                ToolbarItem(placement: .confirmationAction) {
                    if step < 5 {
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

    private var currentStepTitle: String {
        switch step {
        case 0: return "Define the athlete profile"
        case 1: return "Lock in your body metrics"
        case 2: return "Set the outcome"
        case 3: return "Protect the constraints"
        case 4: return "Choose your squad protocol"
        default: return "Choose your mastery level"
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
        profile.experience_level = experienceLevel
        profile.motivational_driver = motivationalDriver
        do {
            try await ds.upsertProfile(profile)
            var onboarding = OnboardingRow()
            onboarding.completed_at = ISO8601DateFormatter().string(from: Date())
            onboarding.responses = [
                "goals": AnyCodable(value: goals as [String]), 
                "diet": AnyCodable(value: diet),
                "squad": AnyCodable(value: squad),
                "experience_level": AnyCodable(value: experienceLevel),
                "motivational_driver": AnyCodable(value: motivationalDriver)
            ]
            try await ds.upsertOnboarding(onboarding)
            await MainActor.run { onComplete?() }
        } catch {
            await MainActor.run { errorMessage = error.localizedDescription }
        }
    }
}
