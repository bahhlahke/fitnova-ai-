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
                        title: "Upgrade into a real coaching operating system.",
                        subtitle: "Structured programming, better feedback loops, and the premium accountability layer that keeps momentum high.",
                        eyebrow: "Membership"
                    ) {
                        HStack(spacing: 10) {
                            PremiumMetricPill(label: "Trial", value: "7 days")
                            PremiumMetricPill(label: "Motion Lab", value: "Included")
                        }
                    }

                    VStack(spacing: 16) {
                        planCard(name: "Standard", price: "7-Day Trial", features: ["Full logging", "Adaptive protocols", "Performance analytics"])
                        planCard(name: "Pro", price: "$9.99/mo", features: ["Everything in Trial", "Predictive engine", "Wearable sync", "AI Motion Lab"], popular: true)
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

    private func planCard(name: String, price: String, features: [String], popular: Bool = false) -> some View {
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
            Button("Get started") {
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
