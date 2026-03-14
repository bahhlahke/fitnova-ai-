//
//  AuthView.swift
//  Koda AI
//

import SwiftUI
import UIKit
import AuthenticationServices

struct AuthView: View {
    @EnvironmentObject var auth: SupabaseService
    var onGuestAccess: (() -> Void)?
    @State private var email = ""
    @State private var message: String?
    @State private var isLoading = false
    @State private var currentNonce: String?

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 22) {
                    PremiumHeroCard(
                        title: "Precision coaching for the next session.",
                        subtitle: "Daily programming, meal guidance, and feedback loops that feel like a real performance desk.",
                        eyebrow: "Koda Access"
                    ) {
                        HStack(spacing: 10) {
                            PremiumMetricPill(label: "Mode", value: "Pro")
                            PremiumMetricPill(label: "Focus", value: "Adaptive plan")
                        }
                    }

                    VStack(alignment: .leading, spacing: 16) {
                        Text("Sign in")
                            .font(.headline)
                            .foregroundStyle(.white)

                        TextField("Email", text: $email)
                            .textContentType(.emailAddress)
                            .keyboardType(.emailAddress)
                            .autocapitalization(.none)
                            .textInputAutocapitalization(.never)
                            .padding(.horizontal, 18)
                            .padding(.vertical, 16)
                            .background(
                                RoundedRectangle(cornerRadius: 18, style: .continuous)
                                    .fill(Brand.Color.surfaceRaised)
                                    .overlay(
                                        RoundedRectangle(cornerRadius: 18, style: .continuous)
                                            .stroke(Brand.Color.borderStrong, lineWidth: 1)
                                    )
                            )

                        if let msg = message {
                            Text(msg)
                                .font(.caption)
                                .foregroundStyle(msg.contains("Check") ? Brand.Color.success : Brand.Color.danger)
                        }

                        if !email.isEmpty && !isValidEmail {
                            Text("Enter a valid email address.")
                                .font(.caption)
                                .foregroundStyle(Brand.Color.danger)
                        }

                        Button(action: sendMagicLink) {
                            if isLoading {
                                ProgressView()
                                    .tint(.black)
                            } else {
                                Text("Send magic link")
                            }
                        }
                        .disabled(isLoading || !isValidEmail)
                        .buttonStyle(PremiumActionButtonStyle())

                        VStack(alignment: .leading, spacing: 10) {
                            authFeatureRow("Adaptive daily plan before you even ask")
                            authFeatureRow("Nutrition and recovery context tied to training")
                            authFeatureRow("Coach chat that can steer straight into guided workouts")
                        }
                    }
                    .padding(20)
                    .premiumCard()

                    VStack(spacing: 12) {
                        Button(action: signInWithGoogle) {
                            HStack {
                                Image(systemName: "globe")
                                Text("Continue with Google")
                                Spacer()
                            }
                        }
                        .buttonStyle(PremiumActionButtonStyle(filled: false))
                    
                        SignInWithAppleButton(.continue) { request in
                            let rawNonce = auth.generateNonce()
                            currentNonce = rawNonce
                            request.nonce = auth.sha256(rawNonce)
                            request.requestedScopes = [.email, .fullName]
                        } onCompletion: { result in
                            handleAppleResult(result)
                        }
                        .signInWithAppleButtonStyle(.white)
                        .frame(height: 54)
                        .clipShape(Capsule())
                    }
                    .padding(20)
                    .premiumCard()
                    
                    #if DEBUG
                    Button(action: { Task { await auth.signInWithBypass() } }) {
                        Text("[DEV] Bypass Login")
                            .font(.caption)
                            .foregroundStyle(Brand.Color.accent)
                    }
                    #endif

                    Button(action: { 
                        HapticEngine.impact(.light)
                        onGuestAccess?() 
                    }) {
                        Text("Explore as Guest")
                            .font(.subheadline.weight(.bold))
                            .foregroundStyle(Brand.Color.muted)
                            .padding(.top, 12)
                    }
                    .frame(maxWidth: .infinity)
                }
                .padding(.horizontal, 20)
                .padding(.vertical, 28)
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

    private var isValidEmail: Bool {
        let pattern = #"[A-Z0-9a-z._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}"#
        return email.range(of: pattern, options: .regularExpression) != nil
    }

    private func authFeatureRow(_ text: String) -> some View {
        HStack(spacing: 10) {
            Image(systemName: "checkmark.circle.fill")
                .foregroundStyle(Brand.Color.accent)
            Text(text)
                .font(.subheadline)
                .foregroundStyle(Brand.Color.muted)
            Spacer()
        }
    }

    private func signInWithGoogle() {
        Task { await Telemetry.track(.authStart, props: ["method": "google"]) }
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
                Task { await Telemetry.track(.authStart, props: ["method": "apple"]) }
                Task {
                    do {
                        try await auth.signInWithApple(idToken: token, nonce: currentNonce)
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
        Task { await Telemetry.track(.authStart, props: ["method": "magic_link"]) }
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
