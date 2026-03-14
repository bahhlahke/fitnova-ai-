# On-Device CV Implementation Plan

Date: 2026-03-10
Branch baseline: `codex/sit-feature-complete`
Owner area: iOS Motion Lab / SIT Phase 4

## Objective

Replace the current server-mediated Motion Lab flow with an iOS-first on-device movement analysis runtime that:

- processes pose frames locally at greater than 24 FPS on supported devices,
- emits coaching cues with p95 latency below 200 ms,
- supports rep segmentation and occlusion-aware confidence handling,
- preserves the current server API as a fallback and offline-safe audit sink.

## Current implementation status on `codex/sit-feature-complete`

Shipped in this branch:

- local-first photo pose analysis in iOS Motion Lab and Guided Workout form check
- capability gating for Low Power Mode and thermal pressure
- automatic fallback to the existing `/api/v1/ai/vision` path
- response metadata for source, analysis mode, latency, frames analyzed, and pose confidence
- telemetry hooks for local vs fallback analysis runs
- real-time camera-frame pose loop for Motion Lab and Guided Workout on supported devices
- local skeleton overlay rendering
- exercise rule packs for squat, hinge, press, and pull
- rep segmentation and live cues across supported movement patterns
- camera-derived velocity summaries for peak, mean, and dropoff
- benchmark capture for average FPS, p50/p95 latency, processed frames, dropped frames, and persisted JSON report artifacts

Branch status:

- The product scope described by this plan is now implemented for the current supported movement set.
- Velocity remains intentionally labeled as a camera-derived estimate, not exact barbell hardware telemetry.
- The remaining work is operational: collecting hardware benchmark evidence and validating simulator/XCTest stability when CoreSimulator is healthy.

## Current baseline

Today Motion Lab is not on-device CV:

- iOS uploads sampled frames through [`KodaAPIService.aiVision`](/Users/blakeaycock/code/fitnessAI/ios/AskKodaAI/AskKodaAI/Services/KodaAPIService.swift#L331)
- the web API caps analysis to three frames in [`app/api/v1/ai/vision/route.ts`](/Users/blakeaycock/code/fitnessAI/app/api/v1/ai/vision/route.ts#L24)
- a remote vision model returns score, critique, and correction in [`app/api/v1/ai/vision/route.ts`](/Users/blakeaycock/code/fitnessAI/app/api/v1/ai/vision/route.ts#L41)

That path remains the fallback while the local runtime is developed.

## Delivery phases

### Phase 0: Capability gate and measurement harness

Ship first:

- `FF_IOS_CV_REP_SEGMENTATION` becomes a real capability gate, not just a placeholder.
- Add a device capability detector in iOS:
  - supported tiers by chip family and thermal state
  - fallback to current remote Motion Lab path when unsupported
- Add a benchmark harness that records:
  - average FPS
  - p50/p95 frame processing latency
  - p50/p95 cue latency
  - dropped-frame rate
  - thermal throttling events

Files likely involved:

- `ios/AskKodaAI/AskKodaAI/Views/Log/MotionLabView.swift`
- `ios/AskKodaAI/AskKodaAI/Services/KodaAPIService.swift`
- new `ios/AskKodaAI/AskKodaAI/Camera/` runtime components
- new `ios/AskKodaAI/AskKodaAI/Services/MotionLab/BenchmarkHarness.swift`

Exit criteria:

- benchmark report artifact saved under `docs/reports/ios-cv-benchmarks/`
- fallback path verified on unsupported devices

### Phase 1: Local pose loop

Build:

- camera capture pipeline using `AVCaptureSession`
- pose inference adapter abstraction:
  - initial provider can be Vision or MediaPipe, but keep a protocol boundary
- temporal smoothing and keypoint confidence filtering
- local overlay renderer for skeleton and confidence state

Architecture:

- `CameraCaptureSession`
- `PoseEstimator`
- `PoseFrame`
- `PoseSmoother`
- `MotionOverlayView`

Exit criteria:

- stable local pose frames rendered in real time
- FPS gate met in controlled benchmark runs on supported devices

### Phase 2: Rep segmentation and movement state machine

Build:

- exercise-specific rep state machine for:
  - squat
  - hinge/deadlift
  - press
  - pull
- phase detection:
  - eccentric
  - bottom
  - concentric
  - lockout
- confidence-aware suppression when tracking quality drops

Data model additions:

- `RepSegment`
- `MovementPhase`
- `PoseFault`
- `CueDecision`

Exit criteria:

- rep counts match labeled test clips within agreed tolerance
- false cue rate stays under target on validation set

### Phase 3: Cue engine

Build:

- deterministic fault rules for first supported lifts:
  - knee valgus
  - depth inconsistency
  - lumbar flexion risk
  - bar path drift proxy
- local cue scheduler with cooldowns to avoid spam
- audio + visual cue emission
- telemetry events:
  - `cv_cue_emitted`
  - `cv_occlusion_suppressed`

Safety rules:

- no injury/medical language from CV runtime
- confidence floor for any spoken cue
- fallback cue when uncertain: “tracking lost, reset camera angle”

Exit criteria:

- p95 cue latency < 200 ms on supported devices
- cue spam suppression verified in replay harness

### Phase 4: Velocity and VBT channel

Build:

- bar/landmark trajectory proxy from pose and tracked reference points
- concentric velocity estimates for supported barbell lifts
- fatigue/dropoff cue rules
- session summary metrics:
  - fastest rep
  - slowest rep
  - dropoff percentage

Important constraint:

- do not market this as exact barbell velocity until calibrated against external ground truth.
- label as “camera-derived velocity estimate” until benchmarked.

Exit criteria:

- velocity estimates correlated against labeled benchmark clips
- acceptable error bounds documented before release

## Testing strategy

### Unit tests

- pose smoothing math
- rep segmentation transitions
- cue cooldown rules
- confidence threshold suppression

### Fixture replay tests

Add a local clip corpus:

- ideal reps
- common faults
- poor lighting
- partial occlusion
- front/side angle variance

### Benchmark protocol

Run on:

- latest flagship iPhone
- one mid-tier supported device
- one unsupported/older device for fallback validation

Record:

- FPS
- p50/p95 inference latency
- p50/p95 cue latency
- CPU/GPU pressure
- thermal degradation over 3-minute continuous sets

## Rollout plan

1. Internal dogfood behind feature flag.
2. Supported-device beta with telemetry only.
3. Cue engine enabled for a single lift family.
4. Expand lift coverage after benchmark and false-positive review.
5. Keep server Motion Lab fallback for unsupported devices and degraded sessions.

## Immediate engineering tasks

Completed on this branch:

- capability-gated local runtime with server fallback
- realtime pose loop and overlay
- multi-lift rep segmentation
- cue engine with cooldowns and tracking-loss suppression
- camera-derived velocity and dropoff metrics
- benchmark artifact persistence and UI surfacing

Next operational tasks:

- collect hardware benchmark reports into [`docs/reports/ios-cv-benchmarks/`](/Users/blakeaycock/code/fitnessAI/docs/reports/ios-cv-benchmarks)
- validate sustained FPS/latency on supported physical iPhones
- resolve the Xcode/CoreSimulator host-launch instability observed in `npm run test:ios`

1. Add `MotionLabRuntime` module boundary in iOS.
2. Create `PoseEstimator` protocol and mock implementation for tests.
3. Add benchmark report writer and CI artifact collection.
4. Add a device capability gate plus fallback selection policy.
5. Define first-lift rule pack for squat pattern only.

## Release gate

Do not call on-device CV production ready until all are true:

- supported-device benchmark artifacts exist,
- FPS and latency thresholds are met,
- fallback behavior is automatic and tested,
- cue precision has been measured on labeled fixtures,
- product copy has been updated to match actual shipped capability.
