import Foundation
import SwiftData
import Observation

@Observable
final class KodaSyncService {
    static let shared = KodaSyncService()
    
    private var modelContext: ModelContext?
    private var dataService: KodaDataService? {
        guard let userId = SupabaseService.shared.currentUserId else { return nil }
        return KodaDataService(client: SupabaseService.shared.supabaseClient, userId: userId)
    }
    private var isSyncing = false
    
    func setup(modelContext: ModelContext) {
        self.modelContext = modelContext
    }
    
    @MainActor
    func syncPendingWorkouts() async {
        guard let context = modelContext, !isSyncing else { return }
        isSyncing = true
        defer { isSyncing = false }
        
        do {
            let descriptor = FetchDescriptor<PersistentWorkoutLog>(
                predicate: #Predicate { $0.isSynced == false },
                sortBy: [SortDescriptor(\.createdAt)]
            )
            let pending = try context.fetch(descriptor)
            
            for workout in pending {
                guard NetworkMonitor.shared.isConnected else { break }
                
                do {
                    // Attempt to sync to remote
                    let log = workout.toAPIWorkoutLog()
                    try await dataService?.insertWorkoutLog(log)
                    
                    // Mark as synced
                    workout.isSynced = true
                    try context.save()
                    print("Synced workout: \(workout.id)")
                } catch {
                    print("Failed to sync workout \(workout.id): \(error)")
                }
            }
        } catch {
            print("Sync fetch error: \(error)")
        }
    }
}
