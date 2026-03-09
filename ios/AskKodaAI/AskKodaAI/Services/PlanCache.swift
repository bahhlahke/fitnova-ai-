//
//  PlanCache.swift
//  Koda AI
//
//  UserDefaults-backed stale-while-revalidate cache for DailyPlan.
//  Cold launches show yesterday's plan instantly while the fresh fetch runs in background.
//

import Foundation

struct PlanCache {
    static let shared = PlanCache()
    private let defaults = UserDefaults.standard
    private let ttl: TimeInterval = 3600 // 1 hour

    private enum Keys {
        static let plan = "cached_daily_plan"
        static let date = "cached_daily_plan_date"
    }

    func storeDailyPlan(_ plan: DailyPlan) {
        guard let data = try? JSONEncoder().encode(plan) else { return }
        defaults.set(data, forKey: Keys.plan)
        defaults.set(Date(), forKey: Keys.date)
    }

    /// Returns a cached plan if one exists within TTL; nil otherwise.
    func loadDailyPlan() -> DailyPlan? {
        guard
            let date = defaults.object(forKey: Keys.date) as? Date,
            Date().timeIntervalSince(date) < ttl,
            let data = defaults.data(forKey: Keys.plan)
        else { return nil }
        return try? JSONDecoder().decode(DailyPlan.self, from: data)
    }
}
