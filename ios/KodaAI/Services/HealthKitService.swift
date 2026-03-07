//
//  HealthKitService.swift
//  Koda AI
//
//  Apple Health (HealthKit) integration: read weight, sleep, steps; sync to progress_tracking and check_ins.
//

import Foundation
#if canImport(HealthKit)
import HealthKit
#endif

@MainActor
final class HealthKitService: ObservableObject {
    static let shared = HealthKitService()

    @Published private(set) var isAvailable = false
    @Published private(set) var lastSyncDate: Date?
    @Published private(set) var syncError: String?
    @Published private(set) var isSyncing = false

    #if canImport(HealthKit)
    private let store = HKHealthStore()
    private static let maxDaysToSync = 90
    #endif

    private init() {
        #if canImport(HealthKit)
        isAvailable = HKHealthStore.isHealthDataAvailable()
        #endif
    }

    /// Request authorization for weight, sleep, step count. Call before syncing.
    func requestAuthorization() async throws {
        #if canImport(HealthKit)
        guard HKHealthStore.isHealthDataAvailable() else {
            throw HealthKitError.notAvailable
        }
        let typesToRead: Set<HKObjectType> = [
            HKQuantityType(.bodyMass),
            HKObjectType.categoryType(forIdentifier: .sleepAnalysis)!,
            HKQuantityType(.stepCount),
        ]
        try await store.requestAuthorization(toShare: nil, read: typesToRead)
        #else
        throw HealthKitError.notAvailable
        #endif
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
            }

            lastSyncDate = Date()
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
