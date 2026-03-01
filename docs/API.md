# FitNova AI — API

## POST `/api/v1/ai/respond`

Chat endpoint for the AI coach. Uses OpenRouter; when the user is signed in, context (profile, recent workouts, nutrition, conversation history) is assembled and injected into the system prompt.

### Request

- **Method:** `POST`
- **Headers:** `Content-Type: application/json`
- **Auth:** Session cookie (Supabase) required in production behavior.
- **Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `message` | string | Yes | User message; must be non-empty after trim. |

**Example**

```json
{ "message": "What should I do for upper body today?" }
```

### Response

**Success (200)**

```json
{ "reply": "..." }
```

**Errors**

| Status | Body | Cause |
|--------|------|--------|
| 400 | `{ "error": "...", "code": "INVALID_JSON" \| "VALIDATION_ERROR" }` | Malformed or invalid body. |
| 401 | `{ "error": "...", "code": "AUTH_REQUIRED" }` | No signed-in user. |
| 429 | `{ "error": "...", "code": "RATE_LIMITED" }` | User exceeded request limit. |
| 500 | `{ "error": "...", "code": "INTERNAL_ERROR" }` | Internal error. |
| 502 | `{ "error": "...", "code": "UPSTREAM_ERROR" }` | Provider failure. |
| 503 | `{ "error": "...", "code": "SERVICE_UNAVAILABLE" }` | `OPENROUTER_API_KEY` not set. |

### Behavior

- The handler loads profile, recent workout/nutrition logs, and latest conversation from Supabase and builds a system prompt via `lib/ai/assemble-context.ts`.
- Safety policy is appended to system prompt (balanced mode: no diagnosis/treatment, injury-aware alternatives, escalation guidance).
- Requests are rate limited per user and bounded by message length.
- The request is sent to OpenRouter (`openai/gpt-4o-mini`); reply is returned and appended to `ai_conversations`.

## POST `/api/v1/plan/daily`

Builds and stores a personalized day plan for the signed-in user.

### Request

- **Method:** `POST`
- **Headers:** `Content-Type: application/json`
- **Auth:** Session cookie (Supabase) required.
- **Body:** optional constraints

```json
{
  "todayConstraints": {
    "minutesAvailable": 45,
    "location": "gym",
    "soreness": "mild lower body soreness"
  }
}
```

### Response

**Success (200)**

```json
{
  "plan": {
    "date_local": "2026-02-24",
    "training_plan": {},
    "nutrition_plan": {},
    "safety_notes": []
  }
}
```

### Errors

| Status | Body | Cause |
|--------|------|--------|
| 401 | `{ "error": "...", "code": "AUTH_REQUIRED" }` | No signed-in user. |
| 429 | `{ "error": "...", "code": "RATE_LIMITED" }` | User exceeded request limit. |
| 500 | `{ "error": "...", "code": "INTERNAL_ERROR" }` | Plan generation or persistence failed. |

## GET/POST `/api/v1/plan/weekly`

Returns or regenerates a 7-day microcycle plan based on goals, recent training, recovery signals, and schedule preferences.

- `GET`: returns existing weekly plan for current local week; `?refresh=1` regenerates.
- `POST`: forces regeneration and persistence.

## POST `/api/v1/plan/swap-exercise`

Returns a substitution for the current guided exercise.

**Request example**

```json
{
  "currentExercise": "Back Squat",
  "reason": "knee soreness",
  "location": "gym",
  "sets": 4,
  "reps": "6-8",
  "intensity": "RPE 7"
}
```

**Response**

```json
{
  "replacement": {
    "name": "Box Squat",
    "sets": 4,
    "reps": "6-8",
    "intensity": "RPE 6-7",
    "notes": "Use pain-free depth and slow tempo."
  },
  "reliability": {
    "confidence_score": 0.77,
    "explanation": "...",
    "limitations": ["..."]
  }
}
```

## POST `/api/v1/ai/retention-risk`

Computes near-term churn/adherence risk from logging cadence and plan/check-in behavior. Also seeds `coach_nudges` when risk is medium/high.

## GET `/api/v1/analytics/performance`

Returns a 14-day analytics summary:
- workout days/minutes
- estimated set volume
- push/pull balance
- recovery debt
- nutrition compliance (if enough data exists)

## GET/POST `/api/v1/coach/escalate`

Hybrid coach escalation flow.

- `GET`: fetch recent escalation requests for current user.
- `POST`: submit escalation request.

## POST `/api/v1/jobs/reminders`

Runs reminder/nudge dispatch job (cron endpoint).

- Optional secret gate via `CRON_SECRET` with header:
  - `x-cron-secret: <CRON_SECRET>` or
  - `Authorization: Bearer <CRON_SECRET>`
