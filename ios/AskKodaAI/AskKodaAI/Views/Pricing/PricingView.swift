//
//  PricingView.swift
//  Koda AI
//
//  Plans and Stripe checkout. Parity with web /pricing.
//

import SwiftUI
import UIKit

struct PricingView: View {
    @EnvironmentObject var auth: SupabaseService
    @State private var loading = false
    @State private var errorMessage: String?

    private var api: KodaAPIService {
        KodaAPIService(getAccessToken: { auth.accessToken })
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 18) {
                    PremiumHeroCard(
                        title: "Upgrade into a coaching system you can feel in every session.",
                        subtitle: "Pro brings live Motion Lab feedback, stronger planning intelligence, and faster accountability loops so the app keeps earning the next workout.",
                        eyebrow: "Membership"
                    ) {
                        HStack(spacing: 10) {
                            PremiumMetricPill(label: "Trial", value: "7 days")
                            PremiumMetricPill(label: "Motion Lab", value: "Live")
                            PremiumMetricPill(label: "Cancel", value: "Anytime")
                        }
                    }

                    PremiumRowCard {
                        VStack(alignment: .leading, spacing: 14) {
                            Text("Why athletes upgrade")
                                .font(.headline)
                                .foregroundStyle(.white)

                            pricingBenefit(
                                title: "Realtime Motion Lab",
                                detail: "Live form cues, rep counting, and velocity trends that make the app feel useful during the set, not after it."
                            )
                            pricingBenefit(
                                title: "Better training decisions",
                                detail: "Adaptive planning, predictive progression, and wearable context keep the next session sharper."
                            )
                            pricingBenefit(
                                title: "Lower drop-off",
                                detail: "A clearer feedback loop means more trust, more return sessions, and fewer stalled weeks."
                            )
                        }
                    }

                    VStack(spacing: 16) {
                        planCard(
                            name: "Standard",
                            price: "7-Day Trial",
                            features: ["Full logging", "Adaptive protocols", "Performance analytics"],
                            cta: "Start trial"
                        )
                        planCard(
                            name: "Pro",
                            price: "$9.99/mo",
                            features: ["Everything in Trial", "Predictive engine", "Wearable sync", "AI Motion Lab", "Realtime form coaching"],
                            cta: "Go Pro now",
                            footnote: "Best if you want the app coaching you during training, not just recording it.",
                            popular: true
                        )
                    }

                    PremiumRowCard {
                        VStack(alignment: .leading, spacing: 14) {
                            Text("What Pro unlocks immediately")
                                .font(.headline)
                                .foregroundStyle(.white)

                            HStack(spacing: 10) {
                                PremiumMetricPill(label: "Scan", value: "Realtime")
                                PremiumMetricPill(label: "Cues", value: "On-device")
                                PremiumMetricPill(label: "Trend", value: "Velocity")
                            }

                            Text("If Motion Lab is the feature that makes you say “this is actually useful,” Pro is the tier built around that feeling.")
                                .font(.subheadline)
                                .foregroundStyle(Brand.Color.muted)
                        }
                    }

                    if let err = errorMessage {
                        PremiumStateCard(title: "Checkout unavailable", detail: err, symbol: "creditcard.trianglebadge.exclamationmark")
                    }
                }
                .padding(.horizontal, 16)
                .padding(.vertical, 20)
            }
            .fnBackground()
            .navigationTitle("Pricing")
        }
    }

    private func planCard(name: String, price: String, features: [String], cta: String, footnote: String? = nil, popular: Bool = false) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            if popular {
                Text("Most popular")
                    .font(.system(size: 11, weight: .black, design: .monospaced))
                    .foregroundStyle(Brand.Color.accent)
            }
            Text(name)
                .font(.title3.weight(.black))
                .foregroundStyle(.white)
            Text(price)
                .font(.title2.weight(.bold))
                .foregroundStyle(popular ? Brand.Color.accent : .white)
            ForEach(features, id: \.self) { f in
                HStack(spacing: 8) {
                    Image(systemName: "checkmark.circle.fill")
                        .font(.caption)
                        .foregroundStyle(Brand.Color.accent)
                    Text(f)
                        .font(.subheadline)
                        .foregroundStyle(Brand.Color.muted)
                }
            }

            if let footnote, !footnote.isEmpty {
                Text(footnote)
                    .font(.caption)
                    .foregroundStyle(Brand.Color.muted)
                    .fixedSize(horizontal: false, vertical: true)
            }

            Button(cta) {
                Task { await checkout() }
            }
            .buttonStyle(PremiumActionButtonStyle(filled: popular))
            .disabled(loading)
        }
        .padding()
        .background(
            RoundedRectangle(cornerRadius: 24, style: .continuous)
                .fill(popular ? Brand.Color.accent.opacity(0.12) : Brand.Color.surfaceRaised)
                .overlay(
                    RoundedRectangle(cornerRadius: 24, style: .continuous)
                        .stroke(popular ? Brand.Color.accent.opacity(0.35) : Brand.Color.borderStrong, lineWidth: 1)
                )
        )
    }

    private func pricingBenefit(title: String, detail: String) -> some View {
        HStack(alignment: .top, spacing: 10) {
            Image(systemName: "checkmark.seal.fill")
                .foregroundStyle(Brand.Color.accent)
            VStack(alignment: .leading, spacing: 4) {
                Text(title)
                    .font(.subheadline.weight(.bold))
                    .foregroundStyle(.white)
                Text(detail)
                    .font(.caption)
                    .foregroundStyle(Brand.Color.muted)
                    .fixedSize(horizontal: false, vertical: true)
            }
        }
    }

    private func checkout() async {
        loading = true
        errorMessage = nil
        defer { loading = false }
        do {
            let res = try await api.stripeCheckout(priceId: nil, successUrl: nil, cancelUrl: nil)
            if let urlString = res.url, let url = URL(string: urlString) {
                await MainActor.run { UIApplication.shared.open(url) }
            }
        } catch {
            await MainActor.run { errorMessage = error.localizedDescription }
        }
    }
}
