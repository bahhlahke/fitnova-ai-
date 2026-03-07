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
    let exercises: [PlanExercise]?
}

struct PlanExercise: Decodable {
    let name: String?
    let sets: Int?
    let reps: String?
    let notes: String?
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
