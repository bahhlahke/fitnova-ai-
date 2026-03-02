# AI Workflow Validation Report

- Generated (UTC): 2026-03-01T21:57:13.125Z to 2026-03-01T21:57:15.453Z
- Base URL: https://fitnova-ai.vercel.app/
- AI judge: disabled

## Summary

- Workflows checked: 9
- Deterministic status: pass 4, partial 4, fail 1

| Workflow | Deterministic | AI Verdict |
|---|---|---|
| Signed-out acquisition funnel | pass (3/3) | n/a |
| Onboarding and app shell entry | pass (3/3) | n/a |
| Dashboard AI command center | partial (3/4) | n/a |
| Nutrition logging workflow | pass (4/4) | n/a |
| Workout logging and guided execution | partial (4/5) | n/a |
| Motion analysis and body composition scanning | pass (4/4) | n/a |
| Progress tracking and daily check-in | partial (5/7) | n/a |
| Settings, billing, and exports | partial (4/7) | n/a |
| Legacy route compatibility | fail (0/4) | n/a |

## Workflow Details

### Signed-out acquisition funnel

- Persona: New visitor evaluating whether this product can coach them effectively
- Goal: Land on the site, understand value, and reach auth from assessment flow
- Deterministic status: pass (3/3)

| Step | Expected | Observed | Pass |
|---|---|---|---|
| Landing page loads | 200 | 200 | yes |
| Assessment page loads | 200 | 200 | yes |
| Auth page loads | 200 | 200 | yes |

### Onboarding and app shell entry

- Persona: Recently signed-up user setting up profile and entering core product
- Goal: Open onboarding and access shell routes without route failures
- Deterministic status: pass (3/3)

| Step | Expected | Observed | Pass |
|---|---|---|---|
| Onboarding route loads | 200 | 200 | yes |
| Settings route loads | 200 | 200 | yes |
| History route loads | 200 | 200 | yes |

### Dashboard AI command center

- Persona: Daily active user using natural language to log and ask questions
- Goal: Reach dashboard AI and verify chat endpoint behavior
- Deterministic status: partial (3/4)

| Step | Expected | Observed | Pass |
|---|---|---|---|
| Dashboard focus route loads | 200 | 200 | yes |
| AI respond endpoint accepts request shape | 200,401,429,503 | 401 | yes |
| Daily plan generation endpoint responds | 200,401,429,500 | 401 | yes |
| Weekly plan endpoint responds | 200,401,429,500 | 404 | no |

### Nutrition logging workflow

- Persona: User logging meals quickly and relying on AI estimates
- Goal: Open nutrition view and validate AI nutrition endpoints
- Deterministic status: pass (4/4)

| Step | Expected | Observed | Pass |
|---|---|---|---|
| Nutrition route loads | 200 | 200 | yes |
| Analyze meal endpoint responds | 200,401,400,500 | 401 | yes |
| Meal suggestions endpoint responds | 200,401,429,503 | 401 | yes |
| Nutrition insight endpoint responds | 200,401,429,503 | 401 | yes |

### Workout logging and guided execution

- Persona: User completing planned workouts and expecting immediate feedback
- Goal: Validate workout, guided, and post-workout insight surfaces
- Deterministic status: partial (4/5)

| Step | Expected | Observed | Pass |
|---|---|---|---|
| Workout route loads | 200 | 200 | yes |
| Guided workout route loads | 200 | 200 | yes |
| Post-workout insight endpoint responds | 200,401,429,503 | 401 | yes |
| Readiness insight endpoint responds | 200,401,429,503 | 401 | yes |
| Swap exercise endpoint responds | 200,400,401,429,500 | 405 | no |

### Motion analysis and body composition scanning

- Persona: User looking for form correction and composition updates
- Goal: Validate motion/body scan routes and AI endpoints
- Deterministic status: pass (4/4)

| Step | Expected | Observed | Pass |
|---|---|---|---|
| Motion route loads | 200 | 200 | yes |
| Body comp scanner route loads | 200 | 200 | yes |
| Vision endpoint validates request | 200,400,401,500 | 401 | yes |
| Body comp endpoint validates request | 200,400,401,500 | 401 | yes |

### Progress tracking and daily check-in

- Persona: User monitoring trend and readiness across the week
- Goal: Validate progress/check-in routes and narrative endpoints
- Deterministic status: partial (5/7)

| Step | Expected | Observed | Pass |
|---|---|---|---|
| Check-in route loads | 200 | 200 | yes |
| Progress route loads | 200 | 200 | yes |
| Add progress route loads | 200 | 200 | yes |
| Progress insight endpoint responds | 200,401,429,503 | 401 | yes |
| Projection endpoint responds | 200,401,500 | 401 | yes |
| Retention risk endpoint responds | 200,401,429,500 | 405 | no |
| Performance analytics endpoint responds | 200,401,500 | 404 | no |

### Settings, billing, and exports

- Persona: User managing account, data, and subscription
- Goal: Validate settings route plus export and billing APIs
- Deterministic status: partial (4/7)

| Step | Expected | Observed | Pass |
|---|---|---|---|
| Settings route loads | 200 | 200 | yes |
| Export JSON endpoint responds | 200,401,429,500 | 401 | yes |
| Export CSV endpoint responds | 200,401,429,500 | 401 | yes |
| Stripe checkout endpoint responds | 200,401,500,503 | 500 | yes |
| Coach escalation page loads | 200 | 404 | no |
| Coach escalation API validates payload | 200,401,429,500 | 405 | no |
| Reminder dispatch job endpoint responds | 200,401,500 | 405 | no |

### Legacy route compatibility

- Persona: Returning user from old deep links
- Goal: Ensure old routes redirect to current destinations
- Deterministic status: fail (0/4)

| Step | Expected | Observed | Pass |
|---|---|---|---|
| Coach route redirects to dashboard AI | 307,308 + location contains `/?focus=ai` | 307 | no |
| Omni route redirects to dashboard AI | 307,308 + location contains `/?focus=ai` | 307 | no |
| Log route redirects to workout | 307,308 + location contains `/log/workout` | 307 | no |
| Legacy motion lab route redirects | 307,308 + location contains `/motion` | 307 | no |

