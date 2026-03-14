# UI Surface Action Plan

This document converts the latest UI validation outputs into an implementation-ready plan for web and iOS.

Source reports:

- [AI UI validation summary](reports/ai-ui-surface-validation-manual-check-2/SUMMARY.md)
- [Web surface smoke summary](reports/web-surface-smoke-manual-check-3/SUMMARY.md)
- [iOS surface smoke summary](reports/ios-surface-smoke-manual-check/SUMMARY.md)

Benchmark references:

- [Ladder](https://www.joinladder.com/)
- [Future Pro](https://future.co/pro)
- [Future](https://future.co/)

## Release Readout

- Web is not production ready.
- iOS is production ready.
- The fastest path is to fix the web release blockers first, then do a focused clarity pass, then raise every surface to a premium coaching-product bar across both platforms.

## Premium Benchmark Bar

The target is not just "working" or "clear enough." The target is a product experience that feels competitive with Ladder and Future on every important surface.

From the current public product messaging, those benchmarks emphasize:

- a daily plan that makes it obvious what to do next
- real coaching, accountability, and plan continuity
- adaptive scheduling, equipment, and injury-aware changes
- guided execution with video demos, voice cues, and precise pacing
- progress visibility that reinforces momentum and confidence
- seamless integrations that support the workout instead of distracting from it
- premium trust signals, polished copy, and no confusing dead ends

That means every Koda surface should feel:

- obvious: one clear primary action and one clear reason it matters
- adaptive: the app responds intelligently to schedule, equipment, readiness, and history
- coached: guidance feels specific, credible, and supportive rather than generic
- resilient: missing data or disconnected integrations never make the product feel broken
- premium: layout, copy, motion, and state handling feel intentional and production-grade

## Non-Negotiable UX Gates

No surface should be considered complete until it passes all of these gates:

- Users can understand what the screen is for within 3-5 seconds.
- The primary next action is above the fold on mobile and desktop.
- Empty, loading, error, and disconnected states are intentional and useful.
- The screen explains why the information matters, not just what it is.
- Advanced terminology is either translated into plain language or paired with helper copy.
- The screen preserves momentum by offering the next best action when the ideal action is unavailable.
- Visual polish is consistent with a premium coaching product: clean hierarchy, stable spacing, strong typography, and no placeholder-feeling content.
- Interactions feel responsive and trustworthy: success, saving, syncing, and failure states are visible.

## Success Criteria

We should consider this plan complete when all of the following are true:

- Web AI validation moves from `watch/blocked` to `ready` across all workflows.
- iOS remains `ready` across all workflows after shared changes.
- Web no longer makes Spotify token requests on unrelated pages.
- Progress and community surfaces stop returning 500-level errors in the smoke run.
- Guided workout and workout log have explicit degraded states instead of silent failures.
- Every core user surface meets the premium benchmark bar described above.
- A manual design review can honestly say the product feels comparable in clarity, coaching quality, and finish to Ladder and Future.

## Surface Quality Standard

Every workflow in this plan should be upgraded to meet the following surface-level expectations.

### Acquisition, Auth, and Pricing

- The product promise is instantly clear.
- The user understands what happens after sign-up.
- Trust signals are present without clutter.
- Pricing and trial terms are legible and confidence-building.
- No setup or integration behavior leaks into signed-out surfaces.

### Onboarding and Profile Setup

- Each field explains why it exists and how it affects personalization.
- The flow feels fast, guided, and confidence-building.
- The user can see progress and expected time to completion.
- The app reflects real personalization inputs such as goals, equipment, schedule, and injuries.

### Dashboard and Daily Command Center

- The user knows today's priority within seconds.
- Readiness, nudges, and coaching insights are understandable for novices and still useful for advanced users.
- The screen creates momentum, not analysis paralysis.
- Coach, plan, workout, nutrition, and recovery entry points feel coordinated.

### Plan and Adaptation

- The weekly structure is easy to scan.
- The user can move, adapt, or swap sessions without fear.
- Schedule, equipment, injury, and readiness changes feel first-class rather than fallback behavior.
- The rationale is credible but not verbose.

### Coach and Support

- Coaching feels personal, operational, and actionable.
- Suggestions route directly into the relevant workout, nutrition, or recovery surface.
- Escalation paths are obvious when AI help is not enough.
- The app reinforces continuity, accountability, and trust.

### Workout Execution and Motion

- Starting a workout feels immediate and motivating.
- Guided workouts provide studio-quality pacing, cues, progress visibility, and exercise confidence.
- Media enriches the experience but is never a dependency for completing the workout.
- Logging, editing, and finishing a session feel tight and reliable.

### Nutrition Logging and Meal Planning

- The fastest way to log is obvious.
- The app explains confidence, uncertainty, and next steps clearly.
- Targets and meal suggestions feel personalized and attainable.
- Photo, barcode, fridge, and meal-plan flows feel like one coherent system.

### Progress, Check-In, and Recovery

- Users can immediately tell what they have done, what has changed, and what to do next.
- Trends, milestones, and achievements feel motivating rather than empty.
- Missing data states explain how to unlock richer insight.
- Recovery and readiness signals feel credible, supportive, and actionable.

### Community

- The value of joining a group or challenge is obvious.
- Actions use plain language.
- Social proof is motivating without becoming confusing or noisy.
- Empty states still feel alive and invitational.

### Settings, Integrations, and Account Management

- The user can manage profile, billing, connections, and privacy without anxiety.
- Connection states are explicit: connected, syncing, disconnected, or action required.
- Integration surfaces explain value before requesting setup effort.
- Account-management actions feel safe and reversible.

## Track 1: Web Release Blockers

### 1. Scope Spotify playback to the surfaces that actually need it

Problem:
The web app mounts `SpotifyProvider` in the global layout, which causes `/api/v1/spotify/token` to run across landing, auth, dashboard, plan, nutrition, progress, community, settings, and integrations. This is the biggest noisy failure cluster in the report and it undermines user trust.

Likely files:

- `app/layout.tsx`
- `lib/music/SpotifyProvider.tsx`
- `app/log/workout/guided/page.tsx`
- `components/music/SpotifyMiniPlayer.tsx`
- `app/api/v1/spotify/token/route.ts`
- `app/integrations/page.tsx`

Implementation tasks:

- Move Spotify player bootstrapping out of the root layout.
- Only initialize Spotify on guided workout and any surface that visibly exposes playback controls.
- Treat a missing Spotify connection as a normal disconnected state, not an app error.
- Show a clear "Connect Spotify to enable workout playback" CTA where playback is relevant.
- Make the integrations page the canonical place to connect Spotify.

Acceptance criteria:

- No `/api/v1/spotify/token` request is made on landing, auth, onboarding, dashboard, plan, nutrition, progress, community, settings, or pricing.
- Guided workout still supports Spotify for connected users.
- Non-connected users see a calm empty state instead of console noise or broken controls.

### 2. Harden the trophies flow so progress can load without backend fragility

Problem:
`/api/v1/user/trophies` returns 500 in the progress workflow. Trophies are supporting content, so they must never make the core progress experience feel broken.

Likely files:

- `app/api/v1/user/trophies/route.ts`
- `components/gamification/TrophyRoom.tsx`
- `app/progress/page.tsx`
- `app/settings/page.tsx`

Implementation tasks:

- Verify the `trophies` table shape, auth rules, and seed assumptions used by the route.
- Return `200` with an empty trophies array when the user has none.
- Degrade gracefully if trophy data is temporarily unavailable.
- Keep the progress page usable even if trophy fetch fails.

Acceptance criteria:

- Progress loads without 500s in the smoke run.
- The trophy room shows either real trophies or a stable empty state.
- Missing trophy data does not block progress trends, insights, or primary CTAs.

### 3. Harden community challenges and empty states

Problem:
`/api/v1/community/challenges` returns 500 and the report marks community as blocked. Social surfaces can be empty, but they cannot look broken.

Likely files:

- `app/api/v1/community/challenges/route.ts`
- `components/community/CommunityChallenges.tsx`
- `app/community/page.tsx`

Implementation tasks:

- Verify the `challenges` and `challenge_participation` query shape.
- Add route-level error handling and logging with a stable fallback response.
- Render a proper empty state when no challenges are available.
- Make join actions resilient to duplicate joins and transient failures.

Acceptance criteria:

- Community no longer returns 500-level errors during smoke validation.
- A user sees either active challenges or a usable empty state with a clear next step.
- Join actions provide visible success or failure feedback.

### 4. Make workout execution resilient when resources fail

Problem:
The AI report blocked workout execution because guided workout had resource-loading risk and workout log lacked clear state feedback. This is the highest-risk core workflow after the API errors.

Likely files:

- `app/log/workout/page.tsx`
- `app/log/workout/guided/page.tsx`
- `lib/workout/exercise-images.ts`
- `app/api/v1/coach/audio/route.ts`

Implementation tasks:

- Add explicit UI feedback for save, update, delete, and post-save insight states in the workout log.
- Add guided workout fallbacks when exercise media or coach audio cannot load.
- Prefer text-first completion over media dependency so the workout can still run.
- Instrument failed media loads so we can tell whether the issue is remote assets, auth, or rate limiting.

Acceptance criteria:

- Guided workout remains usable even when remote media fails.
- Workout log shows success, loading, and error feedback for all primary actions.
- The workflow no longer receives an AI `blocked` verdict.

## Track 2: Web Clarity and Trust Improvements

### 5. Replace high-jargon copy with plain-language support copy

Problem:
Nina repeatedly failed or partially failed because the web app uses elite-performance language without enough translation.

Likely files:

- `app/page.tsx`
- `app/onboarding/page.tsx`
- `app/plan/page.tsx`
- `app/log/workout/page.tsx`

Implementation tasks:

- Add plain-language helper text under advanced labels such as readiness, CNS fatigue, protocol, and synthesis.
- Rename or explain ambiguous onboarding fields such as `Sex` and `Units`.
- Make every primary section answer "what is this?" and "what should I do next?"
- Keep advanced terminology visible, but pair it with novice-friendly framing.

Acceptance criteria:

- A first-time user can understand the dashboard and onboarding without domain knowledge.
- AI persona notes for `nina_novice` no longer mention ambiguous terminology.
- The app still feels premium and coach-led rather than oversimplified.

### 6. Improve nutrition first-run guidance

Problem:
Nutrition is functional, but the report says novice users are not fully sure how to begin.

Likely files:

- `app/log/nutrition/page.tsx`
- `app/log/nutrition/meal-plan/page.tsx`
- `app/log/nutrition/fridge/page.tsx`

Implementation tasks:

- Add a "choose one way to log" explainer above describe, photo, and barcode.
- Improve first-meal empty state copy so it tells the user exactly what to do.
- Surface confidence and limitations in a more human-readable way after AI analysis.

Acceptance criteria:

- A novice user can log their first meal without guessing which tool to use.
- Nutrition no longer gets flagged for unclear state feedback.
- The nutrition flow feels cohesive with meal planning and scanner workflows.

### 7. Clarify progress unlock logic and next steps

Problem:
The progress page already has empty states, but the report still found that novice users do not understand how to unlock insights and trends.

Likely files:

- `app/progress/page.tsx`
- `app/progress/add/page.tsx`
- `app/check-in/page.tsx`

Implementation tasks:

- Turn passive empty copy into action-led guidance.
- Explain the minimum data needed for trends, AI insight, and projections.
- Link empty states directly to the fastest next action.

Acceptance criteria:

- Progress empty states tell the user what to do, how many entries are needed, and where to do it.
- AI validation stops flagging unclear unlock conditions.
- Progress feels motivating and premium even for low-data users.

### 8. Make community actions more obvious

Problem:
The community page uses labels like `Initiate Access`, which fit the brand voice but are not immediately clear to novice users.

Likely files:

- `app/community/page.tsx`
- `components/community/CommunityChallenges.tsx`

Implementation tasks:

- Rename high-friction CTAs to plain actions such as `Join group` or `Join challenge`.
- Add a one-line explanation of what happens after joining.
- Keep the high-energy style in headings, but use practical action labels.

Acceptance criteria:

- Community CTAs are self-explanatory without sacrificing visual style.
- `nina_novice` no longer fails on unclear action prompts.
- Community looks intentional and aspirational even when participation is low.

### 9. Raise the visual and interaction finish of every web core surface

Problem:
Clearing the current bugs is necessary, but it is not sufficient to match the premium feel of Ladder and Future. We need an explicit polish pass across all core web surfaces.

Likely files:

- `app/page.tsx`
- `app/onboarding/page.tsx`
- `app/plan/page.tsx`
- `app/coach/page.tsx`
- `app/log/workout/page.tsx`
- `app/log/workout/guided/page.tsx`
- `app/log/nutrition/page.tsx`
- `app/progress/page.tsx`
- `app/community/page.tsx`
- `app/settings/page.tsx`
- `app/integrations/page.tsx`

Implementation tasks:

- Review spacing, hierarchy, CTA prominence, and state transitions across every workflow.
- Remove any placeholder-feeling copy, overly dense blocks, or visually muddy panels.
- Ensure every screen has one obvious focal point and one clear next action.
- Tighten empty, loading, syncing, and success feedback so the product feels alive.
- Verify mobile layouts feel as deliberate as desktop layouts.

Acceptance criteria:

- A human review of each web workflow says it feels premium, coach-led, and production-grade.
- No core surface feels like a dashboard prototype or internal tool.
- The product quality bar is visibly closer to Ladder/Future than to a typical startup MVP.

## Track 3: iOS Polish and Regression Protection

iOS passed every audited workflow, so this track should not block release. The goal is to preserve that status while tightening the few improvement suggestions the AI judge raised.

### 10. Do a light dashboard copy pass on iOS

Likely files:

- `ios/AskKodaAI/AskKodaAI/Views/Home/HomeView.swift`

Implementation tasks:

- Add brief novice-friendly helper copy for advanced dashboard concepts.
- Shorten secondary nudges for speed-focused users.
- Keep advanced metrics visible for high-proficiency users.

Acceptance criteria:

- The iOS dashboard remains information-dense but easier to scan and explain.
- The screen still feels premium and coach-led rather than generic.

### 11. Preserve simplicity in iOS onboarding and account surfaces

Likely files:

- `ios/AskKodaAI/AskKodaAI/Views/Onboarding/OnboardingView.swift`
- `ios/AskKodaAI/AskKodaAI/Views/Settings/EditProfileView.swift`

Implementation tasks:

- Keep copy plain and confidence-building.
- Avoid introducing web-style jargon creep when shared concepts or labels change.

Acceptance criteria:

- iOS onboarding stays `ready` after any cross-platform copy updates.
- Account-management surfaces remain calm, clear, and high-trust.

### 12. Raise iOS from "passes audit" to "premium product finish"

Problem:
Passing the audit is not enough if we want parity with top-tier coaching apps. We should preserve iOS quality while improving its premium feel on every main tab and detail flow.

Likely files:

- `ios/AskKodaAI/AskKodaAI/Views/Home/HomeView.swift`
- `ios/AskKodaAI/AskKodaAI/Views/Plan/PlanView.swift`
- `ios/AskKodaAI/AskKodaAI/Views/Coach/CoachView.swift`
- `ios/AskKodaAI/AskKodaAI/Views/Log/GuidedWorkoutView.swift`
- `ios/AskKodaAI/AskKodaAI/Views/Log/LogNutritionView.swift`
- `ios/AskKodaAI/AskKodaAI/Views/Progress/BodyProgressView.swift`
- `ios/AskKodaAI/AskKodaAI/Views/Community/CommunityView.swift`
- `ios/AskKodaAI/AskKodaAI/Views/Settings/SettingsView.swift`
- `ios/AskKodaAI/AskKodaAI/Views/Integrations/IntegrationsView.swift`

Implementation tasks:

- Audit typography, spacing, CTA prominence, state design, and motion for premium feel.
- Tighten first-run empty states so they motivate action instead of simply reporting absence.
- Ensure coaching, adaptation, and progress feel emotionally engaging as well as functional.
- Align shared terminology and quality patterns with the web polish pass.

Acceptance criteria:

- iOS still passes the validator and also feels intentionally premium in manual review.
- Main-tab surfaces feel cohesive enough to stand beside Ladder and Future in fit and finish.

### 13. Add release guardrails so iOS stays ready while web changes land

Likely files:

- `scripts/run-ios-surface-smoke.mjs`
- `scripts/ai-ui-surface-validator.mjs`

Implementation tasks:

- Re-run iOS smoke and AI validation after each web blocker lands if shared APIs or copy changed.
- Keep the current surface matrix intact unless a product change requires expansion.

Acceptance criteria:

- Web fixes do not regress iOS workflow readiness.
- Benchmark quality remains visible across both platforms as the product evolves.

## Recommended Execution Order

1. Fix Spotify scoping and disconnected-state UX.
2. Fix trophies API and progress fallback behavior.
3. Fix community challenges API and community empty states.
4. Harden guided workout and workout log degraded states.
5. Run the web smoke test.
6. Do the web microcopy and surface-finish pass for dashboard, onboarding, nutrition, progress, community, settings, and integrations.
7. Run the full AI validator.
8. Apply the premium-finish pass across iOS main surfaces.
9. Run a final cross-platform manual review against the premium benchmark bar.

## Benchmark Review Checklist

Use this checklist during implementation reviews on both web and iOS:

- Would a new user instantly understand what to do next?
- Would a busy returning user complete the task with minimal friction?
- Would an advanced user trust the recommendations and metrics?
- Does the screen feel like a polished coaching product rather than a utility dashboard?
- If this screen were shown next to Ladder or Future, would it still feel premium?
- If the happy path fails, does the fallback still preserve confidence and momentum?

## Verification Commands

```bash
npm run test:web:surfaces
npm run test:ios:surfaces
npm run validate:ui:ai
```

## Suggested First Sprint

If we want the smallest useful first sprint, it should include only these items:

- Spotify scoping and disconnected-state UX
- Trophies route hardening
- Community challenges route hardening
- Guided workout fallback states

That sprint should be enough to remove the biggest false-breakage signals and give the web app a realistic chance of moving from `blocked/watch` to mostly `ready`, which then creates the right foundation for the premium finish pass.
