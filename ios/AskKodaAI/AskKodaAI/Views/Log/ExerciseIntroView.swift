//
//  ExerciseIntroView.swift
//  Koda AI
//
//  Full-screen coached exercise introduction shown before each exercise begins.
//  Shows the demo video, KodaAI coaching script, form cues (revealed one-by-one),
//  common-mistake callout, and an "I'm Ready" CTA.
//  This is the moment the user feels coached by a world-class personal trainer.
//

import SwiftUI

struct ExerciseIntroView: View {
    let exercise: PlanExercise
    let exerciseIndex: Int
    let totalExercises: Int
    let onReady: () -> Void

    @State private var resolvedVideoURL: URL?
    @State private var cardAppeared = false
    @State private var cueRevealIndex = -1

    // MARK: - Derived

    private var catalogEntry: ExerciseCatalogEntry? {
        ExerciseCatalog.entry(for: exercise.name ?? "")
    }

    private var effectiveVideoURL: URL? {
        if let resolvedVideoURL { return resolvedVideoURL }
        let str = ExerciseImages.getExerciseImageUrl(
            exerciseName: exercise.name ?? "",
            overrideUrl: exercise.cinema_video_url ?? exercise.video_url
        )
        return URL(string: str)
    }

    // MARK: - Body

    var body: some View {
        ZStack {
            videoBackground
            gradientOverlay

            VStack(spacing: 0) {
                topBar
                Spacer()
                coachingCard
            }
        }
        .ignoresSafeArea()
        .task { await runIntroSequence() }
    }

    // MARK: - Background

    private var videoBackground: some View {
        Group {
            if let url = effectiveVideoURL {
                CinemaPlayerView(videoURL: url)
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                    .ignoresSafeArea()
                    .opacity(0.6)
            } else {
                Color.black.ignoresSafeArea()
            }
        }
    }

    private var gradientOverlay: some View {
        LinearGradient(
            colors: [.black.opacity(0.25), .black.opacity(0.55), .black.opacity(0.95)],
            startPoint: .top,
            endPoint: .bottom
        )
        .ignoresSafeArea()
    }

    // MARK: - Top Bar

    private var topBar: some View {
        HStack(alignment: .top) {
            VStack(alignment: .leading, spacing: 4) {
                Text("EXERCISE \(exerciseIndex + 1) OF \(totalExercises)")
                    .font(.system(size: 11, weight: .black, design: .monospaced))
                    .tracking(1.6)
                    .foregroundStyle(Brand.Color.accent)
                if let cat = catalogEntry?.category.rawValue {
                    Text(cat.uppercased())
                        .font(.system(size: 9, weight: .bold, design: .monospaced))
                        .tracking(1.2)
                        .foregroundStyle(.white.opacity(0.45))
                }
            }
            Spacer()
            if let muscles = catalogEntry?.muscles, !muscles.isEmpty {
                VStack(alignment: .trailing, spacing: 4) {
                    ForEach(muscles.prefix(3), id: \.self) { muscle in
                        Text(muscle)
                            .font(.system(size: 9, weight: .bold))
                            .foregroundStyle(.white.opacity(0.7))
                            .padding(.horizontal, 8)
                            .padding(.vertical, 3)
                            .background(
                                Capsule()
                                    .fill(Color.white.opacity(0.08))
                                    .overlay(Capsule().stroke(Color.white.opacity(0.14), lineWidth: 1))
                            )
                    }
                }
            }
        }
        .padding(.horizontal, 20)
        .padding(.top, 20)
        .opacity(cardAppeared ? 1 : 0)
        .animation(.easeOut(duration: 0.5), value: cardAppeared)
    }

    // MARK: - Coaching Card

    private var coachingCard: some View {
        ScrollView(showsIndicators: false) {
            VStack(alignment: .leading, spacing: 18) {
                exerciseHeader
                kodaIntroSection
                formCuesSection
                targetPillsRow
                commonMistakeSection
                readyButton
            }
            .padding(20)
        }
        .background(
            RoundedRectangle(cornerRadius: 28, style: .continuous)
                .fill(.ultraThinMaterial)
                .overlay(
                    RoundedRectangle(cornerRadius: 28, style: .continuous)
                        .stroke(Color.white.opacity(0.1), lineWidth: 1)
                )
        )
        .padding(.horizontal, 12)
        .padding(.bottom, 24)
        .offset(y: cardAppeared ? 0 : 60)
        .opacity(cardAppeared ? 1 : 0)
        .animation(.spring(response: 0.5, dampingFraction: 0.8).delay(0.1), value: cardAppeared)
    }

    // MARK: - Card Sections

    private var exerciseHeader: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text("UP NEXT")
                .font(.system(size: 10, weight: .black, design: .monospaced))
                .tracking(1.5)
                .foregroundStyle(Brand.Color.accent)
            Text(exercise.name ?? "Exercise")
                .font(.system(size: 36, weight: .black))
                .italic()
                .foregroundStyle(.white)
                .lineLimit(2)
                .minimumScaleFactor(0.65)
            if let equip = catalogEntry?.equipment {
                Text(equip)
                    .font(.subheadline.weight(.medium))
                    .foregroundStyle(.white.opacity(0.45))
            }
        }
    }

    @ViewBuilder
    private var kodaIntroSection: some View {
        let intro = catalogEntry?.kodaIntro ?? exercise.rationale
        if let intro {
            HStack(alignment: .top, spacing: 10) {
                Image(systemName: "waveform")
                    .font(.caption.weight(.bold))
                    .foregroundStyle(Brand.Color.accent)
                    .padding(.top, 2)
                Text(intro)
                    .font(.subheadline)
                    .foregroundStyle(.white.opacity(0.88))
                    .fixedSize(horizontal: false, vertical: true)
            }
            .padding(14)
            .background(
                RoundedRectangle(cornerRadius: 14, style: .continuous)
                    .fill(Brand.Color.accent.opacity(0.07))
                    .overlay(
                        RoundedRectangle(cornerRadius: 14, style: .continuous)
                            .stroke(Brand.Color.accent.opacity(0.2), lineWidth: 1)
                    )
            )
        }
    }

    @ViewBuilder
    private var formCuesSection: some View {
        let cues: [Any] = catalogEntry.map { Array($0.formCues) } ?? []
        let planCues = planCuePairs

        if !cues.isEmpty || !planCues.isEmpty {
            VStack(alignment: .leading, spacing: 10) {
                Text("FORM CUES")
                    .font(.system(size: 10, weight: .black, design: .monospaced))
                    .tracking(1.2)
                    .foregroundStyle(.white.opacity(0.45))

                if let entry = catalogEntry {
                    ForEach(Array(entry.formCues.enumerated()), id: \.offset) { i, cue in
                        if i <= cueRevealIndex {
                            formCueRow(icon: cue.icon, text: cue.cue)
                                .transition(.asymmetric(
                                    insertion: .move(edge: .bottom).combined(with: .opacity),
                                    removal: .opacity
                                ))
                        }
                    }
                } else {
                    ForEach(planCues, id: \.0) { icon, text in
                        if planCues.firstIndex(where: { $0.0 == icon && $0.1 == text }).map({ $0 <= cueRevealIndex }) == true {
                            formCueRow(icon: icon, text: text)
                        }
                    }
                }
            }
        }
    }

    private var planCuePairs: [(String, String)] {
        var pairs: [(String, String)] = []
        if let tempo = exercise.tempo, !tempo.isEmpty { pairs.append(("metronome", "Tempo: \(tempo)")) }
        if let breathing = exercise.breathing, !breathing.isEmpty { pairs.append(("lungs", breathing)) }
        if let intent = exercise.intent, !intent.isEmpty { pairs.append(("target", intent)) }
        if let notes = exercise.notes, !notes.isEmpty { pairs.append(("note.text", notes)) }
        return pairs
    }

    private var targetPillsRow: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 10) {
                if let sets = exercise.sets { targetPill(label: "Sets", value: "\(sets)") }
                if let reps = exercise.reps { targetPill(label: "Reps", value: reps) }
                if let intensity = exercise.intensity { targetPill(label: "Intensity", value: intensity) }
                if let rir = exercise.target_rir { targetPill(label: "RIR", value: "\(rir)") }
                if let load = exercise.target_load_kg { targetPill(label: "Target", value: "\(Int(load)) kg") }
            }
        }
    }

    @ViewBuilder
    private var commonMistakeSection: some View {
        if let mistake = catalogEntry?.commonMistake {
            HStack(alignment: .top, spacing: 8) {
                Image(systemName: "exclamationmark.triangle.fill")
                    .font(.caption)
                    .foregroundStyle(Brand.Color.warning)
                    .padding(.top, 1)
                Text(mistake)
                    .font(.caption)
                    .foregroundStyle(Brand.Color.warning.opacity(0.9))
                    .fixedSize(horizontal: false, vertical: true)
            }
            .padding(12)
            .background(
                RoundedRectangle(cornerRadius: 12, style: .continuous)
                    .fill(Brand.Color.warning.opacity(0.07))
                    .overlay(
                        RoundedRectangle(cornerRadius: 12, style: .continuous)
                            .stroke(Brand.Color.warning.opacity(0.18), lineWidth: 1)
                    )
            )
        }
    }

    private var readyButton: some View {
        Button(action: onReady) {
            Text("I'm Ready — Let's Go")
        }
        .buttonStyle(PremiumActionButtonStyle())
    }

    // MARK: - Subviews

    private func formCueRow(icon: String, text: String) -> some View {
        HStack(alignment: .top, spacing: 10) {
            Image(systemName: icon)
                .font(.caption.weight(.bold))
                .foregroundStyle(Brand.Color.accent)
                .frame(width: 18)
            Text(text)
                .font(.subheadline)
                .foregroundStyle(.white.opacity(0.82))
                .fixedSize(horizontal: false, vertical: true)
        }
    }

    private func targetPill(label: String, value: String) -> some View {
        VStack(alignment: .leading, spacing: 3) {
            Text(label.uppercased())
                .font(.system(size: 8, weight: .black, design: .monospaced))
                .foregroundStyle(.white.opacity(0.45))
            Text(value)
                .font(.subheadline.weight(.bold))
                .foregroundStyle(.white)
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 10)
        .background(
            RoundedRectangle(cornerRadius: 14, style: .continuous)
                .fill(Color.white.opacity(0.07))
                .overlay(
                    RoundedRectangle(cornerRadius: 14, style: .continuous)
                        .stroke(Color.white.opacity(0.1), lineWidth: 1)
                )
        )
    }

    // MARK: - Intro Sequence

    private func runIntroSequence() async {
        // Fetch best available demo video in parallel with animation
        if let name = exercise.name, !name.isEmpty {
            resolvedVideoURL = await ExerciseDemoResolver.url(for: name)
        }

        // Card slides in
        withAnimation(.easeOut(duration: 0.4).delay(0.05)) {
            cardAppeared = true
        }

        // Reveal form cues one by one with stagger
        let cueCount = catalogEntry?.formCues.count ?? planCuePairs.count
        for i in 0..<cueCount {
            let delay = UInt64(350_000_000 + i * 200_000_000)
            try? await Task.sleep(nanoseconds: delay)
            withAnimation(.spring(response: 0.4, dampingFraction: 0.75)) {
                cueRevealIndex = i
            }
        }
    }
}
