//
//  BodyProgressView.swift
//  Koda AI
//

import SwiftUI

struct BodyProgressView: View {
    var body: some View {
        NavigationStack {
            Text("Weight, body fat %, and trends.")
                .foregroundStyle(.secondary)
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .navigationTitle("Progress")
        }
    }
}
