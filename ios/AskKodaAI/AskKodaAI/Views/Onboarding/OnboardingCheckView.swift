//
//  OnboardingCheckView.swift
//  Koda AI
//
//  Fetches onboarding status; shows OnboardingView if not completed, else MainTabView.
//

import SwiftUI

struct OnboardingCheckView: View {
    @EnvironmentObject var auth: SupabaseService
    @State private var needsOnboarding = true
    @State private var checked = false

    private var dataService: KodaDataService? {
        guard let uid = auth.currentUserId else { return nil }
        return KodaDataService(client: auth.supabaseClient, userId: uid)
    }

    var body: some View {
        Group {
            if auth.currentUserId == nil {
                // Auth initialised but no valid session — route back to sign-in.
                AuthView()
            } else if !checked {
                brandedLoadingView
            } else if needsOnboarding {
                OnboardingView(onComplete: {
                    needsOnboarding = false
                })
            } else {
                MainTabView()
            }
        }
        .task {
            if ProcessInfo.processInfo.environment["E2E_AUTO_LOGIN"] == "true" {
                checked = true
                needsOnboarding = false
            } else {
                await check()
            }
        }
    }

    private var brandedLoadingView: some View {
        ZStack {
            Brand.Color.background.ignoresSafeArea()
            VStack(spacing: 24) {
                Image("KodaLogo")
                    .resizable()
                    .scaledToFit()
                    .frame(height: 56)
                ProgressView()
                    .tint(Brand.Color.accent)
                    .scaleEffect(1.2)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    private func check() async {
        // Guard: if userId is still nil at this point, auth hasn't settled — bail gracefully.
        guard let ds = dataService else {
            await MainActor.run { checked = true; needsOnboarding = false }
            return
        }
        do {
            let row = try await ds.fetchOnboarding()
            await MainActor.run {
                needsOnboarding = (row?.completed_at == nil)
                checked = true
            }
        } catch {
            await MainActor.run { checked = true; needsOnboarding = false }
        }
    }
}
