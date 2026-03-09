# Koda AI — Guide for AI Agents and Contributors

This document orients AI coding agents and human contributors to the repo: layout, config, how to build and test (web and iOS), and where to look for details.

---

## Project overview

- **Product:** AI-first fitness and nutrition coaching (adaptive home, daily plan, AI coach, workout/nutrition log, progress, check-in, settings).
- **Web:** Next.js 14 (App Router), Supabase (auth + Postgres), OpenRouter (AI). See [README.md](README.md) and [docs/RUNBOOK.md](docs/RUNBOOK.md).
- **iOS:** Native SwiftUI app in `ios/`, same Supabase and Next.js API; API accepts **Bearer token** from the app. See [ios/README.md](ios/README.md) and [docs/IOS-PARITY-MAP.md](docs/IOS-PARITY-MAP.md).

---

## Key paths

| Area | Path |
|------|------|
| Web app routes | `app/**/page.tsx` |
| Web API | `app/api/v1/` (AI, plan, coach, nutrition, analytics, etc.) |
| Web lib / Supabase | `lib/` (supabase server + browser, AI context, auth) |
| Shared types | `types/` (aligned with Supabase schema) |
| iOS app source | `ios/AskKodaAI/AskKodaAI/` — `AskKodaAIApp.swift`, `RootView.swift`, `MainTabView.swift`, Config, Core, Models, Services, Views, Components |
| iOS Xcode project | `ios/AskKodaAI/AskKodaAI.xcodeproj` |
| iOS unit tests | `ios/AskKodaAI/AskKodaAITests/` (KodaAITests: DateHelpers, APIModels, DataModels, ProductionReadiness; plus Swift Testing in AskKodaAITests.swift) |
| Config (shared) | `.env.local` at repo root (web); iOS reads same values via `scripts/generate-ios-env.mjs` → `ios/AskKodaAI/Config/Generated.xcconfig` |

---

## Configuration

- **Web:** Copy `.env.local.example` to `.env.local`. Required: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SITE_URL` (or equivalent), `OPENROUTER_API_KEY` (server-only). See [docs/RUNBOOK.md](docs/RUNBOOK.md#environment-variables).
- **iOS:** Uses the **same** source as web. From repo root run `node scripts/generate-ios-env.mjs` to write `ios/AskKodaAI/Config/Generated.xcconfig` (SUPABASE_URL, SUPABASE_ANON_KEY, API_BASE_URL). The Xcode build phase runs this script; the app target uses `Generated.xcconfig`. Do not commit `Generated.xcconfig` (in `.gitignore`). If the script cannot write (e.g. file locked), the build continues using the existing file; run the script from repo root with write access when needed.

---

## Build and test (web)

- **Build:** `npm run build`
- **Lint:** `npm run lint`
- **Tests:** `npm test` (Vitest)
- **Validate:** `npm run validate` (lint + build + test)
- **AI test review:** `npm run test:ai-review` (writes to `docs/reports/ai-test-review-<timestamp>.md`; needs `OPENROUTER_API_KEY` for AI section)
- **AI coverage review:** `npm run test:ai-review:coverage` (Vitest with coverage + AI review)
- **Workflow validation:** `npm run workflow:validate:ai` (HTTP workflow checks + AI judgment)

---

## Build and test (iOS)

- **Config:** Ensure `.env.local` exists at repo root; run `node scripts/generate-ios-env.mjs` once so `ios/AskKodaAI/Config/Generated.xcconfig` exists.
- **Build:** Open `ios/AskKodaAI/AskKodaAI.xcodeproj` in Xcode, select a simulator (e.g. iPhone 17), **Product → Run** (⌘R). Or from repo root:  
  `xcodebuild -project ios/AskKodaAI/AskKodaAI.xcodeproj -scheme AskKodaAI -destination 'platform=iOS Simulator,name=iPhone 17' build`
- **Tests:** In Xcode **Product → Test** (⌘U), or from repo root: `npm run test:ios`. The script uses a **single** simulator (iPhone 17); **run only one iOS test job at a time** on resource-limited machines.
- **Surface smoke pass:** `npm run test:ios:surfaces` (captures screen state matrix on simulator)
- **Test host:** Unit tests run inside the app (host). If tests crash before running (e.g. “Early unexpected exit” / “signal trap”), ensure `Generated.xcconfig` exists and the app launches when run directly (⌘R); in Debug the app uses placeholder config when keys are missing so the host can start.
- **AI review / production gate:** `npm run test:ai-review:ios`, `npm run test:ios:ready` (see [docs/RUNBOOK.md](docs/RUNBOOK.md#ios-tests-and-ai-review)).

---

## iOS-specific notes for agents

1. **Scheme and target:** Use scheme **AskKodaAI** and app target **AskKodaAI**. Test target **AskKodaAITests** must be in the scheme’s Test action.
2. **Simulator:** Scripts use `iPhone 17`; if that device is missing, use another available simulator name in `-destination 'platform=iOS Simulator,name=…'`.
3. **One simulator at a time:** On constrained machines, do not run multiple iOS test or simulator sessions in parallel.
4. **App entry and config:** `AskKodaAIApp.swift` → `RootView`; config from `AppConfig` (reads Info.plist keys from Generated.xcconfig). In Debug, missing keys use placeholders so the test host can launch.
5. **Feature parity:** Web vs iOS screens and APIs are mapped in [docs/IOS-PARITY-MAP.md](docs/IOS-PARITY-MAP.md). iOS implementation status and web-only routes are listed there.
6. **Production checklist:** See “Production readiness checklist” in [ios/README.md](ios/README.md).

---

## Documentation index

| Doc | Purpose |
|-----|---------|
| [README.md](README.md) | Features, stack, quick start, scripts, project structure. |
| [AGENTS.md](AGENTS.md) | This file — orientation for AI agents and contributors. |
| [docs/RUNBOOK.md](docs/RUNBOOK.md) | Environment, deploy, health checks, web and iOS test commands. |
| [docs/API.md](docs/API.md) | API contract (auth, AI, plan, coach, jobs). |
| [docs/PROD-READY-CHECKLIST.md](docs/PROD-READY-CHECKLIST.md) | Production readiness: Vercel, migrations, iOS config. |
| [docs/IOS-PARITY-MAP.md](docs/IOS-PARITY-MAP.md) | Web routes vs iOS screens; API coverage; iOS implementation status. |
| [ios/README.md](ios/README.md) | iOS setup, config (.env.local → Generated.xcconfig), run/test, production checklist, feature parity summary. |
| [docs/DESIGN.md](docs/DESIGN.md) | Design system, UI components. |
| [docs/SMOKE-CHECKLIST.md](docs/SMOKE-CHECKLIST.md) | Pre-launch smoke run. |

When changing iOS app behavior, config, or tests, update **ios/README.md** and, if relevant, **docs/IOS-PARITY-MAP.md** or **AGENTS.md**.
