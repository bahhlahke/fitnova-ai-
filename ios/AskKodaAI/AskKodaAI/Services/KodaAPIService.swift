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

    private var isDemoMode: Bool {
        DebugUX.isDemoMode
    }

    init(baseURL: URL = AppConfig.apiBaseURL, getAccessToken: @escaping () async -> String?) {
        self.baseURL = baseURL
        self.getAccessToken = getAccessToken
    }

    /// POST /api/v1/ai/respond — AI coach chat.
    func aiRespond(message: String, localDate: String? = nil) async throws -> AIReplyResponse {
        if isDemoMode {
            return try await DebugUX.resolve(
                primary: DemoContent.aiReply(for: message),
                empty: AIReplyResponse(reply: "Coach channel is quiet in the empty scenario.", action: nil),
                label: "coach reply"
            )
        }
        let body: [String: Any] = {
            var b: [String: Any] = ["message": message]
            if let d = localDate, !d.isEmpty { b["localDate"] = d }
            return b
        }()
        return try await post("api/v1/ai/respond", body: body)
    }

    /// GET /api/v1/ai/coach-desk — Proactive mastery insights.
    func aiCoachDesk() async throws -> CoachDeskResponse {
        if isDemoMode {
            return try await DebugUX.resolve(
                primary: DemoContent.coachDesk,
                empty: CoachDeskResponse(insights: []),
                label: "coach desk"
            )
        }
        return try await get("api/v1/ai/coach-desk")
    }

    /// GET /api/v1/user/trophies — Earned elite protocols.
    func getTrophies() async throws -> TrophyResponse {
        if isDemoMode {
            return try await DebugUX.resolve(
                primary: DemoContent.trophies,
                empty: TrophyResponse(trophies: []),
                label: "trophies"
            )
        }
        return try await get("api/v1/user/trophies")
    }
    
    /// GET /api/v1/ai/history — AI chat history.
    func aiHistory() async throws -> HistoryResponse {
        if isDemoMode {
            return try await DebugUX.resolve(
                primary: DemoContent.aiHistory,
                empty: HistoryResponse(history: []),
                label: "coach history"
            )
        }
        return try await get("api/v1/ai/history")
    }

    /// POST /api/v1/plan/daily — Generate and save daily plan.
    func planDaily(todayConstraints: DailyConstraints? = nil) async throws -> DailyPlanResponse {
        if isDemoMode {
            return try await DebugUX.resolve(
                primary: DailyPlanResponse(plan: DemoContent.dailyPlan),
                empty: DailyPlanResponse(plan: DailyPlan(date_local: DemoContent.today, training_plan: nil, nutrition_plan: nil, safety_notes: nil)),
                label: "daily plan generation"
            )
        }
        let body = todayConstraints.map { ["todayConstraints": $0.asJSON] } ?? [:]
        return try await post("api/v1/plan/daily", body: body)
    }

    /// GET /api/v1/plan/weekly
    func planWeekly(refresh: Bool = false) async throws -> WeeklyPlanResponse {
        if isDemoMode {
            return try await DebugUX.resolve(
                primary: WeeklyPlanResponse(plan: DemoContent.weeklyPlan),
                empty: WeeklyPlanResponse(plan: WeeklyPlan(week_start_local: DemoContent.today, cycle_goal: nil, adaptation_summary: nil, days: [])),
                label: "weekly plan"
            )
        }
        var path = "api/v1/plan/weekly"
        if refresh { path += "?refresh=1" }
        return try await get(path)
    }

    /// GET /api/v1/analytics/performance — 14-day analytics.
    func analyticsPerformance() async throws -> PerformanceResponse {
        if isDemoMode {
            return try await DebugUX.resolve(
                primary: DemoContent.performance,
                empty: PerformanceResponse(workout_days: 0, workout_minutes: 0, set_volume: 0, push_pull_balance: nil, recovery_debt: nil, nutrition_compliance: nil),
                label: "performance analytics"
            )
        }
        return try await get("api/v1/analytics/performance")
    }
    
    /// GET /api/v1/community/squad/overview — Squad leaderboard and rank.
    func communitySquadOverview() async throws -> SquadOverviewResponse {
        if isDemoMode {
            return try await DebugUX.resolve(
                primary: DemoContent.squadOverview,
                empty: SquadOverviewResponse(squadId: nil, squadName: "ELITE PROTOCOL", rank: 0, leaderboard: []),
                label: "squad overview"
            )
        }
        return try await get("api/v1/community/squad/overview")
    }
    
    /// GET /api/v1/community/squad/vibes — Real-time squad activity feed.
    func communitySquadVibes() async throws -> SquadVibesResponse {
        if isDemoMode {
            return try await DebugUX.resolve(
                primary: DemoContent.squadVibes,
                empty: SquadVibesResponse(vibes: []),
                label: "squad vibes"
            )
        }
        return try await get("api/v1/community/squad/vibes")
    }

    /// GET /api/v1/ai/weekly-insight
    func aiWeeklyInsight() async throws -> WeeklyInsightResponse {
        if isDemoMode {
            return try await DebugUX.resolve(
                primary: WeeklyInsightResponse(insight: "Prioritize the opening lower-body session, then manage fatigue with a lighter recovery mid-week."),
                empty: WeeklyInsightResponse(insight: nil),
                label: "weekly insight"
            )
        }
        return try await get("api/v1/ai/weekly-insight")
    }

    /// POST /api/v1/plan/adapt-day
    func planAdaptDay(
        userMessage: String,
        focus: String,
        intensity: String,
        targetDuration: Int,
        goals: [String],
        currentExercises: [AnyCodable],
        dateLocal: String? = nil
    ) async throws -> AdaptDayResponse {
        if isDemoMode {
            let adaptedPlan = DailyPlan(
                date_local: DemoContent.today,
                training_plan: TrainingPlan(
                    focus: "Condensed \(focus)",
                    duration_minutes: targetDuration,
                    exercises: Array(DemoContent.sampleExercises.prefix(2))
                ),
                adaptation_note: "Adapted to: \(userMessage)"
            )
            return try await DebugUX.resolve(
                primary: AdaptDayResponse(plan: adaptedPlan),
                empty: AdaptDayResponse(plan: nil),
                label: "adapted plan"
            )
        }
        let body: [String: AnyCodable] = [
            "userMessage": AnyCodable(value: userMessage),
            "focus": AnyCodable(value: focus),
            "intensity": AnyCodable(value: intensity),
            "target_duration_minutes": AnyCodable(value: targetDuration),
            "goals": AnyCodable(value: goals),
            "current_exercises": AnyCodable(value: currentExercises),
            "date_local": AnyCodable(value: dateLocal)
        ]
        return try await post("api/v1/plan/adapt-day", body: body)
    }

    /// POST /api/v1/stripe/checkout
    func stripeCheckout(priceId: String?, successUrl: String?, cancelUrl: String?) async throws -> StripeCheckoutResponse {
        if isDemoMode {
            return try await DebugUX.resolve(
                primary: DemoContent.stripeCheckout,
                empty: StripeCheckoutResponse(url: nil, sessionId: "demo-empty"),
                label: "checkout"
            )
        }
        var body: [String: Any] = [:]
        if let p = priceId { body["priceId"] = p }
        if let s = successUrl { body["successUrl"] = s }
        if let c = cancelUrl { body["cancelUrl"] = c }
        return try await post("api/v1/stripe/checkout", body: body)
    }

    /// POST /api/v1/ai/body-comp
    func aiBodyComp(images: (String, String, String), localDate: String) async throws -> BodyCompResponse {
        if isDemoMode {
            return try await DebugUX.resolve(
                primary: DemoContent.bodyComp,
                empty: BodyCompResponse(body_fat_percent: nil, analysis: nil, confidence: nil),
                label: "body composition analysis"
            )
        }
        let body: [String: Any] = [
            "images": [images.0, images.1, images.2],
            "localDate": localDate
        ]
        return try await post("api/v1/ai/body-comp", body: body)
    }

    /// GET /api/v1/ai/projection
    func aiProjection(today: String) async throws -> DashboardProjectionResponse {
        if isDemoMode {
            return try await DebugUX.resolve(
                primary: DemoContent.projection,
                empty: DashboardProjectionResponse(current: nil, projected_4w: nil, projected_12w: nil, rate: nil, confidence: nil),
                label: "projection"
            )
        }
        return try await get("api/v1/ai/projection?today=\(today)")
    }

    /// POST /api/v1/ai/retention-risk
    func aiRetentionRisk(localDate: String) async throws -> RetentionRiskResponse {
        if isDemoMode {
            return try await DebugUX.resolve(
                primary: DemoContent.retentionRisk,
                empty: RetentionRiskResponse(risk_score: nil, risk_level: nil, reasons: [], recommended_action: nil, rationale: nil),
                label: "retention risk"
            )
        }
        let body = ["localDate": localDate]
        return try await post("api/v1/ai/retention-risk", body: body)
    }

    /// POST /api/v1/ai/briefing
    func aiBriefing(localDate: String) async throws -> AIBriefingResponse {
        if isDemoMode {
            return try await DebugUX.resolve(
                primary: DemoContent.briefing,
                empty: AIBriefingResponse(briefing: nil, rationale: nil, inputs: []),
                label: "briefing"
            )
        }
        let body = ["localDate": localDate]
        return try await post("api/v1/ai/briefing", body: body)
    }

    /// POST /api/v1/ai/coach-nudge/ack
    func coachNudgeAck(nudgeId: String) async throws -> [String: AnyCodable] {
        if isDemoMode {
            return try await DebugUX.resolve(primary: [:], empty: [:], label: "nudge acknowledgement")
        }
        let body = ["nudgeId": nudgeId]
        return try await post("api/v1/ai/coach-nudge/ack", body: body)
    }

    /// GET /api/v1/user/export
    func exportData(format: String) async throws -> Data {
        if isDemoMode {
            return try await DebugUX.resolve(primary: DemoContent.exportData, empty: DemoContent.exportData, label: "export")
        }
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
        if isDemoMode {
            return try await DebugUX.resolve(
                primary: DemoContent.readiness,
                empty: ReadinessInsightResponse(insight: nil),
                label: "readiness insight"
            )
        }
        return try await post("api/v1/ai/readiness-insight", body: ["localDate": localDate])
    }

    /// POST /api/v1/ai/post-workout-insight
    func aiPostWorkoutInsight(dateLocal: String) async throws -> PostWorkoutInsightResponse {
        if isDemoMode {
            return try await DebugUX.resolve(
                primary: PostWorkoutInsightResponse(insight: "Clean output today. Reload carbs, walk 10 minutes tonight, and leave the next hinge session heavy."),
                empty: PostWorkoutInsightResponse(insight: nil),
                label: "post-workout insight"
            )
        }
        return try await post("api/v1/ai/post-workout-insight", body: ["dateLocal": dateLocal])
    }

    /// POST /api/v1/user/awards/check
    func awardsCheck() async throws -> AwardsCheckResponse {
        if isDemoMode {
            return try await DebugUX.resolve(primary: DemoContent.awards, empty: AwardsCheckResponse(awarded: []), label: "awards")
        }
        return try await post("api/v1/user/awards/check", body: [:])
    }

    /// POST /api/v1/analytics/process-prs
    func analyticsProcessPRs() async throws -> [String: AnyCodable] {
        if isDemoMode {
            return try await DebugUX.resolve(primary: [:], empty: [:], label: "pr processing")
        }
        return try await post("api/v1/analytics/process-prs", body: [:])
    }

    /// GET /api/v1/spotify/token
    func spotifyToken() async throws -> SpotifyTokenResponse {
        if isDemoMode {
            return try await DebugUX.resolve(
                primary: SpotifyTokenResponse(access_token: "demo-spotify-token"),
                empty: SpotifyTokenResponse(access_token: nil),
                label: "spotify token"
            )
        }
        return try await get("api/v1/spotify/token")
    }

    /// POST /api/v1/ai/vision
    func aiVision(images: [String]) async throws -> VisionAnalysisResponse {
        if isDemoMode {
            return try await DebugUX.resolve(
                primary: DemoContent.vision,
                empty: VisionAnalysisResponse(
                    score: nil,
                    critique: nil,
                    correction: nil,
                    analysis_source: nil,
                    analysis_mode: nil,
                    benchmark_ms: nil,
                    frames_analyzed: nil,
                    pose_confidence: nil,
                    fallback_reason: nil,
                    movement_pattern: nil,
                    rep_count: nil,
                    peak_velocity_mps: nil,
                    mean_velocity_mps: nil,
                    velocity_dropoff_percent: nil,
                    benchmark_report_path: nil
                ),
                label: "vision analysis"
            )
        }
        return try await post("api/v1/ai/vision", body: ["images": images])
    }

    /// POST /api/v1/plan/swap-exercise
    func planSwapExercise(currentExercise: String, reason: String, location: String?, sets: Int?, reps: String?, intensity: String?) async throws -> PlanSwapResponse {
        if isDemoMode {
            return try await DebugUX.resolve(
                primary: PlanSwapResponse(
                    replacement: PlanExercise(name: "Safety Bar Squat", sets: sets, reps: reps, intensity: intensity ?? "RPE 7", notes: "Front-loaded variation to spare shoulders.", tempo: "31X0", breathing: "Brace and exhale on the way up", intent: "Keep intensity high with less shoulder demand", rationale: "Swap selected due to shoulder management.", target_rir: 2, target_load_kg: 132.5, video_url: nil, cinema_video_url: nil, image_url: nil),
                    rationale: "Reduced shoulder stress while keeping lower-body force production intact.",
                    reliability: ReliabilityInfo(confidence_score: 0.86)
                ),
                empty: PlanSwapResponse(replacement: nil, rationale: nil, reliability: ReliabilityInfo(confidence_score: nil)),
                label: "exercise swap"
            )
        }
        var body: [String: Any] = ["currentExercise": currentExercise, "reason": reason]
        if let l = location { body["location"] = l }
        if let s = sets { body["sets"] = s }
        if let r = reps { body["reps"] = r }
        if let i = intensity { body["intensity"] = i }
        return try await post("api/v1/plan/swap-exercise", body: body)
    }

    /// GET /api/v1/ai/progress-insight
    func aiProgressInsight() async throws -> ProgressInsightResponse {
        if isDemoMode {
            return try await DebugUX.resolve(
                primary: DemoContent.progressInsight,
                empty: ProgressInsightResponse(insight: nil),
                label: "progress insight"
            )
        }
        return try await get("api/v1/ai/progress-insight")
    }

    /// POST /api/v1/ai/evolutionary-narrative
    func evolutionaryNarrative(localDate: String) async throws -> EvolutionaryNarrativeResponse {
        if isDemoMode {
            return try await DebugUX.resolve(
                primary: EvolutionaryNarrativeResponse(narrative: "Your journey over the last 30 days has been a masterclass in adaptation. From the initial squat PR on March 1st to the consistent neural recovery scores this week, you are trending towards elite attainment."),
                empty: EvolutionaryNarrativeResponse(narrative: nil),
                label: "evolutionary narrative"
            )
        }
        return try await post("api/v1/ai/evolutionary-narrative", body: ["localDate": localDate])
    }

    /// POST /api/v1/nutrition/fridge-scanner
    func nutritionFridgeScanner(media: String, type: String, localDate: String) async throws -> FridgeScannerResponse {
        if isDemoMode {
            return try await DebugUX.resolve(
                primary: FridgeScannerResponse(recipes: [
                    FridgeRecipe(name: "High-Protein Skillet", calories: 540, protein: 46, carbs: 32, fat: 22, ingredients: ["chicken", "peppers", "rice"], instructions: "Saute protein, add vegetables, finish with cooked rice."),
                    FridgeRecipe(name: "Egg Fried Rice Reload", calories: 620, protein: 34, carbs: 74, fat: 18, ingredients: ["eggs", "rice", "soy", "greens"], instructions: "Scramble eggs, stir-fry rice, finish with greens.")
                ]),
                empty: FridgeScannerResponse(recipes: []),
                label: "fridge scanner"
            )
        }
        return try await post("api/v1/nutrition/fridge-scanner", body: ["media": media, "type": type, "localDate": localDate])
    }

    /// POST /api/v1/ai/recipe-gen
    func aiRecipeGen(startDate: String, durationDays: Int) async throws -> RecipeGenResponse {
        if isDemoMode {
            return try await DebugUX.resolve(
                primary: DemoContent.recipePlan,
                empty: RecipeGenResponse(plan_id: nil, days: [], grocery_list: []),
                label: "recipe generation"
            )
        }
        return try await post("api/v1/ai/recipe-gen", body: ["startDate": startDate, "durationDays": durationDays])
    }

    /// POST /api/v1/telemetry/event
    func telemetryEvent(eventName: String, eventProps: [String: Any]?) async throws -> [String: AnyCodable] {
        if isDemoMode {
            return try await DebugUX.resolve(primary: [:], empty: [:], label: "telemetry")
        }
        var body: [String: Any] = ["eventName": eventName]
        if let p = eventProps { body["eventProps"] = p }
        return try await post("api/v1/telemetry/event", body: body)
    }

    /// GET /api/v1/coach/escalate/list
    func coachEscalateList() async throws -> EscalationListResponse {
        if isDemoMode {
            return try await DebugUX.resolve(
                primary: DemoContent.escalationList,
                empty: EscalationListResponse(escalations: []),
                label: "escalation list"
            )
        }
        return try await get("api/v1/coach/escalate/list")
    }

    /// POST /api/v1/coach/escalate/create
    func coachEscalateCreate(topic: String, urgency: String, details: String?, preferredChannel: String?) async throws -> ActiveEscalationResponse {
        if isDemoMode {
            return try await DebugUX.resolve(
                primary: DemoContent.activeEscalation,
                empty: ActiveEscalationResponse(escalation: nil),
                label: "escalation create"
            )
        }
        var body: [String: Any] = ["topic": topic, "urgency": urgency]
        if let d = details { body["details"] = d }
        if let p = preferredChannel { body["preferredChannel"] = p }
        return try await post("api/v1/coach/escalate/create", body: body)
    }

    /// GET /api/v1/coach/escalate/messages
    func coachEscalateMessages(escalationId: String) async throws -> EscalationMessagesResponse {
        if isDemoMode {
            return try await DebugUX.resolve(
                primary: DemoContent.escalationMessages,
                empty: EscalationMessagesResponse(messages: []),
                label: "escalation messages"
            )
        }
        return try await get("api/v1/coach/escalate/messages?escalationId=\(escalationId)")
    }

    /// POST /api/v1/coach/escalate/send
    func coachEscalateSendMessage(escalationId: String, body: String) async throws -> EscalationMessagesResponse {
        if isDemoMode {
            return try await DebugUX.resolve(
                primary: DemoContent.escalationMessages,
                empty: EscalationMessagesResponse(messages: []),
                label: "escalation send"
            )
        }
        return try await post("api/v1/coach/escalate/send", body: ["escalationId": escalationId, "body": body])
    }

    /// GET /api/v1/social/friends
    func socialFriends() async throws -> [ConnectionRow] {
        if isDemoMode {
            return try await DebugUX.resolve(
                primary: DemoContent.friends.friends ?? [],
                empty: [],
                label: "friends"
            )
        }
        return try await get("api/v1/social/friends")
    }

    /// GET /api/v1/social/accountability
    func socialAccountability() async throws -> SocialAccountabilityResponse {
        if isDemoMode {
            return try await DebugUX.resolve(
                primary: DemoContent.accountability,
                empty: SocialAccountabilityResponse(partner: nil),
                label: "accountability"
            )
        }
        return try await get("api/v1/social/accountability")
    }

    /// GET /api/v1/community/challenges
    func communityChallenges() async throws -> CommunityChallengesResponse {
        if isDemoMode {
            return try await DebugUX.resolve(
                primary: DemoContent.challenges,
                empty: CommunityChallengesResponse(challenges: []),
                label: "challenges"
            )
        }
        return try await get("api/v1/community/challenges")
    }

    /// POST /api/v1/community/challenges/join
    func communityChallengesPost(challengeId: String) async throws -> [String: AnyCodable] {
        if isDemoMode {
            return try await DebugUX.resolve(primary: [:], empty: [:], label: "challenge join")
        }
        return try await post("api/v1/community/challenges/join", body: ["challengeId": challengeId])
    }


    /// GET /api/v1/nutrition/targets
    func nutritionTargetsGet() async throws -> NutritionTargetResponse {
        if isDemoMode {
            return try await DebugUX.resolve(
                primary: NutritionTargetResponse(target: DemoContent.nutritionTarget),
                empty: NutritionTargetResponse(target: nil),
                label: "nutrition targets"
            )
        }
        return try await get("api/v1/nutrition/targets")
    }

    /// GET /api/v1/ai/nutrition-insight
    func aiNutritionInsight(dateLocal: String) async throws -> NutritionInsightResponse {
        if isDemoMode {
            return try await DebugUX.resolve(
                primary: DemoContent.nutritionInsight,
                empty: NutritionInsightResponse(insight: nil),
                label: "nutrition insight"
            )
        }
        return try await get("api/v1/ai/nutrition-insight?dateLocal=\(dateLocal)")
    }

    /// GET /api/v1/ai/meal-suggestions
    func aiMealSuggestions() async throws -> MealSuggestionsResponse {
        if isDemoMode {
            return try await DebugUX.resolve(
                primary: DemoContent.mealSuggestions,
                empty: MealSuggestionsResponse(suggestions: []),
                label: "meal suggestions"
            )
        }
        return try await get("api/v1/ai/meal-suggestions")
    }

    /// GET /api/v1/nutrition/barcode/:code
    func nutritionBarcode(barcode: String) async throws -> BarcodeResponse {
        if isDemoMode {
            return try await DebugUX.resolve(
                primary: DemoContent.barcode,
                empty: BarcodeResponse(nutrition: nil),
                label: "barcode lookup"
            )
        }
        return try await get("api/v1/nutrition/barcode/\(barcode)")
    }

    /// POST /api/v1/ai/analyze-meal
    func aiAnalyzeMeal(text: String?, imageBase64: String?) async throws -> AnalyzeMealResponse {
        if isDemoMode {
            return try await DebugUX.resolve(
                primary: DemoContent.analyzedMeal(text: text),
                empty: AnalyzeMealResponse(name: nil, calories: nil, protein_g: nil, carbs_g: nil, fat_g: nil, confidence: nil),
                label: "meal analysis"
            )
        }
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

struct AIActionPayload: Codable {
    let exercise_name: String?
    let video_url: String?
    let training_plan: TrainingPlan?
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

struct DailyPlan: Codable {
    let date_local: String?
    let training_plan: TrainingPlan?
    let nutrition_plan: NutritionPlan?
    let safety_notes: [String]?
}

struct TrainingPlan: Codable {
    let focus: String?
    let duration_minutes: Int?
    let exercises: [PlanExercise]?
}

struct PlanExercise: Codable {
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

struct NutritionPlan: Codable {
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
    let push_pull_balance: Double?
    let recovery_debt: Double?
    let nutrition_compliance: Double?

    init(
        workout_days: Int?,
        workout_minutes: Int?,
        set_volume: Int?,
        push_pull_balance: Double?,
        recovery_debt: Double?,
        nutrition_compliance: Double?
    ) {
        self.workout_days = workout_days
        self.workout_minutes = workout_minutes
        self.set_volume = set_volume
        self.push_pull_balance = push_pull_balance
        self.recovery_debt = recovery_debt
        self.nutrition_compliance = nutrition_compliance
    }

    private enum CodingKeys: String, CodingKey {
        case workout_days
        case workout_minutes
        case set_volume
        case push_pull_balance
        case recovery_debt
        case nutrition_compliance
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        workout_days = try container.decodeIfPresent(Int.self, forKey: .workout_days)
        workout_minutes = try container.decodeIfPresent(Int.self, forKey: .workout_minutes)
        set_volume = try container.decodeIfPresent(Int.self, forKey: .set_volume)
        push_pull_balance = try container.decodeFlexibleDoubleIfPresent(forKey: .push_pull_balance)
        recovery_debt = try container.decodeFlexibleDoubleIfPresent(forKey: .recovery_debt)
        nutrition_compliance = try container.decodeFlexibleDoubleIfPresent(forKey: .nutrition_compliance)
    }
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

private extension KeyedDecodingContainer {
    func decodeFlexibleDoubleIfPresent(forKey key: Key) throws -> Double? {
        if let value = try? decodeIfPresent(Double.self, forKey: key) {
            return value
        }
        if let intValue = try? decodeIfPresent(Int.self, forKey: key) {
            return Double(intValue)
        }
        if let stringValue = try? decodeIfPresent(String.self, forKey: key) {
            return Double(stringValue)
        }
        return nil
    }
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
