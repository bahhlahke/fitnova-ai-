//
//  CameraCaptureSession.swift
//  Koda AI
//
//  AVCaptureSession wrapper for body comp scans and motion lab form checks.
//  Manages camera lifecycle, permissions, and photo capture.
//

import AVFoundation
import UIKit

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
    private(set) var previewLayer: AVCaptureVideoPreviewLayer?
    private var continuation: CheckedContinuation<UIImage, Error>?

    // MARK: - Lifecycle

    func startSession(position: AVCaptureDevice.Position = .back) async {
        await requestPermissionIfNeeded()
        guard !permissionDenied else { return }

        session.beginConfiguration()
        session.sessionPreset = .photo

        // Remove existing inputs
        session.inputs.forEach { session.removeInput($0) }

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

        session.commitConfiguration()

        let layer = AVCaptureVideoPreviewLayer(session: session)
        layer.videoGravity = .resizeAspectFill
        previewLayer = layer

        Task.detached(priority: .userInitiated) { [weak self] in
            self?.session.startRunning()
            await MainActor.run { self?.isRunning = true }
        }
    }

    func stopSession() {
        Task.detached(priority: .background) { [weak self] in
            self?.session.stopRunning()
            await MainActor.run { self?.isRunning = false }
        }
    }

    // MARK: - Capture

    /// Captures a single photo and returns a UIImage.
    func capturePhoto() async throws -> UIImage {
        guard isRunning else { throw CameraError.notAvailable }
        return try await withCheckedThrowingContinuation { [weak self] cont in
            self?.continuation = cont
            let settings = AVCapturePhotoSettings()
            settings.flashMode = .auto
            self?.output.capturePhoto(with: settings, delegate: self ?? EmptyDelegate())
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

/// Fallback delegate used when self is deallocated before capture completes.
private final class EmptyDelegate: NSObject, AVCapturePhotoCaptureDelegate {}
