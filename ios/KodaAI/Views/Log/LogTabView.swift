//
//  LogTabView.swift
//  Koda AI
//

import SwiftUI

struct LogTabView: View {
    var body: some View {
        NavigationStack {
            List {
                Section("Workout") {
                    NavigationLink("Log workout") { LogWorkoutView() }
                    NavigationLink("Guided workout") { GuidedWorkoutView() }
                }
                Section("Nutrition") {
                    NavigationLink("Log nutrition") { LogNutritionView() }
                    NavigationLink("Fridge scanner") { FridgeScannerView() }
                    NavigationLink("Meal plan") { MealPlanView() }
                }
            }
            .navigationTitle("Log")
        }
    }
}
