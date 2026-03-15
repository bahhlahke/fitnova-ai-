import SwiftUI

@main
struct AskKodaWatchApp: App {
    @StateObject private var connectivityManager = WatchConnectivityManager.shared
    
    var body: some Scene {
        WindowGroup {
            if let state = connectivityManager.workoutState {
                WorkoutWatchView(state: state)
            } else {
                NoActiveWorkoutView()
            }
        }
    }
}

struct NoActiveWorkoutView: View {
    var body: some View {
        VStack(spacing: 12) {
            Image(systemName: "figure.strengthtraining.traditional")
                .font(.system(size: 40))
                .foregroundColor(.accentColor)
            
            Text("Ready to work?")
                .font(.headline)
            
            Text("Start a guided workout on your iPhone to begin.")
                .font(.caption2)
                .multilineTextAlignment(.center)
                .foregroundColor(.secondary)
        }
        .padding()
    }
}
