//
//  CameraCaptureSession.swift
//  Koda AI
//
//  AVCaptureSession wrapper for body comp scans and motion lab form checks.
//  Manages camera lifecycle, permissions, and photo capture.
//

@preconcurrency import AVFoundation
import UIKit
import Combine
import CoreVideo

enum CameraError: LocalizedError {
    case notAvailable
    case permissionDenied
    case captureDataMissing
    case sessionSetupFailed

    var errorDescription: String? {
        switch self {
        case .notAvailable:      return "Camera is not available on this device."
        case .permissionDenied:  return "Camera access was denied. Please enable it in Settings."
        case .captureDataMissing: return "Could not process the captured photo."
        case .sessionSetupFailed: return "Failed to configure the camera session."
        }
    }
}

@MainActor
final class CameraCaptureSession: NSObject, ObservableObject {
    @Published private(set) var isRunning = false
    @Published private(set) var permissionDenied = false
    @Published private(set) var capturedImage: UIImage?
    @Published private(set) var error: CameraError?

    private let session = AVCaptureSession()
    private let output = AVCapturePhotoOutput()
    private let videoOutput = AVCaptureVideoDataOutput()
    private let sessionQueue = DispatchQueue(label: "ai.koda.camera.session")
    private let videoOutputQueue = DispatchQueue(label: "ai.koda.camera.video-output")
    private let videoProxy = CameraVideoFrameProxy()
    private(set) var previewLayer: AVCaptureVideoPreviewLayer?
    private var continuation: CheckedContinuation<UIImage, Error>?

    // MARK: - Lifecycle

    func startSession(position: AVCaptureDevice.Position = .back, enableVideoFrames: Bool = false) async {
        await requestPermissionIfNeeded()
        guard !permissionDenied else { return }

        session.beginConfiguration()
        session.sessionPreset = enableVideoFrames ? .high : .photo

        // Remove existing inputs
        session.inputs.forEach { session.removeInput($0) }
        session.outputs.forEach { session.removeOutput($0) }

        guard let device = AVCaptureDevice.default(.builtInWideAngleCamera,
                                                    for: .video,
                                                    position: position),
              let input = try? AVCaptureDeviceInput(device: device) else {
            error = .sessionSetupFailed
            session.commitConfiguration()
            return
        }

        if session.canAddInput(input) { session.addInput(input) }
        if session.canAddOutput(output) { session.addOutput(output) }
        output.maxPhotoQualityPrioritization = .quality

        if enableVideoFrames {
            if session.canAddOutput(videoOutput) {
                session.addOutput(videoOutput)
                videoOutput.alwaysDiscardsLateVideoFrames = true
                videoOutput.videoSettings = [
                    kCVPixelBufferPixelFormatTypeKey as String: Int(kCVPixelFormatType_32BGRA),
                ]
                videoOutput.setSampleBufferDelegate(videoProxy, queue: videoOutputQueue)
            }

            if let videoConnection = videoOutput.connection(with: .video) {
                if #available(iOS 17.0, *) {
                    if videoConnection.isVideoRotationAngleSupported(90) {
                        videoConnection.videoRotationAngle = 90
                    }
                } else if videoConnection.isVideoOrientationSupported {
                    videoConnection.videoOrientation = .portrait
                }
            }
        } else {
            videoOutput.setSampleBufferDelegate(nil, queue: nil)
        }

        session.commitConfiguration()

        let layer = AVCaptureVideoPreviewLayer(session: session)
        layer.videoGravity = .resizeAspectFill
        previewLayer = layer

        sessionQueue.async { [session] in
            session.startRunning()
            DispatchQueue.main.async {
                self.isRunning = true
            }
        }
    }

    func stopSession() {
        videoProxy.onFrame = nil
        sessionQueue.async { [session] in
            session.stopRunning()
            DispatchQueue.main.async {
                self.isRunning = false
            }
        }
    }

    func setVideoFrameHandler(_ handler: ((CMSampleBuffer) -> Void)?) {
        videoProxy.onFrame = handler
    }

    // MARK: - Capture

    /// Captures a single photo and returns a UIImage.
    func capturePhoto() async throws -> UIImage {
        guard isRunning else { throw CameraError.notAvailable }
        return try await withCheckedThrowingContinuation { [weak self] cont in
            guard let self else {
                cont.resume(throwing: CameraError.notAvailable)
                return
            }

            self.continuation = cont
            let settings = AVCapturePhotoSettings()
            settings.flashMode = .auto
            self.output.capturePhoto(with: settings, delegate: self)
        }
    }

    // MARK: - Permissions

    private func requestPermissionIfNeeded() async {
        let status = AVCaptureDevice.authorizationStatus(for: .video)
        switch status {
        case .notDetermined:
            let granted = await AVCaptureDevice.requestAccess(for: .video)
            permissionDenied = !granted
        case .denied, .restricted:
            permissionDenied = true
        default:
            break
        }
    }
}

// MARK: - AVCapturePhotoCaptureDelegate

extension CameraCaptureSession: AVCapturePhotoCaptureDelegate {
    nonisolated func photoOutput(_ output: AVCapturePhotoOutput,
                                  didFinishProcessingPhoto photo: AVCapturePhoto,
                                  error: Error?) {
        if let error {
            Task { @MainActor in self.continuation?.resume(throwing: error); self.continuation = nil }
            return
        }
        guard let data = photo.fileDataRepresentation(),
              let image = UIImage(data: data) else {
            Task { @MainActor in
                self.continuation?.resume(throwing: CameraError.captureDataMissing)
                self.continuation = nil
            }
            return
        }
        Task { @MainActor in
            self.capturedImage = image
            self.continuation?.resume(returning: image)
            self.continuation = nil
        }
    }
}

private final class CameraVideoFrameProxy: NSObject, AVCaptureVideoDataOutputSampleBufferDelegate {
    var onFrame: ((CMSampleBuffer) -> Void)?

    func captureOutput(_ output: AVCaptureOutput, didOutput sampleBuffer: CMSampleBuffer, from connection: AVCaptureConnection) {
        onFrame?(sampleBuffer)
    }
}
