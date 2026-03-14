//
//  MainTabView.swift
//  Koda AI
//
//  5-tab navigation following Apple HIG. Secondary views (Plan, Check-in, Community,
//  Integrations, Pricing) are reachable from their parent tab via navigation links.
//

import SwiftUI

struct MainTabView: View {
    @Environment(\.scenePhase) private var scenePhase

    @State private var selectedTab: Int = {
        if let s = ProcessInfo.processInfo.environment["E2E_START_TAB"], let i = Int(s) {
            return i
        }
        return 0
    }()

    var body: some View {
        TabView(selection: $selectedTab) {
            // Tab 0: Home — briefing, daily plan, BioSync HUD, quick actions
            HomeView()
                .tabItem { Label("Home", systemImage: "house.fill") }
                .tag(0)

            // Tab 1: Train — log workout + weekly plan (plan reachable via NavigationLink)
            LogTabView()
                .tabItem { Label("Train", systemImage: "dumbbell.fill") }
                .tag(1)

            // Tab 2: Coach — AI chat; check-in and escalation reachable from within
            CoachView()
                .tabItem { Label("Coach", systemImage: "message.fill") }
                .tag(2)

            // Tab 3: Progress — body comp, history, trophies, vitals, analytics
            BodyProgressView()
                .tabItem { Label("Progress", systemImage: "chart.bar.fill") }
                .tag(3)

            // Tab 4: Me — settings, community, integrations, pricing
            SettingsView()
                .tabItem { Label("Me", systemImage: "person.crop.circle.fill") }
                .tag(4)
        }
        .fnBackground()
        .toolbarBackground(Brand.Color.surfaceRaised.opacity(0.96), for: .tabBar)
        .toolbarBackground(.visible, for: .tabBar)
        .toolbarColorScheme(.dark, for: .tabBar)
        .onChange(of: scenePhase) { _, newPhase in
            if newPhase == .active {
                NotificationCenter.default.post(name: NSNotification.Name("AppEnteredForeground"), object: nil)
            }
        }
        .onChange(of: selectedTab) { _, _ in
            HapticEngine.selection()
        }
        .onOpenURL { url in
            handleDeepLink(url)
        }
        .onReceive(NotificationCenter.default.publisher(for: NSNotification.Name("SwitchToTab"))) { note in
            if let tab = note.userInfo?["tab"] as? Int {
                withAnimation { selectedTab = tab }
            }
        }
    }

    private func handleDeepLink(_ url: URL) {
        let path = url.path.lowercased()
        if path.contains("/plan") {
            selectedTab = 0
        } else if path.contains("/log") {
            selectedTab = 1
        } else if path.contains("/progress") {
            selectedTab = 3
        } else if path.contains("/coach") {
            selectedTab = 2
        } else if path.contains("/settings") {
            selectedTab = 4
        }
    }
}
