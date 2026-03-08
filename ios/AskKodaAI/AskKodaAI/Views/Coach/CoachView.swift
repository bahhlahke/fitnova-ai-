//
//  CoachView.swift
//  Koda AI
//

import SwiftUI

struct CoachView: View {
    @EnvironmentObject var auth: SupabaseService
    @State private var input = ""
    @State private var messages: [(role: String, text: String)] = []
    @State private var isLoading = false
    @State private var hasLoadedHistory = false

    private var api: KodaAPIService {
        KodaAPIService(getAccessToken: { await auth.accessToken })
    }

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                ScrollViewReader { proxy in
                    ScrollView {
                        LazyVStack(alignment: .leading, spacing: 12) {
                            if messages.isEmpty {
                                emptyStateCard
                            } else {
                                ForEach(Array(messages.enumerated()), id: \.offset) { _, m in
                                    MessageBubble(role: m.role, text: m.text)
                                }
                            }
                            if isLoading {
                                HStack {
                                    ProgressView()
                                    Text("Coach is thinking…")
                                        .font(.caption)
                                        .foregroundStyle(.secondary)
                                }
                                .padding(.leading)
                            }
                        }
                        .padding()
                    }
                    .scrollDismissesKeyboard(.interactively)
                    .onChange(of: messages.count) { _, _ in
                        if let last = messages.indices.last {
                            proxy.scrollTo(last, anchor: .bottom)
                        }
                    }
                }

                HStack(spacing: 12) {
                    TextField("Ask your coach…", text: $input, axis: .vertical)
                        .textFieldStyle(.roundedBorder)
                        .lineLimit(1...4)
                    Button("Send") { send() }
                        .disabled(isLoading || input.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                }
                .padding()
            }
            .fnBackground()
            .navigationTitle("Coach")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .primaryAction) {
                    NavigationLink("Support") {
                        CoachEscalateView()
                    }
                }
            }
        }
        .task {
            if !hasLoadedHistory {
                hasLoadedHistory = true
                await fetchHistory()
            }
        }
    }

    private func send() {
        let text = input.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !text.isEmpty else { return }
        messages.append((role: "user", text: text))
        input = ""
        isLoading = true
        Task {
            do {
                let response = try await api.aiRespond(message: text)
                await MainActor.run {
                    messages.append((role: "assistant", text: response.reply))
                }
            } catch {
                await MainActor.run {
                    messages.append((role: "assistant", text: "Sorry, something went wrong: \(error.localizedDescription)"))
                }
            }
            await MainActor.run { isLoading = false }
        }
    }
    
    private func fetchHistory() async {
        do {
            let response = try await api.aiHistory()
            if let hist = response.history, !hist.isEmpty {
                await MainActor.run {
                    self.messages = hist.map { (role: $0.role, text: $0.content) }
                }
            }
        } catch {
            print("Failed to fetch history: \(error)")
        }
    }
    
    private var emptyStateCard: some View {
        VStack(spacing: 12) {
            Image(systemName: "sparkles")
                .font(.largeTitle)
                .foregroundColor(.accentColor)
            Text("How can I help you today?")
                .font(.headline)
            Text("I can adapt your daily plan, analyze a meal via text, explain your muscle recovery, or guide you through a workout. Just ask!")
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 40)
        .padding(.horizontal, 20)
        .glassCard()
    }
}

struct MessageBubble: View {
    let role: String
    let text: String

    var body: some View {
        HStack {
            if role == "user" { Spacer(minLength: 60) }
            Text(text)
                .padding(12)
                .background(role == "user" ? Brand.Color.accent : Brand.Color.surface)
                .background {
                    if role == "assistant" {
                        Color.clear.background(.ultraThinMaterial)
                    }
                }
                .foregroundColor(role == "user" ? .black : .primary)
                .cornerRadius(16)
                .overlay(
                    RoundedRectangle(cornerRadius: 16)
                        .stroke(role == "user" ? Brand.Color.accent : Brand.Color.border, lineWidth: 1)
                )
            if role == "assistant" { Spacer(minLength: 60) }
        }
    }
}
