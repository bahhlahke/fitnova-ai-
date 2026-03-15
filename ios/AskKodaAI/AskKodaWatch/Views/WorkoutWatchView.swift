import SwiftUI

struct WorkoutWatchView: View {
    let state: WorkoutWatchState
    @StateObject private var connectivityManager = WatchConnectivityManager.shared
    
    var body: some View {
        VStack(spacing: 8) {
            // Header: Exercise Name
            Text(state.exerciseName)
                .font(.headline)
                .lineLimit(1)
                .minimumScaleFactor(0.8)
            
            HStack {
                // Set/Reps Info
                VStack(alignment: .leading) {
                    Text("SET \(state.currentSet) OF \(state.totalSets)")
                        .font(.system(size: 10, weight: .bold, design: .monospaced))
                        .foregroundColor(.accentColor)
                    
                    Text(state.repsLabel)
                        .font(.title2.weight(.black))
                }
                
                Spacer()
                
                // HR Data
                if let hr = state.heartRate {
                    VStack(alignment: .trailing) {
                        HStack(spacing: 4) {
                            Image(systemName: "heart.fill")
                                .foregroundColor(.red)
                                .font(.system(size: 10))
                            Text("\(hr)")
                                .font(.system(size: 20, weight: .bold, design: .rounded))
                        }
                        Text("BPM")
                            .font(.system(size: 8, weight: .bold))
                            .foregroundColor(.secondary)
                    }
                }
            }
            .padding(.horizontal, 4)
            
            Spacer()
            
            // Phase-aware interaction
            if state.phase == "rest" {
                VStack(spacing: 4) {
                    if let remaining = state.restRemaining {
                        Text("\(remaining)")
                            .font(.system(size: 30, weight: .black, design: .rounded))
                            .foregroundColor(.accentColor)
                    }
                    
                    Button(action: {
                        connectivityManager.sendAction(.skipRest)
                    }) {
                        Text("SKIP REST")
                            .font(.system(size: 12, weight: .bold))
                    }
                    .buttonStyle(.borderedProminent)
                    .tint(.accentColor)
                    .foregroundColor(.black)
                }
            } else {
                Button(action: {
                    connectivityManager.sendAction(.completeSet)
                }) {
                    VStack(spacing: 2) {
                        Image(systemName: "checkmark.circle.fill")
                        Text("DONE")
                    }
                    .padding(.vertical, 4)
                }
                .buttonStyle(.borderedProminent)
                .tint(.green)
                .foregroundColor(.white)
            }
        }
        .padding(.horizontal, 8)
    }
}

#Preview {
    WorkoutWatchView(state: WorkoutWatchState(
        exerciseName: "Bench Press",
        currentSet: 1,
        totalSets: 3,
        repsLabel: "10-12",
        phase: "work",
        restRemaining: nil,
        heartRate: 145
    ))
}
