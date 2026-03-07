//
//  IntegrationsView.swift
//  Koda AI
//
//  Integrations: Apple Health (HealthKit sync), Whoop (open web connect).
//

import SwiftUI

struct IntegrationsView: View {
    @EnvironmentObject var auth: SupabaseService
    @StateObject private var healthKit = HealthKitService.shared
    @State private var errorMessage: String?
    @State private var showAuthAlert = false

    private var dataService: KodaDataService? {
        guard let uid = auth.currentUserId else { return nil }
        return KodaDataService(client: auth.supabaseClient, userId: uid)
    }

    private let whoopConnectURL: URL? = {
        guard let base = Bundle.main.object(forInfoDictionaryKey: "API_BASE_URL") as? String else { return nil }
        return URL(string: "\(base)/api/v1/integrations/whoop/connect")
    }()

    var body: some View {
        NavigationStack {
            List {
                Section("Apple Health") {
                    if !healthKit.isAvailable {
                        Text("Health data is not available on this device.")
                            .foregroundStyle(.secondary)
                    } else {
                        HStack {
                            Label("Apple Health / Apple Watch", systemImage: "heart.fill")
                            Spacer()
                            if healthKit.isSyncing {
                                ProgressView()
                            } else {
                                Button("Sync") {
                                    Task { await requestAuthAndSync() }
                                }
                                .disabled(healthKit.isSyncing)
                            }
                        }
                        if let err = healthKit.syncError {
                            Text(err)
                                .font(.caption)
                                .foregroundStyle(.red)
                        }
                        if let d = healthKit.lastSyncDate {
                            Text("Last sync: \(d.formatted(date: .abbreviated, time: .shortened))")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                        Text("Syncs weight → Progress, sleep → Check-in for the last 90 days.")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                }
                Section("Wearables") {
                    if let url = whoopConnectURL {
                        Link(destination: url) {
                            HStack {
                                Label("WHOOP", systemImage: "bolt.fill")
                                Spacer()
                                Image(systemName: "arrow.up.right")
                            }
                        }
                        Text("Opens in browser to connect your WHOOP account.")
                            .font(.caption)
                            .foregroundStyle(.secondary)
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
            .navigationTitle("Integrations")
            .alert("Apple Health Access", isPresented: $showAuthAlert) {
                Button("OK") { }
            } message: {
                Text("Allow read access for Weight, Sleep, and Step Count so we can sync to your Koda profile.")
            }
        }
    }

    private func requestAuthAndSync() async {
        guard let ds = dataService else {
            errorMessage = "Sign in to sync."
            return
        }
        do {
            try await healthKit.requestAuthorization()
            await healthKit.syncToKoda(dataService: ds)
        } catch {
            await MainActor.run {
                errorMessage = error.localizedDescription
                showAuthAlert = true
            }
        }
    }
}
