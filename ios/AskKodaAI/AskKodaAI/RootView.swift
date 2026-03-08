//
//  RootView.swift
//  Koda AI
//

import SwiftUI

struct RootView: View {
    @EnvironmentObject var auth: SupabaseService

    var body: some View {
        Group {
            if !auth.isInitialized {
                ProgressView("Loading…")
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                    .fnBackground()
            } else if auth.isSignedIn {
                OnboardingCheckView()
            } else {
                AuthView()
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .preferredColorScheme(.dark)
        .tint(Brand.Color.accent)
        .fnBackground()
    }
}
