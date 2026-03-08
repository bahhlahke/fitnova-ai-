//
//  BodyCompScanView.swift
//  Koda AI
//
//  Body composition scan: capture front/side/back, call API, save to progress.
//

import SwiftUI
import PhotosUI

struct BodyCompScanView: View {
    @EnvironmentObject var auth: SupabaseService
    @State private var images: (front: String?, side: String?, back: String?) = (nil, nil, nil)
    @State private var activeSlot: String? = nil
    @State private var showPhotoPicker = false
    @State private var isScanning = false
    @State private var result: BodyCompResponse?
    @State private var errorMessage: String?
    @State private var selectedItems: [PhotosPickerItem] = []

    private var api: KodaAPIService {
        KodaAPIService(getAccessToken: { await auth.accessToken })
    }

    private var dataService: KodaDataService? {
        guard let uid = auth.currentUserId else { return nil }
        return KodaDataService(client: auth.supabaseClient, userId: uid)
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                Text("Capture front, side, and back photos. Then run the scan.")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)

                HStack(spacing: 12) {
                    slotButton("Front", image: images.front)
                    slotButton("Side", image: images.side)
                    slotButton("Back", image: images.back)
                }

                if let err = errorMessage {
                    Text(err)
                        .font(.caption)
                        .foregroundStyle(.red)
                }

                if let r = result {
                    VStack(alignment: .leading, spacing: 8) {
                        if let bf = r.body_fat_percent {
                            Text("Est. body fat: \(String(format: "%.1f", bf))%")
                                .font(.headline)
                        }
                        if let a = r.analysis {
                            Text(a)
                                .font(.subheadline)
                        }
                        Button("Save to progress") {
                            Task { await saveToProgress(r) }
                        }
                        .buttonStyle(.borderedProminent)
                    }
                    .padding()
                    .background(Color(.systemGray6))
                    .clipShape(RoundedRectangle(cornerRadius: 12))
                }

                Button(action: runScan) {
                    if isScanning {
                        ProgressView()
                            .tint(.white)
                            .frame(maxWidth: .infinity)
                            .padding()
                    } else {
                        Text("Run body comp scan")
                            .frame(maxWidth: .infinity)
                            .padding()
                    }
                }
                .disabled(isScanning || images.front == nil || images.side == nil || images.back == nil)
                .buttonStyle(.borderedProminent)
            }
            .padding()
        }
        .navigationTitle("Body comp scan")
        .sheet(isPresented: $showPhotoPicker) {
            NavigationStack {
                PhotosPicker(selection: $selectedItems, maxSelectionCount: 1, matching: .images) {
                    Label("Choose photo for \(activeSlot ?? "")", systemImage: "photo")
                }
                .padding()
                .navigationTitle("Add photo")
                .navigationBarTitleDisplayMode(.inline)
                .toolbar {
                    ToolbarItem(placement: .cancellationAction) {
                        Button("Cancel") {
                            showPhotoPicker = false
                            activeSlot = nil
                        }
                    }
                }
            }
            .onChange(of: selectedItems) { _, newItems in
                Task {
                    guard let slot = activeSlot, let item = newItems.first else { return }
                    if let data = try? await item.loadTransferable(type: Data.self) {
                        let base64 = data.base64EncodedString()
                        let dataUrl = "data:image/jpeg;base64,\(base64)"
                        await MainActor.run {
                            switch slot {
                            case "Front": images.front = dataUrl
                            case "Side": images.side = dataUrl
                            case "Back": images.back = dataUrl
                            default: break
                            }
                            showPhotoPicker = false
                            activeSlot = nil
                        }
                    }
                }
            }
        }
    }

    private func slotButton(_ label: String, image: String?) -> some View {
        Button {
            activeSlot = label
            selectedItems = []  // Reset so onChange fires even if same photo is picked again
            showPhotoPicker = true
        } label: {
            VStack(spacing: 8) {
                if let _ = image {
                    Image(systemName: "checkmark.circle.fill")
                        .foregroundStyle(.green)
                } else {
                    Image(systemName: "camera")
                        .foregroundStyle(.secondary)
                }
                Text(label)
                    .font(.caption)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 24)
            .background(Color(.systemGray6))
            .clipShape(RoundedRectangle(cornerRadius: 12))
        }
        .buttonStyle(.plain)
    }

    private func runScan() {
        guard let f = images.front, let s = images.side, let b = images.back else { return }
        errorMessage = nil
        result = nil
        isScanning = true
        Task {
            do {
                let res = try await api.aiBodyComp(images: (f, s, b), localDate: DateHelpers.todayLocal)
                await MainActor.run {
                    result = res
                    isScanning = false
                }
            } catch {
                await MainActor.run {
                    errorMessage = error.localizedDescription
                    isScanning = false
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
    }
}
