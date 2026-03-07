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
            if !checked {
                ProgressView("Loading…")
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if needsOnboarding {
                OnboardingView(onComplete: {
                    needsOnboarding = false
                })
            } else {
                MainTabView()
            }
        }
        .task { await check() }
    }

    private func check() async {
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
