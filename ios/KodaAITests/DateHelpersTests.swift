//
//  DateHelpersTests.swift
//  KodaAITests
//
//  Unit tests for DateHelpers (format, week start).
//

import XCTest
@testable import AskKodaAI

final class DateHelpersTests: XCTestCase {

    func testTodayLocalFormat() {
        let value = DateHelpers.todayLocal
        // yyyy-MM-dd
        let pattern = #"^\d{4}-\d{2}-\d{2}$"#
        let regex = try! NSRegularExpression(pattern: pattern)
        let range = NSRange(value.startIndex..., in: value)
        XCTAssertTrue(regex.firstMatch(in: value, options: [], range: range) != nil, "todayLocal should be yyyy-MM-dd, got: \(value)")
    }

    func testWeekStartLocalMonday() {
        // 2026-03-09 is Sunday; Monday of that week is 2026-03-03
        var comp = DateComponents()
        comp.year = 2026
        comp.month = 3
        comp.day = 9
        let calendar = Calendar.current
        let date = calendar.date(from: comp)!
        let weekStart = DateHelpers.weekStartLocal(from: date)
        XCTAssertEqual(weekStart, "2026-03-03", "Week containing 2026-03-09 (Sunday) should start 2026-03-03 (Monday)")
    }

    func testWeekStartLocalMondaySameDay() {
        // 2026-03-02 is Monday; week start is itself
        var comp = DateComponents()
        comp.year = 2026
        comp.month = 3
        comp.day = 2
        let calendar = Calendar.current
        let date = calendar.date(from: comp)!
        let weekStart = DateHelpers.weekStartLocal(from: date)
        XCTAssertEqual(weekStart, "2026-03-02")
    }
}
