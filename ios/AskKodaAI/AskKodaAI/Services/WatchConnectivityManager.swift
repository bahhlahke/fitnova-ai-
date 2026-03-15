import Foundation
import WatchConnectivity
import Combine

/**
 * WatchConnectivityManager handles real-time communication between iOS and Watch.
 * Shared between both targets.
 */
class WatchConnectivityManager: NSObject, ObservableObject, WCSessionDelegate {
    static let shared = WatchConnectivityManager()
    
    @Published var workoutState: WorkoutWatchState?
    
    private override init() {
        super.init()
        if WCSession.isSupported() {
            let session = WCSession.default
            session.delegate = self
            session.activate()
        }
    }
    
    // MARK: - API
    
    func sendState(_ state: WorkoutWatchState) {
        guard WCSession.default.activationState == .activated else { return }
        
        do {
            let data = try JSONEncoder().encode(state)
            let message = ["workoutState": data]
            
            // Use updateApplicationContext for state (persists last state)
            try WCSession.default.updateApplicationContext(message)
            
            // Also send immediate message if needed
            if WCSession.default.isReachable {
                WCSession.default.sendMessage(message, replyHandler: nil)
            }
        } catch {
            print("Failed to send state to Watch: \(error)")
        }
    }
    
    func sendAction(_ action: WatchAction) {
        guard WCSession.default.activationState == .activated else { return }
        
        do {
            let data = try JSONEncoder().encode(action)
            let message = ["watchAction": data]
            
            WCSession.default.sendMessage(message, replyHandler: nil) { error in
                print("Failed to send action to iOS: \(error)")
            }
        } catch {
            print("Failed to encode action: \(error)")
        }
    }
    
    // MARK: - WCSessionDelegate
    
    func session(_ session: WCSession, activationDidCompleteWith activationState: WCSessionActivationState, error: Error?) {
        if let error = error {
            print("WCSession activation failed: \(error.localizedDescription)")
        }
    }
    
    #if os(iOS)
    func sessionDidBecomeInactive(_ session: WCSession) {}
    func sessionDidDeactivate(_ session: WCSession) {
        session.activate()
    }
    #endif
    
    func session(_ session: WCSession, didReceiveMessage message: [String : Any]) {
        handleIncomingMessage(message)
    }
    
    func session(_ session: WCSession, didReceiveApplicationContext applicationContext: [String : Any]) {
        handleIncomingMessage(applicationContext)
    }
    
    private func handleIncomingMessage(_ message: [String : Any]) {
        DispatchQueue.main.async {
            if let stateData = message["workoutState"] as? Data {
                self.workoutState = try? JSONDecoder().decode(WorkoutWatchState.self, from: stateData)
            }
            
            if let actionData = message["watchAction"] as? Data {
                if let action = try? JSONDecoder().decode(WatchAction.self, from: actionData) {
                    NotificationCenter.default.post(name: .didReceiveWatchAction, object: action)
                }
            }
        }
    }
}

// MARK: - Models

struct WorkoutWatchState: Codable {
    let exerciseName: String
    let currentSet: Int
    let totalSets: Int
    let repsLabel: String
    let phase: String // "work", "rest", "intro"
    let restRemaining: Int?
    let heartRate: Int?
}

enum WatchAction: String, Codable {
    case completeSet
    case skipRest
    case previousExercise
    case nextExercise
}

extension NSNotification.Name {
    static let didReceiveWatchAction = NSNotification.Name("didReceiveWatchAction")
}
