//
//  SpotifyPlayerView.swift
//  Koda AI
//

import SwiftUI
import AVFoundation

struct SpotifyPlayerView: View {
    @State private var isPlaying = false
    @State private var currentTrack: String = "No track playing"
    @State private var currentArtist: String = ""
    
    // In a real implementation with the Spotify SDK/API this would sync with the actual playback state.
    // For parity with the web's custom UI, we display standard controls.
    
    var body: some View {
        HStack(spacing: 16) {
            Image(systemName: "music.note.list")
                .font(.title2)
                .foregroundColor(.green)
            
            VStack(alignment: .leading, spacing: 2) {
                Text(currentTrack)
                    .font(.subheadline)
                    .fontWeight(.bold)
                    .lineLimit(1)
                if !currentArtist.isEmpty {
                    Text(currentArtist)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .lineLimit(1)
                }
            }
            
            Spacer()
            
            Button(action: previousTrack) {
                Image(systemName: "backward.fill")
                    .foregroundColor(.primary)
            }
            
            Button(action: togglePlayPause) {
                Image(systemName: isPlaying ? "pause.circle.fill" : "play.circle.fill")
                    .font(.title)
                    .foregroundColor(.green)
            }
            
            Button(action: nextTrack) {
                Image(systemName: "forward.fill")
                    .foregroundColor(.primary)
            }
        }
        .padding()
        .background(Color(.systemGray6))
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .onAppear {
            setupAudioSession()
        }
    }
    
    private func setupAudioSession() {
        do {
            // Allows our app's audio (like Coach TTS) to duck background audio (Spotify/Apple Music)
            try AVAudioSession.sharedInstance().setCategory(.playback, options: .duckOthers)
            try AVAudioSession.sharedInstance().setActive(true)
        } catch {
            print("Failed to set audio session category: \(error)")
        }
    }
    
    private func togglePlayPause() {
        isPlaying.toggle()
        // API call to Spotify would go here
    }
    
    private func nextTrack() {
        // API call to Spotify next track
    }
    
    private func previousTrack() {
        // API call to Spotify prev track
    }
}
