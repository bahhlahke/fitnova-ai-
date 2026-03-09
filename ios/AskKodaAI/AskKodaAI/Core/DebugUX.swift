import Foundation

enum DebugUXScenario: String {
    case primary
    case empty
    case loading
    case error
}

enum DebugUX {
    static let demoUserId = "00000000-0000-0000-0000-000000000001"

    private static var environment: [String: String] {
        ProcessInfo.processInfo.environment
    }

    static var surface: String? {
        environment["E2E_SURFACE"]
    }

    static var variant: String? {
        environment["E2E_VARIANT"]
    }

    static var isSurfaceAudit: Bool {
        guard let surface, !surface.isEmpty else { return false }
        return true
    }

    static var isDemoMode: Bool {
        if isSurfaceAudit { return true }
        return normalized(environment["E2E_DEMO_MODE"]) == "true"
    }

    static var scenario: DebugUXScenario {
        guard let raw = environment["E2E_SCENARIO"] ?? environment["E2E_VARIANT"] else {
            return .primary
        }
        return DebugUXScenario(rawValue: normalized(raw)) ?? .primary
    }

    static var shouldFail: Bool {
        isDemoMode && scenario == .error
    }

    static func resolve<T>(
        primary: @autoclosure () -> T,
        empty: @autoclosure () -> T,
        label: String
    ) async throws -> T {
        if isDemoMode && scenario == .loading {
            try? await Task.sleep(nanoseconds: 4_000_000_000)
        }
        if shouldFail {
            throw KodaAPIError.http(status: 503, message: "Demo \(label) is unavailable in the error scenario.")
        }
        if isDemoMode && scenario == .empty {
            return empty()
        }
        return primary()
    }

    private static func normalized(_ value: String?) -> String {
        (value ?? "").trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
    }
}
