//
//  KodaAIApp.swift
//  Koda AI — Production iOS app for Koda AI fitness coaching.
//

import SwiftUI

@main
struct KodaAIApp: App {
    @StateObject private var auth = SupabaseService.shared

    var body: some Scene {
        WindowGroup {
            RootView()
                .environmentObject(auth)
                .onOpenURL { url in
                    Task { await auth.setSessionFrom(url: url) }
                }
        }
    }
}
