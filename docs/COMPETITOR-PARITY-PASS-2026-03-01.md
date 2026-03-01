# Competitor Parity Pass (March 1, 2026)

## Scope

This pass answers one question:
- Are the implemented P0/P1/P2 features at quality parity with leaders like Future and adjacent AI fitness competitors?

Evaluation inputs:
- Current code implementation (`app/`, `lib/`, `supabase/migrations/`, tests)
- Latest workflow validation reports in `docs/reports/`
- Public competitor product claims from official sites/help centers

## External Benchmarks (latest checked)

- Future:
  - [Future Pro](https://future.co/pro)
  - [Future homepage](https://future.co/)
  - [Smartwatch requirement/help](https://faq.future.co/en/articles/12073347-do-i-need-a-smartwatch-to-use-future)
- Fitbod:
  - [How Fitbod creates workouts](https://fitbod.zendesk.com/hc/en-us/articles/360004429814-How-Fitbod-Creates-Your-Workout)
  - [Understanding Fitbod](https://fitbod.zendesk.com/hc/en-us/sections/360001078993-Understanding-Fitbod-How-It-Works)
- Caliber:
  - [Caliber app (AI + progression)](https://usecaliber.app/)
  - [Caliber coaching](https://caliberstrong.com/)
  - [Caliber FAQs (coach cadence)](https://caliberstrong.com/faqs/)
  - [Caliber workout app](https://caliberstrong.com/workout-app/)
- Freeletics:
  - [Freeletics HIIT app page](https://www.freeletics.com/en/hiit-workout-app/)
  - [Adapt session options](https://help.freeletics.com/hc/en-us/articles/360003933780-Adapt-your-Bodyweight-training-session)
  - [Training journey adaptation](https://help.freeletics.com/hc/fr/articles/360001805519-Choisir-votre-Parcours-d-Entra%C3%AEnement-Freeletics)
- Noom:
  - [Noom Premium (1:1 + AI)](https://www.noom.com/support/faqs/using-the-app/daily-features/2025/10/what-is-the-premium-subscription/%3Fsrsltid%3DAfmBOopNdBKc4oXvDxICRlOU7RAHBG30UjwOpUug_FB49nmf5RX5blAY)
  - [Noom GLP-1 Companion](https://www.noom.com/support/faqs/using-the-app/daily-features/2025/10/glp-1-companion/)
- WHOOP:
  - [WHOOP 2025 launch summary](https://www.whoop.com/hr/en/thelocker/everything-whoop-launched-in-2025/)
  - [OpenAI + WHOOP case study](https://openai.com/index/whoop/)

## FitNova Implementation Verified

Implemented and shipped in code:
- Weekly planning and persistence:
  - `GET/POST /api/v1/plan/weekly`
  - `lib/plan/compose-weekly-plan.ts`
  - `weekly_plans` table
- Daily planning with schedule + weekly context:
  - `lib/plan/compose-daily-plan.ts`
- Guided in-session substitution:
  - `POST /api/v1/plan/swap-exercise`
  - Guided UI swap controls in `/log/workout/guided`
- Retention signal + nudges:
  - `POST /api/v1/ai/retention-risk`
  - `coach_nudges` table + dashboard section
- Reminder dispatch:
  - `POST /api/v1/jobs/reminders`
  - `lib/jobs/reminder-dispatch.ts`
- Hybrid coach escalation:
  - `GET/POST /api/v1/coach/escalate`
  - `/coach/escalate` page + `coach_escalations` table
- Performance analytics:
  - `GET /api/v1/analytics/performance`
  - dashboard/progress analytics surfaces
- AI explainability metadata:
  - reliability payloads in analyze-meal, vision, body-comp
- Workflow QA harness:
  - `scripts/ai-workflow-validator.mjs`
  - latest deterministic pass: `docs/reports/ai-workflow-validation-20260301-024827.md`

## Quality Parity Score (implementation quality, not just feature presence)

Scoring rubric: 0-100 weighted by user outcome impact.

| Dimension | Weight | FitNova Score | Notes |
|---|---:|---:|---|
| Human coaching/accountability depth | 20 | 8 | Escalation intake exists, but no staffed response workflow/SLA or coach-side tooling. |
| Adaptive planning depth | 15 | 9 | Weekly+daily adaptation exists, but mostly rule/template based and limited to shallow signals. |
| In-session adaptation quality | 10 | 7 | Swap works in guided mode; no live load/rep autoregulation loop. |
| Progression intelligence/analytics | 15 | 7 | Good summary metrics; lacks robust PR/1RM model and long-horizon progression logic. |
| Nutrition coaching loop | 10 | 6 | Fast AI estimation, but limited structured adherence/programmed nutrition continuity. |
| Integrations/data connectivity | 10 | 3 | Apple Health import only; no broad live wearable/data sync parity. |
| Trust/safety/explainability | 10 | 7 | Confidence+limitations shipped; no calibration feedback loop yet. |
| QA/reliability discipline | 10 | 9 | Lint/test/build + workflow validator + route hardening in place. |
| **Total** | **100** | **56** | **Broad feature coverage, but not quality parity with leaders yet.** |

## Competitor-by-Competitor Parity Verdict

### Future (primary benchmark)

Current parity:
- Guided sessions and workout adaptation controls are present.
- Scheduling flexibility and plan regeneration are present.

Material gaps:
- Future leads with continuous 1:1 coach relationship, proactive accountability, and wearable-driven personalization.
- FitNova currently provides escalation intake, not ongoing human coaching operations.

Verdict:
- **Not at quality parity** for core Future differentiator (human accountability + integrated coaching cadence).

### Fitbod

Current parity:
- Workout generation/adaptation and user-initiated substitutions are implemented.

Material gaps:
- Fitbod emphasizes feedback learning loops (recommend more/less/exclude, RiR, estimated strength/1RM, recovery heatmap influence).
- FitNova lacks comparable progression memory and intensity autoregulation depth.

Verdict:
- **Partial parity** on adaptation surface, **below parity** on progression intelligence.

### Caliber

Current parity:
- AI coaching feedback and workout logging/planning surfaces exist.

Material gaps:
- Caliber combines progression suggestions, PR-centric analytics, richer coaching cadence, and stronger coaching communication operations.
- FitNova analytics are currently lighter and mostly 14-day summary metrics.

Verdict:
- **Below parity** on coaching operations and analytics maturity.

### Freeletics

Current parity:
- Workout adaptation exists and includes swap-by-context behavior.

Material gaps:
- Freeletics supports broader in-session adaptation choices (time, space, equipment, noise, body-area exclusions, difficulty shifts) and deep journey-level adaptation patterns.
- FitNova adaptation set is narrower.

Verdict:
- **Near parity** on concept, **below parity** on adaptation breadth/depth.

### Noom (behavior + coaching benchmark)

Current parity:
- AI coaching surfaces and reminders are present.

Material gaps:
- Noom Premium combines 1:1 coach + 24/7 AI assistant with a structured behavior-change curriculum and coaching cadence.
- FitNova does not yet have comparable behavior curriculum orchestration or active coach-layer service delivery.

Verdict:
- **Below parity** on behavior-change and coaching program quality.

### WHOOP (AI + contextual guidance benchmark)

Current parity:
- AI insights and readiness/projection surfaces exist.

Material gaps:
- WHOOP guidance uses dense wearable data context plus persistent user memory across app contexts.
- FitNova currently has limited integration breadth and no equivalent contextual memory system tied to broad physiology streams.

Verdict:
- **Below parity** on context richness and physiology-connected guidance.

## Key Quality Gaps That Block Parity Claims

### P0 gaps (must close for “parity” claim)

1. Human accountability operations
- Escalation requests are stored, but there is no staffed assignment flow, SLA tracking, or guaranteed response mechanism.

2. Progression intelligence
- Missing robust per-exercise progression state (PRs, estimated strength trends, autoregulated load/reps over mesocycles).

3. Live data integration depth
- Apple Health import is useful but not parity with broad, continuous wearable-linked adaptation.

### P1 gaps

1. Adaptation breadth in-session
- Need richer “adapt session” controls (time, equipment, space, noise, body-region exclusions) and instant full-session rebuild.

2. Behavioral retention mechanics
- Current nudges are useful but still basic versus structured habit programs and rescue protocols.

3. Trust calibration loop
- Confidence is displayed but not calibrated over time with user corrections/outcome feedback.

## Bottom Line

- Feature coverage is strong and rapidly improving.
- Quality parity with Future and top competitors is **not achieved yet**.
- Current state is best described as:
  - **“Competitive feature breadth”**
  - **“Mid-tier quality depth”**
  - **“Below-parity on human accountability, progression intelligence, and integration depth.”**

## Recommended Next Parity Sprint (4-6 weeks)

1. Ship coach-ops layer:
- Escalation assignment queue, response SLA, staff notifications, and user-visible ETA/state machine.

2. Ship progression engine v1:
- Exercise-level PR tracking, estimated strength trends, autoregulated next-session targets, plateau logic.

3. Expand adaptation controls:
- Full “adapt session” panel in guided mode with immediate regenerated workout variants.

4. Expand integration strategy:
- Start with one continuous wearable path (not import-only), then widen.

5. Add trust calibration:
- Capture user corrections on AI estimates and feed calibration metrics into reliability scoring.
