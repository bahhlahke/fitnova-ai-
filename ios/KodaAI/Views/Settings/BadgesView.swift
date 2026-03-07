//
//  BadgesView.swift
//  Koda AI
//
//  Display earned badges; parity with web BadgeCollection.
//

import SwiftUI

struct UserBadgeRow: Decodable {
    var earned_at: String?
    var badge_definitions: BadgeDefinition?
}

struct BadgeDefinition: Decodable {
    var name: String?
    var description: String?
    var icon_url: String?
}

struct BadgesView: View {
    @EnvironmentObject var auth: SupabaseService
    @State private var badges: [UserBadgeRow] = []
    @State private var loading = false

    var body: some View {
        Group {
            if loading && badges.isEmpty {
                ProgressView("Loading…")
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 40)
            } else if badges.isEmpty {
                VStack(spacing: 8) {
                    Text("No trophies yet")
                        .font(.subheadline)
                        .fontWeight(.semibold)
                    Text("Log workouts and hit your macro targets to earn badges.")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .multilineTextAlignment(.center)
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 40)
            } else {
                List {
                    ForEach(Array(badges.enumerated()), id: \.offset) { _, row in
                        HStack(spacing: 12) {
                            Image(systemName: "medal.fill")
                                .foregroundStyle(.yellow)
                            VStack(alignment: .leading, spacing: 2) {
                                Text(row.badge_definitions?.name ?? "Badge")
                                    .font(.subheadline)
                                    .fontWeight(.medium)
                                if let d = row.badge_definitions?.description, !d.isEmpty {
                                    Text(d)
                                        .font(.caption)
                                        .foregroundStyle(.secondary)
                                }
                            }
                            Spacer()
                        }
                        .padding(.vertical, 4)
                    }
                }
            }
        }
        .navigationTitle("Badges")
        .task { await load() }
        .refreshable { await load() }
    }

    private func load() async {
        guard let uid = auth.currentUserId else { return }
        loading = true
        defer { loading = false }
        do {
            let rows: [UserBadgeRow] = try await auth.supabaseClient
                .from("user_badges")
                .select("earned_at, badge_definitions(name, description, icon_url)")
                .eq("user_id", value: uid)
                .order("earned_at", ascending: false)
                .execute()
                .value
            await MainActor.run { badges = rows }
        } catch {
            await MainActor.run { badges = [] }
        }
    }
}
