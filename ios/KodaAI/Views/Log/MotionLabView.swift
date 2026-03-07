//
//  MotionLabView.swift
//  Koda AI
//
//  Form check: 1–3 photos → AI biomechanics analysis. Parity with web /motion.
//

import SwiftUI
import PhotosUI

struct MotionLabView: View {
    @EnvironmentObject var auth: SupabaseService
    @State private var imageDataUrls: [String] = []
    @State private var selectedItems: [PhotosPickerItem] = []
    @State private var showPicker = false
    @State private var analyzing = false
    @State private var result: VisionAnalysisResponse?
    @State private var errorMessage: String?

    private var api: KodaAPIService {
        KodaAPIService(getAccessToken: { await auth.accessToken })
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                Text("Add 1–3 photos of your lift. We'll analyze form and suggest corrections.")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)

                PhotosPicker(
                    selection: $selectedItems,
                    maxSelectionCount: 3,
                    matching: .images
                ) {
                    HStack {
                        Image(systemName: "photo.on.rectangle.angled")
                        Text(imageDataUrls.isEmpty ? "Choose 1–3 photos" : "\(imageDataUrls.count) photo(s) selected")
                    }
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(Color(.systemGray6))
                    .clipShape(RoundedRectangle(cornerRadius: 12))
                }
                .onChange(of: selectedItems) { _, newItems in
                    Task {
                        var urls: [String] = []
                        for item in newItems {
                            if let data = try? await item.loadTransferable(type: Data.self) {
                                let base64 = data.base64EncodedString()
                                urls.append("data:image/jpeg;base64,\(base64)")
                            }
                        }
                        await MainActor.run {
                            imageDataUrls = urls
                            result = nil
                        }
                    }
                }

                if let err = errorMessage {
                    Text(err)
                        .font(.caption)
                        .foregroundStyle(.red)
                }

                if let r = result {
                    VStack(alignment: .leading, spacing: 10) {
                        if let score = r.score {
                            Text("Form score: \(Int(score))/100")
                                .font(.headline)
                        }
                        if let c = r.critique, !c.isEmpty {
                            Text("Critique")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                            Text(c)
                                .font(.subheadline)
                        }
                        if let corr = r.correction, !corr.isEmpty {
                            Text("Focus on")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                            Text(corr)
                                .font(.subheadline)
                                .italic()
                        }
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding()
                    .background(Color.accentColor.opacity(0.1))
                    .clipShape(RoundedRectangle(cornerRadius: 12))
                }

                Button(action: analyze) {
                    if analyzing {
                        ProgressView()
                            .tint(.white)
                            .frame(maxWidth: .infinity)
                            .padding()
                    } else {
                        Text("Analyze form")
                            .frame(maxWidth: .infinity)
                            .padding()
                    }
                }
                .disabled(analyzing || imageDataUrls.isEmpty)
                .buttonStyle(.borderedProminent)
            }
            .padding()
        }
        .navigationTitle("Form check")
    }

    private func analyze() {
        guard !imageDataUrls.isEmpty else { return }
        errorMessage = nil
        result = nil
        analyzing = true
        Task {
            do {
                let res = try await api.aiVision(images: imageDataUrls)
                await MainActor.run {
                    result = res
                    analyzing = false
                }
            } catch {
                await MainActor.run {
                    errorMessage = (error as? LocalizedError)?.errorDescription ?? error.localizedDescription
                    analyzing = false
                }
            }
        }
    }
}
