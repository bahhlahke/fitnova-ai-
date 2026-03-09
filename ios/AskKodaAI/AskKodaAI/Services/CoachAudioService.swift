//
//  CoachAudioService.swift
//  Koda AI
//
//  Guided workout coach voice powered by the shared OpenAI TTS endpoint.
//

import Foundation
import AVFoundation
import Combine

@MainActor
final class CoachAudioService: NSObject, ObservableObject {
    enum CueContext: String {
        case startWorkout = "start_workout"
        case startSet = "start_set"
        case finishSet = "finish_set"
        case finishWorkout = "finish_workout"
    }

    static let shared = CoachAudioService()

    @Published private(set) var isEnabled = true
    @Published private(set) var isSpeaking = false

    private let synthesizer = AVSpeechSynthesizer()
    private var audioPlayer: AVAudioPlayer?
    private var playbackTask: Task<Void, Never>?

    private override init() {
        super.init()
        synthesizer.delegate = self
    }

    func toggle() {
        isEnabled.toggle()
        if !isEnabled {
            stop()
        }
    }

    func playCue(_ cue: CueContext, metrics: [String: Any]? = nil, fallbackText: String) {
        playCue(cue, metrics: metrics, details: nil, fallbackText: fallbackText)
    }

    func playCue(_ cue: CueContext, metrics: [String: Any]? = nil, details: [String: Any]?, fallbackText: String) {
        guard isEnabled else { return }
        guard !fallbackText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else { return }

        stopPlayback(cancelTask: true)

        playbackTask = Task { @MainActor in
            await requestAndPlay(cue: cue, metrics: metrics, details: details, fallbackText: fallbackText)
        }
    }

    func stop() {
        stopPlayback(cancelTask: true)
    }

    private func requestAndPlay(cue: CueContext, metrics: [String: Any]?, details: [String: Any]?, fallbackText: String) async {
        do {
            try configureAudioSession()

            guard let token = SupabaseService.shared.accessToken, !token.isEmpty else {
                playFallbackSpeech(fallbackText)
                return
            }

            guard let url = URL(string: "api/v1/coach/audio", relativeTo: AppConfig.apiBaseURL)?.absoluteURL else {
                playFallbackSpeech(fallbackText)
                return
            }

            var request = URLRequest(url: url)
            request.httpMethod = "POST"
            request.timeoutInterval = 30
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
            request.setValue("application/json", forHTTPHeaderField: "Accept")
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
            var payload: [String: Any] = [
                "context": cue.rawValue,
                "metrics": metrics ?? [:],
            ]
            if let details {
                payload["details"] = details
            }
            request.httpBody = try JSONSerialization.data(withJSONObject: payload)

            let (data, response) = try await URLSession.shared.data(for: request)
            guard !Task.isCancelled else { return }

            let contentType = (response as? HTTPURLResponse)?
                .value(forHTTPHeaderField: "Content-Type")?
                .lowercased() ?? ""

            if contentType.contains("audio") {
                try playAudioData(data)
                return
            }

            let script = try? JSONDecoder().decode(CoachAudioScriptResponse.self, from: data)
            playFallbackSpeech(script?.script ?? fallbackText)
        } catch {
            guard !Task.isCancelled else { return }
            playFallbackSpeech(fallbackText)
        }
    }

    private func configureAudioSession() throws {
        let session = AVAudioSession.sharedInstance()
        try session.setCategory(.playback, mode: .spokenAudio, options: [.duckOthers])
        try session.setActive(true, options: [])
    }

    private func playAudioData(_ data: Data) throws {
        audioPlayer = try AVAudioPlayer(data: data)
        audioPlayer?.delegate = self
        audioPlayer?.prepareToPlay()
        isSpeaking = true

        if audioPlayer?.play() != true {
            throw CoachAudioError.playbackFailed
        }
    }

    private func playFallbackSpeech(_ text: String) {
        guard !text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
            finishPlayback()
            return
        }

        let utterance = AVSpeechUtterance(string: text)
        utterance.voice = AVSpeechSynthesisVoice(language: "en-US")
        utterance.rate = 0.48
        utterance.pitchMultiplier = 1.02
        utterance.preUtteranceDelay = 0.05
        utterance.postUtteranceDelay = 0.05
        synthesizer.speak(utterance)
    }

    private func stopPlayback(cancelTask: Bool) {
        if cancelTask {
            playbackTask?.cancel()
            playbackTask = nil
        }

        audioPlayer?.stop()
        audioPlayer = nil

        if synthesizer.isSpeaking {
            synthesizer.stopSpeaking(at: .immediate)
        }

        finishPlayback()
    }

    private func finishPlayback() {
        isSpeaking = false
        try? AVAudioSession.sharedInstance().setActive(false, options: [.notifyOthersOnDeactivation])
    }
}

extension CoachAudioService: AVSpeechSynthesizerDelegate {
    nonisolated func speechSynthesizer(_ synthesizer: AVSpeechSynthesizer, didStart utterance: AVSpeechUtterance) {
        Task { @MainActor in
            self.isSpeaking = true
        }
    }

    nonisolated func speechSynthesizer(_ synthesizer: AVSpeechSynthesizer, didFinish utterance: AVSpeechUtterance) {
        Task { @MainActor in
            self.finishPlayback()
        }
    }

    nonisolated func speechSynthesizer(_ synthesizer: AVSpeechSynthesizer, didCancel utterance: AVSpeechUtterance) {
        Task { @MainActor in
            self.finishPlayback()
        }
    }
}

extension CoachAudioService: AVAudioPlayerDelegate {
    nonisolated func audioPlayerDidFinishPlaying(_ player: AVAudioPlayer, successfully flag: Bool) {
        Task { @MainActor in
            self.audioPlayer = nil
            self.finishPlayback()
        }
    }

    nonisolated func audioPlayerDecodeErrorDidOccur(_ player: AVAudioPlayer, error: Error?) {
        Task { @MainActor in
            self.audioPlayer = nil
            self.finishPlayback()
        }
    }
}

private struct CoachAudioScriptResponse: Decodable {
    let success: Bool?
    let script: String?
}

private enum CoachAudioError: Error {
    case playbackFailed
}
