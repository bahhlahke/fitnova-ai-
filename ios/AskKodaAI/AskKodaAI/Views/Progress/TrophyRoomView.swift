//
//  TrophyRoomView.swift
//  Koda AI
//
//  Gamification view displaying unlocked Elite Protocols and achievements.
//

import SwiftUI

struct TrophyItem: Identifiable {
    let id: String
    let name: String
    let description: String
    let aiRationale: String
    let dateEarned: Date
    let iconSystemName: String
    let rarity: Rarity
    
    enum Rarity: String {
        case common = "COMMON"
        case rare = "RARE"
        case epic = "EPIC"
        case legendary = "LEGENDARY"
        
        var colors: [Color] {
            switch self {
            case .legendary: return [.yellow, .orange, .red]
            case .epic: return [.purple, .pink, .indigo]
            case .rare: return [.cyan, .blue, .teal]
            case .common: return [.gray, .secondary, .gray]
            }
        }
    }
}

// Temporary hardcoded achievements for visual demo of the Elite Gamification Protocol
let mockTrophies: [TrophyItem] = [
    TrophyItem(id: "t1", name: "Titanium CNS", description: "Logged 10 consecutive workouts.", aiRationale: "Neural analysis detects high neuromuscular efficiency. Your recovery-to-strain ratio remained above 85% despite increasing volume.", dateEarned: Date(), iconSystemName: "bolt.fill", rarity: .epic),
    TrophyItem(id: "t2", name: "Volume Legend", description: "Moved >10k lbs in a session.", aiRationale: "Synthesis of session 03-05 shows a 12% increase in tonnage. Mechanical tension thresholds reached an all-time record.", dateEarned: Calendar.current.date(byAdding: .day, value: -2, to: Date())!, iconSystemName: "dumbbell.fill", rarity: .legendary),
    TrophyItem(id: "t3", name: "First Blood", description: "Completed 1st Koda AI protocol.", aiRationale: "Initial baseline established. Biometric sync confirms physiological response matches predicted metabolic expenditure.", dateEarned: Calendar.current.date(byAdding: .day, value: -14, to: Date())!, iconSystemName: "flame.fill", rarity: .common)
]

struct TrophyRoomView: View {
    @EnvironmentObject var auth: SupabaseService
    @State private var trophies: [TrophyItem] = []
    @State private var loading = true
    @State private var appear = false

    private var api: KodaAPIService {
        KodaAPIService(getAccessToken: { auth.accessToken })
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            VStack(alignment: .leading, spacing: 4) {
                Text("Elite Protocols")
                    .font(.title2)
                    .fontWeight(.bold)
                Text("Your unlocked classified achievements")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
            .padding(.horizontal)
            
            if loading {
                VStack(spacing: 12) {
                    ShimmerCard(height: 88)
                    ShimmerCard(height: 88)
                    ShimmerCard(height: 88)
                }
                .padding(.horizontal)
            } else if trophies.isEmpty {
                VStack(spacing: 8) {
                    Image(systemName: "lock.shield")
                        .font(.system(size: 30))
                        .foregroundStyle(.secondary)
                    Text("No protocols unlocked yet.")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }
                .frame(maxWidth: .infinity, alignment: .center)
                .padding(.vertical, 40)
            } else {
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 16) {
                        ForEach(Array(trophies.enumerated()), id: \.element.id) { index, trophy in
                            TrophyCard(trophy: trophy)
                                .opacity(appear ? 1 : 0)
                                .offset(x: appear ? 0 : 50)
                                .animation(.spring(response: 0.5, dampingFraction: 0.7).delay(Double(index) * 0.1), value: appear)
                        }
                    }
                    .padding(.horizontal)
                    .padding(.vertical, 8)
                }
            }
        }
        .padding(.vertical)
        .background(Color.black.opacity(0.3))
        .clipShape(RoundedRectangle(cornerRadius: 24))
        .overlay(
            RoundedRectangle(cornerRadius: 24)
                .stroke(Color.white.opacity(0.1), lineWidth: 1)
        )
        .task {
            await loadTrophies()
        }
    }

    private func loadTrophies() async {
        do {
            let res = try await api.getTrophies()
            let mapped = res.trophies.map { t in
                TrophyItem(
                    id: t.id,
                    name: t.name,
                    description: t.description ?? "",
                    aiRationale: t.ai_rationale ?? "",
                    dateEarned: DateHelpers.fromISO(t.earned_at) ?? Date(),
                    iconSystemName: t.icon_slug ?? "bolt.fill",
                    rarity: TrophyItem.Rarity(rawValue: t.rarity?.uppercased() ?? "COMMON") ?? .common
                )
            }
            await MainActor.run {
                self.trophies = mapped
                self.loading = false
                withAnimation { self.appear = true }
            }
        } catch {
            await MainActor.run { self.loading = false }
        }
    }
}

struct TrophyCard: View {
    let trophy: TrophyItem
    @State private var isTapped = false
    
    var body: some View {
        VStack(spacing: 12) {
            ProBadge(
                type: BadgeType(rawValue: trophy.name.lowercased().replacingOccurrences(of: " ", with: "_")) ?? .architect,
                size: 80
            )
            .scaleEffect(isTapped ? 0.9 : 1.0)
            
            VStack(spacing: 4) {
                Text(trophy.name)
                    .font(.headline)
                    .italic()
                    .fontWeight(.black)
                    .lineLimit(1)
                
                Text(trophy.description)
                    .font(.system(size: 10, weight: .medium, design: .default))
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)
                    .lineLimit(2)
                    .frame(height: 28, alignment: .top)
                
                VStack(alignment: .leading, spacing: 4) {
                    HStack(spacing: 4) {
                        Circle()
                            .fill(trophy.rarity.colors.first!)
                            .frame(width: 4, height: 4)
                        Text("NEURAL RATIONALE")
                            .font(.system(size: 7, weight: .black))
                            .tracking(1)
                            .foregroundStyle(trophy.rarity.colors.first!)
                    }
                    
                    Text("\"\(trophy.aiRationale)\"")
                        .font(.system(size: 9, weight: .medium))
                        .italic()
                        .foregroundStyle(.white.opacity(0.7))
                        .lineLimit(3)
                        .frame(height: 36, alignment: .topLeading)
                }
                .padding(8)
                .background(Color.white.opacity(0.05))
                .clipShape(RoundedRectangle(cornerRadius: 12))
                .padding(.top, 4)
                
                Divider().background(Color.white.opacity(0.2)).padding(.vertical, 4)
                
                Text(trophy.rarity.rawValue)
                    .font(.system(size: 8, weight: .black))
                    .foregroundStyle(trophy.rarity.colors.first!)
                    .tracking(2)
            }
        }
        .padding(16)
        .frame(width: 170, height: 320)
        .background(Color.white.opacity(0.05))
        .clipShape(RoundedRectangle(cornerRadius: 24))
        .overlay(
            RoundedRectangle(cornerRadius: 24)
                .stroke(Color.white.opacity(0.1), lineWidth: 1)
        )
        .onTapGesture {
            withAnimation(.spring(response: 0.3, dampingFraction: 0.5)) {
                isTapped = true
            }
            UIImpactFeedbackGenerator(style: .rigid).impactOccurred()
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.15) {
                withAnimation(.spring(response: 0.3, dampingFraction: 0.5)) {
                    isTapped = false
                }
            }
        }
    }
}
