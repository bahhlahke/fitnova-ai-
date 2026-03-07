//
//  APIEndpoints.swift
//  Koda AI
//
//  Full API surface for feature parity with web. Uses KodaAPIService + retry.
//

import Foundation

extension KodaAPIService {

    // MARK: - AI

    func aiBriefing(localDate: String? = nil) async throws -> BriefingResponse {
        let body = localDate.map { ["localDate": $0] } ?? [:]
        return try await post("api/v1/ai/briefing", body: body)
    }

    func aiReadinessInsight(localDate: String? = nil) async throws -> ReadinessInsightResponse {
        let body = localDate.map { ["localDate": $0] } ?? [:]
        return try await post("api/v1/ai/readiness-insight", body: body)
    }

    func aiWeeklyInsight() async throws -> WeeklyInsightResponse {
        try await post("api/v1/ai/weekly-insight", body: [:])
    }

    func aiProgressInsight() async throws -> ProgressInsightResponse {
        try await post("api/v1/ai/progress-insight", body: [:])
    }

    func aiProjection(today: String? = nil) async throws -> ProjectionResponse {
        var path = "api/v1/ai/projection"
        if let t = today, !t.isEmpty { path += "?today=\(t)" }
        return try await get(path)
    }

    func aiRetentionRisk() async throws -> EmptyJSONResponse {
        try await post("api/v1/ai/retention-risk", body: [:])
    }

    func aiAnalyzeMeal(text: String? = nil, imageBase64: String? = nil) async throws -> AnalyzeMealResponse {
        var body: [String: Any] = [:]
        if let t = text, !t.isEmpty { body["text"] = t }
        if let img = imageBase64, !img.isEmpty { body["imageBase64"] = img }
        return try await post("api/v1/ai/analyze-meal", body: body)
    }

    func aiMealSuggestions(context: String? = nil) async throws -> MealSuggestionsResponse {
        let body = context.map { ["context": $0] } ?? [:]
        return try await post("api/v1/ai/meal-suggestions", body: body)
    }

    func aiNutritionInsight(dateLocal: String) async throws -> NutritionInsightResponse {
        try await post("api/v1/ai/nutrition-insight", body: ["dateLocal": dateLocal])
    }

    /// Body comp: pass data URLs (data:image/jpeg;base64,...) or raw base64 for front/side/back.
    func aiBodyComp(images: (front: String, side: String, back: String), localDate: String? = nil) async throws -> BodyCompResponse {
        var body: [String: Any] = ["images": ["front": images.front, "side": images.side, "back": images.back]]
        if let d = localDate { body["localDate"] = d }
        return try await post("api/v1/ai/body-comp", body: body)
    }

    /// Motion Lab / form check: pass array of image data URLs or base64 strings (1–3 frames).
    func aiVision(images: [String]) async throws -> VisionAnalysisResponse {
        let body: [String: Any] = ["images": images]
        return try await post("api/v1/ai/vision", body: body)
    }

    func aiPostWorkoutInsight(workoutId: String? = nil, dateLocal: String? = nil) async throws -> PostWorkoutInsightResponse {
        var body: [String: Any] = [:]
        if let id = workoutId { body["workoutId"] = id }
        if let d = dateLocal { body["dateLocal"] = d }
        return try await post("api/v1/ai/post-workout-insight", body: body)
    }

    func aiWorkoutFeedback(workoutSummary: String) async throws -> WorkoutFeedbackResponse {
        try await post("api/v1/ai/workout-feedback", body: ["workoutSummary": workoutSummary])
    }

    func aiFeedback(domain: String, outputId: String, rating: Int, correction: String? = nil) async throws -> EmptyJSONResponse {
        var body: [String: Any] = ["domain": domain, "output_id": outputId, "rating": rating]
        if let c = correction { body["correction"] = c }
        return try await post("api/v1/ai/feedback", body: body)
    }

    // MARK: - Plan

    func planAdaptDay(minutesAvailable: Int?, location: String?, soreness: String?) async throws -> AdaptDayResponse {
        var body: [String: Any] = [:]
        if let m = minutesAvailable { body["minutesAvailable"] = m }
        if let l = location { body["location"] = l }
        if let s = soreness { body["soreness"] = s }
        return try await post("api/v1/plan/adapt-day", body: body)
    }

    func planSwapExercise(currentExercise: String, reason: String, location: String?, sets: Int?, reps: String?, intensity: String?) async throws -> SwapExerciseResponse {
        var body: [String: Any] = ["currentExercise": currentExercise, "reason": reason]
        if let l = location { body["location"] = l }
        if let s = sets { body["sets"] = s }
        if let r = reps { body["reps"] = r }
        if let i = intensity { body["intensity"] = i }
        return try await post("api/v1/plan/swap-exercise", body: body)
    }

    // MARK: - Nutrition

    func nutritionTargetsGet() async throws -> NutritionTargetResponse {
        try await get("api/v1/nutrition/targets")
    }

    func nutritionTargetsPost(calorieTarget: Int?, proteinG: Int?, carbsG: Int?, fatG: Int?) async throws -> NutritionTargetResponse {
        var body: [String: Any] = [:]
        if let c = calorieTarget { body["calorie_target"] = c }
        if let p = proteinG { body["protein_target_g"] = p }
        if let c = carbsG { body["carbs_target_g"] = c }
        if let f = fatG { body["fat_target_g"] = f }
        return try await post("api/v1/nutrition/targets", body: body)
    }

    func nutritionAdherenceDaily(dateLocal: String? = nil) async throws -> EmptyJSONResponse {
        var path = "api/v1/nutrition/adherence/daily"
        if let d = dateLocal { path += "?date=\(d)" }
        return try await post(path, body: [:])
    }

    func nutritionBarcode(barcode: String) async throws -> BarcodeResponse {
        try await get("api/v1/nutrition/barcode?barcode=\(barcode.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? barcode)")
    }

    /// Fridge scanner: media = base64 or data URL, type = "image" or "video", localDate optional.
    func nutritionFridgeScanner(media: String, type: String = "image", localDate: String? = nil) async throws -> FridgeScannerResponse {
        var body: [String: Any] = ["media": media, "type": type]
        if let d = localDate { body["localDate"] = d }
        return try await post("api/v1/nutrition/fridge-scanner", body: body)
    }

    /// Meal plan / recipe gen: startDate YYYY-MM-DD, durationDays (default 7). Returns plan + grocery list.
    func aiRecipeGen(startDate: String? = nil, durationDays: Int = 7) async throws -> RecipeGenResponse {
        var body: [String: Any] = ["durationDays": durationDays]
        if let s = startDate { body["startDate"] = s }
        return try await post("api/v1/ai/recipe-gen", body: body)
    }

    // MARK: - Coach

    func coachEscalateList() async throws -> EscalationListResponse {
        try await get("api/v1/coach/escalate")
    }

    func coachEscalateCreate(topic: String, urgency: String, details: String?, preferredChannel: String?) async throws -> EscalationCreateResponse {
        var body: [String: Any] = ["topic": topic, "urgency": urgency]
        if let d = details { body["details"] = d }
        if let c = preferredChannel { body["preferred_channel"] = c }
        return try await post("api/v1/coach/escalate", body: body)
    }

    func coachEscalateActive() async throws -> ActiveEscalationResponse {
        try await get("api/v1/coach/escalate/active")
    }

    func coachEscalateMessages(escalationId: String) async throws -> EscalationMessagesResponse {
        try await get("api/v1/coach/escalate/\(escalationId)/messages")
    }

    func coachEscalateSendMessage(escalationId: String, body: String) async throws -> EscalationMessagesResponse {
        try await post("api/v1/coach/escalate/\(escalationId)/messages", body: ["body": body])
    }

    func coachNudgeAck(nudgeId: String) async throws -> EmptyJSONResponse {
        try await post("api/v1/coach/nudges/\(nudgeId)/ack", body: [:])
    }

    func coachAudio(context: String, metrics: [String: Any]?) async throws -> CoachAudioResponse {
        var body: [String: Any] = ["context": context]
        if let m = metrics { body["metrics"] = m }
        return try await post("api/v1/coach/audio", body: body)
    }

    // MARK: - Analytics & progression

    func analyticsProcessPRs() async throws -> EmptyJSONResponse {
        try await post("api/v1/analytics/process-prs", body: [:])
    }

    func progressionNextTargets(exercises: [String]) async throws -> NextTargetsResponse {
        guard !exercises.isEmpty else { return NextTargetsResponse(targets: nil) }
        let encoded = exercises.map { $0.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? $0 }
        let query = encoded.map { "exercises=\($0)" }.joined(separator: "&")
        let path = "api/v1/progression/next-targets?\(query)"
        return try await get(path)
    }

    func progressionRecompute() async throws -> EmptyJSONResponse {
        try await post("api/v1/progression/recompute", body: [:])
    }

    // MARK: - Social & community

    /// Returns array of connection rows (status, friend/user profile). Split into friends (accepted) and requests (pending) in the UI.
    func socialFriends() async throws -> [ConnectionRow] {
        try await get("api/v1/social/friends")
    }

    func socialFriendsPost(friendId: String, action: String) async throws -> EmptyJSONResponse {
        try await post("api/v1/social/friends", body: ["friendId": friendId, "action": action])
    }

    func socialAccountability() async throws -> AccountabilityResponse {
        try await get("api/v1/social/accountability")
    }

    func socialAccountabilityPost(partnerUserId: String?) async throws -> EmptyJSONResponse {
        var body: [String: Any] = [:]
        if let p = partnerUserId { body["partner_user_id"] = p }
        return try await post("api/v1/social/accountability", body: body)
    }

    func communityChallenges() async throws -> ChallengesResponse {
        try await get("api/v1/community/challenges")
    }

    func communityChallengesPost(challengeId: String) async throws -> EmptyJSONResponse {
        try await post("api/v1/community/challenges", body: ["challenge_id": challengeId])
    }

    // MARK: - Billing & export

    func stripeCheckout(priceId: String?, successUrl: String?, cancelUrl: String?) async throws -> StripeCheckoutResponse {
        var body: [String: Any] = [:]
        if let p = priceId { body["priceId"] = p }
        if let s = successUrl { body["successUrl"] = s }
        if let c = cancelUrl { body["cancelUrl"] = c }
        return try await post("api/v1/stripe/checkout", body: body)
    }

    func exportData(format: String) async throws -> Data {
        var path = "api/v1/export?format=\(format)"
        let url = baseURL.appendingPathComponent(path)
        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        if let token = await getAccessToken() {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        let (data, response) = try await URLSession.shared.data(for: request)
        try validateResponse(response, data: data)
        return data
    }

    func telemetryEvent(eventName: String, eventProps: [String: Any]?) async throws {
        var body: [String: Any] = ["event_name": eventName]
        if let p = eventProps { body["event_props"] = p }
        _ = try await post("api/v1/telemetry/event", body: body) as EmptyJSONResponse
    }

    func awardsCheck() async throws -> AwardsCheckResponse {
        try await post("api/v1/awards/check", body: [:])
    }
}

// MARK: - Extra response types

struct EmptyJSONResponse: Decodable {}

struct BarcodeResponse: Decodable {
    let product: BarcodeProduct?
}

struct BarcodeProduct: Decodable {
    let name: String?
    let calories: Int?
    let protein_g: Int?
    let carbs_g: Int?
    let fat_g: Int?
}

struct EscalationCreateResponse: Decodable {
    let escalation_id: String?
}

struct CoachAudioResponse: Decodable {
    let audioBase64: String?
    let url: String?
}

struct NextTargetsResponse: Decodable {
    let targets: [NextTarget]?
}

struct NextTarget: Decodable {
    let exercise: String?
    let next_target: String?
}

struct ConnectionRow: Decodable {
    let connection_id: String?
    let status: String?
    let friend: FriendProfile?
    let user: FriendProfile?
}

struct FriendProfile: Decodable {
    let user_id: String?
    let name: String?
    let xp: Int?
}

struct AccountabilityResponse: Decodable {
    let partner: AccountabilityPartner?
}

struct AccountabilityPartner: Decodable {
    let user_id: String?
    let display_name: String?
}

struct ChallengesResponse: Decodable {
    let challenges: [ChallengeItem]?
}

struct ChallengeItem: Decodable {
    let challenge_id: String?
    let name: String?
    let start_date: String?
    let end_date: String?
}
