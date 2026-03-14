import SwiftUI
import UIKit

struct PremiumTabItem: Identifiable, Hashable {
    let id: String
    let title: String
    var detail: String? = nil
}

struct PremiumTabSwitcher: View {
    let items: [PremiumTabItem]
    @Binding var selectedId: String
    @Namespace private var activeTabNamespace

    var body: some View {
        HStack(spacing: 8) {
            ForEach(items) { item in
                let isActive = selectedId == item.id
                Button {
                    withAnimation(.spring(response: 0.32, dampingFraction: 0.84)) {
                        selectedId = item.id
                    }
                    HapticEngine.selection()
                } label: {
                    VStack(spacing: 2) {
                        Text(item.title)
                            .font(.system(size: 13, weight: .black))
                            .foregroundStyle(isActive ? .white : Brand.Color.muted)
                        if let detail = item.detail, !detail.isEmpty {
                            Text(detail.uppercased())
                                .font(.system(size: 8, weight: .bold, design: .monospaced))
                                .tracking(0.8)
                                .foregroundStyle(isActive ? Brand.Color.accent.opacity(0.95) : Brand.Color.muted.opacity(0.75))
                        }
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 10)
                    .background {
                        if isActive {
                            RoundedRectangle(cornerRadius: 14, style: .continuous)
                                .fill(Brand.Color.surfaceHover)
                                .matchedGeometryEffect(id: "active-tab", in: activeTabNamespace)
                        }
                    }
                    .overlay(
                        RoundedRectangle(cornerRadius: 14, style: .continuous)
                            .stroke(isActive ? Brand.Color.accent.opacity(0.4) : Color.clear, lineWidth: 1)
                    )
                }
                .buttonStyle(.plain)
            }
        }
        .padding(6)
        .background(
            RoundedRectangle(cornerRadius: 18, style: .continuous)
                .fill(Brand.Color.surfaceRaised.opacity(0.95))
                .overlay(
                    RoundedRectangle(cornerRadius: 18, style: .continuous)
                        .stroke(Brand.Color.borderStrong, lineWidth: 1)
                )
        )
    }
}

struct PremiumStatusChip: View {
    enum Tone {
        case accent
        case success
        case warning
        case danger
        case muted
    }

    let label: String
    var tone: Tone = .accent

    private var foreground: Color {
        switch tone {
        case .accent: return Brand.Color.accent
        case .success: return Brand.Color.success
        case .warning: return Brand.Color.warning
        case .danger: return Brand.Color.danger
        case .muted: return Brand.Color.muted
        }
    }

    var body: some View {
        Text(label.uppercased())
            .font(.system(size: 9, weight: .black, design: .monospaced))
            .tracking(0.8)
            .foregroundStyle(foreground)
            .padding(.horizontal, 8)
            .padding(.vertical, 4)
            .background(
                Capsule()
                    .fill(foreground.opacity(0.15))
                    .overlay(
                        Capsule().stroke(foreground.opacity(0.25), lineWidth: 1)
                    )
            )
    }
}

struct PremiumSectionHeader: View {
    let eyebrow: String?
    let title: String
    let subtitle: String?

    init(_ title: String, eyebrow: String? = nil, subtitle: String? = nil) {
        self.eyebrow = eyebrow
        self.title = title
        self.subtitle = subtitle
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            if let eyebrow, !eyebrow.isEmpty {
                Text(eyebrow.uppercased())
                    .font(.system(size: 11, weight: .black, design: .monospaced))
                    .tracking(1.1)
                    .foregroundStyle(Brand.Color.accent)
            }
            Text(title)
                .font(.system(size: 28, weight: .black, design: .default))
                .foregroundStyle(.white)
            if let subtitle, !subtitle.isEmpty {
                Text(subtitle)
                    .font(.subheadline)
                    .foregroundStyle(Brand.Color.muted)
                    .fixedSize(horizontal: false, vertical: true)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}

struct PremiumHeroCard<Content: View>: View {
    let title: String
    let subtitle: String
    let eyebrow: String?
    let content: Content

    init(title: String, subtitle: String, eyebrow: String? = nil, @ViewBuilder content: () -> Content) {
        self.title = title
        self.subtitle = subtitle
        self.eyebrow = eyebrow
        self.content = content()
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            PremiumSectionHeader(title, eyebrow: eyebrow, subtitle: subtitle)
            content
        }
        .padding(20)
        .premiumCard()
    }
}

struct PremiumMetricPill: View {
    let label: String
    let value: String

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(label.uppercased())
                .font(.system(size: 10, weight: .bold, design: .monospaced))
                .foregroundStyle(Brand.Color.muted)
            Text(value)
                .font(.headline)
                .foregroundStyle(.white)
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 12)
        .background(
            Capsule()
                .fill(Brand.Color.surfaceRaised.opacity(0.9))
                .overlay(Capsule().stroke(Brand.Color.borderStrong, lineWidth: 1))
        )
    }
}

struct PremiumActionButtonStyle: ButtonStyle {
    var filled: Bool = true

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.system(size: 15, weight: .bold))
            .padding(.horizontal, 18)
            .padding(.vertical, 14)
            .frame(maxWidth: .infinity)
            .background(
                Capsule()
                    .fill(filled ? Brand.Color.accent : Brand.Color.surfaceRaised)
                    .overlay(
                        Capsule().stroke(
                            filled ? Brand.Color.accent.opacity(0.2) : Brand.Color.borderStrong,
                            lineWidth: 1
                        )
                    )
            )
            .foregroundStyle(filled ? Color.black : Color.white)
            .opacity(configuration.isPressed ? 0.88 : 1)
            .scaleEffect(configuration.isPressed ? 0.99 : 1)
            .onChange(of: configuration.isPressed) { _, pressed in
                if pressed { HapticEngine.impact(.medium) }
            }
    }
}

struct PremiumStateCard: View {
    let title: String
    let detail: String
    let symbol: String

    var body: some View {
        VStack(spacing: 12) {
            Image(systemName: symbol)
                .font(.system(size: 28, weight: .bold))
                .foregroundStyle(Brand.Color.accent)
            Text(title)
                .font(.headline)
                .foregroundStyle(.white)
            Text(detail)
                .font(.subheadline)
                .foregroundStyle(Brand.Color.muted)
                .multilineTextAlignment(.center)
        }
        .frame(maxWidth: .infinity)
        .padding(24)
        .premiumCard()
    }
}

struct PremiumRowCard<Content: View>: View {
    let content: Content

    init(@ViewBuilder content: () -> Content) {
        self.content = content()
    }

    var body: some View {
        content
            .padding(18)
            .premiumCard(cornerRadius: 24)
    }
}

// MARK: - Skeleton / Shimmer

struct ShimmerCard: View {
    var height: CGFloat = 120
    @State private var phase: CGFloat = -1
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    var body: some View {
        RoundedRectangle(cornerRadius: 24, style: .continuous)
            .fill(reduceMotion
                ? LinearGradient(colors: [Brand.Color.surfaceRaised, Brand.Color.surfaceRaised], startPoint: .leading, endPoint: .trailing)
                : LinearGradient(
                    colors: [Brand.Color.surfaceRaised, Brand.Color.surfaceHover, Brand.Color.surfaceRaised],
                    startPoint: UnitPoint(x: phase, y: 0.5),
                    endPoint: UnitPoint(x: phase + 1, y: 0.5)
                )
            )
            .frame(height: height)
            .onAppear {
                guard !reduceMotion else { return }
                withAnimation(.linear(duration: 1.4).repeatForever(autoreverses: false)) {
                    phase = 1
                }
            }
    }
}

// MARK: - View Extensions

extension View {
    func premiumCard(cornerRadius: CGFloat = 24) -> some View {
        self
            .background(
                RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
                    .fill(LinearGradient(colors: [Brand.Color.surfaceRaised, Brand.Color.surface], startPoint: .topLeading, endPoint: .bottomTrailing))
                    .overlay(
                        RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
                            .stroke(Brand.Color.borderStrong, lineWidth: 1)
                    )
            )
            .shadow(color: Color.black.opacity(0.28), radius: 22, x: 0, y: 16)
    }
}
