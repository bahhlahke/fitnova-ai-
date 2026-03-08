//
//  LoopingVideoPlayerView.swift
//  Koda AI
//
//  A reusable, control-free, looping AVPlayer view for backgrounds.
//

import SwiftUI
import AVKit

struct LoopingVideoPlayerView: UIViewRepresentable {
    let videoURL: URL
    let videoGravity: AVLayerVideoGravity
    
    init(videoURL: URL, videoGravity: AVLayerVideoGravity = .resizeAspectFill) {
        self.videoURL = videoURL
        self.videoGravity = videoGravity
    }
    
    func makeUIView(context: Context) -> UIView {
        return LoopingPlayerUIView(videoURL: videoURL, videoGravity: videoGravity)
    }
    
    func updateUIView(_ uiView: UIView, context: Context) { }
}

class LoopingPlayerUIView: UIView {
    private let playerLayer = AVPlayerLayer()
    private var playerLooper: AVPlayerLooper?
    private var queuePlayer: AVQueuePlayer?
    
    init(videoURL: URL, videoGravity: AVLayerVideoGravity) {
        super.init(frame: .zero)
        
        let playerItem = AVPlayerItem(url: videoURL)
        let queuePlayer = AVQueuePlayer(items: [playerItem])
        queuePlayer.isMuted = true
        self.queuePlayer = queuePlayer
        
        playerLayer.player = queuePlayer
        playerLayer.videoGravity = videoGravity
        layer.addSublayer(playerLayer)
        
        playerLooper = AVPlayerLooper(player: queuePlayer, templateItem: playerItem)
        queuePlayer.play()
    }
    
    override func layoutSubviews() {
        super.layoutSubviews()
        playerLayer.frame = bounds
    }
    
    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }
}
