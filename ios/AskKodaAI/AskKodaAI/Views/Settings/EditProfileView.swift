//
//  EditProfileView.swift
//  Koda AI
//
//  Edit profile fields; parity with web settings profile form.
//

import SwiftUI
import UIKit

struct EditProfileView: View {
    @EnvironmentObject var auth: SupabaseService
    @Environment(\.dismiss) private var dismiss
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
    @State private var saveSuccess = false
    @State private var loading = false

    private var dataService: KodaDataService? {
        guard let uid = auth.currentUserId else { return nil }
        return KodaDataService(client: auth.supabaseClient, userId: uid)
    }

    // MARK: - Validation

    private var validationError: String? {
        if let ageVal = Int(age), (ageVal < 1 || ageVal > 120) {
            return "Age must be between 1 and 120."
        }
        if !age.isEmpty, Int(age) == nil {
            return "Age must be a whole number."
        }
        let h = Double(heightCm.replacingOccurrences(of: ",", with: ".")) ?? 0
        if !heightCm.isEmpty, h <= 0 || h > 300 {
            return "Height must be between 1 and 300 cm."
        }
        let w = Double(weightKg.replacingOccurrences(of: ",", with: ".")) ?? 0
        if !weightKg.isEmpty, w <= 0 || w > 500 {
            return "Weight must be between 1 and 500 kg."
        }
        return nil
    }

    private struct ProfileOption: Identifiable {
        let id: String
        let label: String
    }

    private let sexOptions: [ProfileOption] = [
        ProfileOption(id: "male", label: "Male"),
        ProfileOption(id: "female", label: "Female"),
        ProfileOption(id: "other", label: "Other"),
    ]

    private let activityOptions: [ProfileOption] = [
        ProfileOption(id: "sedentary", label: "Sedentary"),
        ProfileOption(id: "light", label: "Light"),
        ProfileOption(id: "moderate", label: "Moderate"),
        ProfileOption(id: "active", label: "Active"),
    ]

    private let experienceOptions: [ProfileOption] = [
        ProfileOption(id: "beginner", label: "Beginner"),
        ProfileOption(id: "intermediate", label: "Intermediate"),
        ProfileOption(id: "advanced", label: "Advanced"),
    ]

    private let driverOptions: [ProfileOption] = [
        ProfileOption(id: "health", label: "Health"),
        ProfileOption(id: "performance", label: "Performance"),
        ProfileOption(id: "aesthetics", label: "Aesthetics"),
        ProfileOption(id: "competition", label: "Competition"),
    ]

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 18) {
                PremiumHeroCard(
                    title: displayName.isEmpty ? "Athlete Profile" : displayName,
                    subtitle: "Tune identity, performance targets, and motivators so Koda coaching adapts to who you are today.",
                    eyebrow: "Identity"
                ) {
                    HStack(spacing: 10) {
                        PremiumMetricPill(label: "Experience", value: experienceLevel.capitalized)
                        PremiumMetricPill(label: "Activity", value: activityLevel.capitalized)
                        PremiumMetricPill(label: "Driver", value: motivationalDriver.capitalized)
                    }
                }

                PremiumSectionHeader("Core Profile", eyebrow: "body metrics")
                PremiumRowCard {
                    VStack(spacing: 10) {
                        profileField("Display name", systemImage: "person.crop.circle", text: $displayName)
                        profileField("Age", systemImage: "calendar", text: $age, keyboard: .numberPad)
                        profileField("Height (cm)", systemImage: "ruler", text: $heightCm, keyboard: .decimalPad)
                        profileField("Weight (kg)", systemImage: "scalemass", text: $weightKg, keyboard: .decimalPad)
                    }
                }

                PremiumSectionHeader("Goals", eyebrow: "program intent")
                PremiumRowCard {
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Goals")
                            .font(.subheadline.weight(.bold))
                            .foregroundStyle(.white)
                        TextField("Build muscle, lose fat, improve endurance…", text: $goalsText, axis: .vertical)
                            .lineLimit(2...4)
                            .font(.body)
                            .foregroundStyle(.white)
                            .padding(12)
                            .background(
                                RoundedRectangle(cornerRadius: 12, style: .continuous)
                                    .fill(Brand.Color.surfaceRaised)
                                    .overlay(
                                        RoundedRectangle(cornerRadius: 12, style: .continuous)
                                            .stroke(Brand.Color.borderStrong, lineWidth: 1)
                                    )
                            )
                        Text("Separate goals with commas.")
                            .font(.caption)
                            .foregroundStyle(Brand.Color.muted)
                    }
                }

                PremiumSectionHeader("Personalization", eyebrow: "preferences")
                PremiumRowCard {
                    VStack(alignment: .leading, spacing: 14) {
                        optionGrid(title: "Sex", options: sexOptions, selection: $sex)
                        optionGrid(title: "Activity Level", options: activityOptions, selection: $activityLevel)
                        optionGrid(title: "Experience", options: experienceOptions, selection: $experienceLevel)
                        optionGrid(title: "Primary Driver", options: driverOptions, selection: $motivationalDriver)
                    }
                }

                if loading {
                    PremiumRowCard {
                        HStack(spacing: 10) {
                            ProgressView()
                            Text("Loading profile...")
                                .foregroundStyle(Brand.Color.muted)
                        }
                        .frame(maxWidth: .infinity, alignment: .leading)
                    }
                }

                if let err = validationError ?? errorMessage {
                    PremiumStateCard(
                        title: "Profile needs a quick fix",
                        detail: err,
                        symbol: "exclamationmark.triangle.fill"
                    )
                }

                if saveSuccess {
                    PremiumStateCard(
                        title: "Profile saved",
                        detail: "Koda updated your coaching profile successfully.",
                        symbol: "checkmark.circle.fill"
                    )
                }

                HStack(spacing: 10) {
                    Button {
                        Task { await save() }
                    } label: {
                        HStack(spacing: 6) {
                            if saving {
                                ProgressView().scaleEffect(0.75).tint(.black)
                            }
                            Text(saving ? "Saving…" : "Save profile")
                        }
                    }
                    .buttonStyle(PremiumActionButtonStyle(filled: true))
                    .disabled(saving || validationError != nil || loading)

                    Button("Cancel") { dismiss() }
                        .buttonStyle(PremiumActionButtonStyle(filled: false))
                        .disabled(saving)
                }
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 18)
        }
        .fnBackground()
        .navigationTitle("Edit profile")
        .navigationBarTitleDisplayMode(.inline)
        .task { await load() }
    }

    private func profileField(_ title: String, systemImage: String, text: Binding<String>, keyboard: UIKeyboardType = .default) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(title)
                .font(.caption.weight(.bold))
                .foregroundStyle(Brand.Color.muted)
            HStack(spacing: 10) {
                Image(systemName: systemImage)
                    .foregroundStyle(Brand.Color.accent)
                TextField(title, text: text)
                    .keyboardType(keyboard)
                    .textInputAutocapitalization(.words)
                    .autocorrectionDisabled()
                    .foregroundStyle(.white)
            }
            .padding(12)
            .background(
                RoundedRectangle(cornerRadius: 12, style: .continuous)
                    .fill(Brand.Color.surfaceRaised)
                    .overlay(
                        RoundedRectangle(cornerRadius: 12, style: .continuous)
                            .stroke(Brand.Color.borderStrong, lineWidth: 1)
                    )
            )
        }
    }

    private func optionGrid(title: String, options: [ProfileOption], selection: Binding<String>) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(title)
                .font(.caption.weight(.bold))
                .foregroundStyle(Brand.Color.muted)
            LazyVGrid(columns: [GridItem(.adaptive(minimum: 110), spacing: 8)], spacing: 8) {
                ForEach(options) { option in
                    let active = selection.wrappedValue == option.id
                    Button {
                        selection.wrappedValue = option.id
                        HapticEngine.selection()
                    } label: {
                        Text(option.label)
                            .font(.caption.weight(.bold))
                            .foregroundStyle(active ? .black : .white)
                            .padding(.horizontal, 10)
                            .padding(.vertical, 9)
                            .frame(maxWidth: .infinity)
                            .background(
                                Capsule()
                                    .fill(active ? Brand.Color.accent : Brand.Color.surfaceRaised)
                                    .overlay(Capsule().stroke(Brand.Color.borderStrong, lineWidth: 1))
                            )
                    }
                    .buttonStyle(.plain)
                }
            }
        }
    }

    private func load() async {
        guard let ds = dataService else { return }
        loading = true
        defer { loading = false }
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
        } catch {
            await MainActor.run { errorMessage = error.localizedDescription }
        }
    }

    private func save() async {
        guard let ds = dataService else { return }
        guard validationError == nil else { return }
        saving = true
        errorMessage = nil
        saveSuccess = false
        defer { saving = false }
        do {
            var p = try await ds.fetchProfile() ?? UserProfile()
            p.display_name = displayName.isEmpty ? nil : displayName
            p.age = age.isEmpty ? nil : Int(age)
            p.sex = sex
            p.height_cm = heightCm.isEmpty ? nil : Double(heightCm.replacingOccurrences(of: ",", with: "."))
            p.weight_kg = weightKg.isEmpty ? nil : Double(weightKg.replacingOccurrences(of: ",", with: "."))
            p.goals = goalsText.split(separator: ",").map { String($0.trimmingCharacters(in: .whitespaces)) }.filter { !$0.isEmpty }
            if p.goals?.isEmpty == true { p.goals = nil }
            p.activity_level = activityLevel
            p.experience_level = experienceLevel
            p.motivational_driver = motivationalDriver
            try await ds.upsertProfile(p)
            await MainActor.run {
                saveSuccess = true
                HapticEngine.notification(.success)
            }
            try? await Task.sleep(nanoseconds: 1_200_000_000)
            await MainActor.run { dismiss() }
        } catch {
            await MainActor.run { errorMessage = error.localizedDescription }
        }
    }
}
