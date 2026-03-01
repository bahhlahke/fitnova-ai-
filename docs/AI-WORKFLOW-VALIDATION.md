# AI Workflow Validation

This repository now includes an AI-assisted workflow validator:

- Script: `scripts/ai-workflow-validator.mjs`
- NPM command: `npm run workflow:validate:ai`

## What it does

- Runs deterministic checks across major user workflows (routes + APIs).
- Simulates persona-based workflow evaluation with an AI judge (OpenRouter) when `OPENROUTER_API_KEY` is set.
- Writes a markdown report to `docs/reports/` with:
  - Pass/partial/fail by workflow
  - Step-level evidence
  - AI friction points and prioritized recommendations

## Workflows covered

- Signed-out acquisition funnel
- Onboarding and shell entry
- Dashboard AI
- Weekly planning
- Nutrition logging + AI endpoints
- Workout + guided + post-workout insights + live exercise swap
- Motion analysis + body composition scan
- Progress + check-ins + projection + retention risk + performance analytics
- Settings + exports + billing + coach escalation + reminder job endpoint
- Legacy route redirects

## Usage

1. Start the app locally:

```bash
npm run dev
```

2. In another terminal, run the validator:

```bash
npm run workflow:validate:ai
```

Optional flags:

```bash
node scripts/ai-workflow-validator.mjs --base-url http://localhost:3000 --timeout-ms 12000
node scripts/ai-workflow-validator.mjs --base-url http://localhost:3000 --no-ai
node scripts/ai-workflow-validator.mjs --output docs/reports/custom-workflow-report.md
```

## Environment variables

- `OPENROUTER_API_KEY`: enables AI judge mode.
- `WORKFLOW_BASE_URL`: default base URL override.
- `WORKFLOW_VALIDATOR_MODEL`: default `openai/gpt-4o-mini`.
- `WORKFLOW_TIMEOUT_MS`: request timeout per step.

## Notes

- Deterministic checks run regardless of AI availability.
- AI judge mode is designed for UX/friction analysis, not strict API correctness.
- For authenticated deep workflow validation, run this against an environment with seeded test users and auth session setup.
