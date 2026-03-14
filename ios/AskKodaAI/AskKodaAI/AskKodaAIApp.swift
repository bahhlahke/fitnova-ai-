import SwiftUI
import AVFoundation
import SwiftData

@main
struct AskKodaAIApp: App {
    @UIApplicationDelegateAdaptor(KodaAppDelegate.self) private var appDelegate
    @StateObject private var auth = SupabaseService.shared
    @Environment(\.scenePhase) private var scenePhase
    private let isRunningTests = ProcessInfo.processInfo.environment["XCTestConfigurationFilePath"] != nil

    var body: some Scene {
        WindowGroup {
            RootView()
                .environmentObject(auth)
                .onOpenURL { url in
                    // Supabase auth callback uses the app's URL scheme (kodaai://)
                    // Notification deep links use koda:// — route them separately.
                    if url.scheme == "kodaai" {
                        Task { await auth.setSessionFrom(url: url) }
                    } else {
                        handleNotificationDeepLink(url)
                    }
                }
                .onChange(of: scenePhase) { _, newPhase in
                    if newPhase == .active && !isRunningTests {
                        Task { await auth.refreshSession() }
                        NotificationService.shared.clearBadge()
                    }
                }
        }
        .modelContainer(for: [PersistentWorkoutLog.self, PersistentExerciseLog.self])
    }

    private func handleNotificationDeepLink(_ url: URL) {
        guard url.scheme == "koda" else { return }
        let tabIndex: Int
        switch url.host {
        case "home":
            tabIndex = 0
        case "train":
            tabIndex = 1
        default:
            return
        }
        NotificationCenter.default.post(
            name: NSNotification.Name("SwitchToTab"),
            object: nil,
            userInfo: ["tab": tabIndex]
        )
    }
}
