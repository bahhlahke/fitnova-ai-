//
//  RootView.swift
//  Koda AI
//

import SwiftUI

struct RootView: View {
    @EnvironmentObject var auth: SupabaseService
    @State private var showGuestMode = false
    private let e2eSurface = ProcessInfo.processInfo.environment["E2E_SURFACE"]

    var body: some View {
        Group {
            if let e2eSurface, !e2eSurface.isEmpty {
                DebugLaunchSurfaceView(surface: e2eSurface)
            } else if !auth.isInitialized {
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
            } else if auth.isSignedIn || ProcessInfo.processInfo.environment["E2E_AUTO_LOGIN"] == "true" || showGuestMode {
                OnboardingCheckView(isGuest: showGuestMode)
            } else {
                AuthView(onGuestAccess: {
                    withAnimation {
                        showGuestMode = true
                    }
                })
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .preferredColorScheme(.dark)
        .tint(Brand.Color.accent)
        .fnBackground()
    }
}
