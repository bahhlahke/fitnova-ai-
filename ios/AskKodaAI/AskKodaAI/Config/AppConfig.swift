//
//  AppConfig.swift
//  Koda AI
//
//  Values come from Config/Generated.xcconfig, which is generated from the repo's .env.local
//  (same source as the web app) by scripts/generate-ios-env.mjs at build time.
//  Required keys: SUPABASE_URL, SUPABASE_ANON_KEY, API_BASE_URL (mapped from NEXT_PUBLIC_* in .env.local).
//

import Foundation

enum AppConfig {
    /// In Debug (including test host), use placeholders when keys are missing so the app never traps.
    private static var usePlaceholdersIfMissing: Bool {
        #if DEBUG
        return true
        #else
        return false
        #endif
    }

    /// Supabase project URL (https://xxx.supabase.co in production). Required; app will not launch without it.
    static var supabaseURL: URL {
        if let urlString = Bundle.main.object(forInfoDictionaryKey: "SUPABASE_URL") as? String,
           let url = URL(string: urlString), !urlString.contains("placeholder") {
            return url
        }
        if usePlaceholdersIfMissing { return URL(string: "https://placeholder.supabase.co")! }
        fatalError("Set SUPABASE_URL in Info.plist or scheme environment")
    }

    /// Supabase anon (public) key. Required; app will not launch without it.
    static var supabaseAnonKey: String {
        if let key = Bundle.main.object(forInfoDictionaryKey: "SUPABASE_ANON_KEY") as? String,
           !key.isEmpty, !key.contains("placeholder") {
            return key
        }
        if usePlaceholdersIfMissing { return "test-placeholder-anon-key" }
        fatalError("Set SUPABASE_ANON_KEY in Info.plist or scheme environment")
    }

    /// Base URL for the Koda AI Next.js API (HTTPS only in production).
    static var apiBaseURL: URL {
        if let urlString = Bundle.main.object(forInfoDictionaryKey: "API_BASE_URL") as? String,
           let url = URL(string: urlString), !urlString.contains("placeholder") {
            return url
        }
        if usePlaceholdersIfMissing { return URL(string: "https://localhost:3000")! }
        fatalError("Set API_BASE_URL in Info.plist or scheme environment")
    }

    /// URL the app opens after magic link sign-in (e.g. kodaai://auth/callback). Add to Supabase Redirect URLs.
    static var authRedirectURL: URL? {
        guard let s = Bundle.main.object(forInfoDictionaryKey: "AUTH_REDIRECT_URL") as? String,
              let url = URL(string: s) else { return nil }
        return url
    }
}
