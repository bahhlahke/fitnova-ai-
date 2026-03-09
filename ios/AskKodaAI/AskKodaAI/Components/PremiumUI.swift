import SwiftUI
import UIKit

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
