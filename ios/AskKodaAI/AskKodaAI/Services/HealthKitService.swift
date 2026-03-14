//
//  HealthKitService.swift
//  Koda AI
//
//  Apple Health (HealthKit) integration: read weight, sleep, steps; sync to progress_tracking and check_ins.
//

import Foundation
import Combine
#if canImport(HealthKit)
import HealthKit
#endif

@MainActor
final class HealthKitService: ObservableObject {
    static let shared = HealthKitService()

    @Published private(set) var isAvailable = false
    @Published private(set) var lastSyncDate: Date?
    @Published private(set) var lastSyncSummary: String?
    @Published private(set) var syncError: String?
    @Published private(set) var isSyncing = false
    @Published private(set) var currentHeartRate: Int?
    @Published private(set) var todaySteps: Int?

    #if canImport(HealthKit)
    private let store = HKHealthStore()
    private static let maxDaysToSync = 90
    #endif

    private init() {
        #if canImport(HealthKit)
        isAvailable = HKHealthStore.isHealthDataAvailable()
        #endif
    }
    
    #if canImport(HealthKit)
    private var hrQuery: HKAnchoredObjectQuery?
    #endif

    func startHeartRateStreaming() {
        #if canImport(HealthKit)
        guard HKHealthStore.isHealthDataAvailable() else { return }
        
        let hrType = HKQuantityType(.heartRate)
        let predicate = HKQuery.predicateForSamples(withStart: Date(), end: nil, options: .strictStartDate)
        
        hrQuery = HKAnchoredObjectQuery(type: hrType, predicate: predicate, anchor: nil, limit: HKObjectQueryNoLimit) { [weak self] _, samples, _, _, _ in
            Task { @MainActor [weak self] in
                self?.processHRSamples(samples)
            }
        }
        
        hrQuery?.updateHandler = { [weak self] _, samples, _, _, _ in
            Task { @MainActor [weak self] in
                self?.processHRSamples(samples)
            }
        }
        
        store.execute(hrQuery!)
        #endif
    }
    
    func stopHeartRateStreaming() {
        #if canImport(HealthKit)
        if let query = hrQuery {
            store.stop(query)
            hrQuery = nil
        }
        currentHeartRate = nil
        #endif
    }

    /// Fetch today's cumulative step count and publish it to `todaySteps`.
    func fetchTodaySteps() async {
        #if canImport(HealthKit)
        guard HKHealthStore.isHealthDataAvailable() else { return }
        let stepType = HKQuantityType(.stepCount)
        let calendar = Calendar.current
        let startOfDay = calendar.startOfDay(for: Date())
        let predicate = HKQuery.predicateForSamples(withStart: startOfDay, end: Date(), options: .strictStartDate)
        let steps: Int? = await withCheckedContinuation { cont in
            let q = HKStatisticsQuery(quantityType: stepType, quantitySamplePredicate: predicate, options: .cumulativeSum) { _, stats, _ in
                if let sum = stats?.sumQuantity() {
                    cont.resume(returning: Int(sum.doubleValue(for: .count())))
                } else {
                    cont.resume(returning: nil)
                }
            }
            store.execute(q)
        }
        await MainActor.run { self.todaySteps = steps }
        #endif
    }
    
    #if canImport(HealthKit)
    private func processHRSamples(_ samples: [HKSample]?) {
        guard let samples = samples as? [HKQuantitySample], let last = samples.last else { return }
        let hr = Int(last.quantity.doubleValue(for: HKUnit.count().unitDivided(by: .minute())))
        Task { @MainActor in
            self.currentHeartRate = hr
        }
    }
    #endif

    /// Request authorization for weight, sleep, step count, heart rate, and HRV. Call before syncing.
    func requestAuthorization() async throws {
        #if canImport(HealthKit)
        guard HKHealthStore.isHealthDataAvailable() else {
            throw HealthKitError.notAvailable
        }
        let typesToRead: Set<HKObjectType> = [
            HKQuantityType(.bodyMass),
            HKObjectType.categoryType(forIdentifier: .sleepAnalysis)!,
            HKQuantityType(.stepCount),
            HKQuantityType(.heartRate),
            HKQuantityType(.heartRateVariabilitySDNN)
        ]
        try await store.requestAuthorization(toShare: Set<HKSampleType>(), read: typesToRead)
        #else
        throw HealthKitError.notAvailable
        #endif
    }

    // MARK: - HRV

    /// Fetch the last `days` days of HRV (SDNN) samples.
    func fetchHRVSamples(days: Int = 7) async -> [(date: Date, hrv: Double)] {
        #if canImport(HealthKit)
        guard HKHealthStore.isHealthDataAvailable() else { return [] }
        let hrvType = HKQuantityType(.heartRateVariabilitySDNN)
        let start = Calendar.current.date(byAdding: .day, value: -days, to: Date()) ?? Date()
        let predicate = HKQuery.predicateForSamples(withStart: start, end: Date(), options: .strictStartDate)
        let samples: [HKQuantitySample] = (try? await withCheckedThrowingContinuation { cont in
            let q = HKSampleQuery(
                sampleType: hrvType,
                predicate: predicate,
                limit: HKObjectQueryNoLimit,
                sortDescriptors: [NSSortDescriptor(key: HKSampleSortIdentifierStartDate, ascending: true)]
            ) { _, s, err in
                if let err { return cont.resume(throwing: err) }
                cont.resume(returning: (s as? [HKQuantitySample]) ?? [])
            }
            store.execute(q)
        }) ?? []
        return samples.map { ($0.startDate, $0.quantity.doubleValue(for: HKUnit(from: "ms"))) }
        #else
        return []
        #endif
    }

    /// Returns today's HRV and the 7-day baseline average.
    /// Returns `(nil, nil)` when no HRV data is available.
    func computeHRVStatus() async -> (todayHRV: Double?, baseline: Double?) {
        let samples = await fetchHRVSamples(days: 7)
        guard !samples.isEmpty else { return (nil, nil) }
        let baseline = samples.map(\.hrv).reduce(0, +) / Double(samples.count)
        let todaySamples = samples.filter { Calendar.current.isDateInToday($0.date) }
        let todayHRV = todaySamples.isEmpty ? nil : todaySamples.map(\.hrv).reduce(0, +) / Double(todaySamples.count)
        return (todayHRV, baseline)
    }

    /// Read weight, sleep, steps from HealthKit and push to Koda (progress_tracking, check_ins).
    func syncToKoda(dataService: KodaDataService) async {
        #if canImport(HealthKit)
        guard HKHealthStore.isHealthDataAvailable() else {
            syncError = "Health data not available."
            return
        }
        isSyncing = true
        syncError = nil
        defer { isSyncing = false }

        let calendar = Calendar.current
        let endDate = Date()
        guard let startDate = calendar.date(byAdding: .day, value: -Self.maxDaysToSync, to: endDate) else { return }

        let dateFormatter = DateFormatter()
        dateFormatter.dateFormat = "yyyy-MM-dd"
        dateFormatter.timeZone = TimeZone.current

        do {
            var weightCount = 0
            var sleepCount = 0
            var stepCount = 0
            // 1) Weight → progress_tracking
            let weightType = HKQuantityType(.bodyMass)
            let weightPredicate = HKQuery.predicateForSamples(withStart: startDate, end: endDate, options: .strictStartDate)
            let weightSamples: [HKQuantitySample] = try await withCheckedThrowingContinuation { cont in
                let q = HKSampleQuery(sampleType: weightType, predicate: weightPredicate, limit: HKObjectQueryNoLimit, sortDescriptors: [NSSortDescriptor(key: HKSampleSortIdentifierStartDate, ascending: true)]) { _, samples, err in
                    if let err = err { return cont.resume(throwing: err) }
                    cont.resume(returning: (samples as? [HKQuantitySample]) ?? [])
                }
                store.execute(q)
            }
            for sample in weightSamples {
                let dateLocal = dateFormatter.string(from: sample.startDate)
                let kg = sample.quantity.doubleValue(for: .gramUnit(with: .kilo))
                var entry = ProgressEntry()
                entry.date = dateLocal
                entry.weight_kg = kg
                entry.notes = "Synced from Apple Health"
                try? await dataService.insertProgressEntry(entry)
                weightCount += 1
            }

            // 2) Sleep → check_ins (sleep_hours per day)
            guard let sleepType = HKObjectType.categoryType(forIdentifier: .sleepAnalysis) else { return }
            let sleepPredicate = HKQuery.predicateForSamples(withStart: startDate, end: endDate, options: .strictStartDate)
            let sleepSamples: [HKCategorySample] = try await withCheckedThrowingContinuation { cont in
                let q = HKSampleQuery(sampleType: sleepType, predicate: sleepPredicate, limit: HKObjectQueryNoLimit, sortDescriptors: [NSSortDescriptor(key: HKSampleSortIdentifierStartDate, ascending: true)]) { _, samples, err in
                    if let err = err { return cont.resume(throwing: err) }
                    cont.resume(returning: (samples as? [HKCategorySample]) ?? [])
                }
                store.execute(q)
            }
            var sleepByDay: [String: Double] = [:]
            for sample in sleepSamples {
                let dateLocal = dateFormatter.string(from: sample.startDate)
                let hours = sample.endDate.timeIntervalSince(sample.startDate) / 3600
                sleepByDay[dateLocal, default: 0] += hours
            }
            for (dateLocal, hours) in sleepByDay {
                var checkIn = CheckIn()
                checkIn.date_local = dateLocal
                checkIn.sleep_hours = hours
                try? await dataService.upsertCheckIn(checkIn)
                var signal = ConnectedSignal()
                signal.provider = "apple_health"
                signal.signal_date = dateLocal
                signal.sleep_hours = hours
                signal.updated_at = ISO8601DateFormatter().string(from: Date())
                try? await dataService.upsertConnectedSignal(signal)
                sleepCount += 1
            }

            // 3) Steps → connected_signals
            let stepType = HKQuantityType(.stepCount)
            let stepPredicate = HKQuery.predicateForSamples(withStart: startDate, end: endDate, options: .strictStartDate)
            let stepSamples: [HKQuantitySample] = try await withCheckedThrowingContinuation { cont in
                let q = HKSampleQuery(sampleType: stepType, predicate: stepPredicate, limit: HKObjectQueryNoLimit, sortDescriptors: [NSSortDescriptor(key: HKSampleSortIdentifierStartDate, ascending: true)]) { _, samples, err in
                    if let err = err { return cont.resume(throwing: err) }
                    cont.resume(returning: (samples as? [HKQuantitySample]) ?? [])
                }
                store.execute(q)
            }
            var stepsByDay: [String: Int] = [:]
            for sample in stepSamples {
                let dateLocal = dateFormatter.string(from: sample.startDate)
                let steps = Int(sample.quantity.doubleValue(for: .count()))
                stepsByDay[dateLocal, default: 0] += steps
            }
            for (dateLocal, steps) in stepsByDay {
                var signal = ConnectedSignal()
                signal.provider = "apple_health"
                signal.signal_date = dateLocal
                signal.steps = steps
                signal.updated_at = ISO8601DateFormatter().string(from: Date())
                try? await dataService.upsertConnectedSignal(signal)
                stepCount += 1
            }

            lastSyncDate = Date()
            lastSyncSummary = "Synced \(weightCount) weight entries, \(sleepCount) sleep days, and \(stepCount) step days."
        } catch {
            syncError = error.localizedDescription
        }
        #else
        syncError = "HealthKit is not available on this device."
        #endif
    }
}

enum HealthKitError: LocalizedError {
    case notAvailable
    var errorDescription: String? {
        switch self {
        case .notAvailable: return "Health data is not available on this device."
        }
    }
}
