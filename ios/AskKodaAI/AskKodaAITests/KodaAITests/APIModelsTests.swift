//
//  APIModelsTests.swift
//  KodaAITests
//
//  Decoding tests for API response models (parity with web API).
//

import XCTest
@testable import AskKodaAI

final class APIModelsTests: XCTestCase {

    var decoder: JSONDecoder!

    override func setUpWithError() throws {
        decoder = JSONDecoder()
    }

    func testDashboardProjectionResponseDecoding() throws {
        let json = """
        {"current":80.5,"projected_4w":79.1,"projected_12w":76.3,"rate":-0.35,"confidence":0.88}
        """
        let data = Data(json.utf8)
        let decoded = try decoder.decode(DashboardProjectionResponse.self, from: data)
        XCTAssertEqual(decoded.current, 80.5)
        XCTAssertEqual(decoded.projected_4w, 79.1)
        XCTAssertEqual(decoded.projected_12w, 76.3)
        XCTAssertEqual(decoded.rate, -0.35)
        XCTAssertEqual(decoded.confidence, 0.88)
    }

    func testRetentionRiskResponseDecoding() throws {
        let json = """
        {"risk_score":0.42,"risk_level":"medium","reasons":["2 day(s) since last workout log"],"recommended_action":"Generate today's plan and complete one key action."}
        """
        let data = Data(json.utf8)
        let decoded = try decoder.decode(RetentionRiskResponse.self, from: data)
        XCTAssertEqual(decoded.risk_score, 0.42)
        XCTAssertEqual(decoded.risk_level, "medium")
        XCTAssertEqual(decoded.reasons?.first, "2 day(s) since last workout log")
        XCTAssertNotNil(decoded.recommended_action)
    }

    func testBriefingResponseDecoding() throws {
        let json = """
        {"briefing":"Today's focus: strength. You're on track for the week."}
        """
        let data = Data(json.utf8)
        let decoded = try decoder.decode(BriefingResponse.self, from: data)
        XCTAssertEqual(decoded.briefing, "Today's focus: strength. You're on track for the week.")
    }

    func testNutritionInsightResponseDecoding() throws {
        let json = """
        {"insight":"Your protein intake is solid. Consider adding a post-workout shake."}
        """
        let data = Data(json.utf8)
        let decoded = try decoder.decode(NutritionInsightResponse.self, from: data)
        XCTAssertNotNil(decoded.insight)
    }

    func testAnalyzeMealResponseDecoding() throws {
        let json = """
        {"name":"Scrambled eggs and toast","calories":320,"protein_g":18,"carbs_g":28,"fat_g":16,"confidence":0.92}
        """
        let data = Data(json.utf8)
        let decoded = try decoder.decode(AnalyzeMealResponse.self, from: data)
        XCTAssertEqual(decoded.name, "Scrambled eggs and toast")
        XCTAssertEqual(decoded.calories, 320)
        XCTAssertEqual(decoded.protein_g, 18)
        XCTAssertEqual(decoded.confidence, 0.92)
    }

    func testProjectionResponseHandlesOptionalFields() throws {
        let json = """
        {"current":75.0}
        """
        let data = Data(json.utf8)
        let decoded = try decoder.decode(DashboardProjectionResponse.self, from: data)
        XCTAssertEqual(decoded.current, 75.0)
        XCTAssertNil(decoded.projected_4w)
        XCTAssertNil(decoded.projected_12w)
    }

    func testPerformanceResponseDecoding() throws {
        let json = """
        {"workout_days":5,"workout_minutes":180,"set_volume":42,"push_pull_balance":"balanced","nutrition_compliance":0.85}
        """
        let data = Data(json.utf8)
        let decoded = try decoder.decode(PerformanceResponse.self, from: data)
        XCTAssertEqual(decoded.workout_days, 5)
        XCTAssertEqual(decoded.workout_minutes, 180)
        XCTAssertEqual(decoded.set_volume, 42)
        XCTAssertEqual(decoded.nutrition_compliance, 0.85)
    }

    func testDailyPlanResponseDecoding() throws {
        let json = """
        {"plan":{"date_local":"2026-03-07","training_plan":{"exercises":[{"name":"Squat","sets":3,"reps":"8"}]},"nutrition_plan":{"calories_target":2200,"protein_g":150},"safety_notes":[]}}
        """
        let data = Data(json.utf8)
        let decoded = try decoder.decode(DailyPlanResponse.self, from: data)
        XCTAssertEqual(decoded.plan.date_local, "2026-03-07")
        XCTAssertEqual(decoded.plan.training_plan?.exercises?.first?.name, "Squat")
        XCTAssertEqual(decoded.plan.nutrition_plan?.protein_g, 150)
    }

    func testBarcodeResponseDecoding() throws {
        let json = """
        {"nutrition":{"name":"Protein Bar","brand":"Acme","calories":200,"protein":20.0,"carbs":22.0,"fat":8.0}}
        """
        let data = Data(json.utf8)
        let decoded = try decoder.decode(BarcodeResponse.self, from: data)
        XCTAssertEqual(decoded.nutrition?.name, "Protein Bar")
        XCTAssertEqual(decoded.nutrition?.calories, 200)
        XCTAssertEqual(decoded.nutrition?.protein, 20.0)
    }

    func testVisionAnalysisResponseDecoding() throws {
        let json = """
        {"score":0.88,"critique":"Good depth.","correction":"Drive through heels.","analysis_source":"on_device","analysis_mode":"on_device_pose_photo","benchmark_ms":128,"frames_analyzed":3,"pose_confidence":0.81,"movement_pattern":"squat","rep_count":4,"peak_velocity_mps":0.72,"mean_velocity_mps":0.61,"velocity_dropoff_percent":12.5,"benchmark_report_path":"/tmp/report.json"}
        """
        let data = Data(json.utf8)
        let decoded = try decoder.decode(VisionAnalysisResponse.self, from: data)
        XCTAssertEqual(decoded.score, 0.88)
        XCTAssertNotNil(decoded.critique)
        XCTAssertNotNil(decoded.correction)
        XCTAssertEqual(decoded.analysis_source, "on_device")
        XCTAssertEqual(decoded.analysis_mode, "on_device_pose_photo")
        XCTAssertEqual(decoded.benchmark_ms, 128)
        XCTAssertEqual(decoded.frames_analyzed, 3)
        XCTAssertEqual(decoded.pose_confidence, 0.81)
        XCTAssertEqual(decoded.movement_pattern, "squat")
        XCTAssertEqual(decoded.rep_count, 4)
        XCTAssertEqual(decoded.peak_velocity_mps, 0.72)
        XCTAssertEqual(decoded.mean_velocity_mps, 0.61)
        XCTAssertEqual(decoded.velocity_dropoff_percent, 12.5)
        XCTAssertEqual(decoded.benchmark_report_path, "/tmp/report.json")
    }

    func testBodyCompResponseDecoding() throws {
        let json = """
        {"body_fat_percent":18.5,"analysis":"Within healthy range.","confidence":0.9}
        """
        let data = Data(json.utf8)
        let decoded = try decoder.decode(BodyCompResponse.self, from: data)
        XCTAssertEqual(decoded.body_fat_percent, 18.5)
        XCTAssertEqual(decoded.confidence, 0.9)
    }

    func testAPIErrorBodyDecoding() throws {
        let json = """
        {"error":"Sign in is required.","code":"AUTH_REQUIRED"}
        """
        let data = Data(json.utf8)
        let decoded = try decoder.decode(APIErrorBody.self, from: data)
        XCTAssertEqual(decoded.error, "Sign in is required.")
        XCTAssertEqual(decoded.code, "AUTH_REQUIRED")
    }

    func testStripeCheckoutResponseDecoding() throws {
        let json = """
        {"url":"https://checkout.stripe.com/...","sessionId":"cs_xxx"}
        """
        let data = Data(json.utf8)
        let decoded = try decoder.decode(StripeCheckoutResponse.self, from: data)
        XCTAssertNotNil(decoded.url)
        XCTAssertNotNil(decoded.sessionId)
    }

    func testSpotifyTokenResponseSupportsTokenAlias() throws {
        let json = """
        {"token":"spotify-provider-token"}
        """
        let data = Data(json.utf8)
        let decoded = try decoder.decode(SpotifyTokenResponse.self, from: data)
        XCTAssertEqual(decoded.access_token, "spotify-provider-token")
    }

    func testSpotifyTokenResponseSupportsAccessTokenKey() throws {
        let json = """
        {"access_token":"spotify-provider-token"}
        """
        let data = Data(json.utf8)
        let decoded = try decoder.decode(SpotifyTokenResponse.self, from: data)
        XCTAssertEqual(decoded.access_token, "spotify-provider-token")
    }
}
