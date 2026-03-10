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
    @StateObject private var spotify = SpotifyService.shared
    @State private var errorMessage: String?
    @State private var showAuthAlert = false
    @State private var spotifyConnectError: String?

    private var dataService: KodaDataService? {
        guard let uid = auth.currentUserId else { return nil }
        return KodaDataService(client: auth.supabaseClient, userId: uid)
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
            Group {
                if DebugUX.isDemoMode {
                    demoView
                } else {
                    liveView
                }
            }
            .navigationTitle("Integrations")
            .task { await refreshIntegrations() }
            .refreshable { await refreshIntegrations() }
            .alert("Apple Health Access", isPresented: $showAuthAlert) {
                Button("OK") { }
            } message: {
                Text("Allow read access for Weight, Sleep, and Step Count so Koda can keep your progress, check-ins, and wearable signal timeline current.")
            }
            .onReceive(NotificationCenter.default.publisher(for: NSNotification.Name("AppEnteredForeground"))) { _ in
                Task { await refreshIntegrations() }
            }
        }
    }

    private var demoView: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 18) {
                PremiumHeroCard(
                    title: "Connected systems, staged for premium review.",
                    subtitle: "Simulator mode shows believable device posture without depending on real HealthKit or Spotify accounts.",
                    eyebrow: "Demo"
                ) {
                    HStack(spacing: 10) {
                        PremiumMetricPill(label: "Spotify", value: "Connected")
                        PremiumMetricPill(label: "Health", value: "Synced")
                    }
                }

                PremiumRowCard {
                    VStack(alignment: .leading, spacing: 12) {
                        Label("Spotify", systemImage: "music.note")
                            .font(.headline)
                            .foregroundStyle(.white)
                        Text("Playback controls are staged and ready. Koda can steer the active device during guided work.")
                            .foregroundStyle(Brand.Color.muted)
                        SpotifyPlayerView(compact: false)
                            .frame(height: 96)
                    }
                }

                PremiumRowCard {
                    VStack(alignment: .leading, spacing: 12) {
                        Label("Apple Health / Apple Watch", systemImage: "heart.fill")
                            .font(.headline)
                            .foregroundStyle(.white)
                        Text("Last sync: today at 6:42 AM. Weight, sleep, and steps are staged into the coaching timeline.")
                            .foregroundStyle(Brand.Color.muted)
                        HStack(spacing: 10) {
                            PremiumMetricPill(label: "Sleep", value: "7.4h")
                            PremiumMetricPill(label: "Steps", value: "10.8k")
                        }
                    }
                }

                PremiumRowCard {
                    VStack(alignment: .leading, spacing: 12) {
                        Label("WHOOP", systemImage: "bolt.fill")
                            .font(.headline)
                            .foregroundStyle(.white)
                        Text("Browser handoff remains available in production. Simulator audit mode keeps this surface in a polished placeholder state.")
                            .foregroundStyle(Brand.Color.muted)
                    }
                }
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 20)
        }
        .fnBackground()
    }

    private var liveView: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 18) {
                PremiumHeroCard(
                    title: "Connected signals power smarter coaching.",
                    subtitle: "Link Spotify for in-workout music control and Apple Health for weight, sleep, and step data.",
                    eyebrow: "Integrations"
                ) {
                    HStack(spacing: 10) {
                        PremiumMetricPill(label: "Spotify", value: spotify.isConnected ? "Connected" : "Not linked")
                        PremiumMetricPill(label: "Health", value: healthKit.lastSyncDate != nil ? "Synced" : "Not synced")
                    }
                }

                // Spotify
                PremiumRowCard {
                    VStack(alignment: .leading, spacing: 14) {
                        HStack {
                            Label("Spotify", systemImage: "music.note")
                                .font(.headline)
                                .foregroundStyle(.white)
                            Spacer()
                            if spotify.isLoading {
                                ProgressView().tint(Brand.Color.accent)
                            } else if spotify.isConnected {
                                Label("Connected", systemImage: "checkmark.circle.fill")
                                    .font(.caption.weight(.semibold))
                                    .foregroundStyle(Brand.Color.success)
                            }
                        }

                        if spotify.isConnected {
                            SpotifyPlayerView(compact: false)
                                .frame(height: 80)
                        } else {
                            Text("Connect your Spotify account to enable play, pause, and skip controls during guided workouts.")
                                .font(.subheadline)
                                .foregroundStyle(Brand.Color.muted)
                                .fixedSize(horizontal: false, vertical: true)

                            if let err = spotifyConnectError {
                                Label(err, systemImage: "exclamationmark.triangle.fill")
                                    .font(.caption)
                                    .foregroundStyle(Brand.Color.danger)
                            }

                            Button("Connect Spotify") {
                                Task { await connectSpotify() }
                            }
                            .buttonStyle(PremiumActionButtonStyle())
                        }
                    }
                }

                // Apple Health
                PremiumRowCard {
                    VStack(alignment: .leading, spacing: 14) {
                        HStack {
                            Label("Apple Health", systemImage: "heart.fill")
                                .font(.headline)
                                .foregroundStyle(.white)
                            Spacer()
                            if healthKit.isSyncing {
                                ProgressView().tint(Brand.Color.accent)
                            } else if healthKit.lastSyncDate != nil {
                                Label("Synced", systemImage: "checkmark.circle.fill")
                                    .font(.caption.weight(.semibold))
                                    .foregroundStyle(Brand.Color.success)
                            }
                        }

                        if !healthKit.isAvailable {
                            Text("Health data is not available on this device.")
                                .font(.subheadline)
                                .foregroundStyle(Brand.Color.muted)
                        } else {
                            if let summary = healthKit.lastSyncSummary {
                                Text(summary)
                                    .font(.subheadline)
                                    .foregroundStyle(Brand.Color.muted)
                                    .fixedSize(horizontal: false, vertical: true)
                            } else {
                                Text("Sync weight, sleep, and step data from the last 90 days into your coaching timeline.")
                                    .font(.subheadline)
                                    .foregroundStyle(Brand.Color.muted)
                                    .fixedSize(horizontal: false, vertical: true)
                            }

                            if let d = healthKit.lastSyncDate {
                                Text("Last sync: \(d.formatted(date: .abbreviated, time: .shortened))")
                                    .font(.caption)
                                    .foregroundStyle(Brand.Color.muted)
                            }

                            if let err = healthKit.syncError {
                                Label(err, systemImage: "exclamationmark.triangle.fill")
                                    .font(.caption)
                                    .foregroundStyle(Brand.Color.danger)
                            }

                            Button(healthKit.isSyncing ? "Syncing…" : "Sync Apple Health") {
                                Task { await requestAuthAndSync() }
                            }
                            .buttonStyle(PremiumActionButtonStyle())
                            .disabled(healthKit.isSyncing)
                        }
                    }
                }

                // WHOOP
                if let url = whoopConnectURL {
                    PremiumRowCard {
                        VStack(alignment: .leading, spacing: 14) {
                            Label("WHOOP", systemImage: "bolt.fill")
                                .font(.headline)
                                .foregroundStyle(.white)
                            Text("Connect your WHOOP strap to sync recovery, strain, and sleep stage data.")
                                .font(.subheadline)
                                .foregroundStyle(Brand.Color.muted)
                                .fixedSize(horizontal: false, vertical: true)
                            Link(destination: url) {
                                HStack {
                                    Text("Connect WHOOP")
                                    Spacer()
                                    Image(systemName: "arrow.up.right")
                                }
                                .font(.subheadline.weight(.bold))
                                .foregroundStyle(Brand.Color.accent)
                                .padding(.vertical, 14)
                                .padding(.horizontal, 18)
                                .frame(maxWidth: .infinity)
                                .overlay(
                                    RoundedRectangle(cornerRadius: 18, style: .continuous)
                                        .stroke(Brand.Color.accent.opacity(0.5), lineWidth: 1.5)
                                )
                            }
                        }
                    }
                }

                if let err = errorMessage {
                    Label(err, systemImage: "exclamationmark.triangle.fill")
                        .font(.caption)
                        .foregroundStyle(Brand.Color.danger)
                        .padding(.horizontal, 4)
                }
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 20)
        }
        .fnBackground()
    }

    private func refreshIntegrations() async {
        if DebugUX.isDemoMode { return }
        await checkSpotifyConnection()
    }

    private func checkSpotifyConnection() async {
        spotifyConnectError = nil
        await spotify.refresh(using: auth)
    }

    private func connectSpotify() async {
        spotifyConnectError = nil
        do {
            let redirectURL = AppConfig.authRedirectURL ?? URL(string: "kodaai://auth/callback")
            try await auth.supabaseClient.auth.linkIdentity(
                provider: .spotify,
                scopes: SpotifyService.requiredScopes,
                redirectTo: redirectURL
            )
            await auth.refreshSession()
            await checkSpotifyConnection()
        } catch {
            // linkIdentity throws when the OAuth sheet is closed without completing (normal flow).
            // Refresh session in case the user completed auth in the browser.
            await auth.refreshSession()
            await checkSpotifyConnection()
            // Only surface an error if Spotify is still not connected after refresh.
            if !spotify.isConnected {
                await MainActor.run {
                    spotifyConnectError = "Could not connect Spotify. Make sure you approved the request in the browser."
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
