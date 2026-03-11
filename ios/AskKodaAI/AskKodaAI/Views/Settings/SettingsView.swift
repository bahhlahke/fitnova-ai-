//
//  SettingsView.swift
//  Koda AI
//
//  Profile, export, sign out. Parity with web /settings.
//

import SwiftUI

struct SettingsView: View {
    @EnvironmentObject var auth: SupabaseService
    @State private var profile: UserProfile?
    @State private var loading = false
    @State private var errorMessage: String?
    @State private var showSignOutConfirm = false
    @State private var showExportSheet = false
    @State private var exportData: Data?
    @State private var exportFormat = "json"

    private var dataService: KodaDataService? {
        guard let uid = auth.currentUserId else { return nil }
        return KodaDataService(client: auth.supabaseClient, userId: uid)
    }

    private var api: KodaAPIService {
        KodaAPIService(getAccessToken: { auth.accessToken })
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 18) {
                    PremiumHeroCard(
                        title: profile?.display_name ?? "Athlete settings",
                        subtitle: "Manage account details, connected systems, exports, and premium surfaces from one command center.",
                        eyebrow: "System"
                    ) {
                        HStack(spacing: 10) {
                            PremiumMetricPill(label: "Plan", value: profile?.activity_level ?? "Titanium")
                            PremiumMetricPill(label: "Tier", value: (profile?.subscription_status ?? "pro").capitalized)
                        }
                    }

                    PremiumRowCard {
                        VStack(alignment: .leading, spacing: 12) {
                            Text("Profile")
                                .font(.headline)
                                .foregroundStyle(.white)
                            if loading && profile == nil {
                                HStack {
                                    ProgressView()
                                    Text("Loading profile...")
                                        .foregroundStyle(Brand.Color.muted)
                                }
                            } else if let p = profile {
                                row("Email", p.email)
                                row("Age", p.age.map(String.init))
                                row("Height", p.height_cm.map { "\($0.formatted(.number.precision(.fractionLength(0)))) cm" })
                                row("Weight", p.weight_kg.map { "\($0.formatted(.number.precision(.fractionLength(1)))) kg" })
                            } else {
                                Text("Profile data is unavailable.")
                                    .foregroundStyle(Brand.Color.muted)
                            }
                        }
                    }

                    PremiumRowCard {
                        VStack(spacing: 0) {
                            navRow("Edit profile", systemImage: "person.crop.circle") { EditProfileView() }
                            divider
                            navRow("Badges", systemImage: "sparkles.rectangle.stack") { BadgesView() }
                        }
                    }

                    PremiumRowCard {
                        VStack(alignment: .leading, spacing: 0) {
                            Text("Data & devices")
                                .font(.headline)
                                .foregroundStyle(.white)
                                .padding(.bottom, 12)
                            navRow("Vitals", systemImage: "waveform.path.ecg") { VitalsView() }
                            divider
                            navRow("Integrations", systemImage: "link") { IntegrationsView() }
                            divider
                            HStack {
                                Label("Export format", systemImage: "doc.text")
                                    .foregroundStyle(.white)
                                Spacer()
                                Picker("Format", selection: $exportFormat) {
                                    Text("JSON").tag("json")
                                    Text("CSV").tag("csv")
                                }
                                .pickerStyle(.segmented)
                                .frame(width: 110)
                            }
                            .padding(.vertical, 10)
                            divider
                            Button {
                                Task { await export() }
                            } label: {
                                HStack {
                                    Label("Export my data", systemImage: "square.and.arrow.up")
                                    Spacer()
                                }
                                .padding(.vertical, 14)
                            }
                            .disabled(loading)
                            .foregroundStyle(.white)
                        }
                    }

                    PremiumRowCard {
                        VStack(alignment: .leading, spacing: 0) {
                            Text("Account")
                                .font(.headline)
                                .foregroundStyle(.white)
                                .padding(.bottom, 12)
                            navRow("Complete profile", systemImage: "list.clipboard") { OnboardingView() }
                            divider
                            navRow("Pricing", systemImage: "creditcard") { PricingView() }
                        }
                    }

                    Button(role: .destructive) {
                        showSignOutConfirm = true
                    } label: {
                        Text("Sign out")
                    }
                    .buttonStyle(PremiumActionButtonStyle(filled: false))

                    if let err = errorMessage {
                        PremiumStateCard(title: "Something needs attention", detail: err, symbol: "exclamationmark.triangle.fill")
                    }
                }
                .padding(.horizontal, 16)
                .padding(.vertical, 20)
            }
            .fnBackground()
            .navigationTitle("Settings")
            .refreshable { await loadProfile() }
            .task { await loadProfile() }
            .confirmationDialog("Sign out?", isPresented: $showSignOutConfirm) {
                Button("Sign out", role: .destructive) { Task { try? await auth.signOut() } }
                Button("Cancel", role: .cancel) { }
            } message: {
                Text("You will need to sign in again to use the app.")
            }
            .sheet(isPresented: $showExportSheet) {
                if let data = exportData {
                    ShareSheet(exportData: data, format: exportFormat)
                }
            }
        }
    }

    private func row(_ label: String, _ value: String?) -> some View {
        guard let value, !value.isEmpty else {
            return AnyView(EmptyView())
        }
        return AnyView(
            HStack {
                Text(label)
                    .foregroundStyle(Brand.Color.muted)
                Spacer()
                Text(value)
                    .foregroundStyle(.white)
            }
            .font(.subheadline)
        )
    }

    private func navRow<Destination: View>(_ title: String, systemImage: String, @ViewBuilder destination: () -> Destination) -> some View {
        NavigationLink {
            destination()
        } label: {
            HStack {
                Label(title, systemImage: systemImage)
                Spacer()
                Image(systemName: "chevron.right")
                    .font(.caption.weight(.bold))
                    .foregroundStyle(Brand.Color.muted)
            }
            .padding(.vertical, 14)
            .foregroundStyle(.white)
        }
    }

    private var divider: some View {
        HStack {
            Rectangle()
                .fill(Brand.Color.border)
                .frame(height: 1)
        }
    }

    private func loadProfile() async {
        guard let ds = dataService else { return }
        loading = true
        defer { loading = false }
        do {
            let p = try await ds.fetchProfile()
            await MainActor.run { profile = p }
        } catch {
            await MainActor.run { errorMessage = error.localizedDescription }
        }
    }

    private func export() async {
        errorMessage = nil
        do {
            let data = try await api.exportData(format: exportFormat)
            await MainActor.run {
                exportData = data
                showExportSheet = true
            }
        } catch {
            await MainActor.run { errorMessage = error.localizedDescription }
        }
    }
}

// Share sheet for exporting data (writes to temp file so user can Save to Files).
struct ShareSheet: UIViewControllerRepresentable {
    let exportData: Data
    let format: String

    func makeUIViewController(context: Context) -> UIActivityViewController {
        let ext = format == "csv" ? "csv" : "json"
        let fileName = "koda-export-\(Date().timeIntervalSince1970).\(ext)"
        let url = FileManager.default.temporaryDirectory.appendingPathComponent(fileName)
        try? exportData.write(to: url)
        return UIActivityViewController(activityItems: [url], applicationActivities: nil)
    }

    func updateUIViewController(_ uiViewController: UIActivityViewController, context: Context) {}
}
