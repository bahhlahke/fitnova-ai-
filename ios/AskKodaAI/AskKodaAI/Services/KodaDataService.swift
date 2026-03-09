//
//  KodaDataService.swift
//  Koda AI
//
//  Direct Supabase table access for feature parity. Requires authenticated client.
//

import Foundation
import Supabase

struct KodaDataService {
    private let client: SupabaseClient
    private let userId: String

    private var isDemoMode: Bool {
        DebugUX.isDemoMode
    }

    init(client: SupabaseClient, userId: String) {
        self.client = client
        self.userId = userId
    }

    // MARK: - user_profile

    func fetchProfile() async throws -> UserProfile? {
        if isDemoMode {
            return try await DebugUX.resolve(
                primary: DemoContent.profile as UserProfile?,
                empty: nil as UserProfile?,
                label: "profile"
            )
        }
        let rows: [UserProfile] = try await client.from("user_profile")
            .select()
            .eq("user_id", value: userId)
            .limit(1)
            .execute()
            .value
        return rows.first
    }

    func upsertProfile(_ profile: UserProfile) async throws {
        if isDemoMode { return }
        var row = profile
        row.user_id = userId
        try await client.from("user_profile")
            .upsert(row)
            .execute()
    }

    // MARK: - workout_logs

    func fetchWorkoutLogs(fromDate: String? = nil, toDate: String? = nil, limit: Int = 50) async throws -> [WorkoutLog] {
        if isDemoMode {
            return try await DebugUX.resolve(
                primary: Array(DemoContent.workouts.prefix(limit)),
                empty: [],
                label: "workout history"
            )
        }
        var query = client.from("workout_logs")
            .select()
            .eq("user_id", value: userId)
        if let from = fromDate { query = query.gte("date", value: from) }
        if let to = toDate { query = query.lte("date", value: to) }
        let value: [WorkoutLog] = try await query
            .order("date", ascending: false)
            .limit(limit)
            .execute()
            .value
        return value
    }

    func insertWorkoutLog(_ log: WorkoutLog) async throws {
        if isDemoMode { return }
        var row = log
        row.user_id = userId
        try await client.from("workout_logs").insert(row).execute()
    }

    /// Upsert a workout log by `log_id`. Used for optimistic mid-session checkpoints.
    func upsertWorkoutLog(_ log: WorkoutLog) async throws {
        if isDemoMode { return }
        var row = log
        row.user_id = userId
        try await client.from("workout_logs").upsert(row).execute()
    }

    func updateWorkoutLog(logId: String, _ log: WorkoutLog) async throws {
        if isDemoMode { return }
        try await client.from("workout_logs")
            .update(log)
            .eq("log_id", value: logId)
            .eq("user_id", value: userId)
            .execute()
    }

    func deleteWorkoutLog(logId: String) async throws {
        if isDemoMode { return }
        try await client.from("workout_logs")
            .delete()
            .eq("log_id", value: logId)
            .eq("user_id", value: userId)
            .execute()
    }

    // MARK: - nutrition_logs

    func fetchNutritionLogs(fromDate: String? = nil, toDate: String? = nil, limit: Int = 30) async throws -> [NutritionLog] {
        if isDemoMode {
            return try await DebugUX.resolve(
                primary: Array(DemoContent.nutritionHistory.prefix(limit)),
                empty: [],
                label: "nutrition history"
            )
        }
        var query = client.from("nutrition_logs")
            .select()
            .eq("user_id", value: userId)
        if let from = fromDate { query = query.gte("date", value: from) }
        if let to = toDate { query = query.lte("date", value: to) }
        return try await query
            .order("date", ascending: false)
            .limit(limit)
            .execute()
            .value
    }

    func fetchNutritionLog(date: String) async throws -> NutritionLog? {
        if isDemoMode {
            return try await DebugUX.resolve(
                primary: DemoContent.nutritionLog as NutritionLog?,
                empty: nil as NutritionLog?,
                label: "nutrition log"
            )
        }
        let rows: [NutritionLog] = try await client.from("nutrition_logs")
            .select()
            .eq("user_id", value: userId)
            .eq("date", value: date)
            .limit(1)
            .execute()
            .value
        return rows.first
    }

    func upsertNutritionLog(_ log: NutritionLog) async throws {
        if isDemoMode { return }
        var row = log
        row.user_id = userId
        try await client.from("nutrition_logs").upsert(row).execute()
    }

    // MARK: - progress_tracking

    func fetchProgressEntries(limit: Int = 100) async throws -> [ProgressEntry] {
        if isDemoMode {
            return try await DebugUX.resolve(
                primary: Array(DemoContent.progressEntries.prefix(limit)),
                empty: [],
                label: "progress entries"
            )
        }
        return try await client.from("progress_tracking")
            .select()
            .eq("user_id", value: userId)
            .order("date", ascending: false)
            .limit(limit)
            .execute()
            .value
    }

    func insertProgressEntry(_ entry: ProgressEntry) async throws {
        if isDemoMode { return }
        var row = entry
        row.user_id = userId
        try await client.from("progress_tracking").insert(row).execute()
    }

    // MARK: - daily_plans

    func fetchDailyPlan(dateLocal: String) async throws -> DailyPlan? {
        if isDemoMode {
            return try await DebugUX.resolve(
                primary: DemoContent.dailyPlan as DailyPlan?,
                empty: nil as DailyPlan?,
                label: "daily plan"
            )
        }
        struct Wrapper: Decodable { let plan_json: DailyPlan? }
        let rows: [Wrapper] = try await client.from("daily_plans")
            .select("plan_json")
            .eq("user_id", value: userId)
            .eq("date_local", value: dateLocal)
            .limit(1)
            .execute()
            .value
        return rows.first?.plan_json
    }

    // MARK: - check_ins

    func fetchCheckIn(dateLocal: String) async throws -> CheckIn? {
        if isDemoMode {
            return try await DebugUX.resolve(
                primary: DemoContent.checkIn as CheckIn?,
                empty: nil as CheckIn?,
                label: "check-in"
            )
        }
        let rows: [CheckIn] = try await client.from("check_ins")
            .select()
            .eq("user_id", value: userId)
            .eq("date_local", value: dateLocal)
            .limit(1)
            .execute()
            .value
        return rows.first
    }

    func upsertCheckIn(_ checkIn: CheckIn) async throws {
        if isDemoMode { return }
        var row = checkIn
        row.user_id = userId
        try await client.from("check_ins").upsert(row).execute()
    }

    // MARK: - connected_signals

    func upsertConnectedSignal(_ signal: ConnectedSignal) async throws {
        if isDemoMode { return }
        var row = signal
        row.user_id = userId
        try await client.from("connected_signals")
            .upsert(row, onConflict: "user_id,provider,signal_date")
            .execute()
    }

    // MARK: - onboarding

    func fetchOnboarding() async throws -> OnboardingRow? {
        if isDemoMode {
            return try await DebugUX.resolve(
                primary: OnboardingRow(onboarding_id: "onboarding-demo", user_id: userId, completed_at: ISO8601DateFormatter().string(from: Date()), responses: nil),
                empty: nil as OnboardingRow?,
                label: "onboarding"
            )
        }
        let rows: [OnboardingRow] = try await client.from("onboarding")
            .select()
            .eq("user_id", value: userId)
            .limit(1)
            .execute()
            .value
        return rows.first
    }

    func upsertOnboarding(_ row: OnboardingRow) async throws {
        if isDemoMode { return }
        var r = row
        r.user_id = userId
        try await client.from("onboarding").upsert(r).execute()
    }

    // MARK: - coach_nudges

    func fetchNudges(dateLocal: String? = nil, unacknowledgedOnly: Bool = true, limit: Int = 10) async throws -> [CoachNudge] {
        if isDemoMode {
            return try await DebugUX.resolve(
                primary: Array(DemoContent.nudges.prefix(limit)),
                empty: [],
                label: "coach nudges"
            )
        }
        var query = client.from("coach_nudges")
            .select()
            .eq("user_id", value: userId)
        if let d = dateLocal { query = query.eq("date_local", value: d) }
        if unacknowledgedOnly { query = query.is("acknowledged_at", value: nil as Bool?) }
        return try await query
            .order("created_at", ascending: false)
            .limit(limit)
            .execute()
            .value
    }
}
