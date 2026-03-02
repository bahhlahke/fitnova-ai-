# AI Workflow Validation Report

- Generated (UTC): 2026-03-01T21:35:09.464Z to 2026-03-01T21:35:09.543Z
- Base URL: http://localhost:3000/
- AI judge: disabled

## Summary

- Workflows checked: 9
- Deterministic status: pass 0, partial 0, fail 9

| Workflow | Deterministic | AI Verdict |
|---|---|---|
| Signed-out acquisition funnel | fail (0/3) | n/a |
| Onboarding and app shell entry | fail (0/3) | n/a |
| Dashboard AI command center | fail (0/4) | n/a |
| Nutrition logging workflow | fail (0/4) | n/a |
| Workout logging and guided execution | fail (0/5) | n/a |
| Motion analysis and body composition scanning | fail (0/4) | n/a |
| Progress tracking and daily check-in | fail (0/7) | n/a |
| Settings, billing, and exports | fail (0/7) | n/a |
| Legacy route compatibility | fail (0/4) | n/a |

## Workflow Details

### Signed-out acquisition funnel

- Persona: New visitor evaluating whether this product can coach them effectively
- Goal: Land on the site, understand value, and reach auth from assessment flow
- Deterministic status: fail (0/3)

| Step | Expected | Observed | Pass |
|---|---|---|---|
| Landing page loads | 200 | error (fetch failed) | no |
| Assessment page loads | 200 | error (fetch failed) | no |
| Auth page loads | 200 | error (fetch failed) | no |

Request errors detected:
- Landing page loads: fetch failed
- Assessment page loads: fetch failed
- Auth page loads: fetch failed

### Onboarding and app shell entry

- Persona: Recently signed-up user setting up profile and entering core product
- Goal: Open onboarding and access shell routes without route failures
- Deterministic status: fail (0/3)

| Step | Expected | Observed | Pass |
|---|---|---|---|
| Onboarding route loads | 200 | error (fetch failed) | no |
| Settings route loads | 200 | error (fetch failed) | no |
| History route loads | 200 | error (fetch failed) | no |

Request errors detected:
- Onboarding route loads: fetch failed
- Settings route loads: fetch failed
- History route loads: fetch failed

### Dashboard AI command center

- Persona: Daily active user using natural language to log and ask questions
- Goal: Reach dashboard AI and verify chat endpoint behavior
- Deterministic status: fail (0/4)

| Step | Expected | Observed | Pass |
|---|---|---|---|
| Dashboard focus route loads | 200 | error (fetch failed) | no |
| AI respond endpoint accepts request shape | 200,401,429,503 | error (fetch failed) | no |
| Daily plan generation endpoint responds | 200,401,429,500 | error (fetch failed) | no |
| Weekly plan endpoint responds | 200,401,429,500 | error (fetch failed) | no |

Request errors detected:
- Dashboard focus route loads: fetch failed
- AI respond endpoint accepts request shape: fetch failed
- Daily plan generation endpoint responds: fetch failed
- Weekly plan endpoint responds: fetch failed

### Nutrition logging workflow

- Persona: User logging meals quickly and relying on AI estimates
- Goal: Open nutrition view and validate AI nutrition endpoints
- Deterministic status: fail (0/4)

| Step | Expected | Observed | Pass |
|---|---|---|---|
| Nutrition route loads | 200 | error (fetch failed) | no |
| Analyze meal endpoint responds | 200,401,400,500 | error (fetch failed) | no |
| Meal suggestions endpoint responds | 200,401,429,503 | error (fetch failed) | no |
| Nutrition insight endpoint responds | 200,401,429,503 | error (fetch failed) | no |

Request errors detected:
- Nutrition route loads: fetch failed
- Analyze meal endpoint responds: fetch failed
- Meal suggestions endpoint responds: fetch failed
- Nutrition insight endpoint responds: fetch failed

### Workout logging and guided execution

- Persona: User completing planned workouts and expecting immediate feedback
- Goal: Validate workout, guided, and post-workout insight surfaces
- Deterministic status: fail (0/5)

| Step | Expected | Observed | Pass |
|---|---|---|---|
| Workout route loads | 200 | error (fetch failed) | no |
| Guided workout route loads | 200 | error (fetch failed) | no |
| Post-workout insight endpoint responds | 200,401,429,503 | error (fetch failed) | no |
| Readiness insight endpoint responds | 200,401,429,503 | error (fetch failed) | no |
| Swap exercise endpoint responds | 200,400,401,429,500 | error (fetch failed) | no |

Request errors detected:
- Workout route loads: fetch failed
- Guided workout route loads: fetch failed
- Post-workout insight endpoint responds: fetch failed
- Readiness insight endpoint responds: fetch failed
- Swap exercise endpoint responds: fetch failed

### Motion analysis and body composition scanning

- Persona: User looking for form correction and composition updates
- Goal: Validate motion/body scan routes and AI endpoints
- Deterministic status: fail (0/4)

| Step | Expected | Observed | Pass |
|---|---|---|---|
| Motion route loads | 200 | error (fetch failed) | no |
| Body comp scanner route loads | 200 | error (fetch failed) | no |
| Vision endpoint validates request | 200,400,401,500 | error (fetch failed) | no |
| Body comp endpoint validates request | 200,400,401,500 | error (fetch failed) | no |

Request errors detected:
- Motion route loads: fetch failed
- Body comp scanner route loads: fetch failed
- Vision endpoint validates request: fetch failed
- Body comp endpoint validates request: fetch failed

### Progress tracking and daily check-in

- Persona: User monitoring trend and readiness across the week
- Goal: Validate progress/check-in routes and narrative endpoints
- Deterministic status: fail (0/7)

| Step | Expected | Observed | Pass |
|---|---|---|---|
| Check-in route loads | 200 | error (fetch failed) | no |
| Progress route loads | 200 | error (fetch failed) | no |
| Add progress route loads | 200 | error (fetch failed) | no |
| Progress insight endpoint responds | 200,401,429,503 | error (fetch failed) | no |
| Projection endpoint responds | 200,401,500 | error (fetch failed) | no |
| Retention risk endpoint responds | 200,401,429,500 | error (fetch failed) | no |
| Performance analytics endpoint responds | 200,401,500 | error (fetch failed) | no |

Request errors detected:
- Check-in route loads: fetch failed
- Progress route loads: fetch failed
- Add progress route loads: fetch failed
- Progress insight endpoint responds: fetch failed
- Projection endpoint responds: fetch failed
- Retention risk endpoint responds: fetch failed
- Performance analytics endpoint responds: fetch failed

### Settings, billing, and exports

- Persona: User managing account, data, and subscription
- Goal: Validate settings route plus export and billing APIs
- Deterministic status: fail (0/7)

| Step | Expected | Observed | Pass |
|---|---|---|---|
| Settings route loads | 200 | error (fetch failed) | no |
| Export JSON endpoint responds | 200,401,429,500 | error (fetch failed) | no |
| Export CSV endpoint responds | 200,401,429,500 | error (fetch failed) | no |
| Stripe checkout endpoint responds | 200,401,500,503 | error (fetch failed) | no |
| Coach escalation page loads | 200 | error (fetch failed) | no |
| Coach escalation API validates payload | 200,401,429,500 | error (fetch failed) | no |
| Reminder dispatch job endpoint responds | 200,401,500 | error (fetch failed) | no |

Request errors detected:
- Settings route loads: fetch failed
- Export JSON endpoint responds: fetch failed
- Export CSV endpoint responds: fetch failed
- Stripe checkout endpoint responds: fetch failed
- Coach escalation page loads: fetch failed
- Coach escalation API validates payload: fetch failed
- Reminder dispatch job endpoint responds: fetch failed

### Legacy route compatibility

- Persona: Returning user from old deep links
- Goal: Ensure old routes redirect to current destinations
- Deterministic status: fail (0/4)

| Step | Expected | Observed | Pass |
|---|---|---|---|
| Coach route redirects to dashboard AI | 307,308 + location contains `/?focus=ai` | error (fetch failed) | no |
| Omni route redirects to dashboard AI | 307,308 + location contains `/?focus=ai` | error (fetch failed) | no |
| Log route redirects to workout | 307,308 + location contains `/log/workout` | error (fetch failed) | no |
| Legacy motion lab route redirects | 307,308 + location contains `/motion` | error (fetch failed) | no |

Request errors detected:
- Coach route redirects to dashboard AI: fetch failed
- Omni route redirects to dashboard AI: fetch failed
- Log route redirects to workout: fetch failed
- Legacy motion lab route redirects: fetch failed

