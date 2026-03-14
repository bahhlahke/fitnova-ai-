# Koda AI — iOS App

Native iOS client for Koda AI. Uses the same Supabase backend and Next.js API as the web app; auth is via **Bearer token** so the API accepts requests from native clients.

---

## Setup and run (summary)

### One-time setup

1. **Xcode 15+** and **iOS 16+** simulator or device.
2. **Open the project:** `ios/AskKodaAI/AskKodaAI.xcodeproj` (or create a new App project and name it **AskKodaAI**; the repo includes the full app source in `ios/AskKodaAI/AskKodaAI/`).
3. **Add Supabase:** **File → Add Package Dependencies…** → `https://github.com/supabase/supabase-swift.git` → add to target **AskKodaAI**.
4. **Configure secrets** (target → Info or Info.plist; do not commit real keys):
   - `SUPABASE_URL` — your Supabase project URL  
   - `SUPABASE_ANON_KEY` — Supabase anon key  
   - `API_BASE_URL` — your Next.js API base (e.g. `https://your-app.vercel.app` or `http://localhost:3000` for local dev)
5. **Add the test target** (for the test suite):
   - **File → New → Target** → **Unit Testing Bundle** → name **AskKodaAITests** (or **KodaAITests**).
   - Right‑click the new test target in the project navigator → **Add Files to "AskKodaAITests"…** → select the `ios/KodaAITests` folder (at repo root `ios/KodaAITests`), **Add to targets: AskKodaAITests**.
   - In the test target’s settings, set **AskKodaAI** as the target to test (so `@testable import AskKodaAI` works).
   - **Edit Scheme → Test:** Click the **AskKodaAI** scheme → **Edit Scheme…** → **Test** in the sidebar → **+** → add the **AskKodaAITests** (or KodaAITests) target. Otherwise `npm run test:ios` will report “Scheme is not currently configured for the test action”.

### Run the app

- In Xcode: choose a simulator (e.g. iPhone 16) or a device → **Product → Run** (⌘R).
- Sign in with magic link (or Sign in with Apple if configured); complete the link in Simulator’s browser or Mail.

### Run the test suite

- **In Xcode:** **Product → Test** (⌘U). Ensure **AskKodaAITests** is in the scheme’s Test action.
- **From repo root (terminal):** `npm run test:ios` (or `npm run test:ai-review:ios` / `npm run test:ios:ready` for AI review and production gate). The script uses a single simulator (iPhone 17); **run only one iOS test job at a time** on resource-limited machines.
- **Surface smoke pass:** `npm run test:ios:surfaces` builds the app, launches each major screen in deterministic **demo mode**, captures a state matrix (primary plus loading/empty/error variants where relevant) on `iPhone 17`, runs a tighter layout sanity pass on `iPhone 16e`, and writes both `SUMMARY.md` and `manifest.json` to `docs/reports/ios-surface-smoke-<timestamp>/`.
- **Cross-platform UI validation:** `npm run validate:ui:ai` reuses the iOS surface smoke output alongside web surface captures, then asks a multimodal AI judge to assess production readiness across multiple personas with different proficiency levels.
- **If tests crash before running** (e.g. “Early unexpected exit” / “signal trap”): the test host is the app; it must launch successfully. Run `node scripts/generate-ios-env.mjs` from repo root so `ios/AskKodaAI/Config/Generated.xcconfig` exists with valid values from `.env.local`, then build and run the app once (⌘R) to confirm it launches, then run tests again.

---

## Requirements

- **Xcode 15+** (Swift 5.9+)
- **iOS 16+** deployment target
- Supabase project (same as web)
- Deployed Next.js API (e.g. Vercel) with `NEXT_PUBLIC_SITE_URL` set

## 1. Open or create the Xcode project

- **If the repo already has an AskKodaAI project:** Open `ios/AskKodaAI/AskKodaAI.xcodeproj`. The app source is in `ios/AskKodaAI/AskKodaAI/` (entry point: `AskKodaAIApp.swift` with `RootView`).
- **If creating from scratch:** **File → New → Project** → App (iOS) → **Product Name:** `AskKodaAI`, **Interface:** SwiftUI, **Language:** Swift. Save as `ios/AskKodaAI/AskKodaAI.xcodeproj`. Then copy the app source from the repository's `ios/AskKodaAI/AskKodaAI/` folder into your new project and use `AskKodaAIApp.swift` as the `@main` entry.

## 2. Add Supabase Swift SDK

1. **File → Add Package Dependencies…**
2. Enter: `https://github.com/supabase/supabase-swift.git`
3. **Add to target:** AskKodaAI. Use **Up to Next Major** with version **2.0.0** or later.

## 3. App source files

The **AskKodaAI** target should compile everything in `ios/AskKodaAI/AskKodaAI/`: Config, Core, Models, Services, Views, Components, `RootView.swift`, `MainTabView.swift`, and `AskKodaAIApp.swift` as the `@main` entry. If you created the project yourself, add these files/folders to the AskKodaAI target (or use the copied structure from the repo).

## 4. Configuration (secrets) — same as web (.env.local)

The iOS app uses the **same config source as the web app**: the repo's `.env.local`.

- **Recommended:** From repo root, ensure `.env.local` exists with `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `NEXT_PUBLIC_SITE_URL` (or `API_BASE_URL`). On each build, a Run Script runs `node scripts/generate-ios-env.mjs`, which writes `ios/AskKodaAI/Config/Generated.xcconfig`. The app target uses that file so `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `API_BASE_URL` match the web app. The generated file is in `.gitignore`; do not commit it.
- **First time or after adding .env.local:** From repo root run `node scripts/generate-ios-env.mjs` once so `Generated.xcconfig` exists before opening Xcode (otherwise the first build may use placeholders). If the script reports it couldn't write (e.g. file locked), run it again with write access; the build phase continues using the existing file.
- **Fallback — Info.plist / xcconfig:** You can instead set these keys in the target's Info or via a custom xcconfig; the generate script is optional if you provide them elsewhere.

**Legacy options (if not using .env.local):**

- **Option A — Info.plist (dev):** Add keys to the target’s **Info** tab (or `Info.plist`):
  - `SUPABASE_URL` — string, e.g. `https://xxxx.supabase.co`
  - `SUPABASE_ANON_KEY` — string, your anon key
  - `API_BASE_URL` — string, e.g. `https://askkodaai.com` or `https://your-app.vercel.app`
- **Option B — xcconfig:** Create e.g. `Config.xcconfig` with:
  ```
  SUPABASE_URL = https://xxxx.supabase.co
  SUPABASE_ANON_KEY = your-anon-key
  API_BASE_URL = https://your-api.vercel.app
  ```
  Add these to **Info.plist** via `$(SUPABASE_URL)` etc., and do not commit `Config.xcconfig` (add to `.gitignore`).

## 5. Magic link (email sign-in)

1. In **Signing & Capabilities**, add **Associated Domains** and add your web domain, e.g. `applinks:askkodaai.com`, so the magic link opens the app.
2. In the Supabase dashboard, set the **Site URL** and **Redirect URLs** to include your app’s URL scheme (e.g. `kodaai://auth/callback`) or the universal link path you use.
3. In the app, handle the open URL: in `KodaAIApp.swift` you can use `.onOpenURL` to pass the URL to `SupabaseService.shared.setSessionFrom(url:)` (implement that if your Supabase Swift SDK version exposes a session-from-URL API).

If your Supabase Swift SDK uses a different method name (e.g. `signInWithOtp` instead of `signInWithMagicLink`), update `SupabaseService` to match the [Supabase Swift Auth reference](https://supabase.com/docs/reference/swift/auth-signinwithotp).

## 6. API auth (Bearer token)

The Next.js API accepts **cookie** (web) or **Authorization: Bearer &lt;access_token&gt;** (mobile). The iOS app sends the Supabase `access_token` on every request via `KodaAPIService`. No backend changes are required beyond what’s already in `lib/supabase/server.ts`.

## 7. Apple Health (HealthKit)

- In Xcode, add the **HealthKit** capability (Signing & Capabilities → + Capability → HealthKit). Enable **Clinical Health Records** only if needed.
- Add `NSHealthShareUsageDescription` to Info.plist (see Info.plist.example). Request read access for weight, sleep, and step count. The app syncs the last 90 days of weight to `progress_tracking`, sleep to `check_ins`, and sleep plus steps to `connected_signals`.
- HealthKit requires a physical iPhone for realistic validation. Simulator smoke tests only confirm the screen launches and permission flow code paths compile.

## 8. Spotify

- Spotify linking uses the Supabase linked identity token for the signed-in user. The native player UI can refresh playback state and send play, pause, next, and previous commands to the active Spotify device.
- The Spotify connection flow requires the scopes `user-read-playback-state`, `user-modify-playback-state`, and `user-read-currently-playing`.
- Real playback validation requires a linked Spotify account and an active Spotify playback device. Simulator smoke tests do not prove end-to-end playback control.

## 9. Production / App Store

- **Sign in with Apple:** If you offer email magic link, Apple requires also offering Sign in with Apple. Add a “Sign in with Apple” button and call `SupabaseService.signInWithApple(idToken:nonce:)` (implement using `AuthenticationServices` to get `idToken` and `nonce`).
- **Privacy:** Add a **Privacy Policy** URL and, if needed, **App Privacy** details in App Store Connect.
- **Capabilities:** Enable **Push Notifications** if you use them; **Background Modes** only if needed.
- **App Transport Security:** Use HTTPS for `API_BASE_URL` and `SUPABASE_URL` in production. For local dev with `http://localhost:3000`, add an ATS exception in the target’s Info if the simulator blocks the request.

## Production readiness checklist

Before release or CI “production ready” gate:

1. **Config:** `.env.local` (or equivalent) provides `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `NEXT_PUBLIC_SITE_URL`; `node scripts/generate-ios-env.mjs` has been run so the app builds with real values (no placeholders in release).
2. **Build:** `xcodebuild -scheme AskKodaAI -destination 'platform=iOS Simulator,name=iPhone 17' build` succeeds.
3. **Run:** App launches in simulator or device; auth screen or main UI appears (no white screen); magic link or Sign in with Apple works.
4. **Tests:** Unit tests (DateHelpers, APIModels, DataModels, ProductionReadiness) pass. If the test host crashes, ensure `Generated.xcconfig` exists and the app launches when run directly.
5. **Surface QA:** `npm run test:ios:surfaces` completes, the generated screenshots do not show blank, clipped, or obviously broken screens, and `manifest.json` is present for downstream review tooling.
6. **Cross-platform UX QA:** `npm run validate:ui:ai --fail-if-not-ready` does not report blocked workflows for iOS or web.
7. **Device validations:** Validate Apple Health permissions/sync on a physical iPhone, validate Spotify playback controls with a linked account and active playback device, and verify Motion Lab realtime local pose analysis on supported hardware with Low Power Mode off.
8. **Secrets:** No real keys committed; `ios/AskKodaAI/Config/Generated.xcconfig` is in `.gitignore`.
9. **HTTPS:** Production builds use HTTPS for API and Supabase URLs.
10. **Feature parity:** See “Feature parity with web” and `docs/IOS-PARITY-MAP.md` for coverage.

## Feature parity with web

The iOS app matches the web app for core flows:

- **Dashboard (Home):** Briefing, today's plan, 14-day performance, coach nudges, generate plan.
- **Plan:** Weekly plan, day selector, adapt day, weekly AI insight.
- **Coach:** AI chat; Support (escalate) with list/create/messages.
- **Log:** Workouts (list, quick log, **guided workout**, **Form check (Motion Lab)** with realtime on-device pose tracking, photo analysis, and server fallback); Nutrition (meals, targets, analyze meal, fridge scanner, meal plan/recipe gen); **History** (workouts & nutrition tabs, expand, edit workout).
- **Progress:** List entries, add entry, **body comp scan** (3 photos → API → save).
- **Check-in:** Daily energy, sleep, soreness, adherence.
- **Community:** Friends, requests, accountability partner, challenges (join).
- **Settings:** Profile, **Vitals** (readiness insight), **Integrations** (Apple Health sync, Spotify controls, Whoop link), export, onboarding link, pricing/Stripe, sign out.
- **Onboarding:** Multi-step gate (name, age, sex, height, weight, goals, injuries, diet) → profile + onboarding.
- **Integrations:** **Apple Health** (HealthKit): read weight/sleep/steps, sync last 90 days to progress, check-ins, and wearable signals; **Spotify** native playback controls via linked account token; Whoop (open web connect).
- **Telemetry:** `Telemetry.track(_:props:)` for product events.

Robustness: retry-friendly API client, loading/error/empty states, Supabase direct access, HealthKit sync, simulator surface smoke coverage.

Additional iOS notes:

- Guided workout voice cues now announce the next exercise during the intro step so coached sessions stay continuous between cards and set execution.
- Guided workout now consumes rich coach metadata from plan payloads (setup checklist, walkthrough steps, coaching points, common mistakes, progression notes, per-exercise rest targets) and adds timed work intervals plus one-tap smart logging actions for between-set speed.
- Coach chat now surfaces trust signals (weekly recap, plan rationale, progress loop, escalation SLA) and enforces a Koda-vs-coach parity approval checkpoint when a generated workout diverges from guarded baseline constraints.
- Recipe generation response models decode `meal_type` so breakfast/lunch/dinner labels coming from the API are preserved in native UI fixtures and production payloads.
- Motion Lab now offers a reusable realtime session sheet with on-device pose tracking, skeleton overlay, squat/hinge/press/pull rep segmentation, live cueing, camera-derived velocity summaries, and benchmark report capture for Motion Lab and Guided Workout form checks.
- Motion Lab now includes a conversion-oriented access funnel: one free realtime scan per month for non-Pro accounts, stronger setup/preflight guidance before the live session starts, and direct in-flow upgrade prompts after valuable results.
- Photo-based Motion Lab checks still prefer on-device pose analysis on supported devices and automatically fall back to the server vision API when thermal state, Low Power Mode, or pose-tracking quality makes the local path unreliable.
- Realtime sessions persist benchmark JSON artifacts under the app documents directory (`MotionLabReports/<pattern>/...json`) and surface the saved filename in the native result cards so operators can collect evidence after device runs.

## Simulator QA launch contract

The debug launcher and surface smoke harness use these environment variables:

- `E2E_SURFACE` — screen to launch directly (`home`, `plan`, `coach`, etc.)
- `E2E_DEMO_MODE` — enables deterministic demo data instead of live auth/backend dependencies
- `E2E_SCENARIO` — state variant for the launched surface (`primary`, `empty`, `loading`, `error`)
- `E2E_VARIANT` — optional extra variant channel; the smoke harness currently mirrors the scenario value here

In demo mode, the app uses stable profile, plan, workout, nutrition, community, and coach fixtures so simulator QA can focus on layout and polish instead of login or backend state.

The surface smoke runner now also writes `manifest.json` next to `SUMMARY.md` so downstream QA tools can reason over exact simulator, surface, scenario, and screenshot evidence without scraping Markdown.

## Unit tests and AI review

- **Test target:** Add a **Unit Testing Bundle** target (e.g. `AskKodaAITests`) in Xcode: **File → New → Target → Unit Testing Bundle**. Add the `ios/KodaAITests` folder to that target and set **AskKodaAI** as the target to test (so `@testable import AskKodaAI` works). Ensure the **AskKodaAI** scheme’s Test action runs this test target.
- **Run from terminal:** From repo root, `npm run test:ios` finds any `.xcodeproj` under `ios/` (e.g. `ios/AskKodaAI/AskKodaAI.xcodeproj`) and runs `xcodebuild test` with the matching scheme (e.g. **AskKodaAI**).
- **AI review:** `npm run test:ai-review:ios` discovers iOS test files, runs tests if a project exists, then sends the output to an LLM (OpenRouter) for gap analysis, suggested tests, and **production readiness**. Report: `docs/reports/ai-test-review-ios-<timestamp>.md`. Set `OPENROUTER_API_KEY` for the AI step. Use `--fail-if-not-ready` to exit 1 when the app is not deemed production ready.
- **Production gate:** `npm run test:ios:ready` runs tests then AI review with `--fail-if-not-ready`. If tests pass and the AI reports production ready (all checklist items satisfied), exit 0; otherwise exit 1. Use before release or in CI, but still treat HealthKit and Spotify as device/account validations that require manual confirmation.

## Project layout

```
ios/
├── README.md
├── AskKodaAI/                    # Xcode project (name: AskKodaAI)
│   ├── AskKodaAI.xcodeproj
│   └── AskKodaAI/                # App source (synced to target)
│       ├── AskKodaAIApp.swift
│       ├── RootView.swift
│       ├── MainTabView.swift
│       ├── Config/, Core/, Models/, Services/, Views/, Components/
│       └── Assets.xcassets
├── KodaAITests/                  # XCTest sources (add to test target in Xcode)
│   ├── DateHelpersTests.swift
│   ├── APIModelsTests.swift
│   ├── DataModelsTests.swift
│   └── ProductionReadinessTests.swift
```

## Running

1. Select a simulator or device.
2. Build and run (⌘R).
3. Enter your email on the auth screen and tap **Send magic link**; complete sign-in via the link (in Simulator you can use the browser or Mail app).
4. Use **Home** to generate a daily plan and **Coach** to chat with the AI.
