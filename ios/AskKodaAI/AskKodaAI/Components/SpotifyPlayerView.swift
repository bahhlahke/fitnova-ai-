//
//  SpotifyPlayerView.swift
//  Koda AI
//

import SwiftUI

struct SpotifyPlayerView: View {
    @EnvironmentObject var auth: SupabaseService
    @StateObject private var spotify = SpotifyService.shared

    var compact = false

    var body: some View {
        Group {
            if compact {
                compactPlayer
            } else {
                fullPlayer
            }
        }
        .onAppear {
            Task { await spotify.refresh(using: auth) }
        }
        .onReceive(NotificationCenter.default.publisher(for: NSNotification.Name("AppEnteredForeground"))) { _ in
            Task { await spotify.refresh(using: auth) }
        }
    }

    private var compactPlayer: some View {
        HStack(spacing: 10) {
            Image(systemName: "music.note")
                .font(.caption)
                .foregroundStyle(.green)

            VStack(alignment: .leading, spacing: 1) {
                Text(spotify.currentTrack)
                    .font(.caption2.weight(.semibold))
                    .lineLimit(1)
                Text(compactStatusText)
                    .font(.caption2)
                    .foregroundStyle(.secondary)
                    .lineLimit(1)
            }

            Spacer(minLength: 6)

            Button {
                Task { await spotify.togglePlayback(using: auth) }
            } label: {
                Image(systemName: spotify.isPlaying ? "pause.fill" : "play.fill")
                    .font(.caption)
            }
            .disabled(!spotify.isConnected || spotify.isLoading)
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 8)
        .background(Color.white.opacity(0.08))
        .overlay(
            RoundedRectangle(cornerRadius: 999)
                .stroke(Color.white.opacity(0.12), lineWidth: 1)
        )
        .clipShape(Capsule())
    }

    private var fullPlayer: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(spacing: 14) {
                Image(systemName: spotify.isConnected ? "music.note.list" : "link.badge.plus")
                    .font(.title3)
                    .foregroundStyle(.green)

                VStack(alignment: .leading, spacing: 2) {
                    Text(spotify.currentTrack)
                        .font(.subheadline.weight(.bold))
                        .lineLimit(1)
                    Text(spotify.currentArtist)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .lineLimit(2)
                }

                Spacer()
            }

            if let device = spotify.activeDeviceName, !device.isEmpty {
                Text("Active device: \(device)")
                    .font(.caption2)
                    .foregroundStyle(.secondary)
            }

            HStack(spacing: 18) {
                Button {
                    Task { await spotify.previousTrack(using: auth) }
                } label: {
                    Image(systemName: "backward.fill")
                }
                .disabled(!spotify.isConnected || spotify.isLoading)

                Button {
                    Task { await spotify.togglePlayback(using: auth) }
                } label: {
                    Image(systemName: spotify.isPlaying ? "pause.circle.fill" : "play.circle.fill")
                        .font(.title)
                }
                .disabled(!spotify.isConnected || spotify.isLoading)

                Button {
                    Task { await spotify.nextTrack(using: auth) }
                } label: {
                    Image(systemName: "forward.fill")
                }
                .disabled(!spotify.isConnected || spotify.isLoading)

                Spacer()

                if spotify.isLoading {
                    ProgressView()
                        .scaleEffect(0.8)
                }
            }

            if let error = spotify.errorMessage {
                Text(error)
                    .font(.caption2)
                    .foregroundStyle(.secondary)
            }
        }
        .padding()
        .background(Color(.systemGray6))
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }

    private var compactStatusText: String {
        if spotify.isLoading {
            return "Syncing playback…"
        }
        if spotify.isConnected {
            return spotify.currentArtist
        }
        return "Connect in Integrations"
    }
}
