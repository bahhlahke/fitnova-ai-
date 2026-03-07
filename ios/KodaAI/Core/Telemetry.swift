//
//  Telemetry.swift
//  Koda AI
//
//  Fire product events to API for analytics parity with web.
//

import Foundation

enum Telemetry {
    /// Call from key screens/actions. No-op if no token.
    static func track(_ eventName: String, props: [String: Any]? = nil) async {
        let api = KodaAPIService(getAccessToken: { await MainActor.run { SupabaseService.shared.accessToken } })
        try? await api.telemetryEvent(eventName: eventName, eventProps: props)
    }
}
