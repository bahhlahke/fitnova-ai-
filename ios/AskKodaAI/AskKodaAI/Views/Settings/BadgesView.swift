//
//  BadgesView.swift
//  Koda AI
//
//  Display earned badges; parity with web BadgeCollection.
//

import SwiftUI
import Supabase
import PostgREST

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
    @State private var errorMessage: String?

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                if loading && badges.isEmpty {
                    ShimmerCard(height: 80)
                    ShimmerCard(height: 80)
                    ShimmerCard(height: 80)
                } else if let err = errorMessage {
                    HStack(spacing: 10) {
                        Image(systemName: "exclamationmark.triangle.fill")
                            .foregroundStyle(Brand.Color.danger)
                        Text(err)
                            .font(.caption)
                            .foregroundStyle(Brand.Color.danger)
                    }
                    .padding(14)
                    .background(Brand.Color.danger.opacity(0.1))
                    .clipShape(RoundedRectangle(cornerRadius: 14))
                } else if badges.isEmpty {
                    PremiumRowCard {
                        VStack(spacing: 10) {
                            Image(systemName: "lock.shield")
                                .font(.title)
                                .foregroundStyle(Brand.Color.muted)
                            Text("No badges earned yet.")
                                .font(.subheadline)
                                .foregroundStyle(Brand.Color.muted)
                            Text("Log workouts and hit macro targets to unlock achievements.")
                                .font(.caption)
                                .foregroundStyle(Brand.Color.muted)
                                .multilineTextAlignment(.center)
                        }
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 16)
                    }
                } else {
                    ForEach(Array(badges.enumerated()), id: \.offset) { _, row in
                        badgeCard(row)
                    }
                }
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 20)
        }
        .fnBackground()
        .navigationTitle("Badges")
        .navigationBarTitleDisplayMode(.inline)
        .task { await load() }
        .refreshable { await load() }
    }

    private func badgeCard(_ row: UserBadgeRow) -> some View {
        PremiumRowCard {
            HStack(spacing: 14) {
                // Badge icon — async load or fallback
                ZStack {
                    RoundedRectangle(cornerRadius: 12)
                        .fill(Brand.Color.accent.opacity(0.15))
                        .frame(width: 52, height: 52)

                    if let urlStr = row.badge_definitions?.icon_url,
                       let url = URL(string: urlStr) {
                        AsyncImage(url: url) { phase in
                            switch phase {
                            case .success(let image):
                                image.resizable()
                                    .scaledToFit()
                                    .frame(width: 30, height: 30)
                            default:
                                Image(systemName: "medal.fill")
                                    .font(.title3)
                                    .foregroundStyle(Brand.Color.accent)
                            }
                        }
                    } else {
                        Image(systemName: "medal.fill")
                            .font(.title3)
                            .foregroundStyle(Brand.Color.accent)
                    }
                }

                VStack(alignment: .leading, spacing: 4) {
                    Text(row.badge_definitions?.name ?? "Badge")
                        .font(.headline)
                        .foregroundStyle(.white)
                    if let d = row.badge_definitions?.description, !d.isEmpty {
                        Text(d)
                            .font(.caption)
                            .foregroundStyle(Brand.Color.muted)
                            .lineLimit(2)
                    }
                    if let earnedAt = row.earned_at {
                        Text("Earned \(formattedDate(earnedAt))")
                            .font(.system(size: 10, weight: .medium))
                            .foregroundStyle(Brand.Color.muted)
                            .padding(.top, 2)
                    }
                }
                Spacer()

                Image(systemName: "checkmark.seal.fill")
                    .foregroundStyle(Brand.Color.success)
                    .font(.title3)
            }
        }
    }

    private func formattedDate(_ iso: String) -> String {
        let p = ISO8601DateFormatter()
        guard let d = p.date(from: iso) else { return iso }
        let f = DateFormatter()
        f.dateStyle = .medium
        f.timeStyle = .none
        return f.string(from: d)
    }

    private func load() async {
        guard let uid = auth.currentUserId else { return }
        loading = true
        errorMessage = nil
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
            await MainActor.run { errorMessage = error.localizedDescription }
        }
    }
}
