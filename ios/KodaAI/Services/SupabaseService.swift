//
//  SupabaseService.swift
//  Koda AI
//
//  Supabase auth; session is used to attach Bearer token to API requests.
//

import Foundation
import Supabase

@MainActor
final class SupabaseService: ObservableObject {
    static let shared = SupabaseService()

    @Published private(set) var session: Session?
    @Published private(set) var isInitialized = false

    var isSignedIn: Bool { session != nil }
    var accessToken: String? { session?.accessToken }

    private let client: SupabaseClient

    private init() {
        client = SupabaseClient(
            supabaseURL: AppConfig.supabaseURL,
            supabaseKey: AppConfig.supabaseAnonKey
        )
        Task { await refreshSession() }
    }

    func refreshSession() async {
        do {
            let session = try await client.auth.session
            self.session = session
        } catch {
            self.session = nil
        }
        isInitialized = true
    }

    /// Magic link sign-in: pass the email; user opens link in mail to complete sign-in.
    /// Set AUTH_REDIRECT_URL in Info.plist (e.g. kodaai://auth/callback) and add it to Supabase Redirect URLs.
    func signInWithMagicLink(email: String, redirectTo: URL? = nil) async throws {
        let redirect = redirectTo ?? AppConfig.authRedirectURL ?? AppConfig.apiBaseURL
        try await client.auth.signInWithOTP(
            email: email,
            redirectTo: redirect
        )
    }

    /// Sign in with Apple (required for App Store if you offer other third-party sign-in).
    func signInWithApple(idToken: String, nonce: String) async throws {
        _ = try await client.auth.signInWithIdToken(
            credentials: OpenIDConnectCredentials(
                provider: .apple,
                idToken: idToken,
                nonce: nonce
            )
        )
        await refreshSession()
    }

    func signOut() async throws {
        try await client.auth.signOut()
        await refreshSession()
    }

    /// Call when the app is opened via the magic link URL (e.g. kodaai://auth/callback#access_token=...).
    /// Parse tokens from URL fragment and set session, then refresh.
    func setSessionFrom(url: URL) async {
        guard let fragment = url.fragment else { return }
        let params = URLComponents(string: "?\(fragment)")?.queryItems ?? []
        let accessToken = params.first(where: { $0.name == "access_token" })?.value
        let refreshToken = params.first(where: { $0.name == "refresh_token" })?.value
        guard let access = accessToken, let refresh = refreshToken else { return }
        do {
            try await client.auth.setSession(accessToken: access, refreshToken: refresh)
            await refreshSession()
        } catch {
            self.session = nil
        }
    }
}
