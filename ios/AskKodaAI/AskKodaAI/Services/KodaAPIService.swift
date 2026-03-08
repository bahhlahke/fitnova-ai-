//
//  KodaAPIService.swift
//  Koda AI
//
//  Calls the Next.js API with Bearer token. All /api/v1/* routes accept Authorization: Bearer <access_token>.
//

import Foundation

struct KodaAPIService {
    let baseURL: URL
    let getAccessToken: () async -> String?

    init(baseURL: URL = AppConfig.apiBaseURL, getAccessToken: @escaping () async -> String?) {
        self.baseURL = baseURL
        self.getAccessToken = getAccessToken
    }

    /// POST /api/v1/ai/respond — AI coach chat.
    func aiRespond(message: String, localDate: String? = nil) async throws -> AIReplyResponse {
        let body: [String: Any] = {
            var b: [String: Any] = ["message": message]
            if let d = localDate, !d.isEmpty { b["localDate"] = d }
            return b
        }()
        return try await post("api/v1/ai/respond", body: body)
    }

    /// GET /api/v1/ai/coach-desk — Proactive mastery insights.
    func aiCoachDesk() async throws -> CoachDeskResponse {
        try await get("api/v1/ai/coach-desk")
    }

    /// GET /api/v1/user/trophies — Earned elite protocols.
    func getTrophies() async throws -> TrophyResponse {
        try await get("api/v1/user/trophies")
    }
    
    /// GET /api/v1/ai/history — AI chat history.
    func aiHistory() async throws -> HistoryResponse {
        return try await get("api/v1/ai/history")
    }

    /// POST /api/v1/plan/daily — Generate and save daily plan.
    func planDaily(todayConstraints: DailyConstraints? = nil) async throws -> DailyPlanResponse {
        let body = todayConstraints.map { ["todayConstraints": $0.asJSON] } ?? [:]
        return try await post("api/v1/plan/daily", body: body)
    }

    /// GET /api/v1/plan/weekly
    func planWeekly(refresh: Bool = false) async throws -> WeeklyPlanResponse {
        var path = "api/v1/plan/weekly"
        if refresh { path += "?refresh=1" }
        return try await get(path)
    }

    /// GET /api/v1/analytics/performance — 14-day analytics.
    func analyticsPerformance() async throws -> PerformanceResponse {
        try await get("api/v1/analytics/performance")
    }
    
    /// GET /api/v1/community/squad/overview — Squad leaderboard and rank.
    func communitySquadOverview() async throws -> SquadOverviewResponse {
        try await get("api/v1/community/squad/overview")
    }
    
    /// GET /api/v1/community/squad/vibes — Real-time squad activity feed.
    func communitySquadVibes() async throws -> SquadVibesResponse {
        try await get("api/v1/community/squad/vibes")
    }

    /// GET /api/v1/ai/weekly-insight
    func aiWeeklyInsight() async throws -> WeeklyInsightResponse {
        try await get("api/v1/ai/weekly-insight")
    }

    /// POST /api/v1/plan/adapt-day
    func planAdaptDay(minutesAvailable: Int?, location: String?, soreness: String?, intensity: String?, equipmentContext: String?) async throws -> DailyPlanResponse {
        var body: [String: Any] = [:]
        if let m = minutesAvailable { body["minutesAvailable"] = m }
        if let l = location { body["location"] = l }
        if let s = soreness { body["soreness"] = s }
        if let i = intensity { body["intensity"] = i }
        if let ec = equipmentContext { body["equipmentContext"] = ec }
        return try await post("api/v1/plan/adapt-day", body: body)
    }

    /// POST /api/v1/stripe/checkout
    func stripeCheckout(priceId: String?, successUrl: String?, cancelUrl: String?) async throws -> StripeCheckoutResponse {
        var body: [String: Any] = [:]
        if let p = priceId { body["priceId"] = p }
        if let s = successUrl { body["successUrl"] = s }
        if let c = cancelUrl { body["cancelUrl"] = c }
        return try await post("api/v1/stripe/checkout", body: body)
    }

    /// POST /api/v1/ai/body-comp
    func aiBodyComp(images: (String, String, String), localDate: String) async throws -> BodyCompResponse {
        let body: [String: Any] = [
            "images": [images.0, images.1, images.2],
            "localDate": localDate
        ]
        return try await post("api/v1/ai/body-comp", body: body)
    }

    /// GET /api/v1/ai/projection
    func aiProjection(today: String) async throws -> DashboardProjectionResponse {
        try await get("api/v1/ai/projection?today=\(today)")
    }

    /// POST /api/v1/ai/retention-risk
    func aiRetentionRisk(localDate: String) async throws -> RetentionRiskResponse {
        let body = ["localDate": localDate]
        return try await post("api/v1/ai/retention-risk", body: body)
    }

    /// POST /api/v1/ai/briefing
    func aiBriefing(localDate: String) async throws -> AIBriefingResponse {
        let body = ["localDate": localDate]
        return try await post("api/v1/ai/briefing", body: body)
    }

    /// POST /api/v1/ai/coach-nudge/ack
    func coachNudgeAck(nudgeId: String) async throws -> [String: AnyCodable] {
        let body = ["nudgeId": nudgeId]
        return try await post("api/v1/ai/coach-nudge/ack", body: body)
    }

    /// GET /api/v1/user/export
    func exportData(format: String) async throws -> Data {
        let path = "api/v1/user/export?format=\(format)"
        let url: URL
        if let u = URL(string: path, relativeTo: baseURL)?.absoluteURL {
            url = u
        } else { throw KodaAPIError.invalidURL }
        
        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        if let token = await getAccessToken() {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        let (data, response) = try await URLSession.shared.data(for: request)
        try validateResponse(response, data: data)
        return data
    }

    /// POST /api/v1/ai/readiness-insight
    func aiReadinessInsight(localDate: String) async throws -> ReadinessInsightResponse {
        return try await post("api/v1/ai/readiness-insight", body: ["localDate": localDate])
    }

    /// POST /api/v1/ai/post-workout-insight
    func aiPostWorkoutInsight(dateLocal: String) async throws -> PostWorkoutInsightResponse {
        return try await post("api/v1/ai/post-workout-insight", body: ["dateLocal": dateLocal])
    }

    /// POST /api/v1/user/awards/check
    func awardsCheck() async throws -> AwardsCheckResponse {
        return try await post("api/v1/user/awards/check", body: [:])
    }

    /// POST /api/v1/analytics/process-prs
    func analyticsProcessPRs() async throws -> [String: AnyCodable] {
        return try await post("api/v1/analytics/process-prs", body: [:])
    }

    /// GET /api/v1/spotify/token
    func spotifyToken() async throws -> SpotifyTokenResponse {
        return try await get("api/v1/spotify/token")
    }

    /// POST /api/v1/ai/vision
    func aiVision(images: [String]) async throws -> VisionAnalysisResponse {
        return try await post("api/v1/ai/vision", body: ["images": images])
    }

    /// POST /api/v1/plan/swap-exercise
    func planSwapExercise(currentExercise: String, reason: String, location: String?, sets: Int?, reps: String?, intensity: String?) async throws -> PlanSwapResponse {
        var body: [String: Any] = ["currentExercise": currentExercise, "reason": reason]
        if let l = location { body["location"] = l }
        if let s = sets { body["sets"] = s }
        if let r = reps { body["reps"] = r }
        if let i = intensity { body["intensity"] = i }
        return try await post("api/v1/plan/swap-exercise", body: body)
    }

    /// GET /api/v1/ai/progress-insight
    func aiProgressInsight() async throws -> ProgressInsightResponse {
        return try await get("api/v1/ai/progress-insight")
    }

    /// POST /api/v1/nutrition/fridge-scanner
    func nutritionFridgeScanner(media: String, type: String, localDate: String) async throws -> FridgeScannerResponse {
        return try await post("api/v1/nutrition/fridge-scanner", body: ["media": media, "type": type, "localDate": localDate])
    }

    /// POST /api/v1/ai/recipe-gen
    func aiRecipeGen(startDate: String, durationDays: Int) async throws -> RecipeGenResponse {
        return try await post("api/v1/ai/recipe-gen", body: ["startDate": startDate, "durationDays": durationDays])
    }

    /// POST /api/v1/telemetry/event
    func telemetryEvent(eventName: String, eventProps: [String: Any]?) async throws -> [String: AnyCodable] {
        var body: [String: Any] = ["eventName": eventName]
        if let p = eventProps { body["eventProps"] = p }
        return try await post("api/v1/telemetry/event", body: body)
    }

    /// GET /api/v1/coach/escalate/list
    func coachEscalateList() async throws -> EscalationListResponse {
        return try await get("api/v1/coach/escalate/list")
    }

    /// POST /api/v1/coach/escalate/create
    func coachEscalateCreate(topic: String, urgency: String, details: String?, preferredChannel: String?) async throws -> ActiveEscalationResponse {
        var body: [String: Any] = ["topic": topic, "urgency": urgency]
        if let d = details { body["details"] = d }
        if let p = preferredChannel { body["preferredChannel"] = p }
        return try await post("api/v1/coach/escalate/create", body: body)
    }

    /// GET /api/v1/coach/escalate/messages
    func coachEscalateMessages(escalationId: String) async throws -> EscalationMessagesResponse {
        return try await get("api/v1/coach/escalate/messages?escalationId=\(escalationId)")
    }

    /// POST /api/v1/coach/escalate/send
    func coachEscalateSendMessage(escalationId: String, body: String) async throws -> EscalationMessagesResponse {
        return try await post("api/v1/coach/escalate/send", body: ["escalationId": escalationId, "body": body])
    }

    /// GET /api/v1/social/friends
    func socialFriends() async throws -> [ConnectionRow] {
        return try await get("api/v1/social/friends")
    }

    /// GET /api/v1/social/accountability
    func socialAccountability() async throws -> SocialAccountabilityResponse {
        return try await get("api/v1/social/accountability")
    }

    /// GET /api/v1/community/challenges
    func communityChallenges() async throws -> CommunityChallengesResponse {
        return try await get("api/v1/community/challenges")
    }

    /// POST /api/v1/community/challenges/join
    func communityChallengesPost(challengeId: String) async throws -> [String: AnyCodable] {
        return try await post("api/v1/community/challenges/join", body: ["challengeId": challengeId])
    }


    /// GET /api/v1/nutrition/targets
    func nutritionTargetsGet() async throws -> NutritionTargetResponse {
        return try await get("api/v1/nutrition/targets")
    }

    /// GET /api/v1/ai/nutrition-insight
    func aiNutritionInsight(dateLocal: String) async throws -> NutritionInsightResponse {
        return try await get("api/v1/ai/nutrition-insight?dateLocal=\(dateLocal)")
    }

    /// GET /api/v1/ai/meal-suggestions
    func aiMealSuggestions() async throws -> MealSuggestionsResponse {
        return try await get("api/v1/ai/meal-suggestions")
    }

    /// GET /api/v1/nutrition/barcode/:code
    func nutritionBarcode(barcode: String) async throws -> BarcodeResponse {
        return try await get("api/v1/nutrition/barcode/\(barcode)")
    }

    /// POST /api/v1/ai/analyze-meal
    func aiAnalyzeMeal(text: String?, imageBase64: String?) async throws -> AnalyzeMealResponse {
        var body: [String: Any] = [:]
        if let t = text { body["text"] = t }
        if let i = imageBase64 { body["imageBase64"] = i }
        return try await post("api/v1/ai/analyze-meal", body: body)
    }

    // MARK: - Private

    func get<T: Decodable>(_ path: String) async throws -> T {
        let url: URL
        if path.hasPrefix("http"), let u = URL(string: path) {
            url = u
        } else if let u = URL(string: path, relativeTo: baseURL)?.absoluteURL {
            url = u
        } else {
            throw KodaAPIError.invalidURL
        }
        var request = URLRequest(url: url)
        request.timeoutInterval = 30
        request.httpMethod = "GET"
        if let token = await getAccessToken() {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        let (data, response) = try await URLSession.shared.data(for: request)
        try validateResponse(response, data: data)
        return try JSONDecoder().decode(T.self, from: data)
    }

    func post<T: Decodable>(_ path: String, body: [String: Any]) async throws -> T {
        let url: URL
        if path.hasPrefix("http"), let u = URL(string: path) {
            url = u
        } else if let u = URL(string: path, relativeTo: baseURL)?.absoluteURL {
            url = u
        } else {
            throw KodaAPIError.invalidURL
        }
        var request = URLRequest(url: url)
        request.timeoutInterval = 30
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        if let token = await getAccessToken() {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        request.httpBody = try JSONSerialization.data(withJSONObject: body)
        let (data, response) = try await URLSession.shared.data(for: request)
        try validateResponse(response, data: data)
        return try JSONDecoder().decode(T.self, from: data)
    }

    func validateResponse(_ response: URLResponse, data: Data) throws {
        guard let http = response as? HTTPURLResponse else { return }
        guard (200 ..< 300).contains(http.statusCode) else {
            let message = (try? JSONDecoder().decode(APIErrorBody.self, from: data))?.error ?? String(data: data, encoding: .utf8) ?? "Unknown error"
            throw KodaAPIError.http(status: http.statusCode, message: message)
        }
    }
}

// MARK: - Response / request types

struct APIErrorBody: Decodable {
    let error: String?
    let code: String?
}

struct AIReplyResponse: Decodable {
    let reply: String
    let action: AIAction?
}

struct AIAction: Decodable {
    let type: String
    let payload: AIActionPayload?
}

struct AIActionPayload: Decodable {
    let exercise_name: String?
    let video_url: String?
}

struct HistoryResponse: Decodable {
    let history: [HistoryMessage]?
}

struct HistoryMessage: Decodable {
    let role: String
    let content: String
}

struct DailyPlanResponse: Decodable {
    let plan: DailyPlan
}

struct DailyPlan: Decodable {
    let date_local: String
    let training_plan: TrainingPlan?
    let nutrition_plan: NutritionPlan?
    let safety_notes: [String]?
}

struct TrainingPlan: Decodable {
    let focus: String?
    let duration_minutes: Int?
    let exercises: [PlanExercise]?
}

struct PlanExercise: Decodable {
    let name: String?
    let sets: Int?
    let reps: String?
    let intensity: String?
    let notes: String?
    let tempo: String?
    let breathing: String?
    let intent: String?
    let rationale: String?
    let target_rir: Int?
    let target_load_kg: Double?
    let video_url: String?
    let cinema_video_url: String?
    let image_url: String?
}

struct NutritionPlan: Decodable {
    let calories_target: Int?
    let protein_g: Int?
    let carbs_g: Int?
    let fat_g: Int?
}

struct WeeklyPlanResponse: Decodable {
    let plan: WeeklyPlan?
}

struct PerformanceResponse: Decodable {
    let workout_days: Int?
    let workout_minutes: Int?
    let set_volume: Int?
    let push_pull_balance: String?
    let recovery_debt: String?
    let nutrition_compliance: Double?
}

struct DailyConstraints {
    var minutesAvailable: Int?
    var location: String?
    var soreness: String?

    var asJSON: [String: Any] {
        var d: [String: Any] = [:]
        if let m = minutesAvailable { d["minutesAvailable"] = m }
        if let l = location { d["location"] = l }
        if let s = soreness { d["soreness"] = s }
        return d
    }
}

enum KodaAPIError: Error {
    case http(status: Int, message: String)
    case noAuth
    case invalidResponse
    case invalidURL
    case unknown
}

extension KodaAPIError: LocalizedError {
    var errorDescription: String? {
        switch self {
        case .http(let status, let message):
            if status == 401 { return "Please sign in again." }
            if status == 429 { return "Too many requests. Please try again in a minute." }
            return message.isEmpty ? "Something went wrong (\(status))." : message
        case .noAuth: return "Please sign in to continue."
        case .invalidResponse, .invalidURL: return "Network error. Please try again."
        case .unknown: return "Something went wrong. Please try again."
        }
    }
}

/// Type-erased Codable for flexible API/Supabase payloads.
struct AnyCodable: Codable {
    let value: Any
    init(value: Any) {
        self.value = value
    }
    init(from decoder: Decoder) throws {
        let c = try decoder.singleValueContainer()
        if let b = try? c.decode(Bool.self) { value = b }
        else if let i = try? c.decode(Int.self) { value = i }
        else if let s = try? c.decode(String.self) { value = s }
        else if let a = try? c.decode([AnyCodable].self) { value = a.map(\.value) }
        else if let d = try? c.decode([String: AnyCodable].self) { value = d.mapValues(\.value) }
        else { value = NSNull() }
    }
    func encode(to encoder: Encoder) throws {
        var c = encoder.singleValueContainer()
        switch value {
        case let b as Bool: try c.encode(b)
        case let i as Int: try c.encode(i)
        case let s as String: try c.encode(s)
        case let a as [AnyCodable]: try c.encode(a)
        case let a as [String]: try c.encode(a)
        case let d as [String: AnyCodable]: try c.encode(d)
        default: try c.encodeNil()
        }
    }
}
struct ProductEventRecord: Decodable {
    let event_id: String?
    let event_name: String?
}

// Phase 5: Squad Types
struct SquadOverviewResponse: Decodable {
    let squadId: String?
    let squadName: String?
    let rank: Int?
    let leaderboard: [SquadLeaderboardEntry]?
}

struct SquadLeaderboardEntry: Decodable, Identifiable {
    let userId: String
    let name: String
    let score: Int
    let rank: Int
    var id: String { userId }
}

struct SquadVibesResponse: Decodable {
    let vibes: [SquadVibe]?
}

struct SquadVibe: Decodable, Identifiable {
    let id: String
    let userName: String
    let type: String
    let message: String
    let time: String
}

// Phase 5: Coach Desk Types
struct CoachDeskResponse: Decodable {
    let insights: [CoachInsight]?
}

struct CoachInsight: Decodable, Identifiable {
    let title: String
    let message: String
    let urgency: String
    let cta_route: String?
    var id: String { title }
}

struct TrophyResponse: Decodable {
    let trophies: [Trophy]
}

struct Trophy: Decodable, Identifiable {
    let id: String
    let name: String
    let description: String?
    let ai_rationale: String?
    let icon_slug: String?
    let rarity: String?
    let earned_at: String
}
