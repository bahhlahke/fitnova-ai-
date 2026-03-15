//
//  CoachInsightDetailView.swift
//  Koda AI
//
//  Premium detail view for Coach Insights. Parity with web CoachInsightDetail.tsx.
//

import SwiftUI

struct CoachInsightDetailView: View {
    let insight: CoachInsight
    @Environment(\.dismiss) var dismiss
    
    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 24) {
                    // Header Area
                    VStack(alignment: .leading, spacing: 12) {
                        HStack {
                            urgencyBadge(insight.urgency ?? "low")
                            Spacer()
                            Button {
                                dismiss()
                            } label: {
                                Image(systemName: "xmark.circle.fill")
                                    .font(.title2)
                                    .foregroundStyle(Brand.Color.muted)
                            }
                        }
                        
                        Text(insight.title ?? "Insight")
                            .font(.system(size: 32, weight: .black))
                            .foregroundStyle(.white)
                    }
                    
                    // Supporting Data Section
                    if let data = insight.supporting_data {
                        VStack(alignment: .leading, spacing: 16) {
                            Text(data.headline ?? "Mastery Context")
                                .font(.system(size: 10, weight: .black, design: .monospaced))
                                .tracking(1.4)
                                .foregroundStyle(Brand.Color.accent)
                            
                            HStack(alignment: .bottom, spacing: 12) {
                                Text(data.value ?? "--")
                                    .font(.system(size: 48, weight: .black, design: .rounded))
                                    .foregroundStyle(.white)
                                
                                Text(data.context ?? "")
                                    .font(.subheadline.weight(.semibold))
                                    .foregroundStyle(Brand.Color.muted)
                                    .padding(.bottom, 10)
                            }
                            
                            if data.type == "chart" {
                                // Simple visualization placeholder
                                chartPlaceholder
                            }
                        }
                        .padding(24)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .background(
                            RoundedRectangle(cornerRadius: 24, style: .continuous)
                                .fill(Brand.Color.surfaceRaised.opacity(0.5))
                                .overlay(
                                    RoundedRectangle(cornerRadius: 24, style: .continuous)
                                        .stroke(Brand.Color.border, lineWidth: 1)
                                )
                        )
                    }
                    
                    // Rationale
                    VStack(alignment: .leading, spacing: 12) {
                        Text("COACH RATIONALE")
                            .font(.system(size: 10, weight: .black, design: .monospaced))
                            .tracking(1.4)
                            .foregroundStyle(Brand.Color.muted)
                        
                        Text(insight.message ?? "")
                            .font(.body)
                            .lineSpacing(4)
                            .foregroundStyle(.white.opacity(0.9))
                    }
                    .padding(.top, 8)
                }
                .padding(24)
            }
            .fnBackground()
            .toolbar {
                ToolbarItem(placement: .bottomBar) {
                    if let route = insight.cta_route {
                        Button {
                            // In a real app, this would navigate. For now, we dismiss and let the parent handle it.
                            dismiss()
                        } label: {
                            Text("Take Action")
                                .font(.headline.weight(.black))
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 14)
                                .background(Brand.Color.accent)
                                .foregroundStyle(.black)
                                .clipShape(Capsule())
                        }
                        .padding(.horizontal, 24)
                        .padding(.bottom, 20)
                    }
                }
            }
        }
    }
    
    @ViewBuilder
    private func urgencyBadge(_ urgency: String) -> some View {
        let color: Color = {
            switch urgency {
            case "high": return Brand.Color.danger
            case "medium": return Brand.Color.warning
            default: return Brand.Color.success
            }
        }()
        
        HStack(spacing: 4) {
            Circle().fill(color).frame(width: 8, height: 8)
            Text(urgency.uppercased())
                .font(.system(size: 10, weight: .black, design: .monospaced))
                .foregroundStyle(color)
        }
        .padding(.horizontal, 10)
        .padding(.vertical, 6)
        .background(color.opacity(0.1))
        .clipShape(Capsule())
    }
    
    private var chartPlaceholder: some View {
        HStack(alignment: .bottom, spacing: 4) {
            ForEach(0..<12) { i in
                RoundedRectangle(cornerRadius: 2)
                    .fill(Brand.Color.accent.opacity(Double.random(in: 0.3...1.0)))
                    .frame(width: 6, height: CGFloat.random(in: 10...40))
            }
        }
        .frame(height: 50)
        .padding(.top, 8)
    }
}
