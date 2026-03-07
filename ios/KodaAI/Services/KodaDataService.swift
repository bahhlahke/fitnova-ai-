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

    init(client: SupabaseClient, userId: String) {
        self.client = client
        self.userId = userId
    }

    // MARK: - user_profile

    func fetchProfile() async throws -> UserProfile? {
        try await client.from("user_profile")
            .select()
            .eq("user_id", value: userId)
            .maybeSingle()
            .execute()
            .value
    }

    func upsertProfile(_ profile: UserProfile) async throws {
        var row = profile
        row.user_id = userId
        try await client.from("user_profile")
            .upsert(row)
            .execute()
    }

    // MARK: - workout_logs

    func fetchWorkoutLogs(fromDate: String? = nil, toDate: String? = nil, limit: Int = 50) async throws -> [WorkoutLog] {
        var query = client.from("workout_logs")
            .select()
            .eq("user_id", value: userId)
            .order("date", ascending: false)
            .limit(limit)
        if let from = fromDate { query = query.gte("date", value: from) }
        if let to = toDate { query = query.lte("date", value: to) }
        let value: [WorkoutLog] = try await query.execute().value
        return value
    }

    func insertWorkoutLog(_ log: WorkoutLog) async throws {
        var row = log
        row.user_id = userId
        try await client.from("workout_logs").insert(row).execute()
    }

    func updateWorkoutLog(logId: String, _ log: WorkoutLog) async throws {
        try await client.from("workout_logs")
            .update(log)
            .eq("log_id", value: logId)
            .eq("user_id", value: userId)
            .execute()
    }

    func deleteWorkoutLog(logId: String) async throws {
        try await client.from("workout_logs")
            .delete()
            .eq("log_id", value: logId)
            .eq("user_id", value: userId)
            .execute()
    }

    // MARK: - nutrition_logs

    func fetchNutritionLogs(fromDate: String? = nil, toDate: String? = nil, limit: Int = 30) async throws -> [NutritionLog] {
        var query = client.from("nutrition_logs")
            .select()
            .eq("user_id", value: userId)
            .order("date", ascending: false)
            .limit(limit)
        if let from = fromDate { query = query.gte("date", value: from) }
        if let to = toDate { query = query.lte("date", value: to) }
        return try await query.execute().value
    }

    func fetchNutritionLog(date: String) async throws -> NutritionLog? {
        try await client.from("nutrition_logs")
            .select()
            .eq("user_id", value: userId)
            .eq("date", value: date)
            .maybeSingle()
            .execute()
            .value
    }

    func upsertNutritionLog(_ log: NutritionLog) async throws {
        var row = log
        row.user_id = userId
        try await client.from("nutrition_logs").upsert(row).execute()
    }

    // MARK: - progress_tracking

    func fetchProgressEntries(limit: Int = 100) async throws -> [ProgressEntry] {
        try await client.from("progress_tracking")
            .select()
            .eq("user_id", value: userId)
            .order("date", ascending: false)
            .limit(limit)
            .execute()
            .value
    }

    func insertProgressEntry(_ entry: ProgressEntry) async throws {
        var row = entry
        row.user_id = userId
        try await client.from("progress_tracking").insert(row).execute()
    }

    // MARK: - daily_plans

    func fetchDailyPlan(dateLocal: String) async throws -> DailyPlan? {
        struct Wrapper: Decodable { let plan_json: DailyPlan? }
        let w: Wrapper? = try await client.from("daily_plans")
            .select("plan_json")
            .eq("user_id", value: userId)
            .eq("date_local", value: dateLocal)
            .maybeSingle()
            .execute()
            .value
        return w?.plan_json
    }

    // MARK: - check_ins

    func fetchCheckIn(dateLocal: String) async throws -> CheckIn? {
        try await client.from("check_ins")
            .select()
            .eq("user_id", value: userId)
            .eq("date_local", value: dateLocal)
            .maybeSingle()
            .execute()
            .value
    }

    func upsertCheckIn(_ checkIn: CheckIn) async throws {
        var row = checkIn
        row.user_id = userId
        try await client.from("check_ins").upsert(row).execute()
    }

    // MARK: - onboarding

    func fetchOnboarding() async throws -> OnboardingRow? {
        try await client.from("onboarding")
            .select()
            .eq("user_id", value: userId)
            .maybeSingle()
            .execute()
            .value
    }

    func upsertOnboarding(_ row: OnboardingRow) async throws {
        var r = row
        r.user_id = userId
        try await client.from("onboarding").upsert(r).execute()
    }

    // MARK: - coach_nudges

    func fetchNudges(dateLocal: String? = nil, unacknowledgedOnly: Bool = true, limit: Int = 10) async throws -> [CoachNudge] {
        var query = client.from("coach_nudges")
            .select()
            .eq("user_id", value: userId)
            .order("created_at", ascending: false)
            .limit(limit)
        if let d = dateLocal { query = query.eq("date_local", value: d) }
        if unacknowledgedOnly { query = query.is("acknowledged_at", value: nil) }
        return try await query.execute().value
    }
}
