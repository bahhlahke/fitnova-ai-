//
//  APIModels.swift
//  Koda AI
//
//  Shared request/response types for API parity with web.
//

import Foundation

// MARK: - Weekly plan (matches lib/plan/types.ts)

struct WeeklyPlan: Decodable {
    let week_start_local: String?
    let cycle_goal: String?
    let adaptation_summary: String?
    var days: [WeeklyPlanDay]?
}

struct WeeklyPlanDay: Decodable {
    let date_local: String?
    let day_label: String?
    let focus: String?
    let intensity: String?
    let target_duration_minutes: Int?
    let rationale: String?
    let equipment_context: String?
    let exercises: [WeeklyPlanExercise]?
}

struct WeeklyPlanExercise: Decodable {
    let name: String?
    let equipment: String?
    let sets: Int?
    let reps: String?
    let coaching_cue: String?
}

// MARK: - Briefing, insights, projection

struct AIBriefingResponse: Decodable {
    let briefing: String?
    let rationale: String?
    let inputs: [String]?
}

struct BriefingResponse: Decodable {
    let briefing: String?
}

struct ReadinessInsightResponse: Decodable {
    let insight: String?
}

struct WeeklyInsightResponse: Decodable {
    let insight: String?
}

struct ProgressInsightResponse: Decodable {
    let insight: String?
}

struct ProjectionResponse: Decodable {
    let current: Double?
    let projected_4w: Double?
    let projected_12w: Double?
    let rate: Double?
    let confidence: Double?
}

/// GET /api/v1/ai/projection — flat response: current, projected_4w, projected_12w, rate, confidence
typealias DashboardProjectionResponse = ProjectionResponse

/// POST /api/v1/ai/retention-risk — risk_score (0–1), risk_level, reasons, recommended_action
struct RetentionRiskResponse: Decodable {
    let risk_score: Double?
    let risk_level: String?
    let reasons: [String]?
    let recommended_action: String?
    let rationale: String?
}

// MARK: - Nutrition

struct NutritionTargetResponse: Decodable {
    let target: NutritionTarget?
}

struct NutritionTarget: Decodable {
    let target_id: String?
    let calorie_target: Int?
    let protein_target_g: Int?
    let carbs_target_g: Int?
    let fat_target_g: Int?
    let meal_timing: [MealTimingSlot]?
    let active: Bool?
}

struct MealTimingSlot: Decodable {
    let label: String?
    let window: String?
}

struct AnalyzeMealResponse: Decodable {
    let name: String?
    let calories: Int?
    let protein_g: Int?
    let carbs_g: Int?
    let fat_g: Int?
    let confidence: Double?
}

struct BarcodeResponse: Decodable {
    let nutrition: BarcodeNutrition?
}

struct BarcodeNutrition: Decodable {
    let name: String?
    let brand: String?
    let calories: Int?
    let protein: Double?
    let carbs: Double?
    let fat: Double?
}

struct MealSuggestionsResponse: Decodable {
    let suggestions: [MealSuggestion]?
}

struct MealSuggestion: Decodable {
    let name: String?
    let calories: Int?
    let protein_g: Int?
    let carbs_g: Int?
    let fat_g: Int?
    let note: String?
}

struct NutritionInsightResponse: Decodable {
    let insight: String?
}

// MARK: - Plan adapt / swap

struct AdaptDayResponse: Decodable {
    let plan: DailyPlan?
}

struct SwapExerciseResponse: Decodable {
    let replacement: SwapReplacement?
    let reliability: SwapReliability?
}

struct SwapReplacement: Decodable {
    let name: String?
    let sets: Int?
    let reps: String?
    let intensity: String?
    let notes: String?
}

struct SwapReliability: Decodable {
    let confidence_score: Double?
    let explanation: String?
    let limitations: [String]?
}

struct PlanSwapResponse: Decodable {
    let replacement: PlanExercise?
    let rationale: String?
    let reliability: ReliabilityInfo?
}

struct ReliabilityInfo: Decodable {
    let confidence_score: Double?
}

// MARK: - Post-workout, body comp, vision

struct PostWorkoutInsightResponse: Decodable {
    let insight: String?
}

struct SpotifyTokenResponse: Decodable {
    let access_token: String?

    private enum CodingKeys: String, CodingKey {
        case access_token
        case token
    }

    init(access_token: String?) {
        self.access_token = access_token
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        access_token = try container.decodeIfPresent(String.self, forKey: .access_token)
            ?? container.decodeIfPresent(String.self, forKey: .token)
    }
}

struct WorkoutFeedbackResponse: Decodable {
    let feedback: String?
}

struct BodyCompResponse: Decodable {
    let body_fat_percent: Double?
    let analysis: String?
    let confidence: Double?
}

struct VisionAnalysisResponse: Decodable {
    let score: Double?
    let critique: String?
    let correction: String?
    let analysis_source: String?
    let analysis_mode: String?
    let benchmark_ms: Int?
    let frames_analyzed: Int?
    let pose_confidence: Double?
    let fallback_reason: String?
}

// MARK: - Coach escalate

struct EscalationListResponse: Decodable {
    let escalations: [EscalationItem]?
}

struct EscalationItem: Decodable {
    let escalation_id: String?
    let topic: String?
    let urgency: String?
    let status: String?
    let created_at: String?
}

struct EscalationMessagesResponse: Decodable {
    let messages: [EscalationMessage]?
}

struct EscalationMessage: Decodable {
    let escalation_message_id: String?
    let body: String?
    let sender_type: String?
    let created_at: String?
}

struct ActiveEscalationResponse: Decodable {
    let escalation: ActiveEscalation?
}

struct ActiveEscalation: Decodable {
    let escalation_id: String?
    let topic: String?
    let status: String?
}

// MARK: - Export, telemetry, awards

struct ExportResponse: Decodable {
    // Export returns raw data; we treat as Data or string
}

struct AwardsCheckResponse: Decodable {
    let awarded: [AwardItem]?
}

struct AwardItem: Decodable {
    let badge_id: String?
    let name: String?
}

// MARK: - Stripe

struct StripeCheckoutResponse: Decodable {
    let url: String?
    let sessionId: String?
}

// MARK: - Fridge scanner

struct FridgeScannerResponse: Decodable {
    let recipes: [FridgeRecipe]?
}

struct FridgeRecipe: Decodable {
    let name: String?
    let calories: Int?
    let protein: Int?
    let carbs: Int?
    let fat: Int?
    let ingredients: [String]?
    let instructions: String?
}

// MARK: - Recipe gen / meal plan

struct RecipeGenResponse: Decodable {
    let plan_id: String?
    let days: [RecipeGenDay]?
    let grocery_list: [GroceryItem]?
}

struct RecipeGenDay: Decodable {
    let date: String?
    let meals: [RecipeGenMeal]?
}

struct RecipeGenMeal: Decodable {
    let name: String?
    let meal_type: String?
    let calories: Int?
    let protein: Int?
    let carbs: Int?
    let fat: Int?
    let recipe: String?
    let ingredients: [String]?
}

struct GroceryItem: Decodable {
    let item: String?
    let category: String?
    let quantity: String?
}
// MARK: - Social / Community

struct SocialAccountabilityResponse: Decodable {
    let partner: AccountabilityPartner?
}

struct CommunityChallengesResponse: Decodable {
    let challenges: [ChallengeItem]?
}

struct SocialFriendsResponse: Decodable {
    let friends: [ConnectionRow]?
}
