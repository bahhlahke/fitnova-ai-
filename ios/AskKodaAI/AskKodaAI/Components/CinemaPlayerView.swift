//
//  CinemaPlayerView.swift
//  Koda AI
//
//  Elite Masterclass Video Player.
//  Optimized for high-bitrate cinema loops with seamless transitions.
//

import SwiftUI
import AVKit

struct CinemaPlayerView: UIViewRepresentable {
    let videoURL: URL
    let videoGravity: AVLayerVideoGravity = .resizeAspectFill
    
    func makeUIView(context: Context) -> CinemaPlayerUIView {
        return CinemaPlayerUIView(videoURL: videoURL, videoGravity: videoGravity)
    }
    
    func updateUIView(_ uiView: CinemaPlayerUIView, context: Context) {
        if uiView.currentURL != videoURL {
            uiView.updateVideo(url: videoURL)
        }
    }
}

class CinemaPlayerUIView: UIView {
    private let playerLayer = AVPlayerLayer()
    private var playerLooper: AVPlayerLooper?
    private var queuePlayer: AVQueuePlayer?
    var currentURL: URL?

    init(videoURL: URL, videoGravity: AVLayerVideoGravity) {
        self.currentURL = videoURL
        super.init(frame: .zero)
        setupPlayer(url: videoURL, gravity: videoGravity)
    }

    private func setupPlayer(url: URL, gravity: AVLayerVideoGravity) {
        let playerItem = AVPlayerItem(url: url)
        let queuePlayer = AVQueuePlayer(items: [playerItem])
        queuePlayer.isMuted = true
        queuePlayer.preventsDisplaySleepDuringVideoPlayback = false
        self.queuePlayer = queuePlayer
        
        playerLayer.player = queuePlayer
        playerLayer.videoGravity = gravity
        layer.addSublayer(playerLayer)
        
        playerLooper = AVPlayerLooper(player: queuePlayer, templateItem: playerItem)
        queuePlayer.play()
    }

    func updateVideo(url: URL) {
        self.currentURL = url
        queuePlayer?.pause()
        
        let playerItem = AVPlayerItem(url: url)
        let newQueuePlayer = AVQueuePlayer(items: [playerItem])
        newQueuePlayer.isMuted = true
        
        self.queuePlayer = newQueuePlayer
        playerLayer.player = newQueuePlayer
        playerLooper = AVPlayerLooper(player: newQueuePlayer, templateItem: playerItem)
        newQueuePlayer.play()
    }

    override func layoutSubviews() {
        super.layoutSubviews()
        playerLayer.frame = bounds
    }

    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }
}
