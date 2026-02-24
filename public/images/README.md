# Brand imagery

Replace these placeholders with your own AI-generated or branded assets for a custom look.

## Main images

| Slot | Where used | Recommended file | Dimensions |
|------|------------|------------------|------------|
| **Hero** (landing, signed-out) | `app/page.tsx` → `HERO_IMAGE` | `public/images/hero.jpg` | 1200×630 or 1600×900 |
| **Coach – female pro** | `app/coach/page.tsx` → `COACH_IMAGE_FEMALE_PRO` | `public/images/coach-female-pro.jpg` | 400×400 or 600×600 |
| **Coach – male pro** | `app/coach/page.tsx` → `COACH_IMAGE_MALE_PRO` | `public/images/coach-male-pro.jpg` | 400×400 or 600×600 |

Use Next.js `Image` with `priority` for above-the-fold hero images.

### Gender-tailored coach logic

On the **Coach** page, the coach persona is chosen from the user’s profile `sex`:

- **Male user** → female fitness professional.
- **Female user** → male fitness professional.
- **Other / not set** → default to female professional.

Keep this selection logic when replacing URLs; use the recommended filenames above or update the constants in `app/coach/page.tsx`.

## Exercise demo media (guided workout)

Guided workout play-by-play shows **animated** demos per move so users can see proper form. Use **GIF** or **short looped video** (WebM or MP4) for each exercise.

- **Formats:** `.gif`, `.webm`, or `.mp4` (looped, 3–10 s, no audio).
- **Content:** One person performing the exercise with correct form through the full range of motion so users can mimic it in the gym.
- **Place files in** `public/images/exercises/` with kebab-case names (e.g. `goblet-squat.gif`, `push-up.mp4`).

The map lives in **`lib/workout/exercise-images.ts`** (`BY_NAME`). Keys are normalized (lowercase, single spaces). Plan exercises can override via optional `image_url` (and optionally `image_video_url` for video when you keep a static fallback). The UI prefers video/GIF when the URL points to a video or GIF file and renders it with loop/autoplay.

**Supported exercises (~45):** goblet squat, push-up, dumbbell RDL, RDL, bench press, squat, deadlift, row, dumbbell row, overhead press, lunge(s), plank, lat pulldown, leg press, hip thrust, curl, bicep curl, tricep, tricep pushdown, incline bench press, incline dumbbell press, cable fly, chest fly, pull-up, chin-up, barbell row, bent over row, cable row, face pull, lateral raise, front raise, Bulgarian split squat, leg curl, leg extension, calf raise, sumo deadlift, kettlebell swing, box jump, burpee, mountain climber, crunch, bicycle crunch, Russian twist, dead bug, glute bridge, donkey kick, skull crusher, hammer curl, preacher curl, dips, Romanian deadlift.

To use your own assets: add animated files under `public/images/exercises/` (e.g. `goblet-squat.gif`) and either (1) set `image_url` per exercise in the plan, or (2) update the URLs in `lib/workout/exercise-images.ts` to `/images/exercises/<name>.gif` (or `.webm`/`.mp4`) so the guided page shows the animation.
