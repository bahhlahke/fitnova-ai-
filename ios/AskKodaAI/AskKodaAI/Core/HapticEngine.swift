//
//  HapticEngine.swift
//  Koda AI
//
//  Centralised haptic feedback. All meaningful interactions should route through here.
//

import UIKit

enum HapticEngine {
    /// Standard button press, card tap, or navigation action.
    static func impact(_ style: UIImpactFeedbackGenerator.FeedbackStyle = .medium) {
        let g = UIImpactFeedbackGenerator(style: style)
        g.prepare()
        g.impactOccurred()
    }

    /// Success, error, or warning feedback.
    static func notification(_ type: UINotificationFeedbackGenerator.FeedbackType) {
        let g = UINotificationFeedbackGenerator()
        g.prepare()
        g.notificationOccurred(type)
    }

    /// Picker scrubs, tab switches, selection changes.
    static func selection() {
        let g = UISelectionFeedbackGenerator()
        g.selectionChanged()
    }
}
