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
    var phone_number: String?
    var age: Int?
    var sex: String?
    var height_cm: Double?
    var weight_kg: Double?
    var goals: [String]?
    var injuries_limitations: AnyCodable?
    var dietary_preferences: AnyCodable?
    var activity_level: String?
    var devices: [String: AnyCodable]?
    var subscription_status: String?
    var stripe_customer_id: String?
    var role: String?
    var experience_level: String?
    var motivational_driver: String?
    var created_at: String?
    var updated_at: String?

    private enum CodingKeys: String, CodingKey {
        case user_id
        case display_name
        case name
        case email
        case phone_number
        case age
        case sex
        case height_cm
        case height
        case weight_kg
        case weight
        case goals
        case injuries_limitations
        case dietary_preferences
        case activity_level
        case devices
        case subscription_status
        case stripe_customer_id
        case role
        case experience_level
        case motivational_driver
        case created_at
        case updated_at
    }

    init(
        user_id: String? = nil,
        display_name: String? = nil,
        email: String? = nil,
        phone_number: String? = nil,
        age: Int? = nil,
        sex: String? = nil,
        height_cm: Double? = nil,
        weight_kg: Double? = nil,
        goals: [String]? = nil,
        injuries_limitations: AnyCodable? = nil,
        dietary_preferences: AnyCodable? = nil,
        activity_level: String? = nil,
        devices: [String: AnyCodable]? = nil,
        subscription_status: String? = nil,
        stripe_customer_id: String? = nil,
        role: String? = nil,
        experience_level: String? = nil,
        motivational_driver: String? = nil,
        created_at: String? = nil,
        updated_at: String? = nil
    ) {
        self.user_id = user_id
        self.display_name = display_name
        self.email = email
        self.phone_number = phone_number
        self.age = age
        self.sex = sex
        self.height_cm = height_cm
        self.weight_kg = weight_kg
        self.goals = goals
        self.injuries_limitations = injuries_limitations
        self.dietary_preferences = dietary_preferences
        self.activity_level = activity_level
        self.devices = devices
        self.subscription_status = subscription_status
        self.stripe_customer_id = stripe_customer_id
        self.role = role
        self.experience_level = experience_level
        self.motivational_driver = motivational_driver
        self.created_at = created_at
        self.updated_at = updated_at
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        user_id = try container.decodeIfPresent(String.self, forKey: .user_id)
        display_name =
            try container.decodeIfPresent(String.self, forKey: .display_name) ??
            container.decodeIfPresent(String.self, forKey: .name)
        email = try container.decodeIfPresent(String.self, forKey: .email)
        phone_number = try container.decodeIfPresent(String.self, forKey: .phone_number)
        age = try container.decodeIfPresent(Int.self, forKey: .age)
        sex = try container.decodeIfPresent(String.self, forKey: .sex)
        height_cm =
            try container.decodeIfPresent(Double.self, forKey: .height_cm) ??
            container.decodeIfPresent(Double.self, forKey: .height)
        weight_kg =
            try container.decodeIfPresent(Double.self, forKey: .weight_kg) ??
            container.decodeIfPresent(Double.self, forKey: .weight)
        goals = try container.decodeIfPresent([String].self, forKey: .goals)
        injuries_limitations = try container.decodeIfPresent(AnyCodable.self, forKey: .injuries_limitations)
        dietary_preferences = try container.decodeIfPresent(AnyCodable.self, forKey: .dietary_preferences)
        activity_level = try container.decodeIfPresent(String.self, forKey: .activity_level)
        devices = try container.decodeIfPresent([String: AnyCodable].self, forKey: .devices)
        subscription_status = try container.decodeIfPresent(String.self, forKey: .subscription_status)
        stripe_customer_id = try container.decodeIfPresent(String.self, forKey: .stripe_customer_id)
        role = try container.decodeIfPresent(String.self, forKey: .role)
        experience_level = try container.decodeIfPresent(String.self, forKey: .experience_level)
        motivational_driver = try container.decodeIfPresent(String.self, forKey: .motivational_driver)
        created_at = try container.decodeIfPresent(String.self, forKey: .created_at)
        updated_at = try container.decodeIfPresent(String.self, forKey: .updated_at)
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encodeIfPresent(user_id, forKey: .user_id)
        try container.encodeIfPresent(display_name, forKey: .name)
        try container.encodeIfPresent(email, forKey: .email)
        try container.encodeIfPresent(phone_number, forKey: .phone_number)
        try container.encodeIfPresent(age, forKey: .age)
        try container.encodeIfPresent(sex, forKey: .sex)
        try container.encodeIfPresent(height_cm, forKey: .height)
        try container.encodeIfPresent(weight_kg, forKey: .weight)
        try container.encodeIfPresent(goals, forKey: .goals)
        try container.encodeIfPresent(injuries_limitations, forKey: .injuries_limitations)
        try container.encodeIfPresent(dietary_preferences, forKey: .dietary_preferences)
        try container.encodeIfPresent(activity_level, forKey: .activity_level)
        try container.encodeIfPresent(devices, forKey: .devices)
        try container.encodeIfPresent(subscription_status, forKey: .subscription_status)
        try container.encodeIfPresent(stripe_customer_id, forKey: .stripe_customer_id)
        try container.encodeIfPresent(role, forKey: .role)
        try container.encodeIfPresent(experience_level, forKey: .experience_level)
        try container.encodeIfPresent(motivational_driver, forKey: .motivational_driver)
        try container.encodeIfPresent(created_at, forKey: .created_at)
        try container.encodeIfPresent(updated_at, forKey: .updated_at)
    }
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

// MARK: - connected_signals

struct ConnectedSignal: Codable {
    var connected_signal_id: String?
    var user_id: String?
    var provider: String?
    var signal_date: String?
    var sleep_hours: Double?
    var steps: Int?
    var hrv: Double?
    var resting_hr: Double?
    var workout_hr_avg: Double?
    var updated_at: String?
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
