//
//  CommunityView.swift
//  Koda AI
//
//  Friends list, accountability partner, challenges. Parity with web community/friends.
//

import SwiftUI
import Supabase
import Realtime

struct CommunityView: View {
    @EnvironmentObject var auth: SupabaseService
    @State private var connections: [ConnectionRow] = []
    @State private var partner: AccountabilityPartner?
    @State private var challenges: [ChallengeItem] = []
    @State private var loading = false
    @State private var errorMessage: String?
    
    // Synapse Pulse State
    @State private var recentPulses: [String] = []
    @State private var showingPulseAnimation = false
    @State private var pulseMessage = ""

    private var api: KodaAPIService {
        KodaAPIService(getAccessToken: { await auth.accessToken })
    }

    var body: some View {
        NavigationStack {
            List {
                Section("Accountability partner") {
                    if let p = partner, let name = p.display_name {
                        Text(name)
                    } else {
                        Text("No partner set")
                            .foregroundStyle(.secondary)
                    }
                }
                Section("Friends") {
                    ForEach(Array(acceptedConnections.enumerated()), id: \.offset) { _, row in
                        HStack {
                            Text(otherDisplayName(row) ?? "")
                            Spacer()
                            Button(action: {
                                if let id = otherUserId(row) {
                                    Task { await sendPulse(to: id, name: otherDisplayName(row) ?? "Friend") }
                                }
                            }) {
                                Image(systemName: "bolt.fill")
                                    .foregroundStyle(Color.accentColor)
                                    .padding(8)
                                    .background(Color.accentColor.opacity(0.2))
                                    .clipShape(Circle())
                            }
                        }
                    }
                }
                Section("Pending requests") {
                    ForEach(Array(pendingConnections.enumerated()), id: \.offset) { _, row in
                        HStack {
                            Text(otherDisplayName(row) ?? "")
                            Spacer()
                            Button("Accept") {
                                if let id = otherUserId(row) {
                                    Task { try? await api.socialFriendsPost(friendId: id, action: "accept"); await load() }
                                }
                            }
                        }
                    }
                }
                Section("Challenges") {
                    ForEach(challenges, id: \.challenge_id) { c in
                        HStack {
                            Text(c.name ?? "")
                            Spacer()
                            Button("Join") {
                                if let id = c.challenge_id {
                                    Task { try? await api.communityChallengesPost(challengeId: id); await load() }
                                }
                            }
                        }
                    }
                }
            }
            .navigationTitle("Community")
            .refreshable { await load() }
            .task { 
                await load() 
                await setupPulseSubscription()
            }
            .overlay {
                if showingPulseAnimation {
                    VStack {
                        Image(systemName: "bolt.fill")
                            .font(.system(size: 60))
                            .foregroundStyle(Color.accentColor)
                            .shadow(color: .accentColor, radius: 20)
                        Text(pulseMessage)
                            .font(.headline)
                            .fontWeight(.black)
                            .foregroundStyle(.white)
                            .padding(.top, 8)
                    }
                    .padding(30)
                    .background(.ultraThinMaterial)
                    .clipShape(RoundedRectangle(cornerRadius: 24))
                    .transition(.scale.combined(with: .opacity))
                    .zIndex(100)
                }
            }
        }
    }

    private var acceptedConnections: [ConnectionRow] {
        connections.filter { $0.status == "accepted" }
    }

    private var pendingConnections: [ConnectionRow] {
        connections.filter { $0.status == "pending" }
    }

    private func otherDisplayName(_ row: ConnectionRow) -> String? {
        row.friend?.name ?? row.user?.name
    }

    private func otherUserId(_ row: ConnectionRow) -> String? {
        row.friend?.user_id ?? row.user?.user_id
    }

    private func load() async {
        loading = true
        defer { loading = false }
        do {
            let (conns, aRes, cRes) = try await (
                api.socialFriends(),
                api.socialAccountability(),
                api.communityChallenges()
            )
            await MainActor.run {
                connections = conns
                partner = aRes.partner
                challenges = cRes.challenges ?? []
            }
        } catch {
            await MainActor.run { errorMessage = error.localizedDescription }
        }
    }
    
    private func setupPulseSubscription() async {
        guard let myId = auth.currentUserId else { return }
        
        let channel = auth.supabaseClient.channel("synapse_pulses_\(myId)")
        await channel.subscribe()
        
        Task {
            for await message in channel.broadcastStream(event: "pulse") {
                guard let senderName = message["sender_name"]?.stringValue else { continue }
                
                await MainActor.run {
                    self.pulseMessage = "\(senderName) sent a Synapse Pulse!"
                    withAnimation(.spring(response: 0.3, dampingFraction: 0.5)) {
                        self.showingPulseAnimation = true
                    }
                    
                    // Haptic feedback
                    UINotificationFeedbackGenerator().notificationOccurred(.success)
                }
                
                try? await Task.sleep(nanoseconds: 2_000_000_000)
                
                await MainActor.run {
                    withAnimation {
                        self.showingPulseAnimation = false
                    }
                }
            }
        }
    }
    
    private func sendPulse(to userId: String, name: String) async {
        guard let myId = auth.currentUserId else { return }
        
        // Prepare the broadcast payload
        let payload: AnyJSON = .object([
            "sender_id": .string(myId),
            "sender_name": .string("A Friend"),
            "type": .string("pulse")
        ])
        
        // This broadcasts the pulse directly to the recipient's channel
        let channel = auth.supabaseClient.channel("synapse_pulses_\(userId)")
        await channel.subscribe()
        try? await channel.broadcast(event: "pulse", message: payload)
        
        // Optional haptic locally
        UIImpactFeedbackGenerator(style: .heavy).impactOccurred()
    }
}
