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

struct HealthLiveSnapshot {
    let provider: String
    let currentHeartRate: Int?
    let todaySteps: Int?
    let todayHRV: Double?
    let hrvBaseline: Double?
    let hrvDelta: Double?
    let sessionPhase: String?
    let recoveryTargetHeartRate: Int?
    let signalCapturedAt: Date
}

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
    @Published private(set) var todayHRV: Double?
    @Published private(set) var hrvBaseline: Double?
    @Published private(set) var liveSignalsUpdatedAt: Date?
    @Published private(set) var isAuthorized: Bool? = nil

    var hrvDelta: Double? {
        guard let todayHRV, let hrvBaseline else { return nil }
        return todayHRV - hrvBaseline
    }

    #if canImport(HealthKit)
    private let store = HKHealthStore()
    private static let maxDaysToSync = 90

    private static var coreReadRequirements: [(type: HKObjectType, label: String)] {
        [
            (HKQuantityType(.bodyMass), "weight"),
            (HKObjectType.categoryType(forIdentifier: .sleepAnalysis)!, "sleep"),
            (HKQuantityType(.stepCount), "step count")
        ]
    }

    private static var optionalReadRequirements: [HKObjectType] {
        [
            HKQuantityType(.heartRate),
            HKQuantityType(.heartRateVariabilitySDNN)
        ]
    }

    private var unauthorizedCoreReadLabels: [String] {
        Self.coreReadRequirements.compactMap { entry in
            switch store.authorizationStatus(for: entry.type) {
            case .sharingAuthorized:
                return nil
            case .notDetermined, .sharingDenied:
                return entry.label
            @unknown default:
                return entry.label
            }
        }
    }

    private var authorizedCoreReadCount: Int {
        Self.coreReadRequirements.count - unauthorizedCoreReadLabels.count
    }

    private static func rounded(_ value: Double, places: Int = 1) -> Double {
        let multiplier = pow(10.0, Double(places))
        return (value * multiplier).rounded() / multiplier
    }
    #endif

    private init() {
        #if canImport(HealthKit)
        isAvailable = HKHealthStore.isHealthDataAvailable()
        if isAvailable {
            refreshAuthorizationStatus()
        }
        #endif
    }

    func refreshAuthorizationStatus() {
        #if canImport(HealthKit)
        guard isAvailable else { return }
        let coreTypes = Set(Self.coreReadRequirements.map(\.type))
        let authorized = coreTypes.allSatisfy { store.authorizationStatus(for: $0) == .sharingAuthorized }
        // Note: HealthKit authorizationStatus is for SHARING (writing). 
        // For READING, it always returns .notDetermined or .sharingAuthorized (if we asked).
        // A better check for reading is to see if we've at least prompted.
        // However, for Koda, we want to know if they've granted the permissions we asked for.
        // We'll use a pragmatic check: if any of our core types are authorized for reading (which we can't truly check),
        // we'll assume authorized if they've completed the prompt and we have some data or status is sharingAuthorized.
        
        // Since we can't definitively know READ authorization, we'll mark as authorized if they've gone through the flow.
        // We'll update this after a successful requestAuthorization call.
        if isAuthorized == nil && authorized {
            isAuthorized = true
        }
        #endif
    }
    
    #if canImport(HealthKit)
    private var hrQuery: HKAnchoredObjectQuery?
    #endif

    func startHeartRateStreaming() {
        #if canImport(HealthKit)
        guard HKHealthStore.isHealthDataAvailable() else { return }
        guard hrQuery == nil else { return }
        
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
            self.liveSignalsUpdatedAt = Date()
        }
    }
    #endif

    /// Pulls the latest lightweight health signals used in guided coaching and AI context.
    func refreshLiveCoachingSignals() async {
        #if canImport(HealthKit)
        guard HKHealthStore.isHealthDataAvailable() else { return }
        await fetchTodaySteps()
        let hrv = await computeHRVStatus()
        todayHRV = hrv.todayHRV.map { Self.rounded($0, places: 1) }
        hrvBaseline = hrv.baseline.map { Self.rounded($0, places: 1) }
        liveSignalsUpdatedAt = Date()
        #else
        liveSignalsUpdatedAt = Date()
        #endif
    }

    func liveSnapshot(
        sessionPhase: String? = nil,
        recoveryTargetHeartRate: Int? = nil
    ) -> HealthLiveSnapshot? {
        let hasSignal =
            currentHeartRate != nil ||
            todaySteps != nil ||
            todayHRV != nil ||
            hrvBaseline != nil
        guard hasSignal else { return nil }

        return HealthLiveSnapshot(
            provider: "apple_health",
            currentHeartRate: currentHeartRate,
            todaySteps: todaySteps,
            todayHRV: todayHRV,
            hrvBaseline: hrvBaseline,
            hrvDelta: hrvDelta,
            sessionPhase: sessionPhase,
            recoveryTargetHeartRate: recoveryTargetHeartRate,
            signalCapturedAt: liveSignalsUpdatedAt ?? Date()
        )
    }

    /// Request authorization for weight, sleep, step count, heart rate, and HRV. Call before syncing.
    func requestAuthorization() async throws {
        #if canImport(HealthKit)
        guard HKHealthStore.isHealthDataAvailable() else {
            throw HealthKitError.notAvailable
        }
        let typesToRead = Set(Self.coreReadRequirements.map(\.type) + Self.optionalReadRequirements)
        try await store.requestAuthorization(toShare: Set<HKSampleType>(), read: typesToRead)

        let unauthorizedCore = unauthorizedCoreReadLabels
        if unauthorizedCore.count == Self.coreReadRequirements.count {
            throw HealthKitError.permissionDenied(dataTypes: unauthorizedCore)
        }
        if !unauthorizedCore.isEmpty && authorizedCoreReadCount > 0 {
            throw HealthKitError.partialPermissionDenied(dataTypes: unauthorizedCore)
        }
        isAuthorized = true
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

            // 4) HRV (today snapshot) → connected_signals for readiness context.
            let hrvStatus = await computeHRVStatus()
            if let today = hrvStatus.todayHRV {
                var signal = ConnectedSignal()
                signal.provider = "apple_health"
                signal.signal_date = dateFormatter.string(from: endDate)
                signal.hrv = Self.rounded(today, places: 1)
                signal.updated_at = ISO8601DateFormatter().string(from: Date())
                try? await dataService.upsertConnectedSignal(signal)
            }

            todayHRV = hrvStatus.todayHRV.map { Self.rounded($0, places: 1) }
            hrvBaseline = hrvStatus.baseline.map { Self.rounded($0, places: 1) }
            liveSignalsUpdatedAt = Date()

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
    case permissionDenied(dataTypes: [String])
    case partialPermissionDenied(dataTypes: [String])

    private static func formattedList(_ values: [String]) -> String {
        guard !values.isEmpty else { return "required data types" }
        if values.count == 1 { return values[0] }
        if values.count == 2 { return "\(values[0]) and \(values[1])" }
        let head = values.dropLast().joined(separator: ", ")
        return "\(head), and \(values.last ?? "")"
    }

    var errorDescription: String? {
        switch self {
        case .notAvailable:
            return "Health data is not available on this device."
        case let .permissionDenied(dataTypes):
            return "Apple Health access was not granted for \(Self.formattedList(dataTypes))."
        case let .partialPermissionDenied(dataTypes):
            return "Apple Health access is limited. Missing access for \(Self.formattedList(dataTypes))."
        }
    }
}
