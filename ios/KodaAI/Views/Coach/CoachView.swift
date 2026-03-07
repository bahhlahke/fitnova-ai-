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

    private var api: KodaAPIService {
        KodaAPIService(getAccessToken: { await auth.accessToken })
    }

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                ScrollViewReader { proxy in
                    ScrollView {
                        LazyVStack(alignment: .leading, spacing: 12) {
                            ForEach(Array(messages.enumerated()), id: \.offset) { _, m in
                                MessageBubble(role: m.role, text: m.text)
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
            .navigationTitle("Coach")
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
}

struct MessageBubble: View {
    let role: String
    let text: String

    var body: some View {
        HStack {
            if role == "user" { Spacer(minLength: 60) }
            Text(text)
                .padding(12)
                .background(role == "user" ? Color.accentColor : Color(.systemGray5))
                .foregroundColor(role == "user" ? .white : .primary)
                .clipShape(RoundedRectangle(cornerRadius: 12))
            if role == "assistant" { Spacer(minLength: 60) }
        }
    }
}
