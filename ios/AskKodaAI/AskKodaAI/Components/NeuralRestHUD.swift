//
//  NeuralRestHUD.swift
//  Koda AI
//
//  "Biometric Synapse" visualization for the rest phase.
//  Displays real-time heart rate, recovery efficiency, and AI steering messages.
//

import SwiftUI

struct NeuralRestHUD: View {
    let heartRate: Int?
    let timeRemaining: Int
    let recoveryScore: Double // 0.0 to 1.0 based on HR drop
    let steeringMessage: String?
    
    @State private var pulseScale: CGFloat = 1.0
    @State private var scanlineOffset: CGFloat = -100
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    var body: some View {
        VStack(spacing: 24) {
            // Heart Rate HUD
            ZStack {
                Circle()
                    .stroke(Brand.Color.accent.opacity(0.1), lineWidth: 4)
                    .frame(width: ringSize, height: ringSize)
                
                // Pulsing biometric ring
                Circle()
                    .stroke(Brand.Color.accent.opacity(0.5), lineWidth: 2)
                    .frame(width: innerRingSize, height: innerRingSize)
                    .scaleEffect(pulseScale)
                    .opacity(2 - pulseScale)
                
                VStack(spacing: 4) {
                    HStack(alignment: .lastTextBaseline, spacing: 4) {
                        Text("\(heartRate ?? 0)")
                            .font(.system(size: bpmFontSize, weight: .black, design: .monospaced))
                            .foregroundStyle(.white)
                        
                        Text("BPM")
                            .font(.system(size: bpmLabelSize, weight: .bold, design: .monospaced))
                            .foregroundStyle(Brand.Color.accent)
                    }
                    
                    Text("SYNAPSE ACTIVE")
                        .font(.system(size: 8, weight: .black))
                        .tracking(2)
                        .foregroundStyle(Brand.Color.accent)
                }
            }
            .onAppear {
                guard !reduceMotion else { return }
                withAnimation(.easeInOut(duration: 0.8).repeatForever(autoreverses: true)) {
                    pulseScale = 1.2
                }
            }
            
            // Progress / Status
            VStack(spacing: 12) {
                ViewThatFits(in: .horizontal) {
                    HStack {
                        statusItem(label: "TIME REMAINING", value: "\(timeRemaining)S")
                        Spacer()
                        statusItem(label: "RECOVERY", value: "\(Int(recoveryScore * 100))%")
                    }

                    VStack(alignment: .leading, spacing: 10) {
                        statusItem(label: "TIME REMAINING", value: "\(timeRemaining)S")
                        statusItem(label: "RECOVERY", value: "\(Int(recoveryScore * 100))%")
                    }
                }
                .padding(.horizontal, 20)
                
                // AI Steering Message (The "Neural Link")
                if let msg = steeringMessage {
                    Text(msg.uppercased())
                        .font(.system(size: 13, weight: .black, design: .monospaced))
                        .multilineTextAlignment(.center)
                        .foregroundStyle(.white)
                        .padding()
                        .background(
                            ZStack {
                                Brand.Color.accent.opacity(0.1)
                                Rectangle()
                                    .fill(
                                        LinearGradient(colors: [.clear, Brand.Color.accent.opacity(0.2), .clear], startPoint: .top, endPoint: .bottom)
                                    )
                                    .frame(height: 2)
                                    .offset(y: scanlineOffset)
                            }
                        )
                        .clipShape(RoundedRectangle(cornerRadius: 12))
                        .overlay(
                            RoundedRectangle(cornerRadius: 12)
                                .stroke(Brand.Color.accent.opacity(0.3), lineWidth: 1)
                        )
                        .padding(.horizontal, 8)
                        .onAppear {
                            guard !reduceMotion else { return }
                            withAnimation(.linear(duration: 2.0).repeatForever(autoreverses: false)) {
                                scanlineOffset = 100
                            }
                        }
                }
            }
        }
        .padding(.vertical, 40)
        .background(Color.black.opacity(0.4))
        .clipShape(RoundedRectangle(cornerRadius: 32))
        .overlay(
            RoundedRectangle(cornerRadius: 32)
                .stroke(Color.white.opacity(0.1), lineWidth: 1)
        )
    }

    private var ringSize: CGFloat {
        156
    }

    private var innerRingSize: CGFloat {
        ringSize - 10
    }

    private var bpmFontSize: CGFloat {
        52
    }

    private var bpmLabelSize: CGFloat {
        12
    }
    
    private func statusItem(label: String, value: String) -> some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(label)
                .font(.system(size: 8, weight: .black))
                .foregroundStyle(.white.opacity(0.5))
            Text(value)
                .font(.system(size: 18, weight: .bold, design: .monospaced))
                .foregroundStyle(Brand.Color.accent)
        }
    }
}
