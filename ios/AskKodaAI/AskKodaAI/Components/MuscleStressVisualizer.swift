//
//  MuscleStressVisualizer.swift
//  Koda AI
//

import SwiftUI

struct MuscleGroupTarget {
    let id: String
    let label: String
    let activation: Double // 0.0 to 1.0
}

struct MuscleStressVisualizer: View {
    // Dummy / representation data to show the visualization natively.
    // In parity with the newly revamped web Muscle Stress UI.
    
    let targets: [MuscleGroupTarget] = [
        MuscleGroupTarget(id: "chest", label: "Chest", activation: 0.8),
        MuscleGroupTarget(id: "back", label: "Back", activation: 0.6),
        MuscleGroupTarget(id: "legs", label: "Legs", activation: 0.9),
        MuscleGroupTarget(id: "core", label: "Core", activation: 0.4),
        MuscleGroupTarget(id: "arms", label: "Arms", activation: 0.7)
    ]
    
    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Muscle Stress Analysis")
                .font(.headline)
            
            VStack(spacing: 12) {
                ForEach(targets, id: \.id) { target in
                    HStack {
                        Text(target.label)
                            .font(.subheadline)
                            .frame(width: 60, alignment: .leading)
                        
                        GeometryReader { geo in
                            ZStack(alignment: .leading) {
                                RoundedRectangle(cornerRadius: 6)
                                    .fill(Color(.systemGray5))
                                    .frame(height: 12)
                                
                                RoundedRectangle(cornerRadius: 6)
                                    .fill(colorForActivation(target.activation))
                                    .frame(width: geo.size.width * target.activation, height: 12)
                            }
                        }
                        .frame(height: 12)
                        
                        Text("\(Int(target.activation * 100))%")
                            .font(.caption)
                            .monospacedDigit()
                            .foregroundStyle(.secondary)
                            .frame(width: 40, alignment: .trailing)
                    }
                }
            }
            .padding()
            .background(Color(.systemGray6))
            .clipShape(RoundedRectangle(cornerRadius: 12))
        }
    }
    
    private func colorForActivation(_ act: Double) -> Color {
        if act > 0.8 { return .red }
        if act > 0.5 { return .orange }
        return .green
    }
}
