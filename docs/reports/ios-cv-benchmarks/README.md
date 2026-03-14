# iOS CV Benchmark Artifacts

This directory is the operator collection point for Motion Lab benchmark exports gathered from physical-device runs.

## Runtime output

Realtime Motion Lab sessions write JSON artifacts on-device under:

- `Documents/MotionLabReports/squat/`
- `Documents/MotionLabReports/hinge/`
- `Documents/MotionLabReports/press/`
- `Documents/MotionLabReports/pull/`

The app also surfaces the saved filename in the Motion Lab and Guided Workout result cards through `benchmark_report_path`.

## Report schema

Each exported JSON file includes:

- `pattern`
- `repCount`
- `benchmark.averageFPS`
- `benchmark.p50LatencyMs`
- `benchmark.p95LatencyMs`
- `benchmark.processedFrames`
- `benchmark.droppedFrames`
- `velocity.peakVelocityMps`
- `velocity.meanVelocityMps`
- `velocity.velocityDropoffPercent`
- `velocity.fastestRepMps`
- `velocity.slowestRepMps`
- `createdAt`

## Collection workflow

1. Run a realtime Motion Lab or Guided Workout form-check session on supported hardware.
2. Finish the session and note the benchmark filename surfaced in the result card.
3. Pull the matching JSON artifact from the app documents container.
4. Copy the artifact into this directory or an exercise-specific subdirectory for review.

## Release note

Velocity is intentionally labeled as a camera-derived estimate. Do not describe these exports as calibrated barbell telemetry without separate hardware-ground-truth validation.
