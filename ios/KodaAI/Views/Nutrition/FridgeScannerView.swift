//
//  FridgeScannerView.swift
//  Koda AI
//
//  Fridge scanner: photo → recipe suggestions from API.
//

import SwiftUI
import PhotosUI

struct FridgeScannerView: View {
    @EnvironmentObject var auth: SupabaseService
    @State private var selectedItem: PhotosPickerItem?
    @State private var mediaBase64: String?
    @State private var loading = false
    @State private var recipes: [FridgeRecipe] = []
    @State private var errorMessage: String?

    private var api: KodaAPIService {
        KodaAPIService(getAccessToken: { await auth.accessToken })
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                PhotosPicker(selection: $selectedItem, matching: .images, maxSelectionCount: 1) {
                    Label("Choose fridge photo", systemImage: "photo.on.rectangle.angled")
                        .frame(maxWidth: .infinity)
                        .padding()
                }
                .buttonStyle(.bordered)
                .onChange(of: selectedItem) { _, item in
                    Task {
                        guard let item = item else { return }
                        if let data = try? await item.loadTransferable(type: Data.self) {
                            await MainActor.run { mediaBase64 = data.base64EncodedString() }
                        }
                    }
                }

                if let err = errorMessage {
                    Text(err)
                        .font(.caption)
                        .foregroundStyle(.red)
                }

                if loading {
                    ProgressView("Scanning…")
                        .frame(maxWidth: .infinity)
                } else if !recipes.isEmpty {
                    Text("Recipe ideas")
                        .font(.headline)
                    ForEach(Array(recipes.enumerated()), id: \.offset) { _, r in
                        VStack(alignment: .leading, spacing: 4) {
                            Text(r.name ?? "")
                                .font(.subheadline)
                                .fontWeight(.semibold)
                            if let c = r.calories { Text("\(c) cal") }
                            if let ing = r.ingredients, !ing.isEmpty {
                                Text(ing.prefix(3).joined(separator: ", "))
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                            }
                        }
                        .padding()
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .background(Color(.systemGray6))
                        .clipShape(RoundedRectangle(cornerRadius: 8))
                    }
                }
            }
            .padding()
        }
        .navigationTitle("Fridge scanner")
        .onChange(of: mediaBase64) { _, b64 in
            guard let b64 = b64 else { return }
            Task { await scan(b64) }
        }
    }

    private func scan(_ base64: String) async {
        loading = true
        recipes = []
        errorMessage = nil
        defer { loading = false }
        do {
            let res = try await api.nutritionFridgeScanner(media: "data:image/jpeg;base64,\(base64)", type: "image", localDate: DateHelpers.todayLocal)
            await MainActor.run { recipes = res.recipes ?? [] }
        } catch {
            await MainActor.run { errorMessage = error.localizedDescription }
        }
    }
}
