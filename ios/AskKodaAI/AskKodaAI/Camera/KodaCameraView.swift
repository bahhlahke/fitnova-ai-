//
//  KodaCameraView.swift
//  Koda AI
//
//  Full-screen camera capture view with optional body-scan overlay.
//  Used by BodyCompScanView and MotionLabView.
//

import SwiftUI
import AVFoundation

struct KodaCameraView: View {
    /// Called with the captured UIImage on success.
    var onCapture: (UIImage) -> Void
    /// When true, shows a body silhouette alignment guide.
    var showBodyOverlay: Bool = false
    /// Label shown at the bottom of the overlay (e.g. "FRONT VIEW").
    var overlayLabel: String = ""

    @StateObject private var cameraSession = CameraCaptureSession()
    @Environment(\.dismiss) private var dismiss
    @State private var capturing = false

    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()

            if cameraSession.permissionDenied {
                permissionDeniedView
            } else {
                // Live preview
                CameraPreviewLayer(cameraSession: cameraSession)
                    .ignoresSafeArea()

                // Body scan overlay
                if showBodyOverlay {
                    BodyScanOverlayView(label: overlayLabel)
                }

                // Controls
                VStack {
                    // Top bar
                    HStack {
                        Button {
                            cameraSession.stopSession()
                            dismiss()
                        } label: {
                            Image(systemName: "xmark")
                                .font(.title2.bold())
                                .foregroundStyle(.white)
                                .padding(14)
                                .background(Color.black.opacity(0.5))
                                .clipShape(Circle())
                        }
                        Spacer()
                    }
                    .padding(.horizontal, 20)
                    .padding(.top, 8)

                    Spacer()

                    // Shutter button
                    Button {
                        capturePhoto()
                    } label: {
                        ZStack {
                            Circle()
                                .fill(Color.white)
                                .frame(width: 70, height: 70)
                            Circle()
                                .stroke(Color.white, lineWidth: 3)
                                .frame(width: 84, height: 84)
                            if capturing {
                                ProgressView()
                                    .tint(.black)
                                    .scaleEffect(1.4)
                            }
                        }
                    }
                    .disabled(capturing || !cameraSession.isRunning)
                    .padding(.bottom, 48)
                }
            }
        }
        .task {
            await cameraSession.startSession()
        }
        .onDisappear {
            cameraSession.stopSession()
        }
    }

    // MARK: - Capture

    private func capturePhoto() {
        capturing = true
        HapticEngine.impact(.medium)
        Task {
            do {
                let image = try await cameraSession.capturePhoto()
                await MainActor.run {
                    capturing = false
                    HapticEngine.notification(.success)
                    onCapture(image)
                    dismiss()
                }
            } catch {
                await MainActor.run { capturing = false }
            }
        }
    }

    // MARK: - Permission denied fallback

    private var permissionDeniedView: some View {
        VStack(spacing: 20) {
            Image(systemName: "camera.fill")
                .font(.system(size: 48))
                .foregroundStyle(Brand.Color.muted)
            Text("Camera access required")
                .font(.title2.bold())
                .foregroundStyle(.white)
            Text("Enable camera access in Settings to capture photos for your scan.")
                .font(.subheadline)
                .foregroundStyle(Brand.Color.muted)
                .multilineTextAlignment(.center)
                .padding(.horizontal)
            Button("Open Settings") {
                if let url = URL(string: UIApplication.openSettingsURLString) {
                    UIApplication.shared.open(url)
                }
            }
            .buttonStyle(PremiumActionButtonStyle())
            .padding(.horizontal)
        }
    }
}

// MARK: - Body Scan Overlay

struct BodyScanOverlayView: View {
    let label: String
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var borderPulse: CGFloat = 1.0

    var body: some View {
        ZStack {
            // Silhouette guide
            Image(systemName: "person.fill")
                .font(.system(size: 200))
                .foregroundStyle(.white.opacity(0.10))
                .offset(y: 20)

            // Dashed border guide
            RoundedRectangle(cornerRadius: 40, style: .continuous)
                .stroke(
                    Brand.Color.accent.opacity(0.55),
                    style: StrokeStyle(lineWidth: 2, dash: [14, 8])
                )
                .scaleEffect(borderPulse)
                .padding(20)
                .onAppear {
                    guard !reduceMotion else { return }
                    withAnimation(.easeInOut(duration: 2).repeatForever(autoreverses: true)) {
                        borderPulse = 1.02
                    }
                }

            // Instruction label
            VStack {
                Spacer()
                Text("\(label.uppercased()) — STEP BACK 2M · FULL BODY VISIBLE")
                    .font(.system(size: 11, weight: .bold, design: .monospaced))
                    .tracking(0.8)
                    .foregroundStyle(Brand.Color.accent)
                    .padding(.vertical, 8)
                    .padding(.horizontal, 16)
                    .background(Color.black.opacity(0.65))
                    .clipShape(Capsule())
                    .padding(.bottom, 130)
            }
        }
    }
}
