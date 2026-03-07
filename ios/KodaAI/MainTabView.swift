//
//  MainTabView.swift
//  Koda AI
//
//  Tab bar styled to match the dark web interface.
//  Coach tab is placed third for quick access.
//

import SwiftUI

struct MainTabView: View {
    private let accent = Color(red: 0.04, green: 0.85, blue: 0.77)

    init() {
        // Style tab bar to match dark theme
        let appearance = UITabBarAppearance()
        appearance.configureWithOpaqueBackground()
        appearance.backgroundColor = UIColor(white: 0.04, alpha: 1)

        let accentUI = UIColor(red: 0.04, green: 0.85, blue: 0.77, alpha: 1)
        appearance.stackedLayoutAppearance.selected.iconColor = accentUI
        appearance.stackedLayoutAppearance.selected.titleTextAttributes = [
            .foregroundColor: accentUI,
            .font: UIFont.systemFont(ofSize: 10, weight: .black)
        ]
        appearance.stackedLayoutAppearance.normal.iconColor = UIColor(white: 0.4, alpha: 1)
        appearance.stackedLayoutAppearance.normal.titleTextAttributes = [
            .foregroundColor: UIColor(white: 0.4, alpha: 1),
            .font: UIFont.systemFont(ofSize: 10, weight: .bold)
        ]

        UITabBar.appearance().standardAppearance = appearance
        UITabBar.appearance().scrollEdgeAppearance = appearance
    }

    var body: some View {
        TabView {
            HomeView()
                .tabItem { Label("Home", systemImage: "house.fill") }
            CoachView()
                .tabItem { Label("Coach", systemImage: "bolt.fill") }
            PlanView()
                .tabItem { Label("Plan", systemImage: "calendar") }
            LogTabView()
                .tabItem { Label("Log", systemImage: "list.bullet") }
            BodyProgressView()
                .tabItem { Label("Progress", systemImage: "chart.bar.fill") }
            CheckInView()
                .tabItem { Label("Check-in", systemImage: "heart.fill") }
            SettingsView()
                .tabItem { Label("Settings", systemImage: "gearshape.fill") }
        }
        .preferredColorScheme(.dark)
        .tint(accent)
    }
}
