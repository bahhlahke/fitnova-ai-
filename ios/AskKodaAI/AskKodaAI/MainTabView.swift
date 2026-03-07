//
//  MainTabView.swift
//  Koda AI
//

import SwiftUI

struct MainTabView: View {
    var body: some View {
        TabView {
            HomeView()
                .tabItem { Label("Home", systemImage: "house.fill") }
            PlanView()
                .tabItem { Label("Plan", systemImage: "calendar") }
            CoachView()
                .tabItem { Label("Coach", systemImage: "message.fill") }
            LogTabView()
                .tabItem { Label("Log", systemImage: "list.bullet") }
            BodyProgressView()
                .tabItem { Label("Progress", systemImage: "chart.bar.fill") }
            CheckInView()
                .tabItem { Label("Check-in", systemImage: "heart.fill") }
            CommunityView()
                .tabItem { Label("Community", systemImage: "person.2.fill") }
            SettingsView()
                .tabItem { Label("Settings", systemImage: "gearshape.fill") }
        }
    }
}
