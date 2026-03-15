import XCTest
@testable import AskKodaAI

final class WatchSyncTests: XCTestCase {
    
    func testWorkoutWatchStateEncoding() throws {
        let state = WorkoutWatchState(
            exerciseName: "Bench Press",
            currentSet: 2,
            totalSets: 3,
            repsLabel: "10-12",
            phase: "work",
            restRemaining: 45,
            heartRate: 145
        )
        
        let encoder = JSONEncoder()
        let data = try encoder.encode(state)
        
        let decoder = JSONDecoder()
        let decoded = try decoder.decode(WorkoutWatchState.self, from: data)
        
        XCTAssertEqual(decoded.exerciseName, "Bench Press")
        XCTAssertEqual(decoded.currentSet, 2)
        XCTAssertEqual(decoded.totalSets, 3)
        XCTAssertEqual(decoded.repsLabel, "10-12")
        XCTAssertEqual(decoded.phase, "work")
        XCTAssertEqual(decoded.restRemaining, 45)
        XCTAssertEqual(decoded.heartRate, 145)
    }
    
    func testWatchActionEncoding() throws {
        let action = WatchAction.completeSet
        
        let encoder = JSONEncoder()
        let data = try encoder.encode(action)
        
        let decoder = JSONDecoder()
        let decoded = try decoder.decode(WatchAction.self, from: data)
        
        XCTAssertEqual(decoded, .completeSet)
    }
}
