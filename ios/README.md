# Koda AI — iOS App

Production-ready iOS client for Koda AI. Uses the same Supabase backend and Next.js API as the web app; auth is via **Bearer token** so the API accepts requests from native clients.

## Requirements

- **Xcode 15+** (Swift 5.9+)
- **iOS 16+** deployment target
- Supabase project (same as web)
- Deployed Next.js API (e.g. Vercel) with `NEXT_PUBLIC_SITE_URL` set

## 1. Create the Xcode project

1. Open Xcode → **File → New → Project**.
2. Choose **App** (iOS), then:
   - **Product Name:** `KodaAI`
   - **Team:** your team
   - **Organization Identifier:** e.g. `com.yourcompany`
   - **Interface:** SwiftUI
   - **Language:** Swift
   - **Storage:** none
   - Uncheck **Include Tests** if you want to add them later.
3. Save the project inside this repo, e.g. `ios/KodaAI.xcodeproj` (so the existing `ios/KodaAI` folder becomes the app source folder).

## 2. Add Supabase Swift SDK

1. **File → Add Package Dependencies…**
2. Enter: `https://github.com/supabase/supabase-swift.git`
3. **Add to target:** KodaAI. Use **Up to Next Major** with version **2.0.0** or later.

## 3. Add the app source files

Add the existing `KodaAI` folder (Config, Services, Views, RootView, MainTabView, etc.) to the app target:

- In Xcode, right‑click the **KodaAI** group → **Add Files to "KodaAI"…**
- Select the `ios/KodaAI` folder (Config, Services, Views, `KodaAIApp.swift`, `RootView.swift`, `MainTabView.swift`).
- Ensure **Copy items if needed** is unchecked and **Add to targets: KodaAI** is checked.

Replace the default `ContentView.swift` with the provided app structure (entry point is `KodaAIApp.swift` with `RootView`).

## 4. Configuration (secrets)

Do **not** commit real keys. Use one of:

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

## 7. Production / App Store

- **Sign in with Apple:** If you offer email magic link, Apple requires also offering Sign in with Apple. Add a “Sign in with Apple” button and call `SupabaseService.signInWithApple(idToken:nonce:)` (implement using `AuthenticationServices` to get `idToken` and `nonce`).
- **Privacy:** Add a **Privacy Policy** URL and, if needed, **App Privacy** details in App Store Connect.
- **Capabilities:** Enable **Push Notifications** if you use them; **Background Modes** only if needed.
- **App Transport Security:** Use HTTPS for `API_BASE_URL` and `SUPABASE_URL` (no change needed if you use your production URLs).

## Project layout

```
ios/
├── README.md                 # This file
└── KodaAI/
    ├── KodaAIApp.swift       # @main, RootView
    ├── RootView.swift        # Auth vs MainTabView
    ├── MainTabView.swift     # Tab bar
    ├── Config/
    │   └── AppConfig.swift   # SUPABASE_URL, API_BASE_URL, etc.
    ├── Services/
    │   ├── SupabaseService.swift   # Auth, session, Bearer token
    │   └── KodaAPIService.swift   # API client (plan, coach, analytics)
    └── Views/
        ├── Auth/
        ├── Home/
        ├── Plan/
        ├── Coach/
        ├── Log/
        ├── Progress/
        └── Settings/
```

## Running

1. Select a simulator or device.
2. Build and run (⌘R).
3. Enter your email on the auth screen and tap **Send magic link**; complete sign-in via the link (in Simulator you can use the browser or Mail app).
4. Use **Home** to generate a daily plan and **Coach** to chat with the AI.
