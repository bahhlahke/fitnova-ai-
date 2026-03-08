//
//  IntegrationsView.swift
//  Koda AI
//
//  Integrations: Apple Health (HealthKit sync), Whoop (open web connect), Spotify (OAuth link).
//

import SwiftUI
import UIKit
import Supabase
import Auth

struct IntegrationsView: View {
    @EnvironmentObject var auth: SupabaseService
    @StateObject private var healthKit = HealthKitService.shared
    @State private var errorMessage: String?
    @State private var showAuthAlert = false
    @State private var spotifyConnected = false
    @State private var spotifyLoading = false
    @State private var spotifyConnectError: String?

    private var dataService: KodaDataService? {
        guard let uid = auth.currentUserId else { return nil }
        return KodaDataService(client: auth.supabaseClient, userId: uid)
    }

    private var api: KodaAPIService {
        KodaAPIService(getAccessToken: { await auth.accessToken })
    }

    private let whoopConnectURL: URL? = {
        guard let base = Bundle.main.object(forInfoDictionaryKey: "API_BASE_URL") as? String else { return nil }
        return URL(string: "\(base)/api/v1/integrations/whoop/connect")
    }()

    private var integrationsWebURL: URL? {
        guard let base = Bundle.main.object(forInfoDictionaryKey: "API_BASE_URL") as? String else { return nil }
        return URL(string: base.hasSuffix("/") ? "\(base)integrations" : "\(base)/integrations")
    }

    var body: some View {
        NavigationStack {
            List {
                Section("Music") {
                    HStack {
                        Label("Spotify", systemImage: "music.note")
                        Spacer()
                        if spotifyLoading {
                            ProgressView()
                        } else if spotifyConnected {
                            Text("Connected")
                                .font(.caption)
                                .foregroundStyle(.green)
                        } else {
                            Button("Connect Spotify") {
                                Task { await connectSpotify() }
                            }
                            .font(.caption)
                        }
                    }
                    if let err = spotifyConnectError {
                        Text(err)
                            .font(.caption)
                            .foregroundStyle(.red)
                    }
                    Text("Link Spotify for in-app music during guided workouts (web). Connect in browser if needed.")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
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
            .task { await checkSpotifyConnection() }
            .refreshable { await checkSpotifyConnection() }
            .alert("Apple Health Access", isPresented: $showAuthAlert) {
                Button("OK") { }
            } message: {
                Text("Allow read access for Weight, Sleep, and Step Count so we can sync to your Koda profile.")
            }
        }
    }

    private func checkSpotifyConnection() async {
        spotifyConnectError = nil
        do {
            let token = try await api.spotifyToken()
            await MainActor.run { spotifyConnected = (token != nil && !(token?.isEmpty ?? true)) }
        } catch {
            await MainActor.run { spotifyConnected = false }
        }
    }

    private func connectSpotify() async {
        spotifyLoading = true
        spotifyConnectError = nil
        defer { spotifyLoading = false }
        do {
            try await auth.supabaseClient.auth.linkIdentity(provider: .spotify)
            await auth.refreshSession()
            await checkSpotifyConnection()
        } catch {
            await MainActor.run {
                spotifyConnectError = error.localizedDescription
                if let url = integrationsWebURL {
                    UIApplication.shared.open(url)
                }
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
