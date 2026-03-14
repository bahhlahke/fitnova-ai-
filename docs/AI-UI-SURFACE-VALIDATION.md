# AI UI Surface Validation

This repository includes a cross-platform UI validator that combines deterministic screenshot capture with multimodal AI review.

- Web smoke runner: `scripts/run-web-surface-smoke.mjs`
- iOS smoke runner: `scripts/run-ios-surface-smoke.mjs`
- AI validator: `scripts/ai-ui-surface-validator.mjs`
- NPM commands:
  - `npm run test:web:surfaces`
  - `npm run test:ios:surfaces`
  - `npm run validate:ui:ai`

## What it does

1. Captures signed-out and signed-in web workflow surfaces on desktop and mobile.
2. Captures deterministic iOS workflow surfaces in demo mode on the simulator matrix.
3. Groups those surfaces into product workflows.
4. Sends representative screenshots plus deterministic evidence to an AI judge.
5. Evaluates the app through three personas:
   - `nina_novice` — low proficiency, needs clarity and reassurance
   - `marcus_regular` — medium proficiency, wants speed and scannability
   - `aria_optimizer` — high proficiency, expects dense but trustworthy signal
6. Produces a production-readiness report for both web and iOS.

## Output

`npm run validate:ui:ai` writes to:

- `docs/reports/ai-ui-surface-validation-<timestamp>/SUMMARY.md`
- `docs/reports/ai-ui-surface-validation-<timestamp>/web/manifest.json`
- `docs/reports/ai-ui-surface-validation-<timestamp>/ios/manifest.json`

The report includes:

- deterministic pass/partial/fail status per workflow
- AI verdict per workflow (`ready`, `watch`, `blocked`)
- persona-specific friction findings
- prioritized UI issues and recommendations
- overall production-readiness status across both apps

The latest implementation plan derived from those findings lives in [UI-SURFACE-ACTION-PLAN.md](UI-SURFACE-ACTION-PLAN.md). Use its premium benchmark bar and review checklist during manual design review, not just the automated pass/fail output.

## Usage

1. Start the web app locally:

```bash
npm run dev
```

2. In another terminal, run the validator:

```bash
npm run validate:ui:ai
```

Optional flags:

```bash
node scripts/ai-ui-surface-validator.mjs --base-url http://localhost:3000
node scripts/ai-ui-surface-validator.mjs --no-ai
node scripts/ai-ui-surface-validator.mjs --fail-if-not-ready
node scripts/ai-ui-surface-validator.mjs --skip-ios-capture
node scripts/ai-ui-surface-validator.mjs --skip-web-capture
node scripts/ai-ui-surface-validator.mjs --web-manifest docs/reports/web-surface-smoke-.../manifest.json
node scripts/ai-ui-surface-validator.mjs --ios-manifest docs/reports/ios-surface-smoke-.../manifest.json
```

## Requirements

- `OPENROUTER_API_KEY` to enable the AI review step
- `SUPABASE_SERVICE_ROLE_KEY` in local `.env.local` if you want the web smoke runner to auto-bootstrap an authenticated test session through `/api/v1/auth/mock-login`
- Xcode + simulator for iOS capture
- A healthy local web server for web capture

## Notes

- If `OPENROUTER_API_KEY` is missing, the validator still captures evidence and writes the report, but it cannot confirm production readiness.
- The iOS capture uses deterministic demo-mode fixtures to focus on layout, hierarchy, and state handling.
- The web capture treats redirects to `/auth`, runtime exceptions, and suspiciously low-content renders as deterministic failures.
