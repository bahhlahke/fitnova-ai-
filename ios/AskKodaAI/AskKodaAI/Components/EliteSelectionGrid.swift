//
//  EliteSelectionGrid.swift
//  Koda AI
//
//  Premium selection component for "Protocol Initialization".
//  Replaces standard pickers with rich visual cards.
//

import SwiftUI

struct EliteSelectionItem: Identifiable {
    let id: String
    let title: String
    let subtitle: String
    let icon: String // SF Symbol
    let imageURL: String? // Optional rich background
}

struct EliteSelectionGrid: View {
    let items: [EliteSelectionItem]
    @Binding var selection: String
    
    var body: some View {
        ScrollView {
            VStack(spacing: 16) {
                ForEach(items) { item in
                    Button(action: {
                        selection = item.id
                        UIImpactFeedbackGenerator(style: .medium).impactOccurred()
                    }) {
                        ZStack(alignment: .bottomLeading) {
                            // Rich Background
                            if let urlStr = item.imageURL, let url = URL(string: urlStr) {
                                AsyncImage(url: url) { image in
                                    image.resizable()
                                        .scaledToFill()
                                } placeholder: {
                                    Color.white.opacity(0.05)
                                }
                                .frame(height: 140)
                                .clipShape(RoundedRectangle(cornerRadius: 16))
                            } else {
                                RoundedRectangle(cornerRadius: 16)
                                    .fill(selection == item.id ? Brand.Color.accent.opacity(0.1) : Color.white.opacity(0.05))
                                    .frame(height: 140)
                            }
                            
                            // Glass Overlay
                            LinearGradient(colors: [.clear, .black.opacity(0.8)], startPoint: .top, endPoint: .bottom)
                                .clipShape(RoundedRectangle(cornerRadius: 16))
                            
                            VStack(alignment: .leading, spacing: 4) {
                                HStack(spacing: 8) {
                                    Image(systemName: item.icon)
                                        .font(.system(size: 14, weight: .bold))
                                        .foregroundStyle(selection == item.id ? Brand.Color.accent : .white)
                                    
                                    Text(item.title.uppercased())
                                        .font(.system(size: 12, weight: .black))
                                        .tracking(2)
                                        .foregroundStyle(selection == item.id ? Brand.Color.accent : .white)
                                }
                                
                                Text(item.subtitle)
                                    .font(.system(size: 10, weight: .medium))
                                    .foregroundStyle(.white.opacity(0.6))
                            }
                            .padding(20)
                        }
                        .overlay(
                            RoundedRectangle(cornerRadius: 16)
                                .stroke(selection == item.id ? Brand.Color.accent : Color.white.opacity(0.1), lineWidth: 2)
                        )
                        .scaleEffect(selection == item.id ? 1.02 : 1.0)
                        .animation(.spring(response: 0.3, dampingFraction: 0.7), value: selection)
                    }
                    .buttonStyle(.plain)
                }
            }
            .padding(.horizontal)
            .padding(.bottom, 20)
        }
    }
}
