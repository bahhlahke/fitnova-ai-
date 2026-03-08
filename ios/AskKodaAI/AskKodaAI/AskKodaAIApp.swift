//
//  AskKodaAIApp.swift
//  AskKodaAI — Production iOS app for Koda AI fitness coaching.
//

import SwiftUI

@main
struct AskKodaAIApp: App {
    @StateObject private var auth = SupabaseService.shared
    @Environment(\.scenePhase) private var scenePhase
    private let isRunningTests = ProcessInfo.processInfo.environment["XCTestConfigurationFilePath"] != nil

    var body: some Scene {
        WindowGroup {
            RootView()
                .environmentObject(auth)
                .onOpenURL { url in
                    Task { await auth.setSessionFrom(url: url) }
                }
                .onChange(of: scenePhase) { _, newPhase in
                    if newPhase == .active && !isRunningTests {
                        Task { await auth.refreshSession() }
                    }
                }
        }
    }
}
