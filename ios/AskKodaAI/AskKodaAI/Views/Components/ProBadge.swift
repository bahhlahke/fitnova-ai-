import SwiftUI

enum BadgeType: String, CaseIterable {
    case shadow, iron_core, infinite, architect
    
    var colors: [Color] {
        switch self {
        case .shadow: return [Color(hex: "0a0a0a"), Color(hex: "0ad9c4")]
        case .iron_core: return [Color(hex: "1a1a1a"), Color(hex: "ff6b00")]
        case .infinite: return [Color(hex: "0f0f0f"), Color(hex: "a855f7")]
        case .architect: return [Color(hex: "0a0a0a"), Color(hex: "eab308")]
        }
    }
    
    var description: String {
        switch self {
        case .shadow: return "Stealth & Metabolic Mastery"
        case .iron_core: return "Strength & Stability Mastery"
        case .infinite: return "Endurance & HIIT Mastery"
        case .architect: return "Precision & Form Mastery"
        }
    }
    
    var iconName: String {
        switch self {
        case .shadow: return "bolt.shield.fill"
        case .iron_core: return "target"
        case .infinite: return "infinity"
        case .architect: return "square.and.pencil"
        }
    }
}

struct ProBadge: View {
    let type: BadgeType
    var label: String? = nil
    var size: CGFloat = 80
    
    @State private var isAnimating = false
    
    var body: some View {
        VStack(spacing: 12) {
            ZStack {
                // Glow Layer
                Circle()
                    .fill(type.colors[1])
                    .frame(width: size, height: size)
                    .blur(radius: size * 0.25)
                    .opacity(isAnimating ? 0.6 : 0.3)
                
                // Border Layer
                Circle()
                    .stroke(
                        LinearGradient(
                            colors: [.white.opacity(0.3), .white.opacity(0.1), .white.opacity(0.3)],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        ),
                        lineWidth: 1
                    )
                    .frame(width: size + 4, height: size + 4)
                
                // Base Medal
                Circle()
                    .fill(
                        RadialGradient(
                            gradient: Gradient(colors: [type.colors[0], .black]),
                            center: .topLeading,
                            startRadius: 0,
                            endRadius: size * 0.8
                        )
                    )
                    .frame(width: size, height: size)
                    .overlay(
                        Circle()
                            .stroke(type.colors[1].opacity(0.2), lineWidth: 0.5)
                            .padding(2)
                    )
                
                // Icon
                Image(systemName: type.iconName)
                    .font(.system(size: size * 0.4, weight: .bold))
                    .foregroundStyle(type.colors[1])
                    .shadow(color: type.colors[1].opacity(0.8), radius: 8)
            }
            .scaleEffect(isAnimating ? 1.05 : 1.0)
            
            if let label = label {
                VStack(spacing: 2) {
                    Text(label.uppercased())
                        .font(.system(size: 10, weight: .black))
                        .tracking(2)
                        .foregroundStyle(.white)
                    
                    Text(type.description.uppercased())
                        .font(.system(size: 8, weight: .bold))
                        .tracking(1)
                        .foregroundStyle(.secondary)
                }
            }
        }
        .onAppear {
            withAnimation(.easeInOut(duration: 2.0).repeatForever(autoreverses: true)) {
                isAnimating = true
            }
        }
    }
}

