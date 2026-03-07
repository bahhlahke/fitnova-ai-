//
//  CommunityView.swift
//  Koda AI
//
//  Friends list, accountability partner, challenges. Parity with web community/friends.
//

import SwiftUI

struct CommunityView: View {
    @EnvironmentObject var auth: SupabaseService
    @State private var connections: [ConnectionRow] = []
    @State private var partner: AccountabilityPartner?
    @State private var challenges: [ChallengeItem] = []
    @State private var loading = false
    @State private var errorMessage: String?

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
                        Text(otherDisplayName(row) ?? "")
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
            .task { await load() }
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
}
