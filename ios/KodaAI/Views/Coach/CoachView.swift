//
//  CoachView.swift
//  Koda AI
//
//  AI Coach chat with:
//  • Persistent conversation history (UserDefaults)
//  • Conversation context sent to API for multi-turn continuity
//  • Workout detection — "Start Coached Session" CTA when AI returns a workout plan
//  • Dark design matching the web Command Center
//

import SwiftUI

// MARK: – Persistent message model

struct ChatMessage: Codable, Identifiable {
    let id: UUID
    let role: String   // "user" | "assistant"
    let text: String
    let timestamp: Date

    // Workout exercises parsed from this assistant turn, if any
    var parsedWorkout: [ParsedExercise]?

    init(role: String, text: String, parsedWorkout: [ParsedExercise]? = nil) {
        self.id = UUID()
        self.role = role
        self.text = text
        self.timestamp = Date()
        self.parsedWorkout = parsedWorkout
    }
}

struct ParsedExercise: Codable {
    var name: String
    var sets: Int?
    var reps: String?
    var notes: String?
}

// MARK: – View

struct CoachView: View {
    @EnvironmentObject var auth: SupabaseService
    @State private var messages: [ChatMessage] = []
    @State private var input = ""
    @State private var isLoading = false
    @State private var showGuidedWorkout = false
    @State private var guidedExercises: [ParsedExercise] = []

    private let storageKey = "koda_chat_messages_v1"
    private let accent = Color(red: 0.04, green: 0.85, blue: 0.77)

    private var api: KodaAPIService {
        KodaAPIService(getAccessToken: { await auth.accessToken })
    }

    var body: some View {
        NavigationStack {
            ZStack {
                Color.black.ignoresSafeArea()

                VStack(spacing: 0) {
                    messageList
                    inputBar
                }
            }
            .navigationTitle("")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar { toolbarContent }
            .preferredColorScheme(.dark)
            .onAppear { loadMessages() }
            .navigationDestination(isPresented: $showGuidedWorkout) {
                GuidedWorkoutView(injectedExercises: guidedExercises.map {
                    PlanExercise(name: $0.name, sets: $0.sets, reps: $0.reps, notes: $0.notes)
                })
            }
        }
    }

    // MARK: – Message list

    private var messageList: some View {
        ScrollViewReader { proxy in
            ScrollView {
                LazyVStack(alignment: .leading, spacing: 16) {
                    if messages.isEmpty {
                        emptyState
                            .id("empty")
                    }
                    ForEach(messages) { message in
                        MessageBubble(message: message, accent: accent) { workout in
                            guidedExercises = workout
                            showGuidedWorkout = true
                        }
                        .id(message.id)
                    }
                    if isLoading {
                        thinkingIndicator
                            .id("loading")
                    }
                }
                .padding(.horizontal, 16)
                .padding(.top, 16)
                .padding(.bottom, 8)
            }
            .onChange(of: messages.count) { _, _ in
                scrollToBottom(proxy)
            }
            .onChange(of: isLoading) { _, loading in
                if loading { scrollToBottom(proxy) }
            }
        }
    }

    private func scrollToBottom(_ proxy: ScrollViewProxy) {
        withAnimation(.easeOut(duration: 0.25)) {
            if isLoading {
                proxy.scrollTo("loading", anchor: .bottom)
            } else if let last = messages.last {
                proxy.scrollTo(last.id, anchor: .bottom)
            }
        }
    }

    private var emptyState: some View {
        VStack(spacing: 16) {
            Image(systemName: "bolt.fill")
                .font(.system(size: 40, weight: .black))
                .foregroundColor(accent)
            Text("COACH KODA")
                .font(.system(size: 18, weight: .black))
                .italic()
                .tracking(3)
                .foregroundColor(.white)
            Text("Ask me to log a workout, describe a session you want to start, or get coaching advice.")
                .font(.system(size: 13, weight: .medium))
                .foregroundColor(Color(white: 0.5))
                .multilineTextAlignment(.center)

            // Quick action chips
            let actions = ["Log a leg day", "Build me a HIIT session", "How am I doing this week?", "Analyze my nutrition"]
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 8) {
                    ForEach(actions, id: \.self) { action in
                        Button(action: { sendQuick(action) }) {
                            Text(action)
                                .font(.system(size: 11, weight: .black))
                                .tracking(1)
                                .foregroundColor(.white)
                                .padding(.horizontal, 14)
                                .padding(.vertical, 9)
                                .background(Color(white: 0.1))
                                .clipShape(Capsule())
                                .overlay(Capsule().stroke(Color(white: 0.2), lineWidth: 1))
                        }
                        .disabled(isLoading)
                    }
                }
                .padding(.horizontal, 4)
            }
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 40)
        .padding(.horizontal, 24)
    }

    private var thinkingIndicator: some View {
        HStack(spacing: 6) {
            ForEach(0..<3) { i in
                Circle()
                    .fill(accent)
                    .frame(width: 7, height: 7)
                    .animation(
                        .easeInOut(duration: 0.6).repeatForever().delay(Double(i) * 0.2),
                        value: isLoading
                    )
            }
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
        .background(Color(white: 0.08))
        .clipShape(RoundedRectangle(cornerRadius: 20))
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    // MARK: – Input bar

    private var inputBar: some View {
        VStack(spacing: 0) {
            Divider().background(Color(white: 0.15))
            HStack(spacing: 12) {
                TextField("Ask your coach…", text: $input, axis: .vertical)
                    .lineLimit(1...4)
                    .font(.system(size: 15, weight: .medium))
                    .foregroundColor(.white)
                    .padding(.horizontal, 16)
                    .padding(.vertical, 12)
                    .background(Color(white: 0.08))
                    .clipShape(RoundedRectangle(cornerRadius: 24))
                    .overlay(RoundedRectangle(cornerRadius: 24).stroke(Color(white: 0.15), lineWidth: 1))

                Button(action: send) {
                    Image(systemName: "arrow.up.circle.fill")
                        .font(.system(size: 34, weight: .black))
                        .foregroundColor(input.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || isLoading
                                         ? Color(white: 0.25) : accent)
                }
                .disabled(isLoading || input.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 12)
            .background(Color.black)
        }
    }

    // MARK: – Toolbar

    @ToolbarContentBuilder
    private var toolbarContent: some ToolbarContent {
        ToolbarItem(placement: .principal) {
            Text("COACH KODA")
                .font(.system(size: 13, weight: .black))
                .italic()
                .tracking(2)
                .foregroundColor(.white)
        }
        ToolbarItem(placement: .navigationBarTrailing) {
            HStack(spacing: 16) {
                Button(action: clearHistory) {
                    Image(systemName: "trash")
                        .font(.system(size: 14))
                        .foregroundColor(Color(white: 0.4))
                }
                NavigationLink(destination: CoachEscalateView()) {
                    Image(systemName: "person.badge.shield.checkmark")
                        .font(.system(size: 14))
                        .foregroundColor(accent)
                }
            }
        }
    }

    // MARK: – Send

    private func sendQuick(_ text: String) {
        input = text
        send()
    }

    private func send() {
        let text = input.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !text.isEmpty else { return }

        let userMessage = ChatMessage(role: "user", text: text)
        messages.append(userMessage)
        input = ""
        isLoading = true
        saveMessages()

        // Build conversation history for context (last 10 turns)
        let historyForAPI = messages.suffix(10).map { ["role": $0.role, "content": $0.text] }

        Task {
            do {
                let response = try await api.aiRespond(
                    message: text,
                    conversationHistory: historyForAPI,
                    localDate: DateHelpers.todayLocal
                )
                let parsed = parseWorkoutFromReply(response.reply)
                let assistantMessage = ChatMessage(
                    role: "assistant",
                    text: response.reply,
                    parsedWorkout: parsed.isEmpty ? nil : parsed
                )
                await MainActor.run {
                    messages.append(assistantMessage)
                    isLoading = false
                    saveMessages()
                }
            } catch {
                let errMessage = ChatMessage(
                    role: "assistant",
                    text: "Something went wrong: \(error.localizedDescription)"
                )
                await MainActor.run {
                    messages.append(errMessage)
                    isLoading = false
                    saveMessages()
                }
            }
        }
    }

    // MARK: – Workout parsing

    /// Simple pattern-based parser that extracts exercises from AI replies like:
    /// "1. Squat — 4×8" or "• Bench Press: 3 sets of 10 reps"
    private func parseWorkoutFromReply(_ text: String) -> [ParsedExercise] {
        let workoutKeywords = ["sets", "reps", "sets of", "×", "x ", "workout", "session", "exercise"]
        let hasWorkoutContent = workoutKeywords.contains { text.lowercased().contains($0) }
        guard hasWorkoutContent else { return [] }

        var exercises: [ParsedExercise] = []
        let lines = text.components(separatedBy: "\n")

        for line in lines {
            let trimmed = line
                .trimmingCharacters(in: .whitespacesAndNewlines)
                .replacingOccurrences(of: "^[•\\-\\*\\d\\.\\)]+\\s*", with: "", options: .regularExpression)

            guard trimmed.count > 3 else { continue }

            // Match patterns like "Squat — 4×8" or "Bench Press: 3 sets x 10"
            let setsRepsPattern = #"(\d+)\s*[x×]\s*(\d+[-–]?\d*)"#
            let setsOfPattern = #"(\d+)\s+sets?\s+(?:of\s+)?(\d+[-–]?\d*(?:\s+reps?)?)"#

            var sets: Int?
            var reps: String?

            if let match = trimmed.range(of: setsRepsPattern, options: .regularExpression) {
                let matchStr = String(trimmed[match])
                let parts = matchStr.components(separatedBy: CharacterSet(charactersIn: "x×"))
                sets = Int(parts[0].trimmingCharacters(in: .whitespaces))
                reps = parts.count > 1 ? parts[1].trimmingCharacters(in: .whitespaces) : nil
            } else if let match = trimmed.range(of: setsOfPattern, options: [.regularExpression, .caseInsensitive]) {
                let matchStr = String(trimmed[match])
                let numPattern = #"\d+"#
                let nums = matchStr.matches(pattern: numPattern)
                if nums.count >= 2 { sets = Int(nums[0]); reps = nums[1] }
            }

            // Extract exercise name — everything before the dash/colon/sets info
            var name = trimmed
                .replacingOccurrences(of: #"\s*[–—:-].*"#, with: "", options: .regularExpression)
                .replacingOccurrences(of: #"\s*\d+\s*[x×].*"#, with: "", options: .regularExpression)
                .trimmingCharacters(in: .whitespacesAndNewlines)

            // Skip lines that are clearly not exercise names
            let skipWords = ["rest", "warm", "cool", "note", "repeat", "make sure", "focus", "ensure", "you", "this", "here", "for", "the", "and"]
            let nameLower = name.lowercased()
            guard !name.isEmpty,
                  name.count > 2,
                  !skipWords.contains(where: { nameLower.hasPrefix($0) }),
                  (sets != nil || reps != nil) else { continue }

            exercises.append(ParsedExercise(name: name, sets: sets, reps: reps))
        }

        return exercises
    }

    // MARK: – Persistence

    private func loadMessages() {
        guard let data = UserDefaults.standard.data(forKey: storageKey),
              let decoded = try? JSONDecoder().decode([ChatMessage].self, from: data) else { return }
        // Only keep last 7 days of messages
        let cutoff = Calendar.current.date(byAdding: .day, value: -7, to: Date()) ?? Date()
        messages = decoded.filter { $0.timestamp > cutoff }
    }

    private func saveMessages() {
        // Keep the last 200 messages
        let toSave = Array(messages.suffix(200))
        if let data = try? JSONEncoder().encode(toSave) {
            UserDefaults.standard.set(data, forKey: storageKey)
        }
    }

    private func clearHistory() {
        messages = []
        UserDefaults.standard.removeObject(forKey: storageKey)
    }
}

// MARK: – Message Bubble

struct MessageBubble: View {
    let message: ChatMessage
    let accent: Color
    let onStartWorkout: ([ParsedExercise]) -> Void

    var isUser: Bool { message.role == "user" }

    var body: some View {
        VStack(alignment: isUser ? .trailing : .leading, spacing: 8) {
            HStack(alignment: .bottom, spacing: 8) {
                if isUser { Spacer(minLength: 48) }

                VStack(alignment: isUser ? .trailing : .leading, spacing: 0) {
                    Text(message.text)
                        .font(.system(size: 15, weight: .medium))
                        .foregroundColor(isUser ? .black : .white)
                        .padding(.horizontal, 16)
                        .padding(.vertical, 12)
                        .background(
                            isUser
                                ? accent
                                : Color(white: 0.1)
                        )
                        .clipShape(
                            RoundedRectangle(cornerRadius: 20)
                        )
                        .overlay(
                            isUser ? nil : RoundedRectangle(cornerRadius: 20)
                                .stroke(Color(white: 0.15), lineWidth: 1)
                        )

                    // Timestamp
                    Text(message.timestamp, style: .time)
                        .font(.system(size: 10, weight: .medium))
                        .foregroundColor(Color(white: 0.3))
                        .padding(.top, 4)
                        .padding(.horizontal, 4)
                }

                if !isUser { Spacer(minLength: 48) }
            }

            // Workout CTA — shown below assistant message if workout was parsed
            if let workout = message.parsedWorkout, !workout.isEmpty, !isUser {
                Button(action: { onStartWorkout(workout) }) {
                    HStack(spacing: 8) {
                        Image(systemName: "play.circle.fill")
                            .font(.system(size: 16, weight: .black))
                        Text("START COACHED SESSION")
                            .font(.system(size: 11, weight: .black))
                            .tracking(1.5)
                    }
                    .foregroundColor(.black)
                    .padding(.horizontal, 18)
                    .padding(.vertical, 11)
                    .background(accent)
                    .clipShape(RoundedRectangle(cornerRadius: 12))
                }
            }
        }
        .frame(maxWidth: .infinity, alignment: isUser ? .trailing : .leading)
    }
}

// MARK: – String regex helper

private extension String {
    func matches(pattern: String) -> [String] {
        guard let regex = try? NSRegularExpression(pattern: pattern) else { return [] }
        let range = NSRange(startIndex..., in: self)
        return regex.matches(in: self, range: range).compactMap {
            Range($0.range, in: self).map { String(self[$0]) }
        }
    }
}
