import Foundation
import SwiftData

@Model
final class PersistentWorkoutLog: Identifiable {
    @Attribute(.unique) var id: UUID
    var logId: String? // Remote ID if synced
    var userId: String
    var date: String
    var workoutType: String
    var durationMinutes: Int?
    var notes: String?
    var exercises: [PersistentExerciseLog]
    var createdAt: Date
    var isSynced: Boolean = false

    init(id: UUID = UUID(), userId: String, date: String, workoutType: String, exercises: [PersistentExerciseLog] = []) {
        self.id = id
        self.userId = userId
        self.date = date
        self.workoutType = workoutType
        self.exercises = exercises
        self.createdAt = Date()
    }
}

@Model
final class PersistentExerciseLog: Identifiable {
    @Attribute(.unique) var id: UUID
    var name: String
    var sets: Int
    var reps: String
    var weight: Double?
    var rpe: Int?

    init(id: UUID = UUID(), name: String, sets: Int, reps: String, weight: Double? = nil, rpe: Int? = nil) {
        self.id = id
        self.name = name
        self.sets = sets
        self.reps = reps
        self.weight = weight
        self.rpe = rpe
    }
}

extension PersistentWorkoutLog {
    func toAPIWorkoutLog() -> WorkoutLog {
        WorkoutLog(
            log_id: logId ?? id.uuidString,
            user_id: userId,
            date: date,
            workout_type: workoutType,
            duration_minutes: durationMinutes,
            exercises: exercises.map { ex in
                WorkoutLog.Exercise(
                    name: ex.name,
                    sets: ex.sets,
                    reps: ex.reps,
                    weight: ex.weight
                )
            },
            notes: notes
        )
    }
}
