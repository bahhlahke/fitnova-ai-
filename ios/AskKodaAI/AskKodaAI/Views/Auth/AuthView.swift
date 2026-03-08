//
//  AuthView.swift
//  Koda AI
//

import SwiftUI
import UIKit
import AuthenticationServices

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
                    
                    Divider()
                        .overlay(Brand.Color.border)
                    
                    Button(action: signInWithGoogle) {
                        HStack {
                            Image(systemName: "globe")
                            Text("Continue with Google")
                        }
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(Brand.Color.surface)
                        .cornerRadius(12)
                        .overlay(
                            RoundedRectangle(cornerRadius: 12)
                                .stroke(Brand.Color.border, lineWidth: 1)
                        )
                    }
                    .foregroundColor(.primary)
                    
                    SignInWithAppleButton(.continue) { request in
                        request.requestedScopes = [.email, .fullName]
                    } onCompletion: { result in
                        handleAppleResult(result)
                    }
                    .signInWithAppleButtonStyle(.black)
                    .frame(height: 50)
                    .cornerRadius(12)
                    
                    #if DEBUG
                    Button(action: { Task { await auth.signInWithBypass() } }) {
                        Text("[DEV] Bypass Login")
                            .font(.caption)
                            .foregroundStyle(Brand.Color.accent)
                    }
                    .padding(.top, 8)
                    #endif
                }
                .padding(32)
            }
            .background {
                ZStack {
                    Brand.Color.background.ignoresSafeArea()
                    if let url = Bundle.main.url(forResource: "push-ups", withExtension: "mp4") {
                        LoopingVideoPlayerView(videoURL: url)
                            .ignoresSafeArea()
                            .opacity(0.4)
                            .saturation(0.0)
                            .contrast(1.25)
                    }
                    LinearGradient(colors: [Color.black, Color.black.opacity(0.9), Color.clear], startPoint: .leading, endPoint: .trailing)
                        .ignoresSafeArea()
                    LinearGradient(colors: [Color.black, Color.clear, Color.black.opacity(0.3)], startPoint: .bottom, endPoint: .top)
                        .ignoresSafeArea()
                }
            }
            .navigationBarTitleDisplayMode(.inline)
        }
    }

    private func signInWithGoogle() {
        Task {
            do {
                let url = try await auth.getGoogleSignInURL()
                await MainActor.run {
                    UIApplication.shared.open(url)
                }
            } catch {
                message = error.localizedDescription
            }
        }
    }

    private func handleAppleResult(_ result: Result<ASAuthorization, Error>) {
        switch result {
        case .success(let authResult):
            if let appleIDCredential = authResult.credential as? ASAuthorizationAppleIDCredential,
               let tokenData = appleIDCredential.identityToken,
               let token = String(data: tokenData, encoding: .utf8) {
                Task {
                    do {
                        try await auth.signInWithApple(idToken: token, nonce: "")
                    } catch {
                        message = error.localizedDescription
                    }
                }
            }
        case .failure(let error):
            message = error.localizedDescription
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
