# FitNova AI — API

## POST `/api/v1/ai/respond`

Chat endpoint for the AI coach. Uses OpenRouter; when the user is signed in, context (profile, recent workouts, nutrition, conversation history) is assembled and injected into the system prompt.

### Request

- **Method:** `POST`
- **Headers:** `Content-Type: application/json`
- **Auth:** Session cookie (Supabase). If no session, a default system prompt is used.
- **Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `message` | string | Yes | User message; must be non-empty after trim. |
| `contextOverride` | string | No | If set, replaces the assembled system prompt (e.g. for testing). |

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
| 400 | `{ "error": "message is required" }` | Missing or empty `message`. |
| 400 | `{ "error": "Invalid JSON body" }` | Malformed request body. |
| 500 | `{ "error": "AI service error" }` | OpenRouter or internal error. |
| 503 | `{ "error": "OpenRouter API key not configured" }` | `OPENROUTER_API_KEY` not set. |

### Behavior

- When the user is signed in, the handler loads profile, recent workout/nutrition logs, and latest conversation from Supabase and builds a system prompt via `lib/ai/assemble-context.ts`.
- The request is sent to OpenRouter (`openai/gpt-4o-mini`); the reply is returned and, when signed in, the exchange is appended to `ai_conversations` for that user.
