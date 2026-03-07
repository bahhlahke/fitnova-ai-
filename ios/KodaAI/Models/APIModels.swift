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
    let days: [WeeklyPlanDay]?
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
    let projection: ProjectionData?
}

struct ProjectionData: Decodable {
    let weight_kg: Double?
    let body_fat_percent: Double?
    let message: String?
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

// MARK: - Post-workout, body comp, vision

struct PostWorkoutInsightResponse: Decodable {
    let insight: String?
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
