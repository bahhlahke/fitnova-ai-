//
//  LoadingErrorView.swift
//  Koda AI
//
//  Reusable loading and error state for robust UX.
//

import SwiftUI

struct LoadingErrorView<T: View>: View {
    let loading: Bool
    let error: String?
    let onDismissError: () -> Void
    let onRetry: (() -> Void)?
    @ViewBuilder let content: () -> T

    init(
        loading: Bool,
        error: String? = nil,
        onDismissError: @escaping () -> Void = { },
        onRetry: (() -> Void)? = nil,
        @ViewBuilder content: @escaping () -> T
    ) {
        self.loading = loading
        self.error = error
        self.onDismissError = onDismissError
        self.onRetry = onRetry
        self.content = content
    }

    var body: some View {
        Group {
            if loading {
                ProgressView()
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if let err = error, !err.isEmpty {
                VStack(spacing: 12) {
                    Text(err)
                        .font(.subheadline)
                        .foregroundStyle(.red)
                        .multilineTextAlignment(.center)
                    Button("Dismiss") { onDismissError() }
                    if let retry = onRetry {
                        Button("Retry") { retry() }
                .buttonStyle(.borderedProminent)
                    }
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .padding()
            } else {
                content()
            }
        }
    }
}

struct EmptyStateView: View {
    let message: String
    let actionTitle: String?
    let action: (() -> Void)?

    init(message: String, actionTitle: String? = nil, action: (() -> Void)? = nil) {
        self.message = message
        self.actionTitle = actionTitle
        self.action = action
    }

    var body: some View {
        VStack(spacing: 12) {
            Text(message)
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
            if let title = actionTitle, let act = action {
                Button(title, action: act)
                    .buttonStyle(.borderedProminent)
            }
        }
        .frame(maxWidth: .infinity)
        .padding(32)
    }
}
