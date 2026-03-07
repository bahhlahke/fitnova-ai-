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
        KodaAPIService(getAccessToken: { await auth.accessToken })
    }

    var body: some View {
        NavigationStack {
            List {
                Section("Profile") {
                    if loading && profile == nil {
                        HStack {
                            ProgressView()
                            Text("Loading…")
                        }
                    } else if let p = profile {
                        if let n = p.display_name { row("Name", n) }
                        if let e = p.email { row("Email", e) }
                        if let a = p.age { row("Age", "\(a)") }
                        if let s = p.sex { row("Sex", s) }
                        if let h = p.height_cm { row("Height", "\(h) cm") }
                        if let w = p.weight_kg { row("Weight", "\(w) kg") }
                    }
                }
                Section("Data") {
                    NavigationLink("Vitals") { VitalsView() }
                    NavigationLink("Integrations") { IntegrationsView() }
                    Button("Export my data") {
                        Task { await export() }
                    }
                    .disabled(loading)
                }
                Section("Account") {
                    NavigationLink("Complete profile (onboarding)") { OnboardingView() }
                    NavigationLink("Pricing") { PricingView() }
                }
                Section {
                    Button("Sign out", role: .destructive) {
                        showSignOutConfirm = true
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

    private func row(_ label: String, _ value: String) -> some View {
        HStack {
            Text(label)
            Spacer()
            Text(value)
                .foregroundStyle(.secondary)
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
