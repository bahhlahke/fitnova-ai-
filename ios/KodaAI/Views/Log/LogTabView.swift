//
//  LogTabView.swift
//  Koda AI
//

import SwiftUI

struct LogTabView: View {
    var body: some View {
        NavigationStack {
            List {
                NavigationLink("Log workout") { LogWorkoutView() }
                NavigationLink("Log nutrition") { LogNutritionView() }
            }
            .navigationTitle("Log")
        }
    }
}

struct LogWorkoutView: View {
    var body: some View {
        Text("Quick log or guided workout.")
            .foregroundStyle(.secondary)
            .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}

struct LogNutritionView: View {
    var body: some View {
        Text("Log meals and calories.")
            .foregroundStyle(.secondary)
            .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}
