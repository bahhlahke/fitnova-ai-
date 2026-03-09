# AskKodaAI — Priority Action Plan: MVP → Pro

> **Scope:** iOS app (`ios/AskKodaAI/`) reviewed against Ladder and Future.co bar.
> **Review dimensions:** Post-Auth Flow · AVFoundation · UI/UX Sophistication · Backend-Frontend Sync
> **Severity key:** 🔴 Critical (ship-blocker or crash) · 🟠 High (user-visible regression) · 🟡 Medium (polish) · 🟢 Low (nice-to-have)

---

## 1. Post-Auth Flow Audit

### 1a. 🔴 Onboarding guard has a silent bypass

**File:** `Views/Onboarding/OnboardingCheckView.swift`

```swift
// CURRENT — if no userId yet, skips onboarding silently:
guard let uid = auth.currentUserId else {
    await MainActor.run { checked = true; needsOnboarding = false }
    return
}
```

`currentUserId` is `nil` until `SupabaseService.refreshSession()` completes. Because `OnboardingCheckView.task {}` fires immediately when the view appears, there is a race window where `auth.isInitialized == true` but `currentUserId` is still `nil`. The guard bails, sets `needsOnboarding = false`, and the user lands on `MainTabView` with a half-initialised data layer.

**Fix:**
```swift
// In OnboardingCheckView
var body: some View {
    Group {
        if !auth.isInitialized {         // belt-and-suspenders: RootView already guards this
            ProgressView("Loading…")
        } else if auth.currentUserId == nil {
            // Auth is initialised but no user — sign them out gracefully
            AuthView()
        } else if !checked {
            ProgressView("Loading…")
        } else if needsOnboarding {
            OnboardingView(onComplete: { needsOnboarding = false })
        } else {
            MainTabView()
        }
    }
    .task {
        guard auth.currentUserId != nil else {
            await MainActor.run { checked = true; needsOnboarding = false }
            return
        }
        await check()
    }
}
```

---

### 1b. 🟠 Tab bar exceeds Apple HIG 5-tab limit

**File:** `MainTabView.swift`

8 tabs are defined. iOS clips the tab bar at 5 items and puts the rest inside a "More" menu — an immediate UX regression that no pro app ships with.

**Fix — collapse into 5 anchors:**

| Tab | Icon | Contains |
|-----|------|----------|
| Home | `house.fill` | Dashboard, briefing, plan launch |
| Train | `dumbbell.fill` | Log workout + Plan view (merged) |
| Coach | `message.fill` | Chat + Check-in (accessible from chat) |
| Progress | `chart.bar.fill` | Body comp, history, trophies, analytics |
| Me | `person.crop.circle` | Settings, community, integrations, billing |

---

### 1c. 🟠 Multiple simultaneous loading spinners cause UI jitter

**File:** `Views/Home/HomeView.swift`

`HomeView` owns 9 independent `@State` loading booleans (`briefingLoading`, `planLoading`, `performanceLoading`, …). Each resolves at a different time, causing the scroll view to shift layout 9 times. On a slow connection this looks broken.

**Fix — single loading enum + skeleton cards:**
```swift
enum LoadPhase { case loading, loaded, error(String) }

@State private var loadPhase: LoadPhase = .loading
```

Show skeleton placeholder cards (shimmer) during `loading`, then replace all at once when the critical path (briefing + daily plan) resolves. Non-critical data (trophies, nudges) can lazy-load after.

---

### 1d. 🟡 `refreshTask` doesn't cancel in-flight requests

**File:** `Views/Home/HomeView.swift`

```swift
@State private var refreshTask: Task<Void, Never>?
```

`refreshTask` is declared but never used to cancel a prior task. Pull-to-refresh while data is loading can produce a race where stale data overwrites the latest response.

**Fix:**
```swift
.refreshable {
    refreshTask?.cancel()
    refreshTask = Task { await loadAll() }
    await refreshTask?.value
}
.task {
    refreshTask?.cancel()
    refreshTask = Task { await loadAll() }
    await refreshTask?.value
}
```

---

### 1e. 🟡 Auth loading screen has no brand treatment

**File:** `RootView.swift`

The splash ProgressView shows `ProgressView("Loading…")` on a black background with no logo. Competitors (Ladder, Future.co) use branded launch sequences.

**Fix:**
```swift
// In RootView, replace the ProgressView branch with:
ZStack {
    Brand.Color.background.ignoresSafeArea()
    VStack(spacing: 24) {
        Image("KodaLogo")
            .resizable().scaledToFit().frame(height: 60)
        ProgressView()
            .tint(Brand.Color.accent)
            .scaleEffect(1.2)
    }
}
```

---

## 2. AVFoundation — Native Camera & Media

### 2a. 🔴 Body Comp Scan uses photo library, not live camera

**File:** `Views/Progress/BodyCompScanView.swift`

The current implementation uses `PhotosPickerItem` (library picker). Ladder and Future use **live camera capture** with guided overlay UI (dotted body outline, lighting check, posture alignment). Using a library picker for a "body scan" feature signals MVP-quality immediately.

**Architecture to implement — `KodaCameraCapture`:**

```
ios/AskKodaAI/AskKodaAI/
  Camera/
    CameraCaptureView.swift          ← SwiftUI wrapper
    CameraPreviewLayer.swift         ← UIViewRepresentable (AVCaptureVideoPreviewLayer)
    CameraCaptureSession.swift       ← ObservableObject managing AVCaptureSession
    CameraOverlayView.swift          ← Body outline / alignment guide
    CapturedPhotoModel.swift         ← Holds Data + thumbnail
```

**`CameraCaptureSession.swift` skeleton:**
```swift
import AVFoundation
import UIKit

@MainActor
final class CameraCaptureSession: NSObject, ObservableObject {
    @Published private(set) var previewLayer: AVCaptureVideoPreviewLayer?
    @Published private(set) var capturedImage: UIImage?
    @Published private(set) var permissionDenied = false
    @Published private(set) var error: String?

    private let session = AVCaptureSession()
    private let output = AVCapturePhotoOutput()
    private var continuation: CheckedContinuation<UIImage, Error>?

    func startSession(position: AVCaptureDevice.Position = .front) async {
        await requestPermissionIfNeeded()
        guard !permissionDenied else { return }

        session.beginConfiguration()
        session.sessionPreset = .photo

        guard let device = AVCaptureDevice.default(.builtInWideAngleCamera, for: .video, position: position),
              let input = try? AVCaptureDeviceInput(device: device) else {
            error = "Camera unavailable"
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
        }
    }

    func stopSession() {
        Task.detached(priority: .background) { [weak self] in
            self?.session.stopRunning()
        }
    }

    func capturePhoto() async throws -> UIImage {
        return try await withCheckedThrowingContinuation { cont in
            continuation = cont
            let settings = AVCapturePhotoSettings()
            settings.flashMode = .auto
            output.capturePhoto(with: settings, delegate: self)
        }
    }

    private func requestPermissionIfNeeded() async {
        let status = AVCaptureDevice.authorizationStatus(for: .video)
        switch status {
        case .notDetermined:
            let granted = await AVCaptureDevice.requestAccess(for: .video)
            if !granted { permissionDenied = true }
        case .denied, .restricted:
            permissionDenied = true
        default: break
        }
    }
}

extension CameraCaptureSession: AVCapturePhotoCaptureDelegate {
    nonisolated func photoOutput(_ output: AVCapturePhotoOutput,
                                  didFinishProcessingPhoto photo: AVCapturePhoto,
                                  error: Error?) {
        if let error {
            Task { @MainActor in self.continuation?.resume(throwing: error) }
            return
        }
        guard let data = photo.fileDataRepresentation(),
              let image = UIImage(data: data) else {
            Task { @MainActor in
                self.continuation?.resume(throwing: CameraError.captureDataMissing)
            }
            return
        }
        Task { @MainActor in
            self.capturedImage = image
            self.continuation?.resume(returning: image)
        }
    }
}

enum CameraError: LocalizedError {
    case captureDataMissing
    var errorDescription: String? { "Could not process the captured photo." }
}
```

**`CameraPreviewLayer.swift` skeleton:**
```swift
import SwiftUI
import AVFoundation

struct CameraPreviewLayer: UIViewRepresentable {
    let session: CameraCaptureSession

    func makeUIView(context: Context) -> PreviewUIView {
        PreviewUIView()
    }

    func updateUIView(_ uiView: PreviewUIView, context: Context) {
        if let layer = session.previewLayer {
            uiView.setPreviewLayer(layer)
        }
    }

    class PreviewUIView: UIView {
        private var previewLayer: AVCaptureVideoPreviewLayer?

        func setPreviewLayer(_ layer: AVCaptureVideoPreviewLayer) {
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
```

**Guided overlay for body scan:**
```swift
struct BodyScanOverlay: View {
    let slot: String // "Front", "Side", "Back"

    var body: some View {
        ZStack {
            // Silhouette guide — use a custom shape or SF Symbol
            Image(systemName: "person.fill")
                .font(.system(size: 220))
                .foregroundStyle(.white.opacity(0.12))
                .offset(y: 20)

            // Corner crop guides
            RoundedRectangle(cornerRadius: 40)
                .stroke(Brand.Color.accent.opacity(0.6), style: StrokeStyle(lineWidth: 2, dash: [12, 8]))
                .padding(24)

            VStack {
                Spacer()
                Text("\(slot.uppercased()) VIEW — STEP BACK 2M · FULL BODY VISIBLE")
                    .font(.system(size: 11, weight: .bold, design: .monospaced))
                    .tracking(0.8)
                    .foregroundStyle(Brand.Color.accent)
                    .padding(.vertical, 8)
                    .padding(.horizontal, 16)
                    .background(Color.black.opacity(0.6))
                    .clipShape(Capsule())
                    .padding(.bottom, 40)
            }
        }
    }
}
```

---

### 2b. 🟠 Motion Lab uses photo picker — should offer live capture option

**File:** `Views/Log/MotionLabView.swift`

Form check is a key differentiator. Competitors record a short video clip, not pick from library. Provide both options (camera + library):

```swift
// Replace the single PhotosPicker with a dual-source picker
HStack(spacing: 12) {
    Button {
        showCamera = true   // opens KodaCameraCapture in video mode
    } label: {
        Label("Record clip", systemImage: "video.circle.fill")
    }
    .buttonStyle(PremiumActionButtonStyle(filled: true))

    PhotosPicker(selection: $selectedItems, maxSelectionCount: 1, matching: .videos) {
        Label("From library", systemImage: "photo.on.rectangle")
    }
    .buttonStyle(PremiumActionButtonStyle(filled: false))
}
```

---

### 2c. 🟠 `CinemaPlayerView.updateVideo()` leaks AVQueuePlayer instances

**File:** `Components/CinemaPlayerView.swift`

Every call to `updateVideo(url:)` creates a new `AVQueuePlayer` and sets the old one to `nil` without calling `.pause()` or invalidating observers. Under ARC the old player may linger.

**Fix:**
```swift
func updateVideo(url: URL) {
    // Stop and tear down old player before creating new one
    playerLooper?.disableLooping()
    playerLooper = nil
    queuePlayer?.pause()
    queuePlayer = nil
    currentURL = url

    let playerItem = AVPlayerItem(url: url)
    let newQueuePlayer = AVQueuePlayer(items: [playerItem])
    newQueuePlayer.isMuted = true
    newQueuePlayer.preventsDisplaySleepDuringVideoPlayback = false
    self.queuePlayer = newQueuePlayer
    playerLayer.player = newQueuePlayer
    playerLooper = AVPlayerLooper(player: newQueuePlayer, templateItem: playerItem)
    newQueuePlayer.play()
}
```

Also add `deinit` cleanup:
```swift
deinit {
    playerLooper?.disableLooping()
    queuePlayer?.pause()
}
```

---

### 2d. 🟡 No audio session configuration for background/foreground transitions

Neither video player sets `AVAudioSession` category. When the user gets a phone call or switches apps and returns, the video audio (even muted) can cause subtle AVAudioSession conflicts.

**Fix — add to `AskKodaAIApp.swift`:**
```swift
import AVFoundation

// In the App init or WindowGroup.onAppear:
try? AVAudioSession.sharedInstance().setCategory(.ambient, mode: .default, options: .mixWithOthers)
try? AVAudioSession.sharedInstance().setActive(true)
```

---

### 2e. 🟡 Exercise demo videos — only push-ups.mp4 is bundled

`CinemaPlayerView` is wired up but there's only one video asset. A pro app has short, crisp demo clips for every exercise in the guided workout.

**Options (in order of polish):**
1. **Remote CDN** — store clips on Supabase Storage, stream via signed URL (avoid app size bloat)
2. **Bundled subset** — bundle 10-15 most common exercises, stream the rest
3. **Animated GIF fallback** — for exercises without a clip, show a looping GIF from Giphy Fitness

Implement a `ExerciseDemoResolver` that returns a local `URL` for bundled assets and a remote signed URL otherwise:
```swift
struct ExerciseDemoResolver {
    static func url(for exerciseName: String) async -> URL? {
        // 1. Check bundle
        let slug = exerciseName.lowercased().replacingOccurrences(of: " ", with: "_")
        if let local = Bundle.main.url(forResource: slug, withExtension: "mp4") {
            return local
        }
        // 2. Fetch signed URL from Supabase Storage
        return try? await SupabaseService.shared.supabaseClient
            .storage.from("exercise-demos")
            .createSignedURL(path: "\(slug).mp4", expiresIn: 3600)
    }
}
```

---

## 3. UI/UX Sophistication

### 3a. 🔴 Zero haptic feedback throughout the app

This is the single biggest perceived quality gap vs Ladder and Future.co. Every meaningful interaction should produce haptic feedback.

**Recommended haptic map:**

| Interaction | Haptic |
|-------------|--------|
| Button primary action (Start Workout, Send magic link) | `UIImpactFeedbackGenerator(.medium)` |
| Set completed in GuidedWorkoutView | `UIImpactFeedbackGenerator(.heavy)` |
| Workout completed | `UINotificationFeedbackGenerator().notificationOccurred(.success)` |
| Tab switch | `UISelectionFeedbackGenerator().selectionChanged()` |
| Onboarding step advance | `UIImpactFeedbackGenerator(.light)` |
| Error / destructive confirmation | `UINotificationFeedbackGenerator().notificationOccurred(.error)` |
| Slider / picker scrub | `UISelectionFeedbackGenerator().selectionChanged()` |

**Implementation — `HapticEngine.swift`:**
```swift
import UIKit

enum HapticEngine {
    static func impact(_ style: UIImpactFeedbackGenerator.FeedbackStyle) {
        let g = UIImpactFeedbackGenerator(style: style)
        g.prepare()
        g.impactOccurred()
    }

    static func notification(_ type: UINotificationFeedbackGenerator.FeedbackType) {
        let g = UINotificationFeedbackGenerator()
        g.prepare()
        g.notificationOccurred(type)
    }

    static func selection() {
        let g = UISelectionFeedbackGenerator()
        g.selectionChanged()
    }
}
```

**Wire into `PremiumActionButtonStyle`:**
```swift
func makeBody(configuration: Configuration) -> some View {
    configuration.label
        // ...existing modifiers...
        .onChange(of: configuration.isPressed) { _, pressed in
            if pressed { HapticEngine.impact(.medium) }
        }
}
```

---

### 3b. 🟠 Onboarding uses plain system Form — kills premium brand

**File:** `Views/Onboarding/OnboardingView.swift`

The gorgeous `PremiumHeroCard`, `EliteSelectionGrid`, and glassmorphic cards used everywhere else are absent from steps 0-3, which fall back to stock `Form { Section { TextField } }`. This is the first impression after auth.

**Redesign steps 0-3 with premium cards:**
```swift
// Step 0 — replace Form Section with:
VStack(spacing: 16) {
    PremiumSectionHeader("Define the athlete profile",
                         eyebrow: "Step 1 of 6",
                         subtitle: "Koda calibrates every plan to your physical baseline.")

    ProgressView(value: 1, total: 6).tint(Brand.Color.accent)

    PremiumTextField(placeholder: "Full name", text: $name,
                     icon: "person.fill")
    PremiumTextField(placeholder: "Age", text: $age,
                     icon: "calendar", keyboard: .numberPad)
    PremiumSegmentedPicker(label: "Biological sex",
                            options: ["Male", "Female", "Other"],
                            selection: $sex)
}
.padding(20)
.premiumCard()
```

Also add `.sensoryFeedback(.selection, trigger: step)` (iOS 17+) or `HapticEngine.impact(.light)` on every `step += 1`.

---

### 3c. 🟠 BioSyncHUD shows hardcoded fake stats

**File:** `Components/BioSyncHUD.swift`

```swift
hudStat(label: "SYNAPSE", value: "STABLE")   // ← always hardcoded
hudStat(label: "LATENCY", value: "14MS")      // ← always hardcoded
```

This reads as a cosmetic mockup, not a live sensor. Either wire real data or replace with meaningful derived metrics.

**Fix — replace with real HealthKit or computed values:**
```swift
struct BioSyncHUD: View {
    let readinessScore: Double
    let activeSquad: String
    let heartRate: Int?          // from HealthKitService.shared.currentHeartRate
    let todaySteps: Int?

    private var heartRateDisplay: String {
        if let hr = heartRate { return "\(hr) BPM" }
        return "—"
    }
    private var stepsDisplay: String {
        if let s = todaySteps { return "\(s / 1000)K" }
        return "—"
    }
    // Replace hudStat calls:
    hudStat(label: "HR", value: heartRateDisplay)
    hudStat(label: "STEPS", value: stepsDisplay)
}
```

---

### 3d. 🟡 No skeleton / shimmer loading states — raw spinners only

Raw `ProgressView()` spinners appear mid-scroll causing layout shift. Pro apps use skeleton placeholder cards that match the final layout.

**`ShimmerCard.swift`:**
```swift
import SwiftUI

struct ShimmerCard: View {
    let height: CGFloat
    @State private var phase: CGFloat = -1

    var body: some View {
        RoundedRectangle(cornerRadius: 24, style: .continuous)
            .fill(LinearGradient(
                colors: [Brand.Color.surfaceRaised,
                         Brand.Color.surfaceHover,
                         Brand.Color.surfaceRaised],
                startPoint: UnitPoint(x: phase, y: 0),
                endPoint: UnitPoint(x: phase + 1, y: 0)
            ))
            .frame(height: height)
            .onAppear {
                withAnimation(.linear(duration: 1.4).repeatForever(autoreverses: false)) {
                    phase = 1
                }
            }
    }
}
```

Use in HomeView during initial load:
```swift
if briefing == nil && briefingLoading {
    ShimmerCard(height: 140)
} else {
    briefingCard
}
```

---

### 3e. 🟡 `matchedGeometryEffect` missing on workout card → full-screen transitions

Opening `GuidedWorkoutView` via `fullScreenCover` is abrupt. A `matchedGeometryEffect` from the workout card to the full-screen view creates the fluid hero expansion that Ladder uses.

```swift
// In HomeView:
@Namespace private var workoutNamespace

// On the plan card:
.matchedGeometryEffect(id: "workout-card", in: workoutNamespace)

// On GuidedWorkoutView container:
.matchedGeometryEffect(id: "workout-card", in: workoutNamespace)
```

---

### 3f. 🟡 No `@Environment(\.accessibilityReduceMotion)` guards

All continuous animations (`BioSyncHUD` rotation, shimmer, pulse overlay) should pause when the user has "Reduce Motion" enabled. No view currently checks this.

```swift
@Environment(\.accessibilityReduceMotion) private var reduceMotion

// In BioSyncHUD.onAppear:
if !reduceMotion {
    withAnimation(.linear(duration: 10).repeatForever(autoreverses: false)) {
        rotation = 360
    }
}
```

---

## 4. Backend-Frontend Sync

### 4a. 🟠 `HomeView` fires 8+ concurrent API calls with no priority or deduplication

**File:** `Views/Home/HomeView.swift`

`loadAll()` fires all requests simultaneously with `async let`. This saturates the connection on first launch and causes the 8-way layout jitter described in §1c. There is also no retry on partial failure — if one call fails, the error banner appears but all others continue.

**Fix — load in two phases:**
```swift
func loadAll() async {
    // Phase 1: above the fold — critical path (briefing, plan, profile)
    async let b: () = loadBriefing()
    async let p: () = loadPlan()
    async let prof: () = loadProfile()
    _ = await (b, p, prof)

    // Phase 2: below the fold — can arrive late
    async let perf: () = loadPerformance()
    async let nudge: () = loadNudges()
    async let proj: () = loadProjection()
    async let ins: () = loadCoachInsights()
    _ = await (perf, nudge, proj, ins)
}
```

---

### 4b. 🟠 `KodaDataService` and `KodaAPIService` are recreated on every render

**Files:** `Views/Home/HomeView.swift` (and most other views)

```swift
// Computed property → new struct every body evaluation:
private var api: KodaAPIService {
    KodaAPIService(getAccessToken: { auth.accessToken })
}
private var dataService: KodaDataService? {
    guard let uid = auth.currentUserId else { return nil }
    return KodaDataService(client: auth.supabaseClient, userId: uid)
}
```

`KodaAPIService` is a value type (struct) so the overhead is minimal, but `KodaDataService` wraps the live `SupabaseClient` and re-capturing it on every render is wasteful. More importantly, `dataService` being nil while `auth.currentUserId` settles can cause missed writes.

**Fix — use `@StateObject` wrappers or pass from parent:**
```swift
// Create once at the tab level and inject as environment:
// In MainTabView:
@StateObject private var dataService = KodaDataServiceObservable()

// Or simpler: resolve lazily once in onAppear and store:
@State private var resolvedDataService: KodaDataService?

.task {
    if resolvedDataService == nil, let uid = auth.currentUserId {
        resolvedDataService = KodaDataService(client: auth.supabaseClient, userId: uid)
    }
    await loadAll()
}
```

---

### 4c. 🟡 No optimistic updates on user actions

When a user completes a set or logs a meal, the UI waits for the server write to confirm before updating. Competitors feel instant because they write optimistically to local state and reconcile server-side in the background.

**Pattern to adopt:**
```swift
// Example in GuidedWorkoutView — completing a set
func completeSet() {
    // 1. Update local state immediately (optimistic)
    loggedSets[exerciseIndex].append(LoggedSet(weight: weight, reps: reps))
    HapticEngine.impact(.heavy)
    advanceToNextSet()

    // 2. Persist in background — no await at the call site
    Task {
        try? await dataService?.insertSetLog(...)
    }
}
```

---

### 4d. 🟡 No local cache — cold launch always hits network

Every app launch triggers full API round-trips before any content is shown. Future.co and Ladder both show yesterday's plan immediately from cache while refreshing in background.

**Recommended: `UserDefaults`-backed cache with TTL:**
```swift
struct PlanCache {
    static let shared = PlanCache()
    private let defaults = UserDefaults.standard
    private let ttl: TimeInterval = 3600 // 1 hour

    func storeDailyPlan(_ plan: DailyPlan) {
        guard let data = try? JSONEncoder().encode(plan) else { return }
        defaults.set(data, forKey: "cached_daily_plan")
        defaults.set(Date(), forKey: "cached_daily_plan_date")
    }

    func loadDailyPlan() -> DailyPlan? {
        guard let date = defaults.object(forKey: "cached_daily_plan_date") as? Date,
              Date().timeIntervalSince(date) < ttl,
              let data = defaults.data(forKey: "cached_daily_plan") else { return nil }
        return try? JSONDecoder().decode(DailyPlan.self, from: data)
    }
}
```

In `HomeView.loadPlan()`:
```swift
func loadPlan() async {
    // Show cached plan instantly (stale-while-revalidate)
    if let cached = PlanCache.shared.loadDailyPlan() {
        await MainActor.run { dailyPlan = cached }
    }
    // Fetch fresh in background
    let fresh = try? await api.planDaily()
    if let plan = fresh?.plan {
        PlanCache.shared.storeDailyPlan(plan)
        await MainActor.run { dailyPlan = plan }
    }
}
```

---

### 4e. 🟡 Nutrition log photo upload is blocking — should be background

**File:** `Views/Nutrition/FridgeScannerView.swift` (assumed pattern from BodyCompScanView)

Photo → base64 → POST is done inline. Large images can cause multi-second waits. Use background upload with `URLSession` background task instead.

---

## 5. Implementation Priority Order

### Sprint 1 — Ship-blockers (do first)
1. **§1a** — Fix onboarding guard race condition
2. **§3a** — Add `HapticEngine` and wire into primary interactions
3. **§1b** — Collapse tab bar to 5 items
4. **§2c** — Fix `CinemaPlayerView` player leak

### Sprint 2 — Quality bar (visible to reviewers)
5. **§2a** — Build `CameraCaptureSession` + replace BodyCompScan photo picker with native camera
6. **§3b** — Redesign onboarding steps 0-3 with premium cards
7. **§1c** — Unified loading phase + skeleton cards (`ShimmerCard`)
8. **§4a** — Two-phase data loading in HomeView

### Sprint 3 — Pro differentiation
9. **§3c** — Wire real HealthKit data into BioSyncHUD
10. **§4d** — `PlanCache` stale-while-revalidate
11. **§3e** — Hero `matchedGeometryEffect` on workout launch
12. **§2b** — Live camera option in MotionLab
13. **§4c** — Optimistic updates in GuidedWorkoutView
14. **§2e** — Exercise demo video CDN resolver

### Sprint 4 — Accessibility + polish
15. **§3f** — `reduceMotion` guards on all animations
16. **§3d** — Shimmer cards across all views
17. **§2d** — `AVAudioSession` configuration
18. **§1d** — Task cancellation on pull-to-refresh
19. **§1e** — Branded launch/loading screen

---

## 6. Quick Wins (< 30 min each)

These require only small code changes but have outsized perceived-quality impact:

```swift
// A. Add .sensoryFeedback to onboarding step advance (iOS 17+)
.onChange(of: step) { HapticEngine.impact(.light) }

// B. Brand the ProgressView in RootView — add KodaLogo + accent tint
ProgressView().tint(Brand.Color.accent)

// C. Fix CinemaPlayerView deinit leak — add:
deinit { playerLooper?.disableLooping(); queuePlayer?.pause() }

// D. Add .animation(.spring(response: 0.35, dampingFraction: 0.8))
//    to all card appearances in HomeView

// E. Wire HapticEngine.notification(.success) to workout completion
//    in GuidedWorkoutView.completedView onAppear

// F. Add accessibilityLabel to all icon-only buttons (BioSyncHUD,
//    BodyCompScan slot buttons, etc.)
```

---

## 7. Competitor Parity Checklist

| Feature | Ladder | Future.co | Koda (current) | Priority |
|---------|--------|-----------|----------------|----------|
| Live camera body scan | ✅ | ✅ | ❌ Photo picker | Sprint 2 |
| Haptics throughout | ✅ | ✅ | ❌ None | Sprint 1 |
| Branded launch screen | ✅ | ✅ | ❌ Spinner | Sprint 1 |
| ≤5 tab items | ✅ | ✅ | ❌ 8 tabs | Sprint 1 |
| Stale-while-revalidate cache | ✅ | ✅ | ❌ No cache | Sprint 3 |
| Skeleton loading states | ✅ | ✅ | ❌ Spinners | Sprint 2 |
| Real-time HR in dashboard | ✅ | ❌ | ❌ Fake | Sprint 3 |
| Live video form check | ✅ | ❌ | ❌ Photo only | Sprint 3 |
| Hero card transitions | ✅ | ✅ | ❌ abrupt | Sprint 3 |
| Optimistic set logging | ✅ | ✅ | ❌ Blocking | Sprint 3 |
| `reduceMotion` accessibility | ✅ | ✅ | ❌ | Sprint 4 |

---

*Generated: 2026-03-09 — based on full review of `ios/AskKodaAI/AskKodaAI/` (Swift 5.10, iOS 17+ target).*
