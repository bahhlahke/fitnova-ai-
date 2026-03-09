import SwiftUI

enum Brand {
    enum Color {
        /// Web app 'fn-bg': #0A0A0B
        static let background = SwiftUI.Color(hex: "0A0A0B")
        
        /// Web app 'fn-bg-alt': #161618
        static let backgroundAlt = SwiftUI.Color(hex: "161618")
        
        /// Web app 'fn-surface': #1C1C1E
        static let surface = SwiftUI.Color(hex: "1C1C1E")

        /// Raised card surface tuned for premium contrast in iOS cards.
        static let surfaceRaised = SwiftUI.Color(hex: "171A1F")

        /// Web app 'fn-surface-hover': #2C2C2E
        static let surfaceHover = SwiftUI.Color(hex: "2C2C2E")
        
        /// Web app 'fn-accent' / 'fn-teal': #0AD9C4
        static let accent = SwiftUI.Color(hex: "0AD9C4")
        
        /// Web app 'fn-border': #27272A
        static let border = SwiftUI.Color(hex: "27272A")

        static let borderStrong = SwiftUI.Color(hex: "31343B")

        /// Web app 'fn-muted': #A1A1AA
        static let muted = SwiftUI.Color(hex: "A1A1AA")

        static let success = SwiftUI.Color(hex: "34D399")
        static let warning = SwiftUI.Color(hex: "F59E0B")
        static let danger = SwiftUI.Color(hex: "FB7185")

        static let primary = SwiftUI.Color.white
        static let secondary = SwiftUI.Color.gray
    }
}

extension Color {
    init(hex: String) {
        let hex = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&int)
        let a, r, g, b: UInt64
        switch hex.count {
        case 3: // RGB (12-bit)
            (a, r, g, b) = (255, (int >> 8) * 17, (int >> 4 & 0xF) * 17, (int & 0xF) * 17)
        case 6: // RGB (24-bit)
            (a, r, g, b) = (255, int >> 16, int >> 8 & 0xFF, int & 0xFF)
        case 8: // ARGB (32-bit)
            (a, r, g, b) = (int >> 24, int >> 16 & 0xFF, int >> 8 & 0xFF, int & 0xFF)
        default:
            (a, r, g, b) = (1, 1, 1, 0)
        }

        self.init(
            .sRGB,
            red: Double(r) / 255,
            green: Double(g) / 255,
            blue:  Double(b) / 255,
            opacity: Double(a) / 255
        )
    }
}

struct GlassCard: ViewModifier {
    func body(content: Content) -> some View {
        content
            .background(
                RoundedRectangle(cornerRadius: 20, style: .continuous)
                    .fill(
                        LinearGradient(
                            colors: [
                                Brand.Color.surfaceRaised.opacity(0.92),
                                Brand.Color.surface.opacity(0.98)
                            ],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        )
                    )
                    .background(.ultraThinMaterial)
                    .overlay(
                        RoundedRectangle(cornerRadius: 20, style: .continuous)
                            .stroke(Brand.Color.borderStrong.opacity(0.9), lineWidth: 1)
                    )
            )
            .shadow(color: .black.opacity(0.35), radius: 20, x: 0, y: 14)
    }
}

extension View {
    func glassCard() -> some View {
        self.modifier(GlassCard())
    }
    
    func fnBackground() -> some View {
        self.background {
            ZStack {
                LinearGradient(
                    colors: [
                        Brand.Color.background,
                        Brand.Color.backgroundAlt.opacity(0.98),
                        Brand.Color.background
                    ],
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                )
                .ignoresSafeArea()

                RadialGradient(
                    colors: [
                        Brand.Color.accent.opacity(0.16),
                        Color.clear
                    ],
                    center: .topTrailing,
                    startRadius: 40,
                    endRadius: 340
                )
                .ignoresSafeArea()

                RadialGradient(
                    colors: [
                        Color.white.opacity(0.08),
                        Color.clear
                    ],
                    center: .bottomLeading,
                    startRadius: 10,
                    endRadius: 280
                )
                .ignoresSafeArea()
            }
        }
    }
}
