import Foundation

enum DemoContent {
    static var today: String { DateHelpers.todayLocal }

    static var profile: UserProfile {
        UserProfile(
            user_id: DebugUX.demoUserId,
            display_name: "Blake",
            email: "blake@koda.demo",
            phone_number: nil,
            age: 31,
            sex: "male",
            height_cm: 183,
            weight_kg: 84.2,
            goals: ["Build lean muscle", "Hold 12% body fat", "Improve conditioning"],
            injuries_limitations: AnyCodable(value: "Managing mild right shoulder tightness after pressing volume."),
            dietary_preferences: AnyCodable(value: ["high_protein", "balanced"]),
            activity_level: "Titanium Hypertrophy",
            devices: nil,
            subscription_status: "pro",
            stripe_customer_id: nil,
            role: nil,
            experience_level: "advanced",
            motivational_driver: "performance",
            created_at: nil,
            updated_at: nil
        )
    }

    static var dailyPlan: DailyPlan {
        DailyPlan(
            date_local: today,
            training_plan: TrainingPlan(
                focus: "Lower Strength + Power",
                duration_minutes: 62,
                exercises: sampleExercises
            ),
            nutrition_plan: NutritionPlan(
                calories_target: 2650,
                protein_g: 210,
                carbs_g: 255,
                fat_g: 75
            ),
            safety_notes: [
                "Keep first squat set at RPE 7.",
                "Respect shoulder warm-up before front rack positions."
            ]
        )
    }

    static var weeklyPlan: WeeklyPlan {
        WeeklyPlan(
            week_start_local: today,
            cycle_goal: "Accumulate high-quality lower-body intensity while protecting recovery.",
            adaptation_summary: "Built around strong adherence, moderate recovery debt, and available gym access.",
            days: [
                WeeklyPlanDay(
                    date_local: today,
                    day_label: "Mon",
                    focus: "Lower Strength",
                    intensity: "High",
                    target_duration_minutes: 62,
                    rationale: "Highest-output day while readiness is elevated.",
                    equipment_context: "Full gym",
                    exercises: sampleWeeklyExercises
                ),
                WeeklyPlanDay(
                    date_local: shiftedDate(days: 1),
                    day_label: "Tue",
                    focus: "Upper Hypertrophy",
                    intensity: "Moderate",
                    target_duration_minutes: 54,
                    rationale: "Volume-focused upper push/pull balance.",
                    equipment_context: "Full gym",
                    exercises: [
                        WeeklyPlanExercise(name: "Incline DB Press", equipment: "Dumbbells", sets: 4, reps: "8", coaching_cue: "Drive elbows 45 degrees."),
                        WeeklyPlanExercise(name: "Chest-Supported Row", equipment: "Machine", sets: 4, reps: "10", coaching_cue: "Pause with scapular control.")
                    ]
                ),
                WeeklyPlanDay(
                    date_local: shiftedDate(days: 2),
                    day_label: "Wed",
                    focus: "Recovery + Steps",
                    intensity: "Low",
                    target_duration_minutes: 35,
                    rationale: "Reduce fatigue and maintain momentum.",
                    equipment_context: "Walk + mobility",
                    exercises: [
                        WeeklyPlanExercise(name: "Incline Walk", equipment: "Treadmill", sets: 1, reps: "30 min", coaching_cue: "Zone 2 breathing."),
                        WeeklyPlanExercise(name: "Hip Airplanes", equipment: "Bodyweight", sets: 3, reps: "6/side", coaching_cue: "Own the rotation.")
                    ]
                )
            ]
        )
    }

    static var briefing: AIBriefingResponse {
        AIBriefingResponse(
            briefing: "Recovery markers are up, so today prioritizes lower-body force production. Hit your top squat exposure early, then let posterior-chain work carry the hypertrophy dose.",
            rationale: "Readiness rose after two compliant nutrition days and seven-plus hours of sleep.",
            inputs: ["sleep", "adherence", "volume trend"]
        )
    }

    static var coachDesk: CoachDeskResponse {
        CoachDeskResponse(
            insights: [
                CoachInsight(
                    title: "Protect Pressing Output",
                    message: "Shoulder tightness is trending down. Keep your warm-up longer than usual before any heavy front-rack or overhead work.",
                    urgency: "medium",
                    cta_route: "/log/workout"
                ),
                CoachInsight(
                    title: "Nutrition Window",
                    message: "You are within reach of a clean training day. Front-load 40-50g carbs in the next meal to support the squat session.",
                    urgency: "low",
                    cta_route: "/log/nutrition"
                )
            ]
        )
    }

    static var performance: PerformanceResponse {
        PerformanceResponse(
            workout_days: 5,
            workout_minutes: 286,
            set_volume: 104,
            push_pull_balance: 0.94,
            recovery_debt: 0.18,
            nutrition_compliance: 0.87
        )
    }

    static var projection: DashboardProjectionResponse {
        DashboardProjectionResponse(
            current: 84.2,
            projected_4w: 85.0,
            projected_12w: 86.4,
            rate: 0.18,
            confidence: 0.78
        )
    }

    static var retentionRisk: RetentionRiskResponse {
        RetentionRiskResponse(
            risk_score: 0.22,
            risk_level: "low",
            reasons: ["Strong 7-day training cadence", "Stable check-in compliance"],
            recommended_action: "Maintain tonight's session start before 7:30 PM.",
            rationale: "Behavioral consistency is high; the only watchpoint is workday fatigue."
        )
    }

    static var nudges: [CoachNudge] {
        [
            CoachNudge(
                nudge_id: "demo-nudge-1",
                user_id: DebugUX.demoUserId,
                date_local: today,
                nudge_type: "workout",
                risk_level: "medium",
                message: "Start the guided session before dinner to stay inside your recovery window.",
                cta_route: "/log/workout",
                cta_label: "Launch session",
                expires_at: nil,
                acknowledged_at: nil
            ),
            CoachNudge(
                nudge_id: "demo-nudge-2",
                user_id: DebugUX.demoUserId,
                date_local: today,
                nudge_type: "nutrition",
                risk_level: "low",
                message: "Protein is still 48g short. A Greek yogurt + whey pairing closes the gap fast.",
                cta_route: "/coach",
                cta_label: "Ask coach",
                expires_at: nil,
                acknowledged_at: nil
            )
        ]
    }

    static var workouts: [WorkoutLog] {
        [
            WorkoutLog(
                log_id: "workout-1",
                user_id: DebugUX.demoUserId,
                date: today,
                workout_type: "Strength",
                exercises: [
                    WorkoutExerciseEntry(name: "Back Squat", sets: 4, reps: "6", weight_kg: 142.5, rpe: 8, form_cues: "Brace hard."),
                    WorkoutExerciseEntry(name: "Romanian Deadlift", sets: 3, reps: "8", weight_kg: 102.5, rpe: 8, form_cues: "Slow eccentric.")
                ],
                duration_minutes: 62,
                calories_burned: 514,
                perceived_exertion: 8,
                notes: "Strong bar speed. Left hip felt cleaner after warm-up ramp.",
                created_at: nil
            ),
            WorkoutLog(
                log_id: "workout-2",
                user_id: DebugUX.demoUserId,
                date: shiftedDate(days: -1),
                workout_type: "Conditioning",
                exercises: [
                    WorkoutExerciseEntry(name: "Assault Bike Intervals", sets: 10, reps: "20s on / 100s easy", weight_kg: nil, rpe: 9, form_cues: nil)
                ],
                duration_minutes: 28,
                calories_burned: 342,
                perceived_exertion: 9,
                notes: "High output. Good recovery by rep 8.",
                created_at: nil
            )
        ]
    }

    static var checkIn: CheckIn {
        CheckIn(
            check_in_id: "checkin-1",
            user_id: DebugUX.demoUserId,
            date_local: today,
            adherence_score: 8,
            energy_score: 8,
            sleep_hours: 7.4,
            soreness_notes: "Mild glute soreness, otherwise good to push.",
            created_at: nil
        )
    }

    static var progressEntries: [ProgressEntry] {
        [
            ProgressEntry(track_id: "progress-1", user_id: DebugUX.demoUserId, date: today, weight_kg: 84.2, body_fat_percent: 12.8, measurements: ["waist": 80], notes: "Holding composition while volume rises.", created_at: nil),
            ProgressEntry(track_id: "progress-2", user_id: DebugUX.demoUserId, date: shiftedDate(days: -7), weight_kg: 84.0, body_fat_percent: 13.0, measurements: ["waist": 81], notes: "Post-travel rebound complete.", created_at: nil),
            ProgressEntry(track_id: "progress-3", user_id: DebugUX.demoUserId, date: shiftedDate(days: -14), weight_kg: 83.7, body_fat_percent: 13.2, measurements: ["waist": 81.5], notes: nil, created_at: nil)
        ]
    }

    static var progressInsight: ProgressInsightResponse {
        ProgressInsightResponse(
            insight: "Body weight is stable while body fat trends down slightly, which implies high-quality maintenance during a productive block. Keep protein high and avoid cutting steps on recovery days."
        )
    }

    static var nutritionTarget: NutritionTarget {
        NutritionTarget(
            target_id: "target-1",
            calorie_target: 2650,
            protein_target_g: 210,
            carbs_target_g: 255,
            fat_target_g: 75,
            meal_timing: [
                MealTimingSlot(label: "Pre-lift", window: "60-90 min before training"),
                MealTimingSlot(label: "Post-lift", window: "Within 90 min after training")
            ],
            active: true
        )
    }

    static var nutritionLog: NutritionLog {
        NutritionLog(
            log_id: "nutrition-1",
            user_id: DebugUX.demoUserId,
            date: today,
            meals: [
                MealEntry(name: "Greek Yogurt Power Bowl", calories: 520, protein_g: 48, carbs_g: 56, fat_g: 12, time_of_day: "Breakfast"),
                MealEntry(name: "Chicken Rice Bowl", calories: 760, protein_g: 62, carbs_g: 84, fat_g: 18, time_of_day: "Lunch"),
                MealEntry(name: "Steak + Potatoes", calories: 810, protein_g: 58, carbs_g: 68, fat_g: 28, time_of_day: "Dinner")
            ],
            total_calories: 2090,
            protein_g: 168,
            carbs_g: 208,
            fat_g: 58,
            hydration_liters: 1.8,
            created_at: nil
        )
    }

    static var nutritionHistory: [NutritionLog] {
        [
            nutritionLog,
            NutritionLog(
                log_id: "nutrition-2",
                user_id: DebugUX.demoUserId,
                date: shiftedDate(days: -1),
                meals: [
                    MealEntry(name: "Egg Wrap", calories: 430, protein_g: 32, carbs_g: 30, fat_g: 18, time_of_day: "Breakfast"),
                    MealEntry(name: "Salmon Bowl", calories: 690, protein_g: 49, carbs_g: 52, fat_g: 24, time_of_day: "Dinner")
                ],
                total_calories: 1830,
                protein_g: 143,
                carbs_g: 156,
                fat_g: 54,
                hydration_liters: 2.3,
                created_at: nil
            )
        ]
    }

    static var nutritionInsight: NutritionInsightResponse {
        NutritionInsightResponse(
            insight: "Protein pacing is solid. The remaining lever is bringing carbs up around the training window so performance stays high without overshooting calories."
        )
    }

    static var mealSuggestions: MealSuggestionsResponse {
        MealSuggestionsResponse(
            suggestions: [
                MealSuggestion(name: "Whey + Banana + Cereal Bowl", calories: 410, protein_g: 36, carbs_g: 52, fat_g: 7, note: "Fast pre-workout fuel."),
                MealSuggestion(name: "Turkey Chili", calories: 540, protein_g: 46, carbs_g: 38, fat_g: 18, note: "High satiety recovery meal."),
                MealSuggestion(name: "Salmon Sushi Bowl", calories: 610, protein_g: 42, carbs_g: 64, fat_g: 20, note: "Easy carb top-up.")
            ]
        )
    }

    static func analyzedMeal(text: String?) -> AnalyzeMealResponse {
        AnalyzeMealResponse(
            name: (text?.isEmpty == false ? text : "Chicken burrito bowl"),
            calories: 680,
            protein_g: 46,
            carbs_g: 62,
            fat_g: 24,
            confidence: 0.89
        )
    }

    static var barcode: BarcodeResponse {
        BarcodeResponse(
            nutrition: BarcodeNutrition(name: "Core Power Elite", brand: "Fairlife", calories: 230, protein: 42, carbs: 8, fat: 3)
        )
    }

    static var readiness: ReadinessInsightResponse {
        ReadinessInsightResponse(
            insight: "Readiness is green. Your last two sessions produced stimulus without driving recovery debt, so keep today's intensity but cut a final accessory set if bar speed fades."
        )
    }

    static var bodyComp: BodyCompResponse {
        BodyCompResponse(
            body_fat_percent: 12.7,
            analysis: "Physique trend suggests a lean gain phase is working. Midsection remains tight while lower-body fullness has improved.",
            confidence: 0.78
        )
    }

    static var vision: VisionAnalysisResponse {
        VisionAnalysisResponse(
            score: 89,
            critique: "Good bracing and hip drive. The only clear miss is a slightly early chest drop out of the hole.",
            correction: "Keep rib cage stacked and lead the ascent with the traps for the first third of the rep.",
            analysis_source: "server",
            analysis_mode: "demo_remote_vision",
            benchmark_ms: 142,
            frames_analyzed: 3,
            pose_confidence: 0.84,
            fallback_reason: nil,
            movement_pattern: "squat",
            rep_count: 4,
            peak_velocity_mps: 0.72,
            mean_velocity_mps: 0.61,
            velocity_dropoff_percent: 12.5,
            benchmark_report_path: nil
        )
    }

    static var recipePlan: RecipeGenResponse {
        RecipeGenResponse(
            plan_id: "plan-1",
            days: [
                RecipeGenDay(
                    date: today,
                    meals: [
                        RecipeGenMeal(name: "High-Protein Overnight Oats", meal_type: "breakfast", calories: 510, protein: 42, carbs: 58, fat: 12, recipe: "Mix oats, whey, chia, berries, and Greek yogurt.", ingredients: ["oats", "whey", "berries", "Greek yogurt"]),
                        RecipeGenMeal(name: "Chicken Burrito Bowl", meal_type: "lunch", calories: 720, protein: 58, carbs: 71, fat: 18, recipe: "Roast chicken, steam rice, build bowl with salsa and avocado.", ingredients: ["chicken", "rice", "avocado", "salsa"])
                    ]
                )
            ],
            grocery_list: [
                GroceryItem(item: "Chicken breast", category: "Protein", quantity: "2 lb"),
                GroceryItem(item: "Jasmine rice", category: "Carbs", quantity: "1 bag"),
                GroceryItem(item: "Greek yogurt", category: "Dairy", quantity: "2 tubs")
            ]
        )
    }

    static var trophies: TrophyResponse {
        TrophyResponse(
            trophies: [
                Trophy(id: "trophy-1", name: "Consistency Engine", description: "Logged 5 sessions in 7 days.", ai_rationale: "Your behavior pattern is stable enough to support higher progression confidence.", icon_slug: "bolt", rarity: "rare", earned_at: today),
                Trophy(id: "trophy-2", name: "Protein Closer", description: "Hit protein target 10 days straight.", ai_rationale: "Nutritional reliability is now a meaningful competitive edge.", icon_slug: "fork.knife", rarity: "epic", earned_at: shiftedDate(days: -3))
            ]
        )
    }

    static var accountability: SocialAccountabilityResponse {
        SocialAccountabilityResponse(
            partner: AccountabilityPartner(
                partner_id: "partner-1",
                user_id: DebugUX.demoUserId,
                partner_user_id: "friend-1",
                status: "active",
                partner_profile: UserProfile(
                    user_id: "friend-1",
                    display_name: "Jordan",
                    email: nil,
                    phone_number: nil,
                    age: nil,
                    sex: nil,
                    height_cm: nil,
                    weight_kg: nil,
                    goals: nil,
                    injuries_limitations: nil,
                    dietary_preferences: nil,
                    activity_level: nil,
                    devices: nil,
                    subscription_status: nil,
                    stripe_customer_id: nil,
                    role: nil,
                    experience_level: nil,
                    motivational_driver: nil,
                    created_at: nil,
                    updated_at: nil
                )
            )
        )
    }

    static var friends: SocialFriendsResponse {
        SocialFriendsResponse(
            friends: [
                ConnectionRow(connection_id: "conn-1", user_id_1: DebugUX.demoUserId, user_id_2: "friend-1", status: "accepted", created_at: nil, profile_1: profile, profile_2: accountability.partner?.partner_profile),
                ConnectionRow(connection_id: "conn-2", user_id_1: DebugUX.demoUserId, user_id_2: "friend-2", status: "accepted", created_at: nil, profile_1: profile, profile_2: UserProfile(user_id: "friend-2", display_name: "Avery", email: nil, phone_number: nil, age: nil, sex: nil, height_cm: nil, weight_kg: nil, goals: nil, injuries_limitations: nil, dietary_preferences: nil, activity_level: nil, devices: nil, subscription_status: nil, stripe_customer_id: nil, role: nil, experience_level: nil, motivational_driver: nil, created_at: nil, updated_at: nil))
            ]
        )
    }

    static var challenges: CommunityChallengesResponse {
        CommunityChallengesResponse(
            challenges: [
                ChallengeItem(challenge_id: "challenge-1", name: "6 AM Club", description: "Five dawn sessions this week.", start_date: today, end_date: shiftedDate(days: 6), participant_count: 124),
                ChallengeItem(challenge_id: "challenge-2", name: "10k Steps Lock", description: "Hold movement quality on recovery days.", start_date: today, end_date: shiftedDate(days: 6), participant_count: 308)
            ]
        )
    }

    static var squadOverview: SquadOverviewResponse {
        SquadOverviewResponse(
            squadId: "squad-1",
            squadName: "TITANIUM PROTOCOL",
            rank: 4,
            leaderboard: [
                SquadLeaderboardEntry(userId: "friend-9", name: "MIA", score: 982, rank: 1),
                SquadLeaderboardEntry(userId: "friend-7", name: "LEO", score: 954, rank: 2),
                SquadLeaderboardEntry(userId: "friend-4", name: "SAGE", score: 939, rank: 3),
                SquadLeaderboardEntry(userId: DebugUX.demoUserId, name: "BLAKE", score: 926, rank: 4),
                SquadLeaderboardEntry(userId: "friend-2", name: "AVERY", score: 901, rank: 5)
            ]
        )
    }

    static var squadVibes: SquadVibesResponse {
        SquadVibesResponse(
            vibes: [
                SquadVibe(id: "vibe-1", userName: "MIA", type: "session", message: "Closed out a brutal hinge session before sunrise.", time: "12m ago"),
                SquadVibe(id: "vibe-2", userName: "JORDAN", type: "nutrition", message: "Hit macros early and still made room for date night.", time: "28m ago"),
                SquadVibe(id: "vibe-3", userName: "AVERY", type: "recovery", message: "Recovery walk plus mobility reset. Ready for tomorrow.", time: "1h ago")
            ]
        )
    }

    static var escalationList: EscalationListResponse {
        EscalationListResponse(
            escalations: [
                EscalationItem(escalation_id: "esc-1", topic: "Shoulder strain management", urgency: "medium", status: "active", created_at: today)
            ]
        )
    }

    static var escalationMessages: EscalationMessagesResponse {
        EscalationMessagesResponse(
            messages: [
                EscalationMessage(escalation_message_id: "msg-1", body: "Coach note: reduce overhead exposure for 72 hours and prioritize tempo pressing.", sender_type: "coach", created_at: today),
                EscalationMessage(escalation_message_id: "msg-2", body: "Understood. Pain is present only above 80 degrees flexion.", sender_type: "user", created_at: today)
            ]
        )
    }

    static var activeEscalation: ActiveEscalationResponse {
        ActiveEscalationResponse(
            escalation: ActiveEscalation(escalation_id: "esc-1", topic: "Shoulder strain management", status: "active")
        )
    }

    static var stripeCheckout: StripeCheckoutResponse {
        StripeCheckoutResponse(
            url: AppConfig.apiBaseURL.absoluteString,
            sessionId: "demo-session"
        )
    }

    static var awards: AwardsCheckResponse {
        AwardsCheckResponse(
            awarded: [
                AwardItem(badge_id: "badge-1", name: "Session Locked")
            ]
        )
    }

    static var exportData: Data {
        let payload = """
        {
          "profile": {
            "name": "Blake",
            "program": "Titanium Hypertrophy"
          },
          "exportedAt": "\(today)"
        }
        """
        return Data(payload.utf8)
    }

    static func aiReply(for message: String) -> AIReplyResponse {
        let normalized = message.lowercased()
        if normalized.contains("workout") || normalized.contains("session") {
            return AIReplyResponse(
                reply: "You are cleared for the lower-strength session. Open the guided workout, keep the first squat exposure at RPE 7, and save one rep in reserve on hinges.",
                action: AIAction(type: "plan_daily", payload: AIActionPayload(exercise_name: nil, video_url: nil, training_plan: dailyPlan.training_plan)),
                actions: nil
            )
        }
        return AIReplyResponse(
            reply: "Today is a high-output day. Keep carbs around training, hold the recovery walk tonight, and message support only if the shoulder pain sharpens during warm-ups.",
            action: nil,
            actions: nil
        )
    }

    static var aiHistory: HistoryResponse {
        HistoryResponse(
            history: [
                HistoryMessage(role: "assistant", content: "Morning briefing loaded. You are set up for a productive lower-body day."),
                HistoryMessage(role: "user", content: "What should I focus on today?"),
                HistoryMessage(role: "assistant", content: "Explosive first working sets, then disciplined posterior-chain volume.")
            ]
        )
    }

    private static var sampleWeeklyExercises: [WeeklyPlanExercise] {
        [
            WeeklyPlanExercise(name: "Barbell Back Squat", equipment: "Barbell", sets: 4, reps: "6", coaching_cue: "Drive through the floor."),
            WeeklyPlanExercise(name: "Romanian Deadlift", equipment: "Barbell", sets: 3, reps: "8", coaching_cue: "Own the eccentric."),
            WeeklyPlanExercise(name: "Walking Lunges", equipment: "Dumbbells", sets: 3, reps: "12/side", coaching_cue: "Stay tall through the trunk.")
        ]
    }

    static var sampleExercises: [PlanExercise] {
        [
            PlanExercise(name: "Barbell Back Squat", sets: 4, reps: "6", intensity: "RPE 8", notes: "Brace hard and drive evenly through mid-foot.", tempo: "31X0", breathing: "Big breath before each rep", intent: "Max force with crisp depth", rationale: "Primary lower-body strength exposure.", target_rir: 2, target_load_kg: 142.5, video_url: nil, cinema_video_url: nil, image_url: nil),
            PlanExercise(name: "Romanian Deadlift", sets: 3, reps: "8", intensity: "RPE 7", notes: "Push hips back until hamstrings load, then snap to lockout.", tempo: "3010", breathing: "Exhale through lockout", intent: "Posterior-chain tension", rationale: "Posterior-chain hypertrophy and hinge patterning.", target_rir: 2, target_load_kg: 102.5, video_url: nil, cinema_video_url: nil, image_url: nil),
            PlanExercise(name: "Walking Lunge", sets: 3, reps: "12/side", intensity: "Controlled burn", notes: "Long stride and vertical torso.", tempo: "2010", breathing: "Short nasal reset between reps", intent: "Single-leg stability", rationale: "Finish with unilateral volume and control.", target_rir: 1, target_load_kg: 22.5, video_url: nil, cinema_video_url: nil, image_url: nil)
        ]
    }

    static func shiftedDate(days: Int) -> String {
        let calendar = Calendar.current
        let date = calendar.date(byAdding: .day, value: days, to: Date()) ?? Date()
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        return formatter.string(from: date)
    }
}
