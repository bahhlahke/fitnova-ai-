//
//  BioSyncHUD.swift
//  Koda AI
//
//  "Mission Control" HUD for the main dashboard.
//  Visualizes neural readiness and live biometric signals.
//

import SwiftUI

struct BioSyncHUD: View {
    let readinessScore: Double  // 0.0 to 1.0
    let activeSquad: String
    /// Live heart rate from HealthKit, nil if not available.
    var heartRate: Int? = nil
    /// Today's step count from HealthKit, nil if not available.
    var todaySteps: Int? = nil

    @State private var rotation: Double = 0
    @State private var pulse: CGFloat = 1.0
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    private var heartRateDisplay: String {
        if let hr = heartRate { return "\(hr)" }
        return "—"
    }

    private var stepsDisplay: String {
        guard let steps = todaySteps else { return "—" }
        return steps >= 1000 ? "\(steps / 1000)K" : "\(steps)"
    }

    var body: some View {
        HStack(spacing: 20) {
            // Neural Readiness Orb
            ZStack {
                Circle()
                    .stroke(
                        LinearGradient(
                            colors: [Brand.Color.accent, .clear, Brand.Color.accent.opacity(0.5)],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        ),
                        lineWidth: 2
                    )
                    .frame(width: 80, height: 80)
                    .rotationEffect(.degrees(rotation))

                Circle()
                    .fill(Brand.Color.accent.opacity(0.1))
                    .frame(width: 60, height: 60)
                    .scaleEffect(pulse)

                VStack(spacing: 0) {
                    Text("\(Int(readinessScore * 100))")
                        .font(.system(size: 24, weight: .black, design: .monospaced))
                        .foregroundStyle(.white)
                    Text("CNS")
                        .font(.system(size: 8, weight: .bold))
                        .foregroundStyle(Brand.Color.accent)
                }
            }
            .onAppear {
                guard !reduceMotion else { return }
                withAnimation(.linear(duration: 10).repeatForever(autoreverses: false)) {
                    rotation = 360
                }
                withAnimation(.easeInOut(duration: 2).repeatForever(autoreverses: true)) {
                    pulse = 1.1
                }
            }

            // Status block
            VStack(alignment: .leading, spacing: 4) {
                Text("PROTOCOL ACTIVE")
                    .font(.system(size: 8, weight: .black))
                    .tracking(2)
                    .foregroundStyle(Brand.Color.accent)

                Text(activeSquad.uppercased())
                    .font(.system(size: 18, weight: .black))
                    .italic()
                    .foregroundStyle(.white)
                    .lineLimit(1)
                    .minimumScaleFactor(0.7)

                HStack(spacing: 12) {
                    hudStat(label: "HR", value: heartRateDisplay, unit: heartRate != nil ? "BPM" : nil)
                    hudStat(label: "STEPS", value: stepsDisplay, unit: nil)
                }
            }

            Spacer()
        }
        .padding(20)
        .background(
            ZStack {
                Color.black.opacity(0.6)
                Path { path in
                    for i in 0...10 {
                        let x = CGFloat(i) * 40
                        path.move(to: CGPoint(x: x, y: 0))
                        path.addLine(to: CGPoint(x: x, y: 120))
                    }
                }
                .stroke(Color.white.opacity(0.03), lineWidth: 1)
            }
        )
        .clipShape(RoundedRectangle(cornerRadius: 20))
        .overlay(
            RoundedRectangle(cornerRadius: 20)
                .stroke(Color.white.opacity(0.1), lineWidth: 1)
        )
    }

    private func hudStat(label: String, value: String, unit: String?) -> some View {
        VStack(alignment: .leading, spacing: 0) {
            Text(label)
                .font(.system(size: 7, weight: .bold))
                .foregroundStyle(.white.opacity(0.4))
            HStack(spacing: 2) {
                Text(value)
                    .font(.system(size: 10, weight: .black, design: .monospaced))
                    .foregroundStyle(Brand.Color.accent)
                if let unit {
                    Text(unit)
                        .font(.system(size: 7, weight: .bold))
                        .foregroundStyle(Brand.Color.accent.opacity(0.7))
                }
            }
        }
    }
}
