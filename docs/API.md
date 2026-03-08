# Koda AI — API

**Auth:** All authenticated routes accept **session cookie** (web) or **`Authorization: Bearer <access_token>`** (e.g. iOS). The server uses `lib/supabase/server.ts`, which reads the Bearer token when present.

## POST `/api/v1/ai/respond`

Chat endpoint for the AI coach. Uses OpenRouter; when the user is signed in, context (profile, recent workouts, nutrition, conversation history) is assembled and injected into the system prompt.

### Request

- **Method:** `POST`
- **Headers:** `Content-Type: application/json`
- **Auth:** Session cookie (Supabase) for web, or `Authorization: Bearer <access_token>` for native clients (e.g. iOS). Required in production.
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

- The handler loads profile, recent workout/nutrition logs, biometric signals (HRV, Sleep trends), Exercise PRs, and latest conversation from Supabase.
- Builds a system prompt via `lib/ai/assemble-context.ts` embodying a PhD-level Performance Coach persona.
- Safety policy is balanced: no diagnosis, injury-aware, escalation guidance.
- The request is sent to OpenRouter (`openai/gpt-4o`); reply is returned and appended to `ai_conversations`.
- Synthesis Logic: Correlates physiological signals with training intensity for high-performance insights.

## POST `/api/v1/plan/daily`

Builds and stores a personalized day plan for the signed-in user.

### Request

- **Method:** `POST`
- **Headers:** `Content-Type: application/json`
- **Auth:** Session cookie (web) or `Authorization: Bearer <access_token>` (native). Required.
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

## POST `/api/v1/plan/adapt-day`

Rewrites the current day's exercise list based on natural language constraints (e.g., "no barbell", "at home with dumbbells").

### Request

- **Body:**
```json
{
  "userMessage": "I'm at home today, only have dumbbells",
  "focus": "Upper push",
  "intensity": "high",
  "target_duration_minutes": 45,
  "goals": ["muscle gain"],
  "current_exercises": [...],
  "date_local": "2026-03-07"
}
```

### Response

```json
{
  "exercises": [...],
  "adaptation_note": "Adapted to your constraint. Added: Dumbbells."
}
```

## GET `/api/v1/spotify/token`

Fetches the Spotify access token from the current Supabase session (available if the user signed in via Spotify OAuth).

### Response

```json
{ "token": "BQA..." }
```

## POST `/api/v1/jobs/reminders`

Runs reminder/nudge dispatch job (cron endpoint).

- Optional secret gate via `CRON_SECRET` with header:
  - `x-cron-secret: <CRON_SECRET>` or
  - `Authorization: Bearer <CRON_SECRET>`

## POST `/api/v1/ai/history-summary`

Returns a macro-view evolutionary performance synthesis based on the user's longitudinal workout and nutrition data.

### Request
- **Method:** `POST`
- **Body:** `{ "localDate": "2026-03-07" }` (optional)

### Response
```json
{ "summary": "Your peak mechanical output in the squat has stabilized..." }
```

## POST `/api/v1/ai/briefing`

Generates the interactive shell briefing for the dashboard. Includes causal analysis of why specific training and nutrition targets were selected.

## POST `/api/v1/ai/progress-insight`

Synthesizes progress entries, weights, and biometrics into a short narrative (2-3 sentences).
