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
                    .background(Color(.systemBackground))
            } else if auth.isSignedIn {
                OnboardingCheckView()
            } else {
                AuthView()
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Color(.systemBackground))
    }
}
