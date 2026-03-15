//
//  DailyMasteryView.swift
//  Koda AI
//
//  Summary view for completed check-ins on iOS. Parity with web "Daily Mastery" summary.
//

import SwiftUI

struct DailyMasteryView: View {
    let energyScore: Int
    let sleepHours: Double
    let sorenessNotes: String
    let onEdit: () -> Void
    
    var body: some View {
        VStack(spacing: 24) {
            // Mastery Ring
            ZStack {
                Circle()
                    .stroke(Brand.Color.border, lineWidth: 8)
                    .frame(width: 160, height: 160)
                
                Circle()
                    .trim(from: 0, to: CGFloat(energyScore) / 10.0)
                    .stroke(
                        AngularGradient(
                            colors: [Brand.Color.accent, Brand.Color.success],
                            center: .center
                        ),
                        style: StrokeStyle(lineWidth: 12, lineCap: .round)
                    )
                    .rotationEffect(.degrees(-90))
                    .frame(width: 160, height: 160)
                    .shadow(color: Brand.Color.accent.opacity(0.3), radius: 10, x: 0, y: 0)
                
                VStack(spacing: -4) {
                    Text("\(energyScore * 10)%")
                        .font(.system(size: 36, weight: .black, design: .rounded))
                        .foregroundStyle(.white)
                    Text("READINESS")
                        .font(.system(size: 10, weight: .black, design: .monospaced))
                        .foregroundStyle(Brand.Color.muted)
                }
            }
            .padding(.top, 20)
            
            VStack(spacing: 8) {
                Text("DAILY MASTERY LOCKED")
                    .font(.system(size: 11, weight: .black, design: .monospaced))
                    .tracking(1.4)
                    .foregroundStyle(Brand.Color.accent)
                Text("Your signal has been received. Your protocol for today is calibrated to your current recovery capacity.")
                    .font(.subheadline)
                    .foregroundStyle(Brand.Color.muted)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 20)
            }
            
            // Stats Grid
            LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 12) {
                masteryStatEntry(label: "SLEEP", value: String(format: "%.1fh", sleepHours), icon: "moon.fill")
                masteryStatEntry(label: "ENERGY", value: "\(energyScore)/10", icon: "bolt.fill")
            }
            .padding(.horizontal, 16)
            
            if !sorenessNotes.isEmpty {
                VStack(alignment: .leading, spacing: 8) {
                    Text("SORENESS NOTES")
                        .font(.system(size: 9, weight: .black, design: .monospaced))
                        .foregroundStyle(Brand.Color.muted)
                    Text(sorenessNotes)
                        .font(.subheadline)
                        .foregroundStyle(.white.opacity(0.8))
                }
                .padding(16)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(Brand.Color.surfaceRaised.opacity(0.5))
                .clipShape(RoundedRectangle(cornerRadius: 16))
                .overlay(RoundedRectangle(cornerRadius: 16).stroke(Brand.Color.border, lineWidth: 1))
                .padding(.horizontal, 16)
            }
            
            Button(action: onEdit) {
                HStack {
                    Image(systemName: "pencil")
                    Text("Modify Check-in")
                }
                .font(.subheadline.weight(.bold))
                .foregroundStyle(Brand.Color.muted)
            }
            .padding(.top, 10)
        }
    }
    
    private func masteryStatEntry(label: String, value: String, icon: String) -> some View {
        HStack(spacing: 12) {
            Image(systemName: icon)
                .font(.caption)
                .foregroundStyle(Brand.Color.accent)
            VStack(alignment: .leading, spacing: 0) {
                Text(label)
                    .font(.system(size: 9, weight: .black, design: .monospaced))
                    .foregroundStyle(Brand.Color.muted)
                Text(value)
                    .font(.subheadline.weight(.black))
                    .foregroundStyle(.white)
            }
        }
        .padding(14)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Brand.Color.surfaceRaised.opacity(0.5))
        .clipShape(RoundedRectangle(cornerRadius: 16))
        .overlay(RoundedRectangle(cornerRadius: 16).stroke(Brand.Color.border, lineWidth: 1))
    }
}
