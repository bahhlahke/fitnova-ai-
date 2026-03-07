//
//  PlanView.swift
//  Koda AI
//

import SwiftUI

struct PlanView: View {
    var body: some View {
        NavigationStack {
            Text("Weekly plan and daily details live here.")
                .foregroundStyle(.secondary)
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .navigationTitle("Plan")
        }
    }
}
