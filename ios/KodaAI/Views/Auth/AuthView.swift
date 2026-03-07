//
//  AuthView.swift
//  Koda AI
//
//  Login screen: Sign in with Apple (primary), magic-link email, and email+password fallback.
//

import SwiftUI
import AuthenticationServices

struct AuthView: View {
    @EnvironmentObject var auth: SupabaseService
    @State private var email = ""
    @State private var password = ""
    @State private var message: String?
    @State private var isLoading = false
    @State private var mode: LoginMode = .magicLink
    @State private var showPassword = false

    enum LoginMode { case magicLink, password }

    // Brand teal accent
    private let accent = Color(red: 0.04, green: 0.85, blue: 0.77)

    var body: some View {
        NavigationStack {
            ZStack {
                Color.black.ignoresSafeArea()

                ScrollView {
                    VStack(spacing: 0) {
                        // ── Brand header ──────────────────────────────────
                        VStack(spacing: 12) {
                            Image(systemName: "bolt.fill")
                                .font(.system(size: 48, weight: .black))
                                .foregroundColor(accent)
                            Text("KODA AI")
                                .font(.system(size: 36, weight: .black))
                                .italic()
                                .tracking(4)
                                .foregroundColor(.white)
                            Text("AI-FIRST FITNESS COACHING")
                                .font(.system(size: 10, weight: .black))
                                .tracking(3)
                                .foregroundColor(Color(white: 0.5))
                        }
                        .padding(.top, 60)
                        .padding(.bottom, 48)

                        VStack(spacing: 16) {
                            // Sign in with Apple
                            SignInWithAppleButton(.signIn) { request in
                                request.requestedScopes = [.fullName, .email]
                            } onCompletion: { result in
                                handleAppleSignIn(result)
                            }
                            .signInWithAppleButtonStyle(.white)
                            .frame(height: 52)
                            .clipShape(RoundedRectangle(cornerRadius: 14))

                            divider

                            // Email field (always visible)
                            emailField

                            // Password field (only in password mode)
                            if mode == .password {
                                passwordField
                            }

                            // Feedback message
                            if let msg = message {
                                Text(msg)
                                    .font(.system(size: 12, weight: .semibold))
                                    .foregroundColor(
                                        (msg.lowercased().contains("check") || msg.lowercased().contains("success"))
                                            ? accent : .red
                                    )
                                    .multilineTextAlignment(.center)
                                    .padding(.horizontal)
                            }

                            // Primary action
                            actionButton

                            // Mode toggle
                            Button(action: toggleMode) {
                                Text(mode == .magicLink
                                     ? "Sign in with password instead"
                                     : "Send magic link instead")
                                    .font(.system(size: 12, weight: .semibold))
                                    .foregroundColor(Color(white: 0.45))
                            }
                            .padding(.top, 4)
                        }
                        .padding(.horizontal, 28)
                        .padding(.bottom, 40)
                    }
                }
            }
            .navigationBarTitleDisplayMode(.inline)
        }
        .preferredColorScheme(.dark)
    }

    // MARK: – Subviews

    private var divider: some View {
        HStack {
            Rectangle().frame(height: 1).foregroundColor(Color(white: 0.15))
            Text("OR")
                .font(.system(size: 10, weight: .black))
                .tracking(2)
                .foregroundColor(Color(white: 0.35))
                .padding(.horizontal, 12)
            Rectangle().frame(height: 1).foregroundColor(Color(white: 0.15))
        }
    }

    private var emailField: some View {
        TextField("Email address", text: $email)
            .textContentType(.emailAddress)
            .keyboardType(.emailAddress)
            .autocapitalization(.none)
            .textInputAutocapitalization(.never)
            .padding(.horizontal, 16)
            .padding(.vertical, 14)
            .background(Color(white: 0.08))
            .foregroundColor(.white)
            .clipShape(RoundedRectangle(cornerRadius: 14))
            .overlay(RoundedRectangle(cornerRadius: 14).stroke(Color(white: 0.15), lineWidth: 1))
    }

    private var passwordField: some View {
        HStack {
            Group {
                if showPassword {
                    TextField("Password", text: $password)
                        .textContentType(.password)
                } else {
                    SecureField("Password", text: $password)
                        .textContentType(.password)
                }
            }
            .autocapitalization(.none)
            .textInputAutocapitalization(.never)
            .foregroundColor(.white)
            Button(action: { showPassword.toggle() }) {
                Image(systemName: showPassword ? "eye.slash" : "eye")
                    .foregroundColor(Color(white: 0.4))
            }
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 14)
        .background(Color(white: 0.08))
        .clipShape(RoundedRectangle(cornerRadius: 14))
        .overlay(RoundedRectangle(cornerRadius: 14).stroke(Color(white: 0.15), lineWidth: 1))
    }

    private var actionButton: some View {
        Button(action: handleEmailAction) {
            ZStack {
                if isLoading {
                    ProgressView()
                        .tint(.black)
                        .frame(maxWidth: .infinity)
                        .frame(height: 52)
                } else {
                    Text(mode == .magicLink ? "SEND MAGIC LINK" : "SIGN IN")
                        .font(.system(size: 13, weight: .black))
                        .tracking(2)
                        .foregroundColor(.black)
                        .frame(maxWidth: .infinity)
                        .frame(height: 52)
                }
            }
            .background(accent)
            .clipShape(RoundedRectangle(cornerRadius: 14))
        }
        .disabled(isLoading || email.isEmpty || (mode == .password && password.isEmpty))
    }

    // MARK: – Actions

    private func toggleMode() {
        withAnimation(.easeInOut(duration: 0.2)) {
            mode = (mode == .magicLink) ? .password : .magicLink
        }
        message = nil
        password = ""
    }

    private func handleEmailAction() {
        message = nil
        isLoading = true
        Task {
            do {
                if mode == .magicLink {
                    try await auth.signInWithMagicLink(email: email)
                    await MainActor.run {
                        message = "Check your email and tap the link to sign in."
                    }
                } else {
                    try await auth.signInWithPassword(email: email, password: password)
                }
            } catch {
                await MainActor.run {
                    message = (error as? LocalizedError)?.errorDescription
                        ?? error.localizedDescription
                }
            }
            await MainActor.run { isLoading = false }
        }
    }

    private func handleAppleSignIn(_ result: Result<ASAuthorization, Error>) {
        switch result {
        case .failure(let error):
            // User cancelled — don't show error
            if (error as NSError).code != ASAuthorizationError.canceled.rawValue {
                message = (error as? LocalizedError)?.errorDescription ?? error.localizedDescription
            }
        case .success(let authorization):
            guard
                let cred = authorization.credential as? ASAuthorizationAppleIDCredential,
                let tokenData = cred.identityToken,
                let idToken = String(data: tokenData, encoding: .utf8),
                let nonceData = cred.authorizationCode,
                let nonce = String(data: nonceData, encoding: .utf8)
            else {
                message = "Apple Sign In failed. Please try another method."
                return
            }
            isLoading = true
            Task {
                do {
                    try await auth.signInWithApple(idToken: idToken, nonce: nonce)
                } catch {
                    await MainActor.run {
                        message = (error as? LocalizedError)?.errorDescription
                            ?? error.localizedDescription
                    }
                }
                await MainActor.run { isLoading = false }
            }
        }
    }
}
