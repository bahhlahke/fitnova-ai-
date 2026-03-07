//
//  AuthView.swift
//  Koda AI
//

import SwiftUI

struct AuthView: View {
    @EnvironmentObject var auth: SupabaseService
    @State private var email = ""
    @State private var message: String?
    @State private var isLoading = false

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 24) {
                    Text("Koda AI")
                        .font(.largeTitle.weight(.bold))
                    Text("AI-first fitness and nutrition coaching")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                        .multilineTextAlignment(.center)

                    TextField("Email", text: $email)
                        .textContentType(.emailAddress)
                        .keyboardType(.emailAddress)
                        .autocapitalization(.none)
                        .textInputAutocapitalization(.never)
                        .padding()
                        .background(Color(.systemGray6))
                        .clipShape(RoundedRectangle(cornerRadius: 12))

                    if let msg = message {
                        Text(msg)
                            .font(.caption)
                            .foregroundStyle(msg.contains("Check") ? .green : .red)
                    }

                    Button(action: sendMagicLink) {
                        if isLoading {
                            ProgressView()
                                .tint(.white)
                                .frame(maxWidth: .infinity)
                                .padding()
                        } else {
                            Text("Send magic link")
                                .frame(maxWidth: .infinity)
                                .padding()
                        }
                    }
                    .disabled(isLoading || email.isEmpty)
                    .buttonStyle(.borderedProminent)
                    .controlSize(.large)
                }
                .padding(32)
            }
            .navigationBarTitleDisplayMode(.inline)
        }
    }

    private func sendMagicLink() {
        message = nil
        isLoading = true
        Task {
            do {
                try await auth.signInWithMagicLink(email: email)
                message = "Check your email and tap the link to sign in."
            } catch {
                message = (error as? LocalizedError)?.errorDescription ?? error.localizedDescription
            }
            isLoading = false
        }
    }
}
