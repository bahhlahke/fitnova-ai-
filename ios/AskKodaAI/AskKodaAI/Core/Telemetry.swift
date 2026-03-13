//
//  Telemetry.swift
//  Koda AI
//
//  Fire product events to API for analytics parity with web.
//

import Foundation

enum Telemetry {
    enum Event: String {
        case assessmentStart = "funnel_assessment_start"
        case assessmentStepCompleted = "funnel_assessment_step_completed"
        case leadCaptured = "funnel_lead_captured"
        case authStart = "funnel_auth_start"
        case authSuccess = "funnel_auth_success"
        case checkoutStart = "funnel_checkout_start"
        case checkoutSuccess = "funnel_checkout_success"
        case onboardingStart = "funnel_onboarding_start"
        case onboardingComplete = "funnel_onboarding_complete"
        
        case adaptSessionRequested = "adapt_session_requested"
        case adaptSessionApplied = "adapt_session_applied"
    }

    /// Call from key screens/actions. No-op if no token.
    static func track(_ event: Event, props: [String: Any]? = nil) {
        Task {
            let api = KodaAPIService(getAccessToken: { await MainActor.run { SupabaseService.shared.accessToken } })
            try? await api.telemetryEvent(eventName: event.rawValue, eventProps: props)
        }
    }
}
