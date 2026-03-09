//
//  AskKodaAIApp.swift
//  AskKodaAI — Production iOS app for Koda AI fitness coaching.
//

import SwiftUI
import AVFoundation

@main
struct AskKodaAIApp: App {
    @StateObject private var auth = SupabaseService.shared
    @Environment(\.scenePhase) private var scenePhase
    private let isRunningTests = ProcessInfo.processInfo.environment["XCTestConfigurationFilePath"] != nil

    init() {
        // Configure audio session so background video loops don't conflict with
        // system audio, phone calls, or third-party audio apps.
        try? AVAudioSession.sharedInstance().setCategory(.ambient, mode: .default, options: .mixWithOthers)
        try? AVAudioSession.sharedInstance().setActive(true)
    }

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
