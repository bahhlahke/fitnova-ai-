//
//  CoachEscalateView.swift
//  Koda AI
//
//  List escalations, create request, view/send messages. Parity with web /coach/escalate.
//

import SwiftUI

struct CoachEscalateView: View {
    @EnvironmentObject var auth: SupabaseService
    @State private var escalations: [EscalationItem] = []
    @State private var loading = false
    @State private var errorMessage: String?
    @State private var showCreate = false
    @State private var createTopic = ""
    @State private var createUrgency = "normal"
    @State private var createDetails = ""
    @State private var saving = false
    @State private var selectedEscalation: EscalationSheetItem?
    @State private var messages: [EscalationMessage] = []
    @State private var messagesError: String?
    @State private var newMessage = ""
    @State private var sendingMessage = false
    @State private var sendError: String?

    private var api: KodaAPIService {
        KodaAPIService(getAccessToken: { auth.accessToken })
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    if loading && escalations.isEmpty {
                        ShimmerCard(height: 80)
                        ShimmerCard(height: 80)
                    } else if let err = errorMessage {
                        HStack(spacing: 10) {
                            Image(systemName: "exclamationmark.triangle.fill")
                                .foregroundStyle(Brand.Color.danger)
                            Text(err).font(.caption).foregroundStyle(Brand.Color.danger)
                        }
                        .padding(14)
                        .background(Brand.Color.danger.opacity(0.1))
                        .clipShape(RoundedRectangle(cornerRadius: 14))
                    } else if escalations.isEmpty {
                        PremiumRowCard {
                            VStack(spacing: 10) {
                                Image(systemName: "questionmark.circle")
                                    .font(.title).foregroundStyle(Brand.Color.muted)
                                Text("No support requests yet.")
                                    .font(.subheadline).foregroundStyle(Brand.Color.muted)
                                Text("Tap \"New request\" to get help from your coach.")
                                    .font(.caption).foregroundStyle(Brand.Color.muted)
                                    .multilineTextAlignment(.center)
                            }
                            .frame(maxWidth: .infinity).padding(.vertical, 16)
                        }
                    } else {
                        ForEach(escalations, id: \.escalation_id) { e in
                            escalationCard(e)
                        }
                    }
                }
                .padding(.horizontal, 16)
                .padding(.vertical, 20)
            }
            .fnBackground()
            .navigationTitle("Coach support")
            .navigationBarTitleDisplayMode(.inline)
            .refreshable { await load() }
            .task { await load() }
            .toolbar {
                ToolbarItem(placement: .primaryAction) {
                    Button {
                        showCreate = true
                    } label: {
                        Image(systemName: "plus").fontWeight(.bold)
                    }
                }
            }
            .sheet(isPresented: $showCreate) {
                createEscalationSheet
            }
            .sheet(item: $selectedEscalation) { item in
                escalationMessagesSheet(escalationId: item.id)
            }
        }
    }

    // MARK: - Escalation Card

    private func escalationCard(_ e: EscalationItem) -> some View {
        Button {
            if let id = e.escalation_id {
                messages = []
                messagesError = nil
                selectedEscalation = EscalationSheetItem(id: id)
            }
        } label: {
            PremiumRowCard {
                HStack(spacing: 12) {
                    ZStack {
                        RoundedRectangle(cornerRadius: 10)
                            .fill(urgencyColor(e.urgency).opacity(0.15))
                            .frame(width: 44, height: 44)
                        Image(systemName: urgencyIcon(e.urgency))
                            .font(.body.weight(.bold))
                            .foregroundStyle(urgencyColor(e.urgency))
                    }

                    VStack(alignment: .leading, spacing: 4) {
                        Text(e.topic ?? "Support request")
                            .font(.headline).foregroundStyle(.white)
                        HStack(spacing: 8) {
                            statusPill(e.status)
                            if let urgency = e.urgency, urgency != "normal" {
                                Text(urgency.uppercased())
                                    .font(.system(size: 9, weight: .black, design: .monospaced))
                                    .foregroundStyle(urgencyColor(urgency))
                                    .padding(.horizontal, 6).padding(.vertical, 2)
                                    .background(urgencyColor(urgency).opacity(0.12))
                                    .clipShape(Capsule())
                            }
                        }
                    }
                    Spacer()
                    Image(systemName: "chevron.right")
                        .font(.caption.weight(.bold))
                        .foregroundStyle(Brand.Color.muted)
                }
            }
        }
        .buttonStyle(.plain)
    }

    private func statusPill(_ status: String?) -> some View {
        let s = status ?? "open"
        let color: Color = s == "resolved" ? Brand.Color.success : Brand.Color.accent
        return Text(s.uppercased())
            .font(.system(size: 9, weight: .black, design: .monospaced))
            .foregroundStyle(color)
            .padding(.horizontal, 6).padding(.vertical, 2)
            .background(color.opacity(0.12))
            .clipShape(Capsule())
    }

    private func urgencyIcon(_ urgency: String?) -> String {
        switch urgency {
        case "high": return "exclamationmark.circle.fill"
        case "low": return "info.circle"
        default: return "questionmark.circle"
        }
    }

    private func urgencyColor(_ urgency: String?) -> Color {
        switch urgency {
        case "high": return Brand.Color.danger
        case "low": return Brand.Color.muted
        default: return Brand.Color.accent
        }
    }

    private func urgencyOption(_ value: String, label: String) -> some View {
        let active = createUrgency == value
        return Button {
            createUrgency = value
            HapticEngine.selection()
        } label: {
            Text(label)
                .font(.caption.weight(.bold))
                .foregroundStyle(active ? .black : .white)
                .padding(.horizontal, 12)
                .padding(.vertical, 8)
                .frame(maxWidth: .infinity)
                .background(
                    Capsule()
                        .fill(active ? urgencyColor(value) : Brand.Color.surfaceRaised)
                        .overlay(Capsule().stroke(Brand.Color.borderStrong, lineWidth: 1))
                )
        }
        .buttonStyle(.plain)
    }

    // MARK: - Create Sheet

    private var createEscalationSheet: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    PremiumHeroCard(
                        title: "Coach Support Request",
                        subtitle: "Escalate blockers that need direct coach intervention and include context so you get faster responses.",
                        eyebrow: "Escalation"
                    ) {
                        HStack(spacing: 10) {
                            PremiumMetricPill(label: "Urgency", value: createUrgency.capitalized)
                            PremiumMetricPill(label: "Status", value: "Draft")
                        }
                    }

                    PremiumRowCard {
                        VStack(alignment: .leading, spacing: 12) {
                            Text("Topic")
                                .font(.caption.weight(.bold))
                                .foregroundStyle(Brand.Color.muted)
                            TextField("Brief description of your issue", text: $createTopic)
                                .padding(12)
                                .background(
                                    RoundedRectangle(cornerRadius: 12, style: .continuous)
                                        .fill(Brand.Color.surfaceRaised)
                                        .overlay(
                                            RoundedRectangle(cornerRadius: 12, style: .continuous)
                                                .stroke(Brand.Color.borderStrong, lineWidth: 1)
                                        )
                                )

                            Text("Urgency")
                                .font(.caption.weight(.bold))
                                .foregroundStyle(Brand.Color.muted)
                            HStack(spacing: 8) {
                                urgencyOption("low", label: "Low")
                                urgencyOption("normal", label: "Normal")
                                urgencyOption("high", label: "High")
                            }

                            Text("Details (optional)")
                                .font(.caption.weight(.bold))
                                .foregroundStyle(Brand.Color.muted)
                            TextField("Describe the situation in more detail…", text: $createDetails, axis: .vertical)
                                .lineLimit(3...8)
                                .padding(12)
                                .background(
                                    RoundedRectangle(cornerRadius: 12, style: .continuous)
                                        .fill(Brand.Color.surfaceRaised)
                                        .overlay(
                                            RoundedRectangle(cornerRadius: 12, style: .continuous)
                                                .stroke(Brand.Color.borderStrong, lineWidth: 1)
                                        )
                                )
                        }
                    }

                    HStack(spacing: 10) {
                        Button("Cancel") {
                            showCreate = false
                            createTopic = ""
                            createDetails = ""
                        }
                        .buttonStyle(PremiumActionButtonStyle(filled: false))

                        Button(saving ? "Sending…" : "Send request") {
                            Task { await createEscalation() }
                        }
                        .buttonStyle(PremiumActionButtonStyle(filled: true))
                        .disabled(saving || createTopic.trimmingCharacters(in: .whitespaces).isEmpty)
                    }
                }
                .padding(.horizontal, 16)
                .padding(.vertical, 18)
            }
            .fnBackground()
            .navigationTitle("New request")
            .navigationBarTitleDisplayMode(.inline)
        }
    }

    // MARK: - Messages Sheet

    private func escalationMessagesSheet(escalationId: String) -> some View {
        NavigationStack {
            VStack(alignment: .leading, spacing: 0) {
                if let err = messagesError {
                    HStack(spacing: 8) {
                        Image(systemName: "exclamationmark.triangle.fill")
                            .foregroundStyle(Brand.Color.danger)
                        Text(err).font(.caption).foregroundStyle(Brand.Color.danger)
                    }
                    .padding(12)
                    .background(Brand.Color.danger.opacity(0.1))
                    .clipShape(RoundedRectangle(cornerRadius: 12))
                    .padding()
                }

                ScrollView {
                    VStack(spacing: 10) {
                        if messages.isEmpty && messagesError == nil {
                            PremiumRowCard {
                                Text("No messages yet. Send the first one below.")
                                    .font(.caption)
                                    .foregroundStyle(Brand.Color.muted)
                                    .frame(maxWidth: .infinity, alignment: .leading)
                            }
                        }
                        ForEach(messages, id: \.escalation_message_id) { m in
                            PremiumRowCard {
                                VStack(alignment: .leading, spacing: 6) {
                                    HStack {
                                        PremiumStatusChip(
                                            label: m.sender_type == "coach" ? "Coach" : "You",
                                            tone: m.sender_type == "coach" ? .accent : .muted
                                        )
                                        Spacer()
                                        if let ts = m.created_at {
                                            Text(formattedTimestamp(ts))
                                                .font(.system(size: 10))
                                                .foregroundStyle(Brand.Color.muted)
                                        }
                                    }
                                    Text(m.body ?? "")
                                        .font(.subheadline)
                                        .foregroundStyle(.white)
                                        .frame(maxWidth: .infinity, alignment: .leading)
                                }
                            }
                        }
                    }
                    .padding(.horizontal, 16)
                    .padding(.vertical, 10)
                }

                if let err = sendError {
                    Text(err)
                        .font(.caption).foregroundStyle(Brand.Color.danger)
                        .padding(.horizontal, 16)
                }

                HStack(spacing: 10) {
                    TextField("Message…", text: $newMessage, axis: .vertical)
                        .lineLimit(1...3)
                        .padding(.horizontal, 12).padding(.vertical, 10)
                        .background(
                            RoundedRectangle(cornerRadius: 12)
                                .fill(Brand.Color.surfaceRaised)
                                .overlay(RoundedRectangle(cornerRadius: 12).stroke(Brand.Color.borderStrong, lineWidth: 1))
                        )
                    Button {
                        Task { await sendMessage(escalationId: escalationId) }
                    } label: {
                        Image(systemName: sendingMessage ? "ellipsis" : "arrow.up.circle.fill")
                            .font(.title2)
                            .foregroundStyle(newMessage.trimmingCharacters(in: .whitespaces).isEmpty ? Brand.Color.muted : Brand.Color.accent)
                    }
                    .disabled(sendingMessage || newMessage.trimmingCharacters(in: .whitespaces).isEmpty)
                }
                .padding(.horizontal, 16).padding(.vertical, 12)
                .background(Brand.Color.surfaceRaised)
            }
            .fnBackground()
            .navigationTitle("Thread")
            .navigationBarTitleDisplayMode(.inline)
            .task { await loadMessages(escalationId: escalationId) }
        }
    }

    private func formattedTimestamp(_ iso: String) -> String {
        let p = ISO8601DateFormatter()
        p.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        guard let d = p.date(from: iso) else {
            // Fallback without fractional seconds
            let p2 = ISO8601DateFormatter()
            guard let d2 = p2.date(from: iso) else { return iso }
            return RelativeDateTimeFormatter().localizedString(for: d2, relativeTo: Date())
        }
        return RelativeDateTimeFormatter().localizedString(for: d, relativeTo: Date())
    }

    // MARK: - Data

    private func load() async {
        loading = true
        errorMessage = nil
        defer { loading = false }
        do {
            let res = try await api.coachEscalateList()
            await MainActor.run { escalations = res.escalations ?? [] }
        } catch {
            await MainActor.run { errorMessage = error.localizedDescription }
        }
    }

    private func createEscalation() async {
        saving = true
        defer { saving = false }
        do {
            _ = try await api.coachEscalateCreate(
                topic: createTopic.trimmingCharacters(in: .whitespaces),
                urgency: createUrgency,
                details: createDetails.isEmpty ? nil : createDetails,
                preferredChannel: nil
            )
            await MainActor.run {
                showCreate = false
                createTopic = ""
                createDetails = ""
            }
            await load()
        } catch {
            await MainActor.run { errorMessage = error.localizedDescription }
        }
    }

    private func loadMessages(escalationId: String) async {
        messagesError = nil
        do {
            let res = try await api.coachEscalateMessages(escalationId: escalationId)
            await MainActor.run { messages = res.messages ?? [] }
        } catch {
            await MainActor.run { messagesError = error.localizedDescription }
        }
    }

    private func sendMessage(escalationId: String) async {
        let text = newMessage.trimmingCharacters(in: .whitespaces)
        guard !text.isEmpty else { return }
        sendingMessage = true
        sendError = nil
        defer { sendingMessage = false }
        do {
            let res = try await api.coachEscalateSendMessage(escalationId: escalationId, body: text)
            await MainActor.run {
                newMessage = ""
                messages = res.messages ?? []
            }
            HapticEngine.notification(.success)
        } catch {
            await MainActor.run { sendError = error.localizedDescription }
        }
    }
}

struct EscalationSheetItem: Identifiable {
    let id: String
}
