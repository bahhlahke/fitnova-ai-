//
//  SettingsView.swift
//  Koda AI
//

import SwiftUI

struct SettingsView: View {
    @EnvironmentObject var auth: SupabaseService
    @State private var showSignOutConfirm = false

    var body: some View {
        NavigationStack {
            List {
                Section {
                    Button("Sign out", role: .destructive) {
                        showSignOutConfirm = true
                    }
                }
            }
            .navigationTitle("Settings")
            .confirmationDialog("Sign out?", isPresented: $showSignOutConfirm) {
                Button("Sign out", role: .destructive) { Task { try? await auth.signOut() } }
                Button("Cancel", role: .cancel) { }
            } message: {
                Text("You will need to sign in again to use the app.")
            }
        }
    }
}
