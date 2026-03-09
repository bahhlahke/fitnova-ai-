//
//  BodyCompScanView.swift
//  Koda AI
//
//  Body composition scan: live-camera capture for front/side/back, call API, save to progress.
//

import SwiftUI
import PhotosUI

struct BodyCompScanView: View {
    @EnvironmentObject var auth: SupabaseService
    @State private var images: (front: UIImage?, side: UIImage?, back: UIImage?) = (nil, nil, nil)
    @State private var activeSlot: String? = nil
    @State private var showCamera = false
    @State private var isScanning = false
    @State private var result: BodyCompResponse?
    @State private var errorMessage: String?

    // Photo library fallback
    @State private var showPhotoPicker = false
    @State private var selectedItems: [PhotosPickerItem] = []

    private var api: KodaAPIService {
        KodaAPIService(getAccessToken: { auth.accessToken })
    }

    private var dataService: KodaDataService? {
        guard let uid = auth.currentUserId else { return nil }
        return KodaDataService(client: auth.supabaseClient, userId: uid)
    }

    private var allCaptured: Bool {
        images.front != nil && images.side != nil && images.back != nil
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                PremiumSectionHeader(
                    "Body composition scan",
                    eyebrow: "Scan",
                    subtitle: "Capture front, side, and back photos with the guided camera. Then run the AI analysis."
                )

                // Capture slots
                HStack(spacing: 12) {
                    slotButton("Front", image: images.front)
                    slotButton("Side", image: images.side)
                    slotButton("Back", image: images.back)
                }

                // Library fallback option
                HStack {
                    Spacer()
                    PhotosPicker(selection: $selectedItems, maxSelectionCount: 1, matching: .images) {
                        HStack(spacing: 6) {
                            Image(systemName: "photo.on.rectangle")
                                .font(.caption)
                            Text("Use photo library for \(activeSlot ?? "slot")")
                                .font(.caption)
                        }
                        .foregroundStyle(Brand.Color.muted)
                    }
                    .onChange(of: selectedItems) { _, newItems in
                        Task { await handleLibrarySelection(newItems) }
                    }
                    Spacer()
                }

                if let err = errorMessage {
                    Text(err)
                        .font(.caption)
                        .foregroundStyle(Brand.Color.danger)
                        .padding(.horizontal, 4)
                }

                if let r = result {
                    resultCard(r)
                }

                Button(action: runScan) {
                    if isScanning {
                        HStack(spacing: 10) {
                            ProgressView().tint(.black)
                            Text("Analysing…")
                        }
                        .frame(maxWidth: .infinity)
                    } else {
                        Text(allCaptured ? "Run body comp scan" : "Capture all 3 photos to scan")
                            .frame(maxWidth: .infinity)
                    }
                }
                .disabled(isScanning || !allCaptured)
                .buttonStyle(PremiumActionButtonStyle(filled: allCaptured))
            }
            .padding(20)
        }
        .background { Brand.Color.background.ignoresSafeArea() }
        .navigationTitle("Body comp scan")
        .navigationBarTitleDisplayMode(.inline)
        .fullScreenCover(isPresented: $showCamera) {
            if let slot = activeSlot {
                KodaCameraView(
                    onCapture: { image in setImage(image, for: slot) },
                    showBodyOverlay: true,
                    overlayLabel: slot
                )
            }
        }
    }

    // MARK: - Slot button

    private func slotButton(_ label: String, image: UIImage?) -> some View {
        Button {
            activeSlot = label
            HapticEngine.impact(.light)
            showCamera = true
        } label: {
            VStack(spacing: 10) {
                if let img = image {
                    Image(uiImage: img)
                        .resizable()
                        .scaledToFill()
                        .frame(width: 60, height: 80)
                        .clipShape(RoundedRectangle(cornerRadius: 10))
                    Image(systemName: "checkmark.circle.fill")
                        .foregroundStyle(Brand.Color.success)
                        .font(.caption)
                } else {
                    Image(systemName: "camera.fill")
                        .font(.system(size: 24))
                        .foregroundStyle(Brand.Color.accent)
                    Text(label)
                        .font(.caption.bold())
                        .foregroundStyle(.white)
                }
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 20)
            .background(
                RoundedRectangle(cornerRadius: 16, style: .continuous)
                    .fill(Brand.Color.surfaceRaised)
                    .overlay(
                        RoundedRectangle(cornerRadius: 16, style: .continuous)
                            .stroke(
                                image != nil ? Brand.Color.success.opacity(0.6) : Brand.Color.borderStrong,
                                lineWidth: image != nil ? 2 : 1
                            )
                    )
            )
        }
        .buttonStyle(.plain)
    }

    // MARK: - Result card

    private func resultCard(_ r: BodyCompResponse) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            if let bf = r.body_fat_percent {
                HStack {
                    VStack(alignment: .leading, spacing: 2) {
                        Text("EST. BODY FAT")
                            .font(.system(size: 10, weight: .bold, design: .monospaced))
                            .foregroundStyle(Brand.Color.muted)
                        Text("\(String(format: "%.1f", bf))%")
                            .font(.system(size: 36, weight: .black))
                            .foregroundStyle(.white)
                    }
                    Spacer()
                    Image(systemName: "waveform.path.ecg")
                        .font(.system(size: 36))
                        .foregroundStyle(Brand.Color.accent)
                }
            }
            if let a = r.analysis {
                Text(a)
                    .font(.subheadline)
                    .foregroundStyle(Brand.Color.muted)
            }
            Button("Save to progress") {
                Task { await saveToProgress(r) }
            }
            .buttonStyle(PremiumActionButtonStyle())
        }
        .padding(20)
        .premiumCard()
    }

    // MARK: - Helpers

    private func setImage(_ image: UIImage, for slot: String) {
        switch slot {
        case "Front": images.front = image
        case "Side":  images.side = image
        case "Back":  images.back = image
        default: break
        }
    }

    private func handleLibrarySelection(_ items: [PhotosPickerItem]) async {
        guard let slot = activeSlot, let item = items.first else { return }
        guard let data = try? await item.loadTransferable(type: Data.self),
              let uiImage = UIImage(data: data) else { return }
        await MainActor.run { setImage(uiImage, for: slot) }
    }

    private func imageToDataURL(_ image: UIImage) -> String {
        let data = image.jpegData(compressionQuality: 0.8) ?? Data()
        return "data:image/jpeg;base64,\(data.base64EncodedString())"
    }

    private func runScan() {
        guard let f = images.front, let s = images.side, let b = images.back else { return }
        errorMessage = nil
        result = nil
        isScanning = true
        HapticEngine.impact(.medium)
        Task {
            do {
                let res = try await api.aiBodyComp(
                    images: (imageToDataURL(f), imageToDataURL(s), imageToDataURL(b)),
                    localDate: DateHelpers.todayLocal
                )
                await MainActor.run {
                    result = res
                    isScanning = false
                    HapticEngine.notification(.success)
                }
            } catch {
                await MainActor.run {
                    errorMessage = error.localizedDescription
                    isScanning = false
                    HapticEngine.notification(.error)
                }
            }
        }
    }

    private func saveToProgress(_ r: BodyCompResponse) async {
        guard let ds = dataService, let bf = r.body_fat_percent else { return }
        var entry = ProgressEntry()
        entry.date = DateHelpers.todayLocal
        entry.body_fat_percent = bf
        entry.notes = "Body comp scan"
        try? await ds.insertProgressEntry(entry)
        HapticEngine.notification(.success)
    }
}
