# SIT Gap Closure — Comprehensive Implementation Plan (Feature Branch Execution)

Date: 2026-03-09  
Branch: `feature/sit-phase-2-4-plan`  
Source inputs:

- `docs/reports/sit-gap-audit-2026-03-09.md`
- `docs/reports/sit-gap-closure-plan-2026-03-09.md`

---

## 1. Outcome and scope (Phase 2-4 directive)

This plan operationalizes the SIT gap closure blueprint into implementation-ready epics, tickets, validation gates, and rollout controls for web + iOS, with active execution moved to **Phase 2-4**.

### Scope decision

- **Phase 1 (Safety + contracts)** is treated as a dependency baseline and must remain stable.
- **Execution focus now:**
  - **Phase 2:** Brain orchestration + deterministic auto-regulation
  - **Phase 3:** Voice + memory intelligence with deterministic substitutions
  - **Phase 4:** iOS realtime CV + VBT feedback loop
- Wearables normalization is pulled forward where required to unblock Phase 2 readiness orchestration inputs.

### Success criteria

1. Deterministic auto-regulation mutates daily plans before delivery when fatigue/risk thresholds are exceeded.
2. Safety validator blocks unsafe prescriptions before persistence or user delivery.
3. Wearables flow through a canonical normalization + confidence layer and directly influence mutation policy.
4. Voice pipeline supports streaming duplex and deterministic symptom-triggered substitutions.
5. iOS CV prototype reaches realtime thresholds in controlled environments.

---

## 2. Delivery model and branch strategy

### Branching

- Parent integration branch: `feature/sit-phase-2-4-plan`
- Child branches (merge into parent via PR):
  - `feature/sit-phase2-readiness-orchestrator`
  - `feature/sit-phase2-wearables-canonical-readiness`
  - `feature/sit-phase3-voice-memory-substitution`
  - `feature/sit-phase4-ios-cv-vbt`

### Phase 2-4 sequencing policy

1. Land deterministic readiness orchestration + mutation traces first (Phase 2 core).
2. Land voice streaming and physical history graph on top of Phase 2 telemetry (Phase 3).
3. Land iOS CV/VBT runtime behind capability-gated flags with fallback modes (Phase 4).
4. Keep all Phase 2-4 increments behind kill-switches until KPI gates are met.

### Environments

- Local + Preview (Vercel) for API and web checks.
- iOS simulator for device/runtime performance checks.
- Supabase staging project for schema rollout + backfill rehearsal.

### Release toggles (required)

- `FF_SAFETY_VALIDATOR_ENFORCE`
- `FF_READINESS_ORCHESTRATOR`
- `FF_AUTO_MUTATION_TRACE`
- `FF_VOICE_DUPLEX_STREAMING`
- `FF_IOS_CV_REP_SEGMENTATION`

---

## 3. Workstream plan by pillar

## Pillar 1 — Brain (deterministic auto-regulation)

### Epic P1.1 — Canonical readiness snapshots

**Implementation tasks**

- Add schema/tables:
  - `readiness_snapshots`
  - `policy_versions`
- Build feature-vector computation service using:
  - ACWR
  - sleep debt
  - HRV delta (21-day baseline)
  - RHR delta
  - strain
  - soreness severity
  - adherence decay
  - pain flags
- Emit reason codes and confidence with each snapshot.

**Primary code surfaces**

- `app/api/v1/**` readiness and plan routes
- `lib/**` scoring + feature builders
- `types/**` schema-aligned types

**Acceptance**

- Deterministic fixture inputs always produce stable readiness output.
- Snapshot rows persist with policy version linkage.

### Epic P1.2 — Readiness orchestrator + auto-mutation

**Implementation tasks**

- Create deterministic policy engine for `green|amber|red` pathways.
- Wire orchestrator into daily-plan response path (pre-delivery hook).
- Persist `plan_mutations` with before/after diffs and policy IDs.
- Add user-visible adaptation rationale API payload.

**Acceptance**

- `RED` path enforces cap and volume reduction rules.
- Daily plan API returns `mutation_trace` when mutation occurs.
- No plan emitted without validator pass.

### Epic P1.3 — Historical backtesting harness

**Implementation tasks**

- Build replay job over sampled 90-day user timelines.
- Generate mutation summary metrics:
  - mutation frequency
  - blocked unsafe drafts
  - adherence proxy change
- Save results under `docs/reports/` for governance review.

**Acceptance**

- Replay deterministic across repeated runs.
- Output includes per-policy false-positive review set.

---

## Pillar 5 — Safety protocols (blocking gate)

### Epic P5.1 — Prescription validator service

**Implementation tasks**

- Implement guardrails:
  - weekly set delta caps by movement pattern
  - max intensity delta by training age
  - rolling high-intensity day limits
  - minimum recovery spacing
- Insert validator in both deterministic and LLM rewrite paths.
- Fail closed when validator service unavailable.

**Acceptance**

- Known unsafe fixtures blocked in CI.
- Rejection reasons and policy IDs exposed in audit logs.

### Epic P5.2 — 1RM anomaly quarantine

**Implementation tasks**

- Add anomaly rules using bodyweight/training-age/trend checks.
- Quarantine improbable entries from progression calculations.
- Emit anomaly events for review queue.

**Acceptance**

- Outlier inputs are excluded from progression updates.
- Audit ledger records decision path.

### Epic P5.3 — Safety ledger + governance

**Implementation tasks**

- Append-only ledger for blocked/modified outputs.
- Require policy version bump + changelog on threshold changes.
- Add red-team prompt suite in CI before policy deploy.

**Acceptance**

- Every block/override queryable by user, policy, and timestamp.
- CI fails when policy config changes without version bump.

---

## Pillar 4 — Nervous system (wearables normalization)

### Epic P4.1 — Provider normalization layer

**Implementation tasks**

- Define canonical schema for sleep/readiness/strain/HRV/RHR/respiration/SpO2/steps/glucose proxy.
- Implement source confidence weighting per provider.
- Build readiness-vector adapter for orchestrator input.

**Acceptance**

- All supported providers map into canonical contract.
- Orchestrator consumes canonical readiness object only.

### Epic P4.2 — Sync resiliency + reconciliation

**Implementation tasks**

- Add webhook replay queue.
- Add nightly reconciliation backfill job.
- Build completeness and drift monitors.

**Acceptance**

- Reconciliation restores >99% missed events (staging replay test).
- Daily completeness dashboard available.

### Epic P4.3 — Oura connector path

**Implementation tasks**

- Implement first-class Oura ingest adapter on canonical contract.
- Add provider-level auth and token refresh handling.

**Acceptance**

- Oura data reaches canonical storage + readiness builder.

---

## Pillar 3 — Voice + memory

### Epic P3.1 — Duplex runtime

**Implementation tasks**

- Implement streaming ASR → incremental LLM → interruption-safe TTS pipeline.
- Add barge-in and turn arbitration state machine.
- Introduce kill-switch fallback to current request/response path.

**Acceptance**

- Interruption tests pass (user cuts in during TTS).
- Measured latency within agreed pilot threshold.

### Epic P3.2 — Physical History Graph

**Implementation tasks**

- Add entities for symptoms, injury episodes, substitutions, outcomes.
- Create retrieval policy keyed by symptom recurrence.
- Integrate graph retrieval into coach context assembly.

**Acceptance**

- Recurrence test retrieves prior successful substitution chain.

### Epic P3.3 — Deterministic substitution middleware + ontology

**Implementation tasks**

- Define exercise ontology v1 (IDs, aliases, contraindications, equivalence classes).
- Enforce contraindication checks before LLM final answer.
- Auto-route symptom intents through deterministic substitution engine.

**Acceptance**

- Contraindicated movement requests are blocked and safely substituted.

---

## Pillar 2 — iOS realtime CV and VBT

### Epic P2.1 — On-device pose loop

**Implementation tasks**

- Implement iOS inference module with temporal smoothing + rep phase segmentation.
- Add confidence outputs and visibility score.
- Support quality tiers for older devices.

**Acceptance**

- Benchmark profile shows >24 FPS in target simulation harness.

### Epic P2.2 — Joint-angle + compensation rules

**Implementation tasks**

- Add exercise-specific angle thresholds and compensation detectors.
- Trigger cue events with confidence gating.

**Acceptance**

- Recorded clip suite reports precision/recall per-lift with minimum thresholds.

### Epic P2.3 — Velocity channel and realtime cues

**Implementation tasks**

- Estimate concentric velocity with confidence score.
- Trigger fatigue stop when velocity-loss threshold crossed.
- Stream cues to UI overlays and voice output.

**Acceptance**

- p95 cue latency <200ms in lab harness on supported devices.

---

## 4. Phase 2-4 implementation schedule (sprints 5-12)

| Sprint | Phase | Core objective                     | Key deliverables                                | Exit gate                          |
| ------ | ----- | ---------------------------------- | ----------------------------------------------- | ---------------------------------- |
| 5      | 2     | Auto-regulate plans                | orchestrator in daily plan API + mutation trace | mutated plans in API response      |
| 6      | 2     | Explainability + wearable coupling | rationale payload + canonical readiness adapter | traceability + canonical input use |
| 7      | 3     | Voice streaming pilot              | ASR/LLM/TTS with interruption handling          | duplex test matrix pass            |
| 8      | 3     | History graph                      | symptom/substitution memory read/write          | recurrence retrieval pass          |
| 9      | 3     | Substitution guardrails            | ontology v1 + deterministic middleware          | contraindication enforcement pass  |
| 10     | 4     | iOS CV runtime                     | on-device rep segmentation prototype            | FPS gate pass                      |
| 11     | 4     | VBT + cue loop                     | velocity estimation + realtime cue stream       | latency gate pass                  |
| 12     | 4     | Hardening + release prep           | E2E reliability tuning + staged rollout plan    | go/no-go checklist pass            |

### Phase 2-4 entry criteria

- Phase 1 validator + anomaly controls remain enabled in production.
- Policy versions are immutable and auditable.
- Rollback playbook tested in staging.

---

## 5. Testing, quality gates, and observability

### Mandatory CI gates

- `npm run lint`
- `npm test`
- `npm run build`
- Deterministic policy test suite (new)
- Unsafe prescription fixture suite (new)
- Red-team substitution safety suite (new)

### iOS validation gates

- `npm run test:ios`
- `npm run test:ios:surfaces`
- CV benchmark harness with FPS + latency metrics

### Telemetry (must ship with each epic)

- `readiness_snapshot_created`
- `plan_mutation_applied`
- `prescription_blocked`
- `substitution_policy_triggered`
- `cv_cue_emitted`
- `cv_occlusion_suppressed`

Each event includes: user ID hash, policy version, confidence, device tier, latency (if realtime path).

---

## 6. Data migration and rollout controls

### Migration sequence

1. Create new tables and indexes behind non-enforcing feature flags.
2. Backfill baseline readiness snapshots for active users.
3. Enable shadow mode: orchestrator runs and logs mutations without user-visible changes.
4. Compare shadow vs production outcomes for 2 weeks.
5. Turn on enforcement for 5% cohort, then 25%, then 100% with rollback checkpoints.

### Rollback strategy

- Hard-disable `FF_SAFETY_VALIDATOR_ENFORCE` only with incident ticket + on-call approval.
- Keep last known stable policy version pinned for immediate reversion.
- Fall back from duplex voice to standard chat/TTS path.

---

## 7. Ownership and operating cadence

### Core owners

- Product + Platform: orchestration + API integration.
- Safety: validator rules, anomaly policy, governance.
- Data/Infra: provider normalization + reconciliation.
- iOS/CV: realtime inference and cue runtime.
- QA: scenario matrix, red-team suites, release gate evidence.

### Cadence

- Weekly architecture review (cross-pillar dependencies).
- Twice-weekly policy review for threshold/version changes.
- End-of-sprint SIT readiness review with KPI delta report.

---

## 8. Immediate execution backlog (next 10 business days, Phase 2-4)

1. Enable orchestrator shadow-run in daily plan API and emit `plan_mutation_applied` telemetry.
2. Implement canonical readiness adapter so orchestrator consumes normalized wearable input only.
3. Stand up Phase 2 replay harness over 90-day timelines and publish benchmark report.
4. Stand up streaming voice pilot path (ASR/LLM/TTS) with barge-in scenario tests.
5. Implement Physical History Graph v1 write/read paths and recurrence retrieval checks.
6. Publish exercise ontology v1 seed + deterministic substitution policy mapping.
7. Define iOS CV benchmark protocol and run baseline FPS/latency benchmarks for Sprint 10 entry.

---

## 9. Definition of done (program)

The SIT gap closure effort is complete when:

- Deterministic readiness + safety policies are enforcing in production for 100% eligible users.
- Mutation and safety decisions are auditable through ledger + trace APIs.
- Symptom recurrence reliably triggers deterministic substitutions.
- Supported iOS devices satisfy realtime cue performance thresholds.
- KPI targets from the closure blueprint are met for two consecutive reporting windows.
