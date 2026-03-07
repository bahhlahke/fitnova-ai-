//
//  DataModelsTests.swift
//  KodaAITests
//
//  Decoding tests for Supabase row types (production data contracts).
//

import XCTest
@testable import AskKodaAI

final class DataModelsTests: XCTestCase {

    var decoder: JSONDecoder!

    override func setUpWithError() throws {
        decoder = JSONDecoder()
    }

    func testUserProfileDecoding() throws {
        let json = """
        {"user_id":"u1","display_name":"Test","email":"test@example.com","age":30,"sex":"male","height_cm":180,"weight_kg":80,"goals":["build_muscle"],"activity_level":"moderate"}
        """
        let data = Data(json.utf8)
        let decoded = try decoder.decode(UserProfile.self, from: data)
        XCTAssertEqual(decoded.user_id, "u1")
        XCTAssertEqual(decoded.display_name, "Test")
        XCTAssertEqual(decoded.age, 30)
        XCTAssertEqual(decoded.weight_kg, 80)
        XCTAssertEqual(decoded.goals?.first, "build_muscle")
    }

    func testWorkoutLogDecoding() throws {
        let json = """
        {"log_id":"w1","user_id":"u1","date":"2026-03-07","workout_type":"strength","duration_minutes":45,"notes":"Felt good","exercises":[{"name":"Squat","sets":3,"reps":"8","weight_kg":100}]}
        """
        let data = Data(json.utf8)
        let decoded = try decoder.decode(WorkoutLog.self, from: data)
        XCTAssertEqual(decoded.log_id, "w1")
        XCTAssertEqual(decoded.date, "2026-03-07")
        XCTAssertEqual(decoded.duration_minutes, 45)
        XCTAssertEqual(decoded.exercises?.first?.name, "Squat")
        XCTAssertEqual(decoded.exercises?.first?.weight_kg, 100)
    }

    func testNutritionLogDecoding() throws {
        let json = """
        {"log_id":"n1","user_id":"u1","date":"2026-03-07","meals":[{"name":"Breakfast","calories":500,"protein_g":25,"carbs_g":50,"fat_g":20}],"total_calories":500,"protein_g":25,"carbs_g":50,"fat_g":20,"hydration_liters":2.0}
        """
        let data = Data(json.utf8)
        let decoded = try decoder.decode(NutritionLog.self, from: data)
        XCTAssertEqual(decoded.log_id, "n1")
        XCTAssertEqual(decoded.hydration_liters, 2.0)
        XCTAssertEqual(decoded.meals?.first?.name, "Breakfast")
        XCTAssertEqual(decoded.meals?.first?.protein_g, 25)
    }

    func testProgressEntryDecoding() throws {
        let json = """
        {"track_id":"p1","user_id":"u1","date":"2026-03-07","weight_kg":79.5,"body_fat_percent":18.0,"notes":"Morning"}
        """
        let data = Data(json.utf8)
        let decoded = try decoder.decode(ProgressEntry.self, from: data)
        XCTAssertEqual(decoded.track_id, "p1")
        XCTAssertEqual(decoded.weight_kg, 79.5)
        XCTAssertEqual(decoded.body_fat_percent, 18.0)
    }

    func testCoachNudgeDecoding() throws {
        let json = """
        {"nudge_id":"nn1","user_id":"u1","date_local":"2026-03-07","nudge_type":"retention_risk","risk_level":"medium","message":"Log a workout today to stay on track."}
        """
        let data = Data(json.utf8)
        let decoded = try decoder.decode(CoachNudge.self, from: data)
        XCTAssertEqual(decoded.nudge_id, "nn1")
        XCTAssertEqual(decoded.risk_level, "medium")
        XCTAssertNotNil(decoded.message)
    }

    func testNutritionLogHandlesMissingHydration() throws {
        let json = """
        {"log_id":"n2","user_id":"u1","date":"2026-03-07","meals":[],"total_calories":0}
        """
        let data = Data(json.utf8)
        let decoded = try decoder.decode(NutritionLog.self, from: data)
        XCTAssertNil(decoded.hydration_liters)
    }
}
