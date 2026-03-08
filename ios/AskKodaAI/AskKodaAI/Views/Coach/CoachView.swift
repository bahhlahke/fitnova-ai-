//
//  CoachView.swift
//  Koda AI
//

import SwiftUI

struct CoachView: View {
    @EnvironmentObject var auth: SupabaseService
    @State private var input = ""
    @State private var messages: [MessageContent] = []
    @State private var isLoading = false
    @State private var hasLoadedHistory = false

    struct MessageContent: Identifiable {
        let id = UUID()
        let role: String
        let text: String
        let action: AIAction?
    }

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
                                ForEach(messages) { m in
                                    MessageBubble(message: m)
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
                            proxy.scrollTo(messages[last].id, anchor: .bottom)
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
        messages.append(MessageContent(role: "user", text: text, action: nil))
        input = ""
        isLoading = true
        Task {
            do {
                let response = try await api.aiRespond(message: text)
                await MainActor.run {
                    messages.append(MessageContent(role: "assistant", text: response.reply, action: response.action))
                }
            } catch {
                await MainActor.run {
                    messages.append(MessageContent(role: "assistant", text: "Sorry, something went wrong: \(error.localizedDescription)", action: nil))
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
                    self.messages = hist.map { MessageContent(role: $0.role, text: $0.content, action: nil) }
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
    let message: CoachView.MessageContent

    var body: some View {
        VStack(alignment: message.role == "user" ? .trailing : .leading, spacing: 8) {
            HStack {
                if message.role == "user" { Spacer(minLength: 60) }
                Text(message.text)
                    .padding(12)
                    .background(message.role == "user" ? Brand.Color.accent : Brand.Color.surface)
                    .background {
                        if message.role == "assistant" {
                            Color.clear.background(.ultraThinMaterial)
                        }
                    }
                    .foregroundColor(message.role == "user" ? .black : .primary)
                    .cornerRadius(16)
                    .overlay(
                        RoundedRectangle(cornerRadius: 16)
                            .stroke(message.role == "user" ? Brand.Color.accent : Brand.Color.border, lineWidth: 1)
                    )
                if message.role == "assistant" { Spacer(minLength: 60) }
            }
            
            if let action = message.action, action.type == "video_demo", let urlStr = action.payload?.video_url, let url = URL(string: urlStr) {
                VStack(alignment: .leading, spacing: 8) {
                    HStack(spacing: 6) {
                        Image(systemName: "play.rectangle.fill")
                            .font(.caption2)
                        Text("ELITE DEMONSTRATION: \(action.payload?.exercise_name?.uppercased() ?? "EXERCISE")")
                            .font(.system(size: 8, weight: .black))
                            .tracking(1)
                    }
                    .foregroundStyle(Brand.Color.accent)
                    
                    CinemaPlayerView(videoURL: url)
                        .frame(height: 300)
                        .clipShape(RoundedRectangle(cornerRadius: 12))
                        .overlay(
                            RoundedRectangle(cornerRadius: 12)
                                .stroke(Brand.Color.accent.opacity(0.3), lineWidth: 1)
                        )
                }
                .padding(.leading, 12)
                .padding(.top, 4)
            }
        }
    }
}
