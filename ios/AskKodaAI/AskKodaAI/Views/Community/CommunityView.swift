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

    enum CommunityTab: String {
        case squad = "Squad Hub"
        case friends = "Social"
    }

    private var communityTabs: [PremiumTabItem] {
        [
            PremiumTabItem(
                id: CommunityTab.squad.rawValue,
                title: CommunityTab.squad.rawValue,
                detail: "\(squadOverview?.leaderboard?.count ?? 0) ranked"
            ),
            PremiumTabItem(
                id: CommunityTab.friends.rawValue,
                title: CommunityTab.friends.rawValue,
                detail: "\(acceptedConnections.count) friends"
            ),
        ]
    }

    private var selectedTabId: Binding<String> {
        Binding(
            get: { selectedTab.rawValue },
            set: { newValue in
                selectedTab = CommunityTab(rawValue: newValue) ?? .squad
            }
        )
    }

    var body: some View {
        NavigationStack {
            VStack(spacing: 14) {
                PremiumHeroCard(
                    title: selectedTab == .squad ? (squadOverview?.squadName ?? "Elite Protocol") : "Social Accountability",
                    subtitle: "Compete on squad rankings, keep your friends engaged, and use Synapse Pulse to reinforce consistency every day.",
                    eyebrow: "Community"
                ) {
                    HStack(spacing: 10) {
                        PremiumMetricPill(label: "Rank", value: squadOverview?.rank.map { "#\($0)" } ?? "—")
                        PremiumMetricPill(label: "Challenges", value: "\(challenges.count)")
                        PremiumMetricPill(label: "Friends", value: "\(acceptedConnections.count)")
                    }
                }
                .padding(.horizontal, 16)
                .padding(.top, 12)

                PremiumTabSwitcher(items: communityTabs, selectedId: selectedTabId)
                    .padding(.horizontal, 16)

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
            VStack(alignment: .leading, spacing: 20) {
                if loading && squadOverview == nil {
                    ShimmerCard(height: 170)
                    ShimmerCard(height: 220)
                    ShimmerCard(height: 150)
                } else {
                    if let err = errorMessage {
                        errorBanner(err)
                    }

                    PremiumSectionHeader(
                        "Squad Command",
                        eyebrow: "competitive mode",
                        subtitle: "Stay in position on the leaderboard and keep momentum high with real-time accountability."
                    )

                    PremiumRowCard {
                        VStack(alignment: .leading, spacing: 14) {
                            HStack(alignment: .top) {
                                VStack(alignment: .leading, spacing: 8) {
                                    Text((squadOverview?.squadName ?? "Elite Protocol").uppercased())
                                        .font(.system(size: 23, weight: .black, design: .default))
                                        .foregroundStyle(.white)
                                    HStack(spacing: 8) {
                                        PremiumStatusChip(label: "Rank #\(squadOverview?.rank ?? 0)", tone: .accent)
                                        PremiumStatusChip(label: "Active", tone: .success)
                                    }
                                }
                                Spacer()
                                Image(systemName: "person.3.fill")
                                    .font(.title2)
                                    .foregroundStyle(Brand.Color.accent.opacity(0.86))
                            }

                            HStack(spacing: 10) {
                                squadStat(label: "Members", value: "\(squadOverview?.leaderboard?.count ?? 0)")
                                squadStat(label: "Challenges", value: "\(challenges.count)")
                                squadStat(label: "Vibes", value: "\(squadVibes.count)")
                            }
                        }
                    }

                    if let leaderboard = squadOverview?.leaderboard, !leaderboard.isEmpty {
                        VStack(alignment: .leading, spacing: 12) {
                            PremiumSectionHeader("Leaderboard", eyebrow: "live standings")
                            PremiumRowCard {
                                VStack(spacing: 10) {
                                    ForEach(Array(leaderboard.enumerated()), id: \.offset) { index, entry in
                                        HStack(spacing: 14) {
                                            Text("\(entry.rank)")
                                                .font(.system(size: 12, weight: .black, design: .monospaced))
                                                .foregroundStyle(entry.rank <= 3 ? Brand.Color.accent : Brand.Color.muted)
                                                .frame(width: 28)

                                            Text(entry.name)
                                                .font(.subheadline.weight(.bold))
                                                .foregroundStyle(.white)
                                                .lineLimit(1)

                                            Spacer()

                                            PremiumStatusChip(
                                                label: "\(entry.score)",
                                                tone: entry.rank <= 3 ? .accent : .muted
                                            )
                                        }
                                        .padding(.horizontal, 12)
                                        .padding(.vertical, 9)
                                        .background(
                                            RoundedRectangle(cornerRadius: 14, style: .continuous)
                                                .fill(entry.userId == auth.currentUserId ? Brand.Color.accent.opacity(0.13) : Brand.Color.surfaceRaised.opacity(0.5))
                                        )

                                        if index < leaderboard.count - 1 {
                                            Divider().background(Brand.Color.border)
                                        }
                                    }
                                }
                            }
                        }
                    } else {
                        PremiumStateCard(
                            title: "Leaderboard syncing",
                            detail: "Squad ranking data will appear here after your first synced session.",
                            symbol: "chart.bar.xaxis"
                        )
                    }

                    VStack(alignment: .leading, spacing: 12) {
                        PremiumSectionHeader("Squad Vibes", eyebrow: "synapse pulse feed")
                        if squadVibes.isEmpty {
                            PremiumRowCard {
                                VStack(spacing: 10) {
                                    Image(systemName: "bolt.badge.clock")
                                        .font(.title2)
                                        .foregroundStyle(Brand.Color.muted)
                                    Text("No vibes yet today.")
                                        .font(.subheadline.weight(.semibold))
                                        .foregroundStyle(Brand.Color.muted)
                                    Text("Your squad pulse moments and hype messages show up here.")
                                        .font(.caption)
                                        .foregroundStyle(Brand.Color.muted)
                                        .multilineTextAlignment(.center)
                                }
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 12)
                            }
                        } else {
                            ScrollView(.horizontal, showsIndicators: false) {
                                HStack(spacing: 12) {
                                    ForEach(Array(squadVibes.prefix(8))) { vibe in
                                        PremiumRowCard {
                                            VStack(alignment: .leading, spacing: 10) {
                                                HStack {
                                                    Text(vibe.userName)
                                                        .font(.caption.weight(.black))
                                                        .foregroundStyle(Brand.Color.accent)
                                                    Spacer()
                                                    Text(vibe.time)
                                                        .font(.system(size: 9, weight: .medium))
                                                        .foregroundStyle(Brand.Color.muted)
                                                }
                                                Text(vibe.message)
                                                    .font(.subheadline)
                                                    .foregroundStyle(.white)
                                                    .lineLimit(3)
                                                Button {
                                                    Task { await sendPulse(to: "global_squad", name: vibe.userName) }
                                                } label: {
                                                    Label("Pulse", systemImage: "bolt.fill")
                                                        .font(.system(size: 10, weight: .black, design: .monospaced))
                                                        .foregroundStyle(Brand.Color.accent)
                                                        .padding(.horizontal, 10)
                                                        .padding(.vertical, 6)
                                                        .background(Brand.Color.accent.opacity(0.15))
                                                        .clipShape(Capsule())
                                                }
                                            }
                                            .frame(width: 220, alignment: .leading)
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
            .padding(.horizontal, 16)
            .padding(.top, 2)
            .padding(.bottom, 20)
        }
    }

    private var friendsListView: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                if loading && connections.isEmpty && challenges.isEmpty {
                    ShimmerCard(height: 130)
                    ShimmerCard(height: 120)
                    ShimmerCard(height: 120)
                }

                if let err = errorMessage {
                    errorBanner(err)
                }

                PremiumSectionHeader(
                    "Social Accountability",
                    eyebrow: "friends and partners",
                    subtitle: "Keep your circle engaged with direct pulses, challenge invites, and visible consistency."
                )

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
                } else {
                    PremiumRowCard {
                        VStack(spacing: 8) {
                            Image(systemName: "person.2.slash")
                                .font(.title3)
                                .foregroundStyle(Brand.Color.muted)
                            Text("No accepted friends yet.")
                                .font(.subheadline.weight(.semibold))
                                .foregroundStyle(Brand.Color.muted)
                            Text("Invite people to build accountability loops and shared streak momentum.")
                                .font(.caption)
                                .foregroundStyle(Brand.Color.muted)
                                .multilineTextAlignment(.center)
                        }
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 10)
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
                                            HapticEngine.notification(.success)
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
                } else {
                    PremiumRowCard {
                        VStack(spacing: 8) {
                            Image(systemName: "flag.slash")
                                .font(.title3)
                                .foregroundStyle(Brand.Color.muted)
                            Text("No active challenges available.")
                                .font(.subheadline.weight(.semibold))
                                .foregroundStyle(Brand.Color.muted)
                        }
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 8)
                    }
                }
            }
            .padding(.horizontal, 16)
            .padding(.top, 2)
            .padding(.bottom, 20)
        }
    }

    private func squadStat(label: String, value: String) -> some View {
        VStack(alignment: .leading, spacing: 3) {
            Text(label.uppercased())
                .font(.system(size: 9, weight: .bold, design: .monospaced))
                .foregroundStyle(Brand.Color.muted)
            Text(value)
                .font(.headline.weight(.black))
                .foregroundStyle(.white)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.horizontal, 10)
        .padding(.vertical, 10)
        .background(
            RoundedRectangle(cornerRadius: 12, style: .continuous)
                .fill(Brand.Color.surfaceRaised.opacity(0.85))
                .overlay(
                    RoundedRectangle(cornerRadius: 12, style: .continuous)
                        .stroke(Brand.Color.borderStrong, lineWidth: 1)
                )
        )
    }

    private func errorBanner(_ err: String) -> some View {
        HStack(spacing: 10) {
            Image(systemName: "exclamationmark.triangle.fill")
                .foregroundStyle(Brand.Color.danger)
            Text(err)
                .font(.caption)
                .foregroundStyle(Brand.Color.danger)
        }
        .padding(14)
        .background(Brand.Color.danger.opacity(0.1))
        .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
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
        errorMessage = nil
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
