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
    
    // Squad Mastery State (Phase 5)
    @State private var selectedTab: CommunityTab = .squad
    @State private var squadOverview: SquadOverviewResponse?
    @State private var squadVibes: [SquadVibe] = []
    
    // Synapse Pulse State
    @State private var showingPulseAnimation = false
    @State private var pulseMessage = ""
    @State private var pulseTask: Task<Void, Never>?
    @State private var myDisplayName: String = ""
    @State private var joiningChallengeId: String?

    private var api: KodaAPIService {
        KodaAPIService(getAccessToken: { auth.accessToken })
    }

    enum CommunityTab { case squad, friends }

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // Custom Tab Picker
                HStack(spacing: 20) {
                    TabButton(title: "Squad Hub", isActive: selectedTab == .squad) { selectedTab = .squad }
                    TabButton(title: "Social", isActive: selectedTab == .friends) { selectedTab = .friends }
                }
                .padding(.horizontal)
                .padding(.top, 10)
                
                if selectedTab == .squad {
                    squadHubView
                } else {
                    friendsListView
                }
            }
            .fnBackground()
            .navigationTitle("Community")
            .navigationBarTitleDisplayMode(.inline)
            .refreshable { await load() }
            .task {
                await load()
                await setupPulseSubscription()
            }
            .onDisappear { pulseTask?.cancel() }
            .overlay {
                if showingPulseAnimation {
                    ZStack {
                        Color.black.opacity(0.4).ignoresSafeArea()
                        VStack {
                            Image(systemName: "bolt.fill")
                                .font(.system(size: 80))
                                .foregroundStyle(Brand.Color.accent)
                                .shadow(color: Brand.Color.accent, radius: 30)
                            Text(pulseMessage)
                                .font(.headline)
                                .fontWeight(.black)
                                .foregroundStyle(.white)
                                .multilineTextAlignment(.center)
                                .padding(.top, 12)
                        }
                        .padding(40)
                        .background(.ultraThinMaterial)
                        .clipShape(RoundedRectangle(cornerRadius: 32))
                        .overlay(RoundedRectangle(cornerRadius: 32).stroke(Brand.Color.accent.opacity(0.3), lineWidth: 1))
                    }
                    .transition(.scale.combined(with: .opacity))
                    .zIndex(100)
                }
            }
        }
    }

    private var squadHubView: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 24) {
                // Squad Header
                VStack(alignment: .leading, spacing: 8) {
                    HStack {
                        Circle()
                            .fill(Brand.Color.accent)
                            .frame(width: 8, height: 8)
                        Text("ACTIVE COHORT")
                            .font(.system(size: 10, weight: .black, design: .monospaced))
                            .foregroundStyle(Brand.Color.accent)
                    }
                    
                    Text(squadOverview?.squadName ?? "ELITE PROTOCOL")
                        .font(.system(size: 32, weight: .black, design: .default))
                        .italic()
                        .foregroundStyle(.white)
                    
                    HStack {
                        Text("YOUR RANK:")
                            .font(.caption)
                            .fontWeight(.bold)
                            .foregroundStyle(.secondary)
                        Text("#\(squadOverview?.rank ?? 0)")
                            .font(.headline)
                            .fontWeight(.black)
                            .foregroundStyle(Brand.Color.accent)
                    }
                }
                .padding()
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(Brand.Color.accent.opacity(0.05))
                .clipShape(RoundedRectangle(cornerRadius: 20))
                .padding(.horizontal)

                // Leaderboard Preview
                VStack(alignment: .leading, spacing: 16) {
                    Text("SQUAD LEADERBOARD")
                        .font(.system(size: 12, weight: .black, design: .monospaced))
                        .foregroundStyle(.white.opacity(0.6))
                        .padding(.horizontal)
                    
                    VStack(spacing: 1) {
                        ForEach(squadOverview?.leaderboard ?? []) { entry in
                            HStack(spacing: 16) {
                                Text("\(entry.rank)")
                                    .font(.system(size: 14, weight: .black, design: .monospaced))
                                    .foregroundStyle(entry.rank <= 3 ? Brand.Color.accent : .secondary)
                                    .frame(width: 24)
                                
                                Text(entry.name)
                                    .font(.subheadline)
                                    .fontWeight(.bold)
                                    .foregroundStyle(.white)
                                
                                Spacer()
                                
                                Text("\(entry.score)")
                                    .font(.system(size: 14, weight: .black, design: .monospaced))
                                    .foregroundStyle(.secondary)
                            }
                            .padding()
                            .background(entry.userId == auth.currentUserId ? Brand.Color.accent.opacity(0.1) : Color.white.opacity(0.02))
                        }
                    }
                    .clipShape(RoundedRectangle(cornerRadius: 16))
                    .padding(.horizontal)
                }

                // Vibes Feed
                VStack(alignment: .leading, spacing: 16) {
                    Text("SQUAD VIBES")
                        .font(.system(size: 12, weight: .black, design: .monospaced))
                        .foregroundStyle(.white.opacity(0.6))
                        .padding(.horizontal)
                    
                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: 12) {
                            ForEach(squadVibes) { vibe in
                                VStack(alignment: .leading, spacing: 8) {
                                    HStack {
                                        Text(vibe.userName)
                                            .font(.caption)
                                            .fontWeight(.black)
                                            .foregroundStyle(Brand.Color.accent)
                                        Spacer()
                                        Text(vibe.time)
                                            .font(.system(size: 9))
                                            .foregroundStyle(.secondary)
                                    }
                                    
                                    Text(vibe.message)
                                        .font(.system(size: 13, weight: .medium))
                                        .foregroundStyle(.white)
                                        .lineLimit(2)
                                    
                                    Button(action: { Task { await sendPulse(to: "global_squad", name: vibe.userName) } }) {
                                        HStack(spacing: 4) {
                                            Image(systemName: "bolt.fill")
                                            Text("PULSE")
                                        }
                                        .font(.system(size: 9, weight: .black, design: .monospaced))
                                        .padding(.horizontal, 8)
                                        .padding(.vertical, 4)
                                        .background(Brand.Color.accent.opacity(0.2))
                                        .foregroundStyle(Brand.Color.accent)
                                        .clipShape(Capsule())
                                    }
                                }
                                .padding()
                                .frame(width: 200)
                                .background(Color.white.opacity(0.05))
                                .clipShape(RoundedRectangle(cornerRadius: 16))
                                .overlay(RoundedRectangle(cornerRadius: 16).stroke(Color.white.opacity(0.05), lineWidth: 1))
                            }
                        }
                        .padding(.horizontal)
                    }
                }
            }
            .padding(.vertical)
        }
    }

    private var friendsListView: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                // Accountability partner
                VStack(alignment: .leading, spacing: 12) {
                    PremiumSectionHeader("Accountability Partner", eyebrow: "PARTNER")
                    PremiumRowCard {
                        if let p = partner, let name = p.partner_profile?.display_name {
                            HStack(spacing: 12) {
                                ZStack {
                                    Circle().fill(Brand.Color.accent.opacity(0.15)).frame(width: 44, height: 44)
                                    Image(systemName: "person.fill").foregroundStyle(Brand.Color.accent)
                                }
                                VStack(alignment: .leading, spacing: 2) {
                                    Text(name).font(.headline).foregroundStyle(.white)
                                    Text("Accountability Partner").font(.caption).foregroundStyle(Brand.Color.muted)
                                }
                                Spacer()
                            }
                        } else {
                            HStack(spacing: 10) {
                                Image(systemName: "person.badge.plus").foregroundStyle(Brand.Color.muted)
                                Text("No accountability partner set").font(.subheadline).foregroundStyle(Brand.Color.muted)
                            }
                        }
                    }
                }

                // Friends
                if !acceptedConnections.isEmpty {
                    VStack(alignment: .leading, spacing: 12) {
                        PremiumSectionHeader("Friends", eyebrow: "\(acceptedConnections.count) connections")
                        ForEach(Array(acceptedConnections.enumerated()), id: \.offset) { _, row in
                            PremiumRowCard {
                                HStack(spacing: 12) {
                                    ZStack {
                                        Circle().fill(Brand.Color.surfaceRaised).frame(width: 44, height: 44)
                                        Image(systemName: "person.fill").foregroundStyle(Brand.Color.muted)
                                    }
                                    Text(otherDisplayName(row) ?? "Friend")
                                        .font(.headline).foregroundStyle(.white)
                                    Spacer()
                                    Button {
                                        if let id = otherUserId(row) {
                                            Task { await sendPulse(to: id, name: otherDisplayName(row) ?? "Friend") }
                                        }
                                    } label: {
                                        HStack(spacing: 4) {
                                            Image(systemName: "bolt.fill")
                                            Text("PULSE")
                                        }
                                        .font(.system(size: 10, weight: .black, design: .monospaced))
                                        .foregroundStyle(Brand.Color.accent)
                                        .padding(.horizontal, 10).padding(.vertical, 6)
                                        .background(Brand.Color.accent.opacity(0.15))
                                        .clipShape(Capsule())
                                    }
                                }
                            }
                        }
                    }
                }

                // Challenges
                if !challenges.isEmpty {
                    VStack(alignment: .leading, spacing: 12) {
                        PremiumSectionHeader("Challenges", eyebrow: "\(challenges.count) available")
                        ForEach(challenges, id: \.challenge_id) { c in
                            PremiumRowCard {
                                HStack {
                                    VStack(alignment: .leading, spacing: 4) {
                                        Text(c.name ?? "Challenge")
                                            .font(.headline).foregroundStyle(.white)
                                    }
                                    Spacer()
                                    let cid = c.challenge_id ?? ""
                                    Button {
                                        guard !cid.isEmpty else { return }
                                        joiningChallengeId = cid
                                        Task {
                                            try? await api.communityChallengesPost(challengeId: cid)
                                            await load()
                                            await MainActor.run { joiningChallengeId = nil }
                                        }
                                    } label: {
                                        if joiningChallengeId == cid {
                                            ProgressView().scaleEffect(0.75).tint(Brand.Color.accent)
                                        } else {
                                            Text("JOIN")
                                                .font(.system(size: 10, weight: .black, design: .monospaced))
                                                .foregroundStyle(Brand.Color.accent)
                                                .padding(.horizontal, 12).padding(.vertical, 6)
                                                .background(Brand.Color.accent.opacity(0.15))
                                                .clipShape(Capsule())
                                        }
                                    }
                                    .disabled(joiningChallengeId != nil)
                                }
                            }
                        }
                    }
                }
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 20)
        }
    }

    private var acceptedConnections: [ConnectionRow] {
        connections.filter { $0.status == "accepted" }
    }

    private func otherDisplayName(_ row: ConnectionRow) -> String? {
        let myId = auth.currentUserId
        if row.user_id_1 == myId {
            return row.profile_2?.display_name
        } else {
            return row.profile_1?.display_name
        }
    }

    private func otherUserId(_ row: ConnectionRow) -> String? {
        let myId = auth.currentUserId
        if row.user_id_1 == myId {
            return row.user_id_2
        } else {
            return row.user_id_1
        }
    }

    private func load() async {
        loading = true
        defer { loading = false }
        // Load social and squad data concurrently; squad is non-critical and fails gracefully.
        await withTaskGroup(of: Void.self) { group in
            group.addTask {
                guard let uid = self.auth.currentUserId else { return }
                let ds = KodaDataService(client: self.auth.supabaseClient, userId: uid)
                if let profile = try? await ds.fetchProfile(),
                   let name = profile.display_name, !name.isEmpty {
                    await MainActor.run { self.myDisplayName = name }
                }
            }
            group.addTask {
                do {
                    let conns = try await self.api.socialFriends()
                    await MainActor.run { self.connections = conns }
                } catch {
                    await MainActor.run { self.errorMessage = error.localizedDescription }
                }
            }
            group.addTask {
                do {
                    let aRes = try await self.api.socialAccountability()
                    await MainActor.run { self.partner = aRes.partner }
                } catch {}
            }
            group.addTask {
                do {
                    let cRes = try await self.api.communityChallenges()
                    await MainActor.run { self.challenges = cRes.challenges ?? [] }
                } catch {}
            }
            group.addTask {
                do {
                    let sOver = try await self.api.communitySquadOverview()
                    await MainActor.run { self.squadOverview = sOver }
                } catch {}
            }
            group.addTask {
                do {
                    let sVibe = try await self.api.communitySquadVibes()
                    await MainActor.run { self.squadVibes = sVibe.vibes ?? [] }
                } catch {}
            }
        }
    }
    
    private func setupPulseSubscription() async {
        guard let myId = auth.currentUserId else { return }
        let channel = auth.supabaseClient.channel("synapse_pulses_\(myId)")
        try? await channel.subscribeWithError()

        pulseTask = Task {
            for await message in channel.broadcastStream(event: "pulse") {
                if Task.isCancelled { break }
                guard let senderName = message["sender_name"]?.stringValue else { continue }
                await MainActor.run {
                    self.pulseMessage = "\(senderName.uppercased()) SENT A PULSE!"
                    withAnimation(.spring(response: 0.3, dampingFraction: 0.5)) {
                        self.showingPulseAnimation = true
                    }
                    UINotificationFeedbackGenerator().notificationOccurred(.success)
                }
                try? await Task.sleep(nanoseconds: 2_000_000_000)
                await MainActor.run { withAnimation { self.showingPulseAnimation = false } }
            }
            try? await channel.unsubscribe()
        }
    }
    
    private func sendPulse(to userId: String, name: String) async {
        guard let myId = auth.currentUserId else { return }
        let senderName = myDisplayName.isEmpty ? "Koda Member" : myDisplayName
        let payload: AnyJSON = .object([
            "sender_id": .string(myId),
            "sender_name": .string(senderName),
            "type": .string("pulse")
        ])
        let channel = auth.supabaseClient.channel("synapse_pulse_out_\(myId)_\(userId)")
        try? await channel.subscribeWithError()
        try? await channel.broadcast(event: "pulse", message: payload)
        try? await channel.unsubscribe()
        UIImpactFeedbackGenerator(style: .heavy).impactOccurred()
    }
}

private struct TabButton: View {
    let title: String
    let isActive: Bool
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            VStack(spacing: 8) {
                Text(title)
                    .font(.system(size: 13, weight: .black))
                    .foregroundStyle(isActive ? .white : .white.opacity(0.4))
                
                Rectangle()
                    .fill(isActive ? Brand.Color.accent : Color.clear)
                    .frame(height: 2)
            }
        }
    }
}
