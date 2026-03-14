//
//  KodaAppDelegate.swift
//  Koda AI
//
//  UIKit AppDelegate hooked into the SwiftUI lifecycle via @UIApplicationDelegateAdaptor.
//  Handles remote push notification registration and foreground deep-link routing.
//

import UIKit
import UserNotifications

final class KodaAppDelegate: NSObject, UIApplicationDelegate {

    private let kAPNSTokenKey = "koda.apns.deviceToken"

    // MARK: - Remote notifications

    func application(
        _ application: UIApplication,
        didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data
    ) {
        let tokenString = deviceToken.map { String(format: "%02.2hhx", $0) }.joined()
        UserDefaults.standard.set(tokenString, forKey: kAPNSTokenKey)
        print("[Koda] APNs device token: \(tokenString)")
    }

    func application(
        _ application: UIApplication,
        didFailToRegisterForRemoteNotificationsWithError error: Error
    ) {
        print("[Koda] Failed to register for remote notifications: \(error)")
    }

    // MARK: - Scene lifecycle (badge clear)

    func applicationDidBecomeActive(_ application: UIApplication) {
        Task { @MainActor in
            NotificationService.shared.clearBadge()
        }
    }
}
