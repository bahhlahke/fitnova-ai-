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
    @State private var newMessage = ""
    @State private var sendingMessage = false

    private var api: KodaAPIService {
        KodaAPIService(getAccessToken: { auth.accessToken })
    }

    var body: some View {
        NavigationStack {
            List {
                Section("Your requests") {
                    ForEach(escalations, id: \.escalation_id) { e in
                        Button {
                            if let id = e.escalation_id {
                                selectedEscalation = EscalationSheetItem(id: id)
                            }
                        } label: {
                            HStack {
                                VStack(alignment: .leading, spacing: 4) {
                                    Text(e.topic ?? "—")
                                        .font(.headline)
                                    Text(e.status ?? "—")
                                        .font(.caption)
                                        .foregroundStyle(.secondary)
                                }
                                Spacer()
                                Image(systemName: "chevron.right")
                            }
                        }
                    }
                }
                if let err = errorMessage {
                    Section {
                        Text(err)
                            .foregroundStyle(.red)
                            .font(.caption)
                    }
                }
            }
            .navigationTitle("Coach support")
            .refreshable { await load() }
            .task { await load() }
            .toolbar {
                ToolbarItem(placement: .primaryAction) {
                    Button("New request") { showCreate = true }
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

    private var createEscalationSheet: some View {
        NavigationStack {
            Form {
                TextField("Topic", text: $createTopic)
                Picker("Urgency", selection: $createUrgency) {
                    Text("Low").tag("low")
                    Text("Normal").tag("normal")
                    Text("High").tag("high")
                }
                TextField("Details", text: $createDetails, axis: .vertical)
                    .lineLimit(3...8)
            }
            .navigationTitle("New request")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") {
                        showCreate = false
                        createTopic = ""
                        createDetails = ""
                    }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Send") {
                        Task { await createEscalation() }
                    }
                    .disabled(saving || createTopic.trimmingCharacters(in: .whitespaces).isEmpty)
                }
            }
        }
    }

    private func escalationMessagesSheet(escalationId: String) -> some View {
        NavigationStack {
            VStack(alignment: .leading, spacing: 0) {
                List {
                    ForEach(messages, id: \.escalation_message_id) { m in
                        VStack(alignment: .leading, spacing: 4) {
                            Text(m.body ?? "")
                            Text(m.sender_type ?? "")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                    }
                }
                HStack {
                    TextField("Message", text: $newMessage, axis: .vertical)
                        .lineLimit(1...3)
                    Button("Send") {
                        Task { await sendMessage(escalationId: escalationId) }
                    }
                    .disabled(sendingMessage || newMessage.trimmingCharacters(in: .whitespaces).isEmpty)
                }
                .padding()
            }
            .navigationTitle("Thread")
            .navigationBarTitleDisplayMode(.inline)
            .task {
                await loadMessages(escalationId: escalationId)
            }
        }
    }

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
        do {
            let res = try await api.coachEscalateMessages(escalationId: escalationId)
            await MainActor.run { messages = res.messages ?? [] }
        } catch { }
    }

    private func sendMessage(escalationId: String) async {
        let text = newMessage.trimmingCharacters(in: .whitespaces)
        guard !text.isEmpty else { return }
        sendingMessage = true
        defer { sendingMessage = false }
        do {
            let res = try await api.coachEscalateSendMessage(escalationId: escalationId, body: text)
            await MainActor.run {
                newMessage = ""
                messages = res.messages ?? []
            }
        } catch { }
    }
}

struct EscalationSheetItem: Identifiable {
    let id: String
}
