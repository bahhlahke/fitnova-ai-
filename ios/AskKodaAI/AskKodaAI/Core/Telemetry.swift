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
        
        case cvRealtimeSessionCompleted = "ios_cv_realtime_session_completed"
        case cvAnalysisCompleted = "ios_cv_analysis_completed"
        case cvAnalysisFailed = "ios_cv_analysis_failed"
        
        case guidedFormCheckRealtimeCompleted = "ios_guided_form_check_realtime_completed"
        case guidedFormCheckCompleted = "ios_guided_form_check_completed"
        case guidedFormCheckFailed = "ios_guided_form_check_failed"
    }

    /// Call from key screens/actions. No-op if no token.
    static func track(_ event: Event, props: [String: Any]? = nil) async {
        let api = KodaAPIService(getAccessToken: { await MainActor.run { SupabaseService.shared.accessToken } })
        try? await api.telemetryEvent(eventName: event.rawValue, eventProps: props)
    }
}
