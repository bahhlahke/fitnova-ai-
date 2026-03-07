//
//  AppConfig.swift
//  Koda AI
//
//  Set these in your scheme Environment or in Info.plist so they are not committed.
//  For release, use xcconfig or CI secrets.
//

import Foundation

enum AppConfig {
    static var supabaseURL: URL {
        guard let urlString = Bundle.main.object(forInfoDictionaryKey: "SUPABASE_URL") as? String,
              let url = URL(string: urlString) else {
            fatalError("Set SUPABASE_URL in Info.plist or scheme environment")
        }
        return url
    }

    static var supabaseAnonKey: String {
        guard let key = Bundle.main.object(forInfoDictionaryKey: "SUPABASE_ANON_KEY") as? String, !key.isEmpty else {
            fatalError("Set SUPABASE_ANON_KEY in Info.plist or scheme environment")
        }
        return key
    }

    /// Base URL for the Koda AI Next.js API (e.g. https://askkodaai.com or https://your-app.vercel.app).
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
