//
//  NetworkClient.swift
//  Koda AI
//
//  Robust HTTP client: retry with backoff, timeout, and consistent error handling.
//

import Foundation

actor NetworkClient {
    static let shared = NetworkClient()
    private let session: URLSession
    private let maxRetries = 2
    private let timeout: TimeInterval = 30

    private init() {
        let config = URLSessionConfiguration.default
        config.timeoutIntervalForRequest = timeout
        config.timeoutIntervalForResource = 60
        self.session = URLSession(configuration: config)
    }

    func data(for request: URLRequest) async throws -> (Data, HTTPURLResponse) {
        var lastError: Error?
        for attempt in 0 ... maxRetries {
            do {
                let (data, response) = try await session.data(for: request)
                guard let http = response as? HTTPURLResponse else {
                    throw KodaAPIError.invalidResponse
                }
                if (200 ..< 300).contains(http.statusCode) {
                    return (data, http)
                }
                let body = try? JSONDecoder().decode(APIErrorBody.self, from: data)
                throw KodaAPIError.http(status: http.statusCode, message: body?.error ?? String(data: data, encoding: .utf8) ?? "Request failed")
            } catch {
                lastError = error
                if attempt < maxRetries, isRetryable(error) {
                    try await Task.sleep(nanoseconds: UInt64(500_000_000 * (attempt + 1))) // 0.5s, 1s
                    continue
                }
                throw error
            }
        }
        throw lastError ?? KodaAPIError.unknown
    }

    private func isRetryable(_ error: Error) -> Bool {
        if case .http(let status, _) = error as? KodaAPIError {
            return status == 429 || status >= 500
        }
        return (error as NSError).code == NSURLErrorTimedOut
            || (error as NSError).code == NSURLErrorNetworkConnectionLost
    }
}
