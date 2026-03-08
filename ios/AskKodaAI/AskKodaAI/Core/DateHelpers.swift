//
//  DateHelpers.swift
//  Koda AI
//

import Foundation

enum DateHelpers {
    static var todayLocal: String {
        let f = DateFormatter()
        f.dateFormat = "yyyy-MM-dd"
        f.timeZone = TimeZone.current
        return f.string(from: Date())
    }

    static func weekStartLocal(from date: Date = Date()) -> String {
        var cal = Calendar(identifier: .iso8601)
        var comps = cal.dateComponents([.yearForWeekOfYear, .weekOfYear], from: date)
        comps.weekday = 2 // Monday
        let monday = cal.date(from: comps) ?? date
        let f = DateFormatter()
        f.dateFormat = "yyyy-MM-dd"
        f.timeZone = TimeZone.current
        return f.string(from: monday)
    }

    static func fromISO(_ isoString: String) -> Date? {
        let f = ISO8601DateFormatter()
        f.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return f.date(from: isoString) ?? ISO8601DateFormatter().date(from: isoString)
    }
}
