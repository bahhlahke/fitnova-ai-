//
//  DataModels.swift
//  Koda AI
//
//  Supabase table row types for feature parity with web.
//

import Foundation

// MARK: - user_profile

struct UserProfile: Codable {
    var user_id: String?
    var display_name: String?
    var email: String?
    var phone: String?
    var age: Int?
    var sex: String?
    var height_cm: Double?
    var weight_kg: Double?
    var goals: [String]?
    var injuries_limitations: String?
    var dietary_preferences: [String]?
    var activity_level: String?
    var devices: [String: AnyCodable]?
    var subscription_status: String?
    var stripe_customer_id: String?
    var role: String?
    var experience_level: String?
    var motivational_driver: String?
    var created_at: String?
    var updated_at: String?
}

// MARK: - workout_logs

struct WorkoutLog: Codable {
    var log_id: String?
    var user_id: String?
    var date: String?
    var workout_type: String?
    var exercises: [WorkoutExerciseEntry]?
    var duration_minutes: Int?
    var calories_burned: Int?
    var perceived_exertion: Int?
    var notes: String?
    var created_at: String?
}

struct WorkoutExerciseEntry: Codable {
    var name: String?
    var sets: Int?
    var reps: String?
    var weight_kg: Double?
    var rpe: Int?
    var form_cues: String?
}

// MARK: - nutrition_logs

struct NutritionLog: Codable {
    var log_id: String?
    var user_id: String?
    var date: String?
    var meals: [MealEntry]?
    var total_calories: Int?
    var protein_g: Int?
    var carbs_g: Int?
    var fat_g: Int?
    var hydration_liters: Double?
    var created_at: String?
}

struct MealEntry: Codable {
    var name: String?
    var calories: Int?
    var protein_g: Int?
    var carbs_g: Int?
    var fat_g: Int?
    var time_of_day: String?
}

// MARK: - progress_tracking

struct ProgressEntry: Codable {
    var track_id: String?
    var user_id: String?
    var date: String?
    var weight_kg: Double?
    var body_fat_percent: Double?
    var measurements: [String: Double]?
    var notes: String?
    var created_at: String?
}

// MARK: - daily_plans (plan_json is flexible; decode-only, DailyPlan is Decodable)

struct DailyPlanRow: Decodable {
    var plan_id: String?
    var user_id: String?
    var date_local: String?
    var plan_json: DailyPlan?
    var created_at: String?
}

// MARK: - check_ins

struct CheckIn: Codable {
    var check_in_id: String?
    var user_id: String?
    var date_local: String?
    var adherence_score: Int?
    var energy_score: Int?
    var sleep_hours: Double?
    var soreness_notes: String?
    var created_at: String?
}

// MARK: - onboarding

struct OnboardingRow: Codable {
    var onboarding_id: String?
    var user_id: String?
    var completed_at: String?
    var responses: [String: AnyCodable]?
}

// MARK: - nutrition_targets (already in APIModels as NutritionTarget)

// MARK: - coach_nudges

struct CoachNudge: Codable {
    var nudge_id: String?
    var user_id: String?
    var date_local: String?
    var nudge_type: String?
    var risk_level: String?
    var message: String?
    var cta_route: String?
    var cta_label: String?
    var expires_at: String?
    var acknowledged_at: String?
}
// MARK: - community

struct ConnectionRow: Codable {
    var connection_id: String?
    var user_id_1: String?
    var user_id_2: String?
    var status: String?
    var created_at: String?
    var profile_1: UserProfile?
    var profile_2: UserProfile?
}

struct AccountabilityPartner: Codable {
    var partner_id: String?
    var user_id: String?
    var partner_user_id: String?
    var status: String?
    var partner_profile: UserProfile?
}

struct ChallengeItem: Codable {
    var challenge_id: String?
    var name: String?
    var description: String?
    var start_date: String?
    var end_date: String?
    var participant_count: Int?
}
