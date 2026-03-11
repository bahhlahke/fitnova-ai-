//
//  OnboardingView.swift
//  Koda AI
//
//  Multi-step onboarding: premium card UI for steps 0-3, EliteSelectionGrid for 4-5.
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

    // MARK: - Body

    var body: some View {
        NavigationStack {
            ZStack {
                Brand.Color.background.ignoresSafeArea()

                ScrollView {
                    VStack(alignment: .leading, spacing: 24) {
                        // Logo
                        HStack {
                            Spacer()
                            Image("KodaLogo")
                                .resizable()
                                .scaledToFit()
                                .frame(height: 40)
                            Spacer()
                        }
                        .padding(.top, 8)

                        // Header
                        VStack(alignment: .leading, spacing: 8) {
                            PremiumSectionHeader(
                                currentStepTitle,
                                eyebrow: "STEP \(step + 1) OF 6",
                                subtitle: currentStepSubtitle
                            )
                            ProgressView(value: Double(step + 1), total: 6)
                                .tint(Brand.Color.accent)
                                .animation(.spring(response: 0.5), value: step)
                        }
                        .padding(.horizontal, 20)

                        // Step content
                        Group {
                            switch step {
                            case 0: step0
                            case 1: step1
                            case 2: step2
                            case 3: step3
                            case 4: step4
                            default: step5
                            }
                        }
                        .transition(.asymmetric(
                            insertion: .move(edge: .trailing).combined(with: .opacity),
                            removal: .move(edge: .leading).combined(with: .opacity)
                        ))
                        .animation(.spring(response: 0.4, dampingFraction: 0.85), value: step)

                        if let err = errorMessage {
                            HStack(spacing: 8) {
                                Image(systemName: "exclamationmark.triangle.fill")
                                    .foregroundStyle(Brand.Color.danger)
                                Text(err)
                                    .font(.caption)
                                    .foregroundStyle(Brand.Color.danger)
                            }
                            .padding(.horizontal, 20)
                        }

                        // Navigation buttons
                        HStack(spacing: 12) {
                            if step > 0 {
                                Button("Back") {
                                    HapticEngine.impact(.light)
                                    step -= 1
                                }
                                .buttonStyle(PremiumActionButtonStyle(filled: false))
                            }

                            if step < 5 {
                                Button("Continue") {
                                    HapticEngine.impact(.light)
                                    step += 1
                                }
                                .buttonStyle(PremiumActionButtonStyle(filled: true))
                                .disabled(continueDisabled)
                            } else {
                                Button(saving ? "Saving…" : "Activate Protocol") {
                                    HapticEngine.notification(.success)
                                    Task { await save() }
                                }
                                .buttonStyle(PremiumActionButtonStyle(filled: true))
                                .disabled(saving)
                            }
                        }
                        .padding(.horizontal, 20)
                        .padding(.bottom, 40)
                    }
                }
            }
            .navigationBarHidden(true)
        }
    }

    // MARK: - Step 0: About you

    private var step0: some View {
        VStack(spacing: 16) {
            premiumField(placeholder: "Full name", text: $name, icon: "person.fill")

            premiumField(placeholder: "Age", text: $age, icon: "calendar", keyboard: .numberPad)

            VStack(alignment: .leading, spacing: 8) {
                fieldLabel("Biological sex")
                HStack(spacing: 0) {
                    ForEach([("Male", "male"), ("Female", "female"), ("Other", "other")], id: \.1) { label, tag in
                        Button(label) {
                            HapticEngine.selection()
                            sex = tag
                        }
                        .font(.system(size: 14, weight: .semibold))
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 14)
                        .background(sex == tag ? Brand.Color.accent : Brand.Color.surfaceRaised)
                        .foregroundStyle(sex == tag ? Color.black : Color.white)
                    }
                }
                .clipShape(RoundedRectangle(cornerRadius: 14))
                .overlay(RoundedRectangle(cornerRadius: 14).stroke(Brand.Color.borderStrong))
            }
        }
        .padding(.horizontal, 20)
    }

    // MARK: - Step 1: Body metrics

    private var step1: some View {
        VStack(spacing: 16) {
            premiumField(placeholder: "Height (cm)", text: $heightCm, icon: "ruler", keyboard: .decimalPad)
            premiumField(placeholder: "Weight (kg)", text: $weightKg, icon: "scalemass.fill", keyboard: .decimalPad)
        }
        .padding(.horizontal, 20)
    }

    // MARK: - Step 2: Goals

    private var step2: some View {
        VStack(alignment: .leading, spacing: 16) {
            VStack(alignment: .leading, spacing: 8) {
                fieldLabel("Training goals")
                Text("Select all that apply")
                    .font(.caption)
                    .foregroundStyle(Brand.Color.muted)

                let goalOptions = ["Build muscle", "Lose fat", "Improve endurance", "Increase strength", "Longevity", "Athletic performance"]
                LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 10) {
                    ForEach(goalOptions, id: \.self) { option in
                        let selected = goals.contains(option)
                        Button {
                            HapticEngine.selection()
                            if selected {
                                goals.removeAll { $0 == option }
                            } else {
                                goals.append(option)
                            }
                        } label: {
                            HStack(spacing: 6) {
                                Image(systemName: selected ? "checkmark.circle.fill" : "circle")
                                    .foregroundStyle(selected ? Brand.Color.accent : Brand.Color.muted)
                                Text(option)
                                    .font(.system(size: 13, weight: .semibold))
                                    .foregroundStyle(.white)
                                    .lineLimit(1)
                                    .minimumScaleFactor(0.8)
                            }
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .padding(.horizontal, 14)
                            .padding(.vertical, 12)
                            .background(
                                RoundedRectangle(cornerRadius: 12)
                                    .fill(selected ? Brand.Color.accent.opacity(0.12) : Brand.Color.surfaceRaised)
                                    .overlay(
                                        RoundedRectangle(cornerRadius: 12)
                                            .stroke(selected ? Brand.Color.accent : Brand.Color.borderStrong, lineWidth: selected ? 1.5 : 1)
                                    )
                            )
                        }
                        .buttonStyle(.plain)
                    }
                }
            }
        }
        .padding(.horizontal, 20)
    }

    // MARK: - Step 3: Constraints

    private var step3: some View {
        VStack(spacing: 16) {
            VStack(alignment: .leading, spacing: 8) {
                fieldLabel("Injuries / limitations")
                ZStack(alignment: .topLeading) {
                    if injuries.isEmpty {
                        Text("e.g. lower back pain, left knee injury")
                            .foregroundStyle(Brand.Color.muted)
                            .font(.subheadline)
                            .padding(.top, 14)
                            .padding(.leading, 4)
                            .allowsHitTesting(false)
                    }
                    TextEditor(text: $injuries)
                        .font(.subheadline)
                        .foregroundStyle(.white)
                        .frame(minHeight: 80)
                        .scrollContentBackground(.hidden)
                }
                .padding(14)
                .background(Brand.Color.surfaceRaised)
                .clipShape(RoundedRectangle(cornerRadius: 14))
                .overlay(RoundedRectangle(cornerRadius: 14).stroke(Brand.Color.borderStrong))
            }

            VStack(alignment: .leading, spacing: 8) {
                fieldLabel("Dietary preference")
                let diets: [(String, String, String)] = [
                    ("Balanced", "balanced", "fork.knife"),
                    ("Low carb", "low_carb", "minus.circle"),
                    ("High protein", "high_protein", "bolt.fill"),
                    ("Vegetarian", "vegetarian", "leaf.fill"),
                ]
                LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 10) {
                    ForEach(diets, id: \.1) { label, tag, icon in
                        Button {
                            HapticEngine.selection()
                            diet = tag
                        } label: {
                            HStack(spacing: 8) {
                                Image(systemName: icon)
                                    .foregroundStyle(diet == tag ? Brand.Color.accent : Brand.Color.muted)
                                Text(label)
                                    .font(.system(size: 13, weight: .semibold))
                                    .foregroundStyle(.white)
                            }
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .padding(.horizontal, 14)
                            .padding(.vertical, 14)
                            .background(
                                RoundedRectangle(cornerRadius: 12)
                                    .fill(diet == tag ? Brand.Color.accent.opacity(0.12) : Brand.Color.surfaceRaised)
                                    .overlay(
                                        RoundedRectangle(cornerRadius: 12)
                                            .stroke(diet == tag ? Brand.Color.accent : Brand.Color.borderStrong, lineWidth: diet == tag ? 1.5 : 1)
                                    )
                            )
                        }
                        .buttonStyle(.plain)
                    }
                }
            }

            VStack(alignment: .leading, spacing: 8) {
                fieldLabel("What drives you")
                let drivers: [(String, String, String)] = [
                    ("Health & longevity", "health", "heart.fill"),
                    ("Peak performance", "performance", "flame.fill"),
                    ("Aesthetics", "aesthetics", "sparkles"),
                    ("Competition", "competition", "trophy.fill"),
                ]
                LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 10) {
                    ForEach(drivers, id: \.1) { label, tag, icon in
                        Button {
                            HapticEngine.selection()
                            motivationalDriver = tag
                        } label: {
                            HStack(spacing: 8) {
                                Image(systemName: icon)
                                    .foregroundStyle(motivationalDriver == tag ? Brand.Color.accent : Brand.Color.muted)
                                Text(label)
                                    .font(.system(size: 13, weight: .semibold))
                                    .foregroundStyle(.white)
                            }
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .padding(.horizontal, 14)
                            .padding(.vertical, 14)
                            .background(
                                RoundedRectangle(cornerRadius: 12)
                                    .fill(motivationalDriver == tag ? Brand.Color.accent.opacity(0.12) : Brand.Color.surfaceRaised)
                                    .overlay(
                                        RoundedRectangle(cornerRadius: 12)
                                            .stroke(motivationalDriver == tag ? Brand.Color.accent : Brand.Color.borderStrong, lineWidth: motivationalDriver == tag ? 1.5 : 1)
                                    )
                            )
                        }
                        .buttonStyle(.plain)
                    }
                }
            }
        }
        .padding(.horizontal, 20)
    }

    // MARK: - Step 4: Squad

    private var step4: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Join a global cohort to synchronize performance metrics.")
                .font(.caption)
                .foregroundStyle(Brand.Color.muted)
                .padding(.horizontal, 20)

            EliteSelectionGrid(items: [
                EliteSelectionItem(id: "hypertrophy", title: "Titanium Hypertrophy", subtitle: "Mechanical tension focus. Build absolute mass.", icon: "dumbbell.fill", imageURL: "https://images.pexels.com/photos/1552242/pexels-photo-1552242.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2"),
                EliteSelectionItem(id: "endurance", title: "Aero Engine", subtitle: "Metabolic conditioning & VO2 max optimization.", icon: "bolt.heart.fill", imageURL: "https://images.pexels.com/photos/1552252/pexels-photo-1552252.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2"),
                EliteSelectionItem(id: "hybrid", title: "Rogue Hybrid", subtitle: "The ultimate athlete. Strength meets endurance.", icon: "shield.fill", imageURL: "https://images.pexels.com/photos/6456108/pexels-photo-6456108.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2"),
                EliteSelectionItem(id: "longevity", title: "Vitality Protocol", subtitle: "Sustainable health and biomechanical preservation.", icon: "leaf.fill", imageURL: "https://images.pexels.com/photos/4056723/pexels-photo-4056723.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2")
            ], selection: $squad)
        }
    }

    // MARK: - Step 5: Mastery level

    private var step5: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Your current training orientation calibrates plan intensity and periodisation.")
                .font(.caption)
                .foregroundStyle(Brand.Color.muted)
                .padding(.horizontal, 20)

            EliteSelectionGrid(items: [
                EliteSelectionItem(id: "beginner", title: "Initiate", subtitle: "New to the protocol. Establishing base mechanics.", icon: "seedling.fill", imageURL: nil),
                EliteSelectionItem(id: "intermediate", title: "Specialist", subtitle: "Consistent output. Refining force production.", icon: "gauge.with.needle.fill", imageURL: nil),
                EliteSelectionItem(id: "advanced", title: "Elite Master", subtitle: "Peak performance. Optimizing neurological limits.", icon: "crown.fill", imageURL: nil)
            ], selection: $experienceLevel)
        }
    }

    // MARK: - Helpers

    private var continueDisabled: Bool {
        switch step {
        case 0:
            let ageVal = Int(age) ?? 0
            return name.trimmingCharacters(in: .whitespaces).isEmpty || ageVal <= 0 || ageVal > 120
        case 1:
            let h = Double(heightCm) ?? 0, w = Double(weightKg) ?? 0
            return h <= 0 || w <= 0
        default: return false
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

    private var currentStepSubtitle: String {
        switch step {
        case 0: return "Koda personalises every plan to your baseline."
        case 1: return "Precise metrics unlock accurate nutrition and load targets."
        case 2: return "Define what winning looks like for you."
        case 3: return "Koda protects these limits in every plan it generates."
        case 4: return "Your squad synchronises training philosophy and benchmarks."
        default: return "Calibrates periodisation logic and progression speed."
        }
    }

    private func fieldLabel(_ text: String) -> some View {
        Text(text.uppercased())
            .font(.system(size: 10, weight: .bold, design: .monospaced))
            .tracking(0.8)
            .foregroundStyle(Brand.Color.muted)
    }

    private func premiumField(placeholder: String, text: Binding<String>, icon: String, keyboard: UIKeyboardType = .default) -> some View {
        HStack(spacing: 12) {
            Image(systemName: icon)
                .frame(width: 20)
                .foregroundStyle(Brand.Color.accent)
            TextField(placeholder, text: text)
                .keyboardType(keyboard)
                .foregroundStyle(.white)
                .tint(Brand.Color.accent)
        }
        .padding(16)
        .background(Brand.Color.surfaceRaised)
        .clipShape(RoundedRectangle(cornerRadius: 14))
        .overlay(RoundedRectangle(cornerRadius: 14).stroke(Brand.Color.borderStrong))
    }

    // MARK: - Save

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
        profile.activity_level = squad
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
