//
//  SpotifyService.swift
//  Koda AI
//
//  Native Spotify control surface backed by the user's Supabase OAuth provider token.
//

import Foundation
import Combine

@MainActor
final class SpotifyService: ObservableObject {
    static let shared = SpotifyService()

    static let requiredScopes = [
        "user-read-playback-state",
        "user-modify-playback-state",
        "user-read-currently-playing"
    ].joined(separator: " ")

    @Published private(set) var isConnected = false
    @Published private(set) var isLoading = false
    @Published private(set) var isPlaying = false
    @Published private(set) var currentTrack = "Spotify not connected"
    @Published private(set) var currentArtist = "Connect Spotify in Integrations."
    @Published private(set) var activeDeviceName: String?
    @Published private(set) var errorMessage: String?
    private let api = KodaAPIService(getAccessToken: { SupabaseService.shared.accessToken })

    private init() {}

    func refresh(using auth: SupabaseService) async {
        guard let token = await resolveSpotifyAccessToken(using: auth) else {
            applyDisconnectedState()
            return
        }

        isConnected = true
        isLoading = true
        defer { isLoading = false }

        do {
            let state: SpotifyPlaybackState? = try await request(
                token: token,
                path: "/me/player",
                method: "GET",
                expecting: SpotifyPlaybackState?.self
            )

            if let state {
                applyPlaybackState(state)
            } else {
                applyIdleConnectedState()
            }
        } catch {
            errorMessage = error.localizedDescription
            if let spotifyError = error as? SpotifyServiceError, spotifyError == .noActiveDevice {
                applyIdleConnectedState()
            }
        }
    }

    func togglePlayback(using auth: SupabaseService) async {
        if isPlaying {
            await sendCommand(using: auth, path: "/me/player/pause")
        } else {
            await sendCommand(using: auth, path: "/me/player/play")
        }
        await refresh(using: auth)
    }

    func nextTrack(using auth: SupabaseService) async {
        await sendCommand(using: auth, path: "/me/player/next")
        await refresh(using: auth)
    }

    func previousTrack(using auth: SupabaseService) async {
        await sendCommand(using: auth, path: "/me/player/previous")
        await refresh(using: auth)
    }

    private func sendCommand(using auth: SupabaseService, path: String) async {
        guard let token = await resolveSpotifyAccessToken(using: auth) else {
            applyDisconnectedState()
            return
        }

        isLoading = true
        defer { isLoading = false }

        do {
            _ = try await request(token: token, path: path, method: "POST", expecting: EmptySpotifyResponse.self)
            errorMessage = nil
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    private func request<T: Decodable>(
        token: String,
        path: String,
        method: String,
        expecting: T.Type
    ) async throws -> T {
        guard let url = URL(string: "https://api.spotify.com/v1\(path)") else {
            throw SpotifyServiceError.invalidURL
        }

        var request = URLRequest(url: url)
        request.httpMethod = method
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        request.timeoutInterval = 20

        let (data, response) = try await URLSession.shared.data(for: request)
        guard let http = response as? HTTPURLResponse else {
            throw SpotifyServiceError.invalidResponse
        }

        switch http.statusCode {
        case 200:
            return try JSONDecoder().decode(T.self, from: data)
        case 202, 204:
            if expecting == EmptySpotifyResponse.self {
                return EmptySpotifyResponse() as! T
            }
            if expecting == Optional<SpotifyPlaybackState>.self {
                return (nil as SpotifyPlaybackState?) as! T
            }
            throw SpotifyServiceError.invalidResponse
        case 401:
            throw SpotifyServiceError.unauthorized
        case 404:
            throw SpotifyServiceError.noActiveDevice
        default:
            let message = (try? JSONDecoder().decode(SpotifyAPIErrorEnvelope.self, from: data).error.message)
                ?? HTTPURLResponse.localizedString(forStatusCode: http.statusCode)
            throw SpotifyServiceError.api(message)
        }
    }

    private func applyPlaybackState(_ state: SpotifyPlaybackState) {
        isConnected = true
        isPlaying = state.is_playing ?? false
        activeDeviceName = state.device?.name
        currentTrack = state.item?.name ?? "Spotify connected"
        currentArtist = state.item?.artists?.compactMap(\.name).joined(separator: ", ")
            ?? "Select something in Spotify to begin."
        errorMessage = nil
    }

    private func applyIdleConnectedState() {
        isConnected = true
        isPlaying = false
        activeDeviceName = nil
        currentTrack = "Spotify connected"
        currentArtist = "Open Spotify on a device to control playback."
        errorMessage = nil
    }

    private func applyDisconnectedState() {
        isConnected = false
        isPlaying = false
        activeDeviceName = nil
        currentTrack = "Spotify not connected"
        currentArtist = "Connect Spotify in Integrations."
        errorMessage = nil
    }

    private func resolveSpotifyAccessToken(using auth: SupabaseService) async -> String? {
        if let providerToken = auth.providerAccessToken, !providerToken.isEmpty {
            return providerToken
        }

        do {
            let response = try await api.spotifyToken()
            return response.access_token
        } catch {
            errorMessage = error.localizedDescription
            return nil
        }
    }
}

private enum SpotifyServiceError: LocalizedError, Equatable {
    case invalidURL
    case invalidResponse
    case unauthorized
    case noActiveDevice
    case api(String)

    var errorDescription: String? {
        switch self {
        case .invalidURL:
            return "Spotify URL could not be created."
        case .invalidResponse:
            return "Spotify returned an invalid response."
        case .unauthorized:
            return "Spotify authorization expired. Reconnect Spotify from Integrations."
        case .noActiveDevice:
            return "Open Spotify on a phone, computer, or speaker to enable playback control."
        case .api(let message):
            return message
        }
    }
}

private struct EmptySpotifyResponse: Decodable {
    init() {}
}

private struct SpotifyPlaybackState: Decodable {
    let is_playing: Bool?
    let device: SpotifyDevice?
    let item: SpotifyTrack?
}

private struct SpotifyDevice: Decodable {
    let name: String?
}

private struct SpotifyTrack: Decodable {
    let name: String?
    let artists: [SpotifyArtist]?
}

private struct SpotifyArtist: Decodable {
    let name: String?
}

private struct SpotifyAPIErrorEnvelope: Decodable {
    let error: SpotifyAPIErrorBody
}

private struct SpotifyAPIErrorBody: Decodable {
    let message: String
}
