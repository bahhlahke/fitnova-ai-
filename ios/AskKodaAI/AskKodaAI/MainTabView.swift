//
//  MainTabView.swift
//  Koda AI
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
            HomeView()
                .tabItem { Label("Home", systemImage: "house.fill") }
                .tag(0)
            PlanView()
                .tabItem { Label("Plan", systemImage: "calendar") }
                .tag(1)
            CoachView()
                .tabItem { Label("Coach", systemImage: "message.fill") }
                .tag(2)
            LogTabView()
                .tabItem { Label("Log", systemImage: "list.bullet") }
                .tag(3)
            BodyProgressView()
                .tabItem { Label("Progress", systemImage: "chart.bar.fill") }
                .tag(4)
            CheckInView()
                .tabItem { Label("Check-in", systemImage: "heart.fill") }
                .tag(5)
            CommunityView()
                .tabItem { Label("Community", systemImage: "person.2.fill") }
                .tag(6)
            SettingsView()
                .tabItem { Label("Settings", systemImage: "gearshape.fill") }
                .tag(7)
        }
        .fnBackground()
        .toolbarBackground(Brand.Color.surfaceRaised.opacity(0.96), for: .tabBar)
        .toolbarBackground(.visible, for: .tabBar)
        .toolbarColorScheme(.dark, for: .tabBar)
        .onChange(of: scenePhase) { _, newPhase in
            if newPhase == .active {
                // Post a notification that views can listen to for refreshing their state
                NotificationCenter.default.post(name: NSNotification.Name("AppEnteredForeground"), object: nil)
            }
        }
    }
}
