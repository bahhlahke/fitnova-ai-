//
//  VitalsView.swift
//  Koda AI
//
//  Readiness insight and recovery; parity with web /vitals.
//

import SwiftUI

struct VitalsView: View {
    @EnvironmentObject var auth: SupabaseService
    @State private var readinessInsight: String?
    @State private var loading = false
    @State private var errorMessage: String?

    private var api: KodaAPIService {
        KodaAPIService(getAccessToken: { await auth.accessToken })
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                if let err = errorMessage {
                    Text(err)
                        .font(.caption)
                        .foregroundStyle(.red)
                        .padding()
                }

                VStack(alignment: .leading, spacing: 8) {
                    Text("Today's readiness")
                        .font(.headline)
                    if loading && readinessInsight == nil {
                        ProgressView()
                            .frame(maxWidth: .infinity)
                            .padding()
                    } else if let insight = readinessInsight, !insight.isEmpty {
                        Text(insight)
                            .font(.subheadline)
                            .italic()
                            .foregroundStyle(.primary)
                    } else if !loading {
                        Text("Complete a check-in and log workouts to get a readiness insight.")
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                    }
                }
                .padding()
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(Color.accentColor.opacity(0.08))
                .clipShape(RoundedRectangle(cornerRadius: 12))
            }
            .padding()
        }
        .navigationTitle("Vitals")
        .refreshable { await load() }
        .task { await load() }
    }

    private func load() async {
        loading = true
        errorMessage = nil
        defer { loading = false }
        do {
            let res = try await api.aiReadinessInsight(localDate: DateHelpers.todayLocal)
            await MainActor.run {
                readinessInsight = res.insight
            }
        } catch {
            await MainActor.run {
                errorMessage = (error as? LocalizedError)?.errorDescription ?? error.localizedDescription
            }
        }
    }
}
