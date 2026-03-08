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
                VStack(spacing: 24) {
                    Text("Choose your protocol")
                        .font(.title2)
                        .fontWeight(.bold)
                    VStack(spacing: 16) {
                        planCard(name: "Standard", price: "7-Day Trial", features: ["Full logging", "Adaptive protocols", "Performance analytics"])
                        planCard(name: "Pro", price: "$9.99/mo", features: ["Everything in Trial", "Predictive engine", "Wearable sync", "AI Motion Lab"], popular: true)
                    }
                    if let err = errorMessage {
                        Text(err)
                            .font(.caption)
                            .foregroundStyle(.red)
                    }
                }
                .padding()
            }
            .navigationTitle("Pricing")
        }
    }

    private func planCard(name: String, price: String, features: [String], popular: Bool = false) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            if popular {
                Text("Most popular")
                    .font(.caption2)
                    .fontWeight(.bold)
            }
            Text(name)
                .font(.headline)
            Text(price)
                .font(.title3)
            ForEach(features, id: \.self) { f in
                Text("• \(f)")
                    .font(.caption)
            }
            Button("Get started") {
                Task { await checkout() }
            }
            .buttonStyle(.borderedProminent)
            .frame(maxWidth: .infinity)
            .disabled(loading)
        }
        .padding()
        .background(popular ? Color.accentColor.opacity(0.1) : Color(.systemGray6))
        .clipShape(RoundedRectangle(cornerRadius: 12))
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
