//
//  SupabaseService.swift
//  Koda AI
//
//  Supabase auth; session is used to attach Bearer token to API requests.
//

import Foundation
import UIKit
import Combine
import Supabase

@MainActor
final class SupabaseService: ObservableObject {
    static let shared = SupabaseService()
    private static let isRunningTests = ProcessInfo.processInfo.environment["XCTestConfigurationFilePath"] != nil

    @Published private(set) var session: Session?
    @Published private(set) var isInitialized = false

    var isSignedIn: Bool { session != nil || DebugUX.isDemoMode }
    var accessToken: String? { session?.accessToken as String? ?? (DebugUX.isDemoMode ? "demo-access-token" : nil) }
    var providerAccessToken: String? { session?.providerToken ?? (DebugUX.isDemoMode ? "demo-provider-token" : nil) }
    var currentUserId: String? { session?.user.id.uuidString ?? (DebugUX.isDemoMode ? DebugUX.demoUserId : nil) }

    /// Exposed for Supabase table access (profile, logs, plans, etc.). Use only when session is non-nil.
    var supabaseClient: SupabaseClient { client }

    private let client: SupabaseClient

    private init() {
        client = SupabaseClient(
            supabaseURL: AppConfig.supabaseURL,
            supabaseKey: AppConfig.supabaseAnonKey
        )
        if Self.isRunningTests || DebugUX.isDemoMode {
            isInitialized = true
            return
        }
        Task { await refreshSession() }
    }

    func refreshSession() async {
        if Self.isRunningTests || DebugUX.isDemoMode {
            session = nil
            isInitialized = true
            return
        }
        do {
            let session = try await client.auth.session
            self.session = session
        } catch {
            self.session = nil
        }
        if !isInitialized {
            isInitialized = true
        }
    }

    /// Magic link sign-in: pass the email; user opens link in mail to complete sign-in.
    /// Redirects to Web first (to log in there) then handshakes back to iOS via deep link.
    func signInWithMagicLink(email: String) async throws {
        let appRedirect = AppConfig.authRedirectURL?.absoluteString ?? "kodaai://auth/callback"
        let webCallback = AppConfig.apiBaseURL.appendingPathComponent("auth/callback")
        
        var components = URLComponents(url: webCallback, resolvingAgainstBaseURL: false)
        components?.queryItems = [URLQueryItem(name: "next", value: appRedirect)]
        
        guard let finalRedirect = components?.url else { return }
        
        try await client.auth.signInWithOTP(
            email: email,
            redirectTo: finalRedirect
        )
    }

    /// Sign in with Apple (required for App Store if you offer other third-party sign-in).
    func signInWithApple(idToken: String, nonce: String? = nil) async throws {
        _ = try await client.auth.signInWithIdToken(
            credentials: OpenIDConnectCredentials(
                provider: .apple,
                idToken: idToken,
                nonce: nonce
            )
        )
        await refreshSession()
    }
    
    /// Get the URL to open for Google OAuth sign-in.
    func getGoogleSignInURL() async throws -> URL {
        let appRedirect = AppConfig.authRedirectURL ?? URL(string: "kodaai://auth/callback")!
        // For OAuth plugins (Google/Apple), we must return directly to the app
        // so the native Supabase Swift client can exchange the PKCE code correctly.
        return try client.auth.getOAuthSignInURL(
            provider: .google,
            redirectTo: appRedirect
        )
    }

    func signInWithOAuth(provider: Provider) async throws {
        let appRedirect = AppConfig.authRedirectURL ?? URL(string: "kodaai://auth/callback")!
        let url = try await client.auth.getOAuthSignInURL(
            provider: provider,
            redirectTo: appRedirect
        )
        await MainActor.run {
            UIApplication.shared.open(url)
        }
    }

    /// DEV only bypass: signs in with a mock session for local testing.
    func signInWithBypass() async {
        let baseUrl = AppConfig.apiBaseURL.absoluteString.replacingOccurrences(of: "localhost", with: "127.0.0.1")
        let redirect = AppConfig.authRedirectURL?.absoluteString ?? "kodaai://auth/callback"
        guard let url = URL(string: "\(baseUrl)/api/v1/auth/mock-login?next=\(redirect)") else { return }
        await MainActor.run {
            UIApplication.shared.open(url)
        }
    }

    func signOut() async throws {
        try await client.auth.signOut()
        await refreshSession()
    }

    /// Call when the app is opened via the magic link or OAuth redirect URL (e.g. kodaai://auth/callback...).
    /// Uses the native Supabase client to parse the fragment/query and complete the session exchange.
    func setSessionFrom(url: URL) async {
        do {
            try await client.auth.session(from: url)
            await refreshSession()
        } catch {
            print("Auth session from URL error: \(error)")
            // Fallback for custom magic link redirect parameters from the web
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
    
    /// Generates a random string for Apple Sign-In nonce.
    func generateNonce() -> String {
        let charset: [Character] = Array("0123456789ABCDEFGHIJKLMNOPQRSTUVXYZabcdefghijklmnopqrstuvwxyz-._")
        var result = ""
        for _ in 0..<32 {
            result.append(charset.randomElement()!)
        }
        return result
    }
    
    /// Hashes a string using SHA256 for Apple Sign-In.
    func sha256(_ input: String) -> String {
        let inputData = Data(input.utf8)
        let hashedData = _SHA256.hash(data: inputData)
        return hashedData.compactMap { String(format: "%02x", $0) }.joined()
    }
}

// Simple SHA256 helper if CryptoKit is available
import CryptoKit
typealias _SHA256 = CryptoKit.SHA256
