//
//  CameraPreviewLayer.swift
//  Koda AI
//
//  UIViewRepresentable that renders a live AVCaptureVideoPreviewLayer.
//

import SwiftUI
import AVFoundation

struct CameraPreviewLayer: UIViewRepresentable {
    @ObservedObject var cameraSession: CameraCaptureSession

    func makeUIView(context: Context) -> PreviewUIView {
        PreviewUIView()
    }

    func updateUIView(_ uiView: PreviewUIView, context: Context) {
        if let layer = cameraSession.previewLayer {
            uiView.setPreviewLayer(layer)
        }
    }

    // MARK: - UIView subclass

    final class PreviewUIView: UIView {
        private var previewLayer: AVCaptureVideoPreviewLayer?

        func setPreviewLayer(_ layer: AVCaptureVideoPreviewLayer) {
            guard previewLayer !== layer else { return }
            previewLayer?.removeFromSuperlayer()
            layer.frame = bounds
            self.layer.insertSublayer(layer, at: 0)
            previewLayer = layer
        }

        override func layoutSubviews() {
            super.layoutSubviews()
            previewLayer?.frame = bounds
        }
    }
}
