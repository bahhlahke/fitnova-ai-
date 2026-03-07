//
//  AppConfig.swift
//  Koda AI
//
//  Required at launch: SUPABASE_URL, SUPABASE_ANON_KEY, API_BASE_URL (Info.plist or scheme environment).
//  For release, use xcconfig or CI-injected values; never commit real keys.
//

import Foundation

enum AppConfig {
    /// Supabase project URL (https://xxx.supabase.co in production). Required; app will not launch without it.
    static var supabaseURL: URL {
        guard let urlString = Bundle.main.object(forInfoDictionaryKey: "SUPABASE_URL") as? String,
              let url = URL(string: urlString) else {
            fatalError("Set SUPABASE_URL in Info.plist or scheme environment")
        }
        return url
    }

    /// Supabase anon (public) key. Required; app will not launch without it.
    static var supabaseAnonKey: String {
        guard let key = Bundle.main.object(forInfoDictionaryKey: "SUPABASE_ANON_KEY") as? String, !key.isEmpty else {
            fatalError("Set SUPABASE_ANON_KEY in Info.plist or scheme environment")
        }
        return key
    }

    /// Base URL for the Koda AI Next.js API (HTTPS only in production).
    static var apiBaseURL: URL {
        guard let urlString = Bundle.main.object(forInfoDictionaryKey: "API_BASE_URL") as? String,
              let url = URL(string: urlString) else {
            fatalError("Set API_BASE_URL in Info.plist or scheme environment")
        }
        return url
    }

    /// URL the app opens after magic link sign-in (e.g. kodaai://auth/callback). Add to Supabase Redirect URLs.
    static var authRedirectURL: URL? {
        guard let s = Bundle.main.object(forInfoDictionaryKey: "AUTH_REDIRECT_URL") as? String,
              let url = URL(string: s) else { return nil }
        return url
    }
}
