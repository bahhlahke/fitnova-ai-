//
//  NotificationService.swift
//  Koda AI
//
//  Manages local and remote push notifications:
//   - Daily plan reminder (07:00 recurring)
//   - Streak-at-risk alert (20:00 one-shot, cancelled when workout saved)
//   - Remote APNs device token storage
//

import Foundation
import UIKit
import UserNotifications

@MainActor
final class NotificationService: NSObject, ObservableObject {
    static let shared = NotificationService()

    private let center = UNUserNotificationCenter.current()
    private let kDailyPlanID = "koda.daily.plan"
    private let kStreakRiskID = "koda.streak.risk"
    private let kStreakRiskLastScheduledKey = "koda.streakRiskLastScheduled"

    private override init() {
        super.init()
        center.delegate = self
    }

    // MARK: - Authorization

    /// Call once on first launch (guarded with UserDefaults key in callers).
    func requestAuthorization() async {
        do {
            let granted = try await center.requestAuthorization(options: [.alert, .badge, .sound])
            if granted {
                await MainActor.run {
                    UIApplication.shared.registerForRemoteNotifications()
                }
            }
        } catch {
            print("[Koda] NotificationService.requestAuthorization: \(error)")
        }
    }

    // MARK: - Daily plan reminder (07:00 every day)

    func scheduleDailyPlanNotification() {
        center.removePendingNotificationRequests(withIdentifiers: [kDailyPlanID])

        let content = UNMutableNotificationContent()
        content.title = "Your plan is ready 💪"
        content.body = "Koda has built today's adaptive training session. Tap to see it."
        content.sound = .default
        content.userInfo = ["deepLink": "koda://home/plan"]

        var comps = DateComponents()
        comps.hour = 7
        comps.minute = 0

        let trigger = UNCalendarNotificationTrigger(dateMatching: comps, repeats: true)
        let request = UNNotificationRequest(identifier: kDailyPlanID, content: content, trigger: trigger)

        center.add(request) { error in
            if let error { print("[Koda] scheduleDailyPlanNotification: \(error)") }
        }
    }

    // MARK: - Streak-at-risk (20:00 one-shot, once per calendar day)

    func scheduleStreakAtRiskNotification() {
        let today = Calendar.current.startOfDay(for: Date())
        let lastScheduled = UserDefaults.standard.object(forKey: kStreakRiskLastScheduledKey) as? Date
        if let last = lastScheduled, Calendar.current.isDate(last, inSameDayAs: today) {
            return // already scheduled today
        }

        center.removePendingNotificationRequests(withIdentifiers: [kStreakRiskID])

        let content = UNMutableNotificationContent()
        content.title = "Don't break the chain 🔥"
        content.body = "You haven't trained yet today. Complete a quick session to keep your streak alive."
        content.sound = .default
        content.userInfo = ["deepLink": "koda://train"]

        var comps = DateComponents()
        comps.hour = 20
        comps.minute = 0

        let trigger = UNCalendarNotificationTrigger(dateMatching: comps, repeats: false)
        let request = UNNotificationRequest(identifier: kStreakRiskID, content: content, trigger: trigger)

        center.add(request) { [weak self] error in
            if let error {
                print("[Koda] scheduleStreakAtRiskNotification: \(error)")
            } else {
                UserDefaults.standard.set(today, forKey: self?.kStreakRiskLastScheduledKey ?? "")
            }
        }
    }

    /// Call when a workout is saved so the evening reminder is cancelled.
    func cancelStreakAtRiskNotification() {
        center.removePendingNotificationRequests(withIdentifiers: [kStreakRiskID])
    }

    // MARK: - Badge

    func clearBadge() {
        UIApplication.shared.applicationIconBadgeNumber = 0
    }
}

// MARK: - UNUserNotificationCenterDelegate

extension NotificationService: UNUserNotificationCenterDelegate {
    /// Show banners even when the app is in the foreground.
    nonisolated func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        willPresent notification: UNNotification,
        withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void
    ) {
        completionHandler([.banner, .sound, .badge])
    }

    /// Route deep links when the user taps a notification.
    nonisolated func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        didReceive response: UNNotificationResponse,
        withCompletionHandler completionHandler: @escaping () -> Void
    ) {
        if let rawURL = response.notification.request.content.userInfo["deepLink"] as? String,
           let url = URL(string: rawURL) {
            DispatchQueue.main.async {
                UIApplication.shared.open(url, options: [:], completionHandler: nil)
            }
        }
        completionHandler()
    }
}
