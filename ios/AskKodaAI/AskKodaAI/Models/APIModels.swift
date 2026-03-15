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

struct CoachDeskResponse: Decodable {
    let insights: [CoachInsight]?
}

struct CoachInsight: Decodable, Identifiable {
    var id: String { title ?? UUID().uuidString }
    let title: String?
    let message: String?
    let urgency: String? // "low", "medium", "high"
    let cta_route: String?
    let supporting_data: CoachInsightSupportingData?
}

struct CoachInsightSupportingData: Decodable {
    let headline: String?
    let value: String?
    let context: String?
    let type: String? // "chart", "stat", "text"
}

struct EvolutionaryNarrativeResponse: Decodable {
    let narrative: String?
}

struct ProjectionResponse: Decodable {
    let current: Double?
    let projected_4w: Double?
    let projected_12w: Double?
    let rate: Double?
    let confidence: Double?
}

struct WorkoutParityGuard: Codable {
    let requires_approval: Bool?
    let summary: String?
    let divergence_count: Int?
    let diffs: [WorkoutParityDiff]?
}

struct WorkoutParityDiff: Codable {
    let exercise_index: Int?
    let exercise_name: String?
    let changed_fields: [String]?
    let baseline_summary: String?
    let candidate_summary: String?
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
    let movement_pattern: String?
    let rep_count: Int?
    let peak_velocity_mps: Double?
    let mean_velocity_mps: Double?
    let velocity_dropoff_percent: Double?
    let benchmark_report_path: String?
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
    let urgency: String?
    let status: String?
    let sla_due_at: String?
    let assigned_coach_user_id: String?
    let created_at: String?

    init(
        escalation_id: String? = nil,
        topic: String? = nil,
        urgency: String? = nil,
        status: String? = nil,
        sla_due_at: String? = nil,
        assigned_coach_user_id: String? = nil,
        created_at: String? = nil
    ) {
        self.escalation_id = escalation_id
        self.topic = topic
        self.urgency = urgency
        self.status = status
        self.sla_due_at = sla_due_at
        self.assigned_coach_user_id = assigned_coach_user_id
        self.created_at = created_at
    }
}

struct ActiveEscalationStateResponse: Decodable {
    let active: ActiveEscalationState?

    init(active: ActiveEscalationState?) {
        self.active = active
    }
}

struct ActiveEscalationState: Decodable {
    let escalation_id: String?
    let topic: String?
    let urgency: String?
    let status: String?
    let sla_due_at: String?
    let assigned_coach_user_id: String?
    let created_at: String?
    let latest_message: EscalationLatestMessage?

    init(
        escalation_id: String? = nil,
        topic: String? = nil,
        urgency: String? = nil,
        status: String? = nil,
        sla_due_at: String? = nil,
        assigned_coach_user_id: String? = nil,
        created_at: String? = nil,
        latest_message: EscalationLatestMessage? = nil
    ) {
        self.escalation_id = escalation_id
        self.topic = topic
        self.urgency = urgency
        self.status = status
        self.sla_due_at = sla_due_at
        self.assigned_coach_user_id = assigned_coach_user_id
        self.created_at = created_at
        self.latest_message = latest_message
    }
}

struct EscalationLatestMessage: Decodable {
    let body: String?
    let sender_type: String?
    let created_at: String?

    init(body: String? = nil, sender_type: String? = nil, created_at: String? = nil) {
        self.body = body
        self.sender_type = sender_type
        self.created_at = created_at
    }
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

/// Preferences sent when generating a meal plan. Mirrors web MealPlanPreferences type.
struct MealPlanPreferences: Encodable {
    var duration_days: Int
    var meals_per_day: Int
    var dietary_restrictions: [String]
    var allergies: [String]
    var cuisine_preferences: [String]
    var cooking_skill: String          // "beginner" | "intermediate" | "advanced"
    var prep_time_budget: String       // "quick" | "moderate" | "elaborate"
    var weekly_budget_usd: Double?
    var servings_per_meal: Int
    var meal_prep_mode: Bool
    var include_snacks: Bool

    static var `default`: MealPlanPreferences {
        MealPlanPreferences(
            duration_days: 7,
            meals_per_day: 3,
            dietary_restrictions: [],
            allergies: [],
            cuisine_preferences: [],
            cooking_skill: "intermediate",
            prep_time_budget: "moderate",
            weekly_budget_usd: nil,
            servings_per_meal: 1,
            meal_prep_mode: false,
            include_snacks: false
        )
    }
}

struct RecipeGenResponse: Decodable {
    let plan: RecipeGenPlan?
    let planId: String?
    // Backward-compat: top-level days/grocery_list if server returns them directly
    let days: [RecipeGenDay]?
    let grocery_list: [GroceryItem]?

    init(plan: RecipeGenPlan? = nil, planId: String? = nil, days: [RecipeGenDay]? = nil, grocery_list: [GroceryItem]? = nil) {
        self.plan = plan
        self.planId = planId
        self.days = days
        self.grocery_list = grocery_list
    }
}

struct RecipeGenPlan: Decodable {
    let days: [RecipeGenDay]?
    let grocery_list: [GroceryItem]?
    let total_estimated_cost_usd: Double?
}

struct RecipeGenDay: Decodable {
    let date: String?
    let meals: [RecipeGenMeal]?
}

struct RecipeGenMeal: Decodable {
    let name: String?
    let meal_type: String?      // "breakfast" | "lunch" | "dinner" | "snack"
    let calories: Int?
    let protein: Int?
    let carbs: Int?
    let fat: Int?
    let fiber_g: Double?
    let sodium_mg: Double?
    let recipe: String?
    let ingredients: [String]?  // imperial: "8 oz chicken breast"
    let prep_time_minutes: Int?
    let servings: Int?
    let cuisine_type: String?
    let estimated_cost_usd: Double?

    init(
        name: String? = nil,
        meal_type: String? = nil,
        calories: Int? = nil,
        protein: Int? = nil,
        carbs: Int? = nil,
        fat: Int? = nil,
        fiber_g: Double? = nil,
        sodium_mg: Double? = nil,
        recipe: String? = nil,
        ingredients: [String]? = nil,
        prep_time_minutes: Int? = nil,
        servings: Int? = nil,
        cuisine_type: String? = nil,
        estimated_cost_usd: Double? = nil
    ) {
        self.name = name
        self.meal_type = meal_type
        self.calories = calories
        self.protein = protein
        self.carbs = carbs
        self.fat = fat
        self.fiber_g = fiber_g
        self.sodium_mg = sodium_mg
        self.recipe = recipe
        self.ingredients = ingredients
        self.prep_time_minutes = prep_time_minutes
        self.servings = servings
        self.cuisine_type = cuisine_type
        self.estimated_cost_usd = estimated_cost_usd
    }
}

struct GroceryItem: Codable, Identifiable {
    var id: String { "\(category ?? "")_\(item ?? "")" }
    let item: String?
    let category: String?
    let quantity: String?
    let estimated_cost_usd: Double?
    var checked: Bool
    var custom: Bool?

    // Allow decoding without checked/custom fields (server may omit them)
    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        item = try c.decodeIfPresent(String.self, forKey: .item)
        category = try c.decodeIfPresent(String.self, forKey: .category)
        quantity = try c.decodeIfPresent(String.self, forKey: .quantity)
        estimated_cost_usd = try c.decodeIfPresent(Double.self, forKey: .estimated_cost_usd)
        checked = try c.decodeIfPresent(Bool.self, forKey: .checked) ?? false
        custom = try c.decodeIfPresent(Bool.self, forKey: .custom)
    }

    init(item: String?, category: String?, quantity: String?, estimated_cost_usd: Double? = nil, checked: Bool = false, custom: Bool? = nil) {
        self.item = item
        self.category = category
        self.quantity = quantity
        self.estimated_cost_usd = estimated_cost_usd
        self.checked = checked
        self.custom = custom
    }
}

// MARK: - Meal Swap

struct MealSwapResponse: Decodable {
    let options: [MealSwapOption]?
}

struct MealSwapOption: Decodable, Identifiable {
    var id: String { name ?? UUID().uuidString }
    let name: String?
    let meal_type: String?
    let calories: Int?
    let protein: Int?
    let carbs: Int?
    let fat: Int?
    let recipe: String?
    let ingredients: [String]?
    let prep_time_minutes: Int?
    let reason: String?
}

// MARK: - Eating Out

struct EatingOutLogResponse: Decodable {
    let log_id: String?
    let calories: Int?
    let protein_g: Int?
    let carbs_g: Int?
    let fat_g: Int?
}

// MARK: - Grocery CRUD

struct GroceryPatchResponse: Decodable {
    let ok: Bool?
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
