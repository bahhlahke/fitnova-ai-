# FitNova AI — Design system

## Concept 2: Premium Adaptive Light

- **Colors:** Light canvas (`#f5f7fb`), white surfaces, deep ink (`#16213a`), primary blue (`#335cff`), accent teal (`#15b69c`).
- **Touch targets:** Minimum 44px height/width for interactive elements (Tailwind: `min-h-touch`, `min-w-touch`).
- **Contrast:** High-contrast, accessible. Use `text-fn-ink` for primary content, `text-fn-muted` for secondary.

Tokens and Tailwind theme are in `app/globals.css` and `tailwind.config.ts`.

## Components (`components/ui/`)

Use these so every screen looks and behaves like the same product.

| Component | Use when |
|-----------|----------|
| **Button** | Primary actions (blue), secondary (outlined white), ghost (muted), danger. Sizes: default (touch), sm. Supports `loading` and `disabled`. |
| **Card** | Section containers. Use `padding="lg"` for forms or dense content. Optional **CardHeader** for title + subtitle. |
| **Input** | Text, number, email fields. Shared focus ring (primary blue). |
| **Label** | Form labels; pair with Input/Select/Textarea. |
| **Select** | Dropdowns; same visual language as Input. |
| **Textarea** | Multi-line text; min height 120px. |
| **EmptyState** | No data yet. Pass `message` and optional `action` (e.g. a Button or Link). |
| **LoadingState** | Data fetching. Optional `message` (default "Loading…"). |
| **ErrorMessage** | Inline errors (e.g. API or validation). Use `role="alert"`. |
| **PageLayout** | Page wrapper: max-width, padding, optional back link, consistent `<h1>` + subtitle. Pass `title` (string or ReactNode), optional `subtitle`, `backHref`, `backLabel`. |

## When to use what

- **Empty lists or no data:** `EmptyState` with a short message and optional CTA.
- **Loading:** `LoadingState` while fetching; avoid raw "Loading…" text.
- **Errors:** `ErrorMessage` for form/API errors.
- **Forms:** `Label` + `Input`/`Select`/`Textarea`; submit with `Button` (use `type="submit"` and `loading` for async).
- **Sections:** `Card` with optional `CardHeader`.
- **New pages:** Wrap content in `PageLayout` for consistent header and spacing.

## Data entry and validation

Forms validate before submit and use `ErrorMessage` for inline errors. Ranges enforced in the app:

- **Profile / onboarding:** Age 13–120, height 100–250 cm, weight 30–500 kg.
- **Progress add:** Weight 20–500 kg, body fat 0–100%, measurements 30–300 cm.
- **Workout quick log:** Duration 1–600 minutes (integer).
- **Nutrition:** Calories 0–50,000 per meal.

Invalid or out-of-range values are rejected with a short message; only valid data is sent to Supabase.

## Accessibility

- Skip link in layout: "Skip to main content" → `#main`. Main landmark has `id="main"` and `tabIndex={-1}`.
- Buttons and inputs use visible focus rings (`focus:ring-2 focus:ring-fn-primary/30` or equivalent).
- Use semantic headings (one `<h1>` per page) and `aria-label` / `aria-current` where appropriate.
