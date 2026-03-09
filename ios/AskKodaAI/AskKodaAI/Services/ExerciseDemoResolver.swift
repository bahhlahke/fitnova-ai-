//
//  ExerciseDemoResolver.swift
//  Koda AI
//
//  Resolves exercise demo video URLs:
//  1. Check app bundle for a pre-bundled .mp4 (no network round-trip)
//  2. Fall back to a signed Supabase Storage URL from the "exercise-demos" bucket
//
//  Usage:
//    let url = await ExerciseDemoResolver.url(for: "Push-ups")
//

import Foundation

enum ExerciseDemoResolver {
    /// Returns a playable URL for the given exercise name, or nil if no asset is available.
    static func url(for exerciseName: String) async -> URL? {
        let slug = exerciseName
            .lowercased()
            .trimmingCharacters(in: .whitespacesAndNewlines)
            .replacingOccurrences(of: " ", with: "_")
            .replacingOccurrences(of: "-", with: "_")

        // 1. Bundle — instant, no network.
        if let local = Bundle.main.url(forResource: slug, withExtension: "mp4") {
            return local
        }

        // 2. Supabase Storage signed URL (1-hour TTL).
        return await fetchSignedURL(slug: slug)
    }

    private static func fetchSignedURL(slug: String) async -> URL? {
        do {
            let signedURL = try await SupabaseService.shared.supabaseClient
                .storage
                .from("exercise-demos")
                .createSignedURL(path: "\(slug).mp4", expiresIn: 3600)
            return signedURL
        } catch {
            return nil
        }
    }
}
