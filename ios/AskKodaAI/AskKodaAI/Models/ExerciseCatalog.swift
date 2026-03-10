//
//  ExerciseCatalog.swift
//  Koda AI
//
//  Rich per-exercise coaching data for the guided session intro experience.
//  Each entry provides KodaAI's coaching script, form cues, muscle targets,
//  and a common-mistake callout — everything a world-class trainer would say
//  before and during a movement.
//

import Foundation

// MARK: - Models

enum ExerciseCategory: String {
    case chest        = "Chest"
    case back         = "Back"
    case legs         = "Legs"
    case glutes       = "Glutes"
    case shoulders    = "Shoulders"
    case arms         = "Arms"
    case core         = "Core"
    case conditioning = "Conditioning"
    case mobility     = "Mobility"
    case fullBody     = "Full Body"
}

struct ExerciseCatalogEntry {
    let name: String
    let muscles: [String]
    let equipment: String
    let category: ExerciseCategory
    /// What KodaAI "says" in the coached intro — 2-3 sentences, world-class trainer voice.
    let kodaIntro: String
    /// Form cues displayed one-by-one as the user reads the intro.
    let formCues: [FormCue]
    /// One key mistake to avoid — shown as a warning callout.
    let commonMistake: String?

    struct FormCue {
        let icon: String   // SF Symbol name
        let cue: String
    }
}

// MARK: - Catalog

enum ExerciseCatalog {

    // MARK: Lookup

    /// Returns the catalog entry for an exercise name, using exact then partial matching.
    static func entry(for exerciseName: String) -> ExerciseCatalogEntry? {
        let key = normalize(exerciseName)
        if let exact = _map[key] { return exact }
        // Partial: catalog name contained in key, or key contained in catalog name
        return _map.values.first { normalize($0.name) == key }
            ?? _map.values.first { key.contains(normalize($0.name)) || normalize($0.name).contains(key) }
    }

    private static func normalize(_ s: String) -> String {
        s.lowercased()
         .trimmingCharacters(in: .whitespacesAndNewlines)
         .replacingOccurrences(of: "\\s+", with: " ", options: .regularExpression)
    }

    // MARK: Data

    private static let _map: [String: ExerciseCatalogEntry] = {
        var m: [String: ExerciseCatalogEntry] = [:]
        for e in _all { m[e.name] = e }
        return m
    }()

    // swiftlint:disable function_body_length
    private static let _all: [ExerciseCatalogEntry] = [

        // ── SQUAT PATTERN ─────────────────────────────────────────────────────────

        .init(name: "squat",
              muscles: ["Quads", "Glutes", "Hamstrings"],
              equipment: "Barbell",
              category: .legs,
              kodaIntro: "This is your foundation. The squat builds full-body strength like nothing else — quads, glutes, and your entire posterior chain working as one unit. Set your stance, breathe into your belly, and own every rep.",
              formCues: [
                  .init(icon: "arrow.down", cue: "Brace your core and drive your knees out over your toes"),
                  .init(icon: "figure.stand", cue: "Keep your chest tall — no forward cave at the bottom"),
                  .init(icon: "arrow.up", cue: "Drive through the whole foot — push the floor away"),
                  .init(icon: "lungs", cue: "Breathe in before descent, exhale as you drive up"),
              ],
              commonMistake: "Knees caving inward — cue yourself to 'spread the floor' with your feet on every rep"),

        .init(name: "back squat",
              muscles: ["Quads", "Glutes", "Hamstrings", "Core"],
              equipment: "Barbell",
              category: .legs,
              kodaIntro: "The back squat is the king of lower body training. We're loading your spine, your legs, your lungs — everything. Get your feet planted, take a big breath into your belly, and let's move some serious weight.",
              formCues: [
                  .init(icon: "arrow.down", cue: "Drive knees out over your pinky toes from the first inch"),
                  .init(icon: "figure.stand", cue: "Elbows slightly forward — keeps the upper back locked tight"),
                  .init(icon: "arrow.up", cue: "Lead with your hips on the ascent, not your shoulders"),
                  .init(icon: "lungs", cue: "Big brace before you unrack — hold it through the entire rep"),
              ],
              commonMistake: "Rising onto your toes — widen your stance or elevate your heels slightly to fix this"),

        .init(name: "goblet squat",
              muscles: ["Quads", "Glutes", "Core"],
              equipment: "Dumbbell / Kettlebell",
              category: .legs,
              kodaIntro: "Goblet squat is deceptively brutal. The counterweight pulls you into perfect position, so all you have to do is sit deep and let your legs do the work. Great for depth, great for core activation.",
              formCues: [
                  .init(icon: "hand.raised", cue: "Hold the weight at chest height — elbows point straight down"),
                  .init(icon: "arrow.down", cue: "Squat between your legs, not behind them — get depth"),
                  .init(icon: "figure.stand", cue: "Use the weight as a counterbalance — slight lean back is fine"),
                  .init(icon: "arrow.up", cue: "Squeeze your glutes hard at lockout"),
              ],
              commonMistake: "Elbows dropping — keep them pointing down to stay braced and the weight from drifting"),

        .init(name: "front squat",
              muscles: ["Quads", "Core", "Upper Back"],
              equipment: "Barbell",
              category: .legs,
              kodaIntro: "The front squat is a quad demolisher that demands real upper back and core strength. The bar wants to pull you forward — your job is to stay completely upright. Technical, demanding, and incredibly effective.",
              formCues: [
                  .init(icon: "arrow.up", cue: "Drive elbows UP — this is what keeps the bar in the rack position"),
                  .init(icon: "figure.stand", cue: "Stay as vertical as possible — think elevator, not airplane"),
                  .init(icon: "arrow.down", cue: "Knees out, full depth — requires good ankle mobility"),
                  .init(icon: "lungs", cue: "Brace before descent, stay braced through every rep"),
              ],
              commonMistake: "Elbows dropping — the bar will roll forward and dump load onto your wrists"),

        .init(name: "bulgarian split squat",
              muscles: ["Quads", "Glutes", "Hip Flexors"],
              equipment: "Dumbbells / Barbell",
              category: .legs,
              kodaIntro: "Bulgarian split squats are one of the most effective single-leg movements in existence. Yes, they're brutal. That's the point. One leg gets no help — pure quad and glute loading with nowhere to hide.",
              formCues: [
                  .init(icon: "figure.stand", cue: "Back foot elevated, front foot far enough forward that your shin stays vertical"),
                  .init(icon: "arrow.down", cue: "Lower straight down — don't let your front knee drift forward"),
                  .init(icon: "arrow.up", cue: "Drive through your front heel to stand — squeeze the glute"),
                  .init(icon: "eye", cue: "Tall torso, eyes ahead — don't look down"),
              ],
              commonMistake: "Front foot too close — you'll feel it in your knee, not your glute. Step it out further"),

        .init(name: "split squat",
              muscles: ["Quads", "Glutes"],
              equipment: "Bodyweight / Dumbbells",
              category: .legs,
              kodaIntro: "Split squat is your foundation for single-leg strength. Both feet on the ground gives stability to really load each leg. Drive every rep with intention and feel the difference side-to-side.",
              formCues: [
                  .init(icon: "figure.stand", cue: "Front shin stays as vertical as possible — control the knee"),
                  .init(icon: "arrow.down", cue: "Lower your back knee toward the floor — don't let it slam"),
                  .init(icon: "arrow.up", cue: "Push through your front foot to drive up"),
                  .init(icon: "eye", cue: "Tall torso throughout — resist leaning forward"),
              ],
              commonMistake: "Leaning forward at the waist — stay upright to keep the load squarely on the front leg"),

        .init(name: "lunge",
              muscles: ["Quads", "Glutes", "Hamstrings"],
              equipment: "Bodyweight / Dumbbells",
              category: .legs,
              kodaIntro: "Lunges expose imbalances between sides and build single-leg strength that carries over to everything. Step long, land controlled, and drive back up with intention. Quality over speed.",
              formCues: [
                  .init(icon: "arrow.forward", cue: "Step long enough that your front shin stays vertical at the bottom"),
                  .init(icon: "arrow.down", cue: "Lower your back knee toward the floor with full control"),
                  .init(icon: "figure.stand", cue: "Tall torso — resist the urge to lean forward"),
                  .init(icon: "arrow.up", cue: "Drive through your front heel to return to start"),
              ],
              commonMistake: "Stepping too short — your knee will load incorrectly. Step further than feels natural"),

        .init(name: "walking lunges",
              muscles: ["Quads", "Glutes", "Balance"],
              equipment: "Bodyweight / Dumbbells",
              category: .legs,
              kodaIntro: "Walking lunges add a gait pattern that torches your legs while building balance and coordination. Don't rush the steps — own every rep as you move through space. This is quality movement.",
              formCues: [
                  .init(icon: "figure.walk", cue: "Step forward with control — land heel-to-toe"),
                  .init(icon: "arrow.down", cue: "Lower back knee toward the floor before driving forward"),
                  .init(icon: "figure.stand", cue: "Tall torso, eyes forward — don't look at the floor"),
                  .init(icon: "arrow.forward", cue: "Drive through your front heel to push yourself forward"),
              ],
              commonMistake: "Rushing the steps and losing posture — go slower than you think you need to"),

        .init(name: "pistol squat",
              muscles: ["Quads", "Glutes", "Balance", "Ankle Stability"],
              equipment: "Bodyweight",
              category: .legs,
              kodaIntro: "The pistol squat is a full-body strength and mobility test — one leg, full depth, zero cheating. This is elite-level movement quality. Take your time, stay controlled, and earn every rep.",
              formCues: [
                  .init(icon: "figure.stand", cue: "Heel on the ground throughout — don't let it rise"),
                  .init(icon: "arrow.down", cue: "Reach your extended leg forward as a counterbalance"),
                  .init(icon: "arrow.up", cue: "Drive through your whole foot, use arms for balance if needed"),
                  .init(icon: "eye", cue: "Look straight ahead — don't look at the floor"),
              ],
              commonMistake: "Knee caving inward — brace your glute hard to keep the knee tracking over your toes"),

        // ── HINGE PATTERN ─────────────────────────────────────────────────────────

        .init(name: "deadlift",
              muscles: ["Hamstrings", "Glutes", "Lower Back", "Traps"],
              equipment: "Barbell",
              category: .back,
              kodaIntro: "This is the most fundamental strength movement there is. The deadlift builds real-world power from the floor up — your entire posterior chain fires to move this weight. Set up tight, breathe, and lift with intention.",
              formCues: [
                  .init(icon: "figure.stand", cue: "Bar over mid-foot, hinge at hips to grip — don't squat down"),
                  .init(icon: "arrow.up", cue: "Push the floor away as you drive your hips forward"),
                  .init(icon: "eye", cue: "Neutral spine — don't look up or round your lower back"),
                  .init(icon: "lungs", cue: "Big brace before you pull — hold it through the entire lift"),
              ],
              commonMistake: "Jerking the bar — take the slack out first, then apply steady pressure. No yanking"),

        .init(name: "barbell deadlift",
              muscles: ["Hamstrings", "Glutes", "Lower Back", "Traps"],
              equipment: "Barbell",
              category: .back,
              kodaIntro: "Full barbell deadlift — this is where you move real weight and build real strength. Every muscle in your body contributes. Set up perfect, breathe, brace, and pull with conviction.",
              formCues: [
                  .init(icon: "figure.stand", cue: "Shoulders slightly in front of or over the bar at setup"),
                  .init(icon: "arrow.up", cue: "Bar stays dragging against your legs as you pull"),
                  .init(icon: "eye", cue: "Neutral neck — don't crane up or tuck your chin"),
                  .init(icon: "lungs", cue: "Valsalva breath before every single rep"),
              ],
              commonMistake: "Bar drifting forward away from your legs — this kills leverage. Keep it dragging up your shins"),

        .init(name: "sumo deadlift",
              muscles: ["Glutes", "Quads", "Hamstrings", "Adductors"],
              equipment: "Barbell",
              category: .legs,
              kodaIntro: "Sumo stance changes the entire movement pattern — wider feet, upright torso, massive glute and inner thigh involvement. Technical work that rewards patience. Set your stance, get tight, and pull.",
              formCues: [
                  .init(icon: "figure.stand", cue: "Wide stance, toes pointed out 30-45 degrees"),
                  .init(icon: "arrow.down", cue: "Hips drop lower than conventional — more squat-like setup"),
                  .init(icon: "arrow.up", cue: "Push knees out as you drive up — don't let them collapse inward"),
                  .init(icon: "eye", cue: "Bar directly over your mid-foot at setup, every time"),
              ],
              commonMistake: "Hips shooting up before the bar breaks the floor — keep your chest up from the very start"),

        .init(name: "romanian deadlift",
              muscles: ["Hamstrings", "Glutes", "Lower Back"],
              equipment: "Barbell / Dumbbells",
              category: .glutes,
              kodaIntro: "The RDL is the premier hamstring and glute builder. We're chasing maximum hip hinge — feel the stretch in your hamstrings at the bottom and drive your hips through hard at the top. Pure posterior chain work.",
              formCues: [
                  .init(icon: "arrow.down", cue: "Hinge at the hips, not the lower back — push hips back behind you"),
                  .init(icon: "eye", cue: "Feel the hamstring stretch at the bottom — that's the money position"),
                  .init(icon: "figure.stand", cue: "Soft bend in the knees, neutral spine throughout"),
                  .init(icon: "arrow.up", cue: "Drive hips forward to stand — squeeze glutes hard at the top"),
              ],
              commonMistake: "Squatting the weight instead of hinging — the bar should hang straight from your hips"),

        .init(name: "rdl",
              muscles: ["Hamstrings", "Glutes", "Lower Back"],
              equipment: "Barbell / Dumbbells",
              category: .glutes,
              kodaIntro: "RDL — posterior chain gold. Push your hips back like someone's pulling them with a rope, feel the hamstring load fully, then drive through at the top. Control on the way down, power on the way up.",
              formCues: [
                  .init(icon: "arrow.down", cue: "Hips back, not down — this is a hip hinge, not a squat"),
                  .init(icon: "eye", cue: "Bar stays close to your legs the entire movement"),
                  .init(icon: "figure.stand", cue: "Maintain the natural arch in your lower back throughout"),
                  .init(icon: "arrow.up", cue: "Squeeze glutes at lockout — don't hyperextend your back"),
              ],
              commonMistake: "Rounding your lower back — if you're losing the arch, you've gone too far"),

        .init(name: "hip thrust",
              muscles: ["Glutes", "Hamstrings", "Core"],
              equipment: "Barbell / Dumbbell",
              category: .glutes,
              kodaIntro: "Hip thrusts are the ultimate glute isolator. Nowhere to hide — it's all about that posterior drive. Squeeze hard at the top, hold for a full second, and feel every glute fiber fire with intention.",
              formCues: [
                  .init(icon: "figure.stand", cue: "Upper back on the bench, bar across your hip crease — not your abs"),
                  .init(icon: "arrow.up", cue: "Drive through your heels — tuck chin to chest as you rise"),
                  .init(icon: "eye", cue: "At the top your body forms a straight line from knees to shoulders"),
                  .init(icon: "clock", cue: "Pause and squeeze for 1 full second at the top of every rep"),
              ],
              commonMistake: "Extending your lower back instead of squeezing glutes — rib cage stays tucked down"),

        .init(name: "barbell hip thrust",
              muscles: ["Glutes", "Hamstrings"],
              equipment: "Barbell",
              category: .glutes,
              kodaIntro: "Loaded hip thrust — the single best direct glute builder available to you. The bar amplifies everything. Brace your core, drive through your heels, and lock out at the top with maximum glute contraction.",
              formCues: [
                  .init(icon: "figure.stand", cue: "Pad the bar — position it across your hip crease, not your abs"),
                  .init(icon: "arrow.up", cue: "Feet flat, drive hips up explosively from the floor"),
                  .init(icon: "eye", cue: "Chin tucked — look at the ceiling, not at the bar"),
                  .init(icon: "clock", cue: "Squeeze hard at the top — hold 1 full second before lowering"),
              ],
              commonMistake: "Feet too far or too close — your shins should be vertical at the top of the movement"),

        .init(name: "glute bridge",
              muscles: ["Glutes", "Hamstrings"],
              equipment: "Bodyweight / Dumbbell",
              category: .glutes,
              kodaIntro: "Glute bridge teaches hip extension and builds the posterior chain. Even bodyweight, done right with full contraction and a hold at the top, will make your glutes work seriously hard.",
              formCues: [
                  .init(icon: "figure.stand", cue: "Feet flat on the floor, knees bent at roughly 90 degrees"),
                  .init(icon: "arrow.up", cue: "Drive hips up until your body is straight from knees to shoulders"),
                  .init(icon: "clock", cue: "Squeeze your glutes hard at the top for 1-2 seconds"),
                  .init(icon: "arrow.down", cue: "Lower with control — don't just drop your hips"),
              ],
              commonMistake: "Not fully extending the hips — if you're not getting tall, drive harder through your heels"),

        // ── PUSH PATTERN ──────────────────────────────────────────────────────────

        .init(name: "bench press",
              muscles: ["Chest", "Triceps", "Front Delts"],
              equipment: "Barbell",
              category: .chest,
              kodaIntro: "Classic barbell bench press — the definitive upper body strength test. We're building chest thickness and raw pressing power. Arch slightly, plant your feet, and drive the bar with everything you have.",
              formCues: [
                  .init(icon: "figure.stand", cue: "Retract your shoulder blades and press them into the bench"),
                  .init(icon: "arrow.down", cue: "Lower to your lower chest — elbows at 45-75 degrees from your body"),
                  .init(icon: "arrow.up", cue: "Press up and slightly back — bar travels in a gentle arc"),
                  .init(icon: "lungs", cue: "Breathe in as you lower, press and exhale on the way up"),
              ],
              commonMistake: "Elbows flaring to 90 degrees — this destroys your shoulder joints. Keep them tucked at 45-75°"),

        .init(name: "barbell bench press",
              muscles: ["Chest", "Triceps", "Shoulders"],
              equipment: "Barbell",
              category: .chest,
              kodaIntro: "Barbell bench is a full upper body strength event. Every muscle from your feet to your fingertips has a role. Set up tight, plant those feet, and press with control and conviction.",
              formCues: [
                  .init(icon: "figure.stand", cue: "Shoulder blades retracted and depressed — create a stable base"),
                  .init(icon: "arrow.down", cue: "Lower under control — touch your chest, don't bounce"),
                  .init(icon: "arrow.up", cue: "Drive the bar up and slightly toward your face"),
                  .init(icon: "lungs", cue: "Hold the brace throughout — breathe at lockout only"),
              ],
              commonMistake: "Bouncing the bar off your chest — touch and press, never bounce"),

        .init(name: "dumbbell bench press",
              muscles: ["Chest", "Triceps", "Shoulders"],
              equipment: "Dumbbells",
              category: .chest,
              kodaIntro: "Dumbbell bench press demands more stability and gives your chest a greater range of motion. Each arm works independently — no compensating, full stretch at the bottom on every single rep.",
              formCues: [
                  .init(icon: "figure.stand", cue: "Feet on the floor, slight natural arch in your back"),
                  .init(icon: "arrow.down", cue: "Lower until your chest gets a full stretch — elbows just below shoulder level"),
                  .init(icon: "arrow.up", cue: "Press up and slightly together — slight inward arc at the top"),
                  .init(icon: "eye", cue: "Keep wrists stacked over your elbows — don't let them bend back"),
              ],
              commonMistake: "Letting the dumbbells drift too wide — keep them over your wrists and over your lower chest"),

        .init(name: "incline bench press",
              muscles: ["Upper Chest", "Shoulders", "Triceps"],
              equipment: "Barbell",
              category: .chest,
              kodaIntro: "Incline bench shifts the load to your upper chest and front delts — the area that defines that aesthetic chest line. Control the descent, get the full stretch, and press with purpose.",
              formCues: [
                  .init(icon: "figure.stand", cue: "Bench at 30-45 degrees — more than 45 becomes shoulder-dominant"),
                  .init(icon: "arrow.down", cue: "Lower to your upper chest, elbows slightly tucked"),
                  .init(icon: "arrow.up", cue: "Drive the bar straight up — squeeze your upper chest at the top"),
                  .init(icon: "eye", cue: "Eyes under the bar at setup, not directly over the rack"),
              ],
              commonMistake: "Angle too steep — above 45 degrees turns this into a shoulder press, not chest work"),

        .init(name: "incline dumbbell press",
              muscles: ["Upper Chest", "Shoulders"],
              equipment: "Dumbbells",
              category: .chest,
              kodaIntro: "Incline dumbbell press targets your upper chest and anterior deltoids. The incline angle combined with the stretch from dumbbells creates a serious hypertrophy stimulus you can't get from the barbell.",
              formCues: [
                  .init(icon: "figure.stand", cue: "Bench at 30-45 degrees, dumbbells start at shoulder level"),
                  .init(icon: "arrow.down", cue: "Lower slowly until you feel the stretch across your upper chest"),
                  .init(icon: "arrow.up", cue: "Press up and slightly together — control the arc throughout"),
                  .init(icon: "eye", cue: "Dumbbells over your wrists — not drifting back toward your head"),
              ],
              commonMistake: "Rushing the descent — slow the eccentric down to maximize upper chest time under tension"),

        .init(name: "push-up",
              muscles: ["Chest", "Triceps", "Core"],
              equipment: "Bodyweight",
              category: .chest,
              kodaIntro: "Push-ups are a full-body movement disguised as a chest exercise. Your core works as hard as your chest to keep your body rigid. No sagging, no broken plank — every rep is a perfect movement.",
              formCues: [
                  .init(icon: "figure.stand", cue: "Body in a straight line — brace your core and your glutes"),
                  .init(icon: "arrow.down", cue: "Lower chest to floor, elbows at 45 degrees from your body"),
                  .init(icon: "arrow.up", cue: "Drive hands into the floor, full elbow extension at the top"),
                  .init(icon: "eye", cue: "Look at the floor ahead of you — don't crane your neck up"),
              ],
              commonMistake: "Hips sagging — if your lower back is arching, squeeze your core and glutes harder"),

        .init(name: "pushups",
              muscles: ["Chest", "Triceps", "Core"],
              equipment: "Bodyweight",
              category: .chest,
              kodaIntro: "Push-ups are a full-body movement disguised as a chest exercise. Your core works as hard as your chest to keep your body rigid. No sagging, no broken plank — every rep earns its place.",
              formCues: [
                  .init(icon: "figure.stand", cue: "Straight line from head to heels — brace everything"),
                  .init(icon: "arrow.down", cue: "Chest to floor, elbows at 45 degrees from your torso"),
                  .init(icon: "arrow.up", cue: "Full extension at the top — own every inch of the press"),
                  .init(icon: "eye", cue: "Neutral neck — look at the floor, not forward"),
              ],
              commonMistake: "Letting your hips sag or pike — one rigid plank from start to finish"),

        .init(name: "dips",
              muscles: ["Chest", "Triceps", "Shoulders"],
              equipment: "Dip Bars",
              category: .chest,
              kodaIntro: "Dips are a compound pressing movement that hits your chest, triceps, and shoulders all at once. Lean forward for more chest, stay upright for more tricep. Control the descent every single rep.",
              formCues: [
                  .init(icon: "figure.stand", cue: "Grip the bars, arms locked out to start"),
                  .init(icon: "arrow.down", cue: "Lower until your upper arms are at least parallel to the floor"),
                  .init(icon: "figure.stand", cue: "Lean forward slightly for more chest involvement"),
                  .init(icon: "arrow.up", cue: "Press up to full lockout — squeeze at the top"),
              ],
              commonMistake: "Not going deep enough — parallel upper arms is the minimum depth for real stimulus"),

        // ── OVERHEAD PRESSING ─────────────────────────────────────────────────────

        .init(name: "overhead press",
              muscles: ["Shoulders", "Triceps", "Core"],
              equipment: "Barbell",
              category: .shoulders,
              kodaIntro: "The overhead press is the truest test of shoulder strength and stability. Everything from your feet to your fingertips has to work together. Stand tall, brace hard, and press the bar straight overhead.",
              formCues: [
                  .init(icon: "figure.stand", cue: "Bar at shoulder level, grip just outside shoulder-width"),
                  .init(icon: "arrow.up", cue: "Press straight up — push your head through at lockout"),
                  .init(icon: "eye", cue: "Brace your core and glutes — no lower back hyperextension"),
                  .init(icon: "arrow.down", cue: "Lower with control — don't let the bar crash onto your shoulders"),
              ],
              commonMistake: "Leaning back excessively — this puts the load on your lower back, not your shoulders"),

        .init(name: "military press",
              muscles: ["Shoulders", "Triceps", "Core"],
              equipment: "Barbell",
              category: .shoulders,
              kodaIntro: "Strict overhead pressing — no leg drive, no momentum. Just raw shoulder and tricep strength. This is the real test of what your upper body can do from a dead stop.",
              formCues: [
                  .init(icon: "figure.stand", cue: "Core braced, ribs down — no arch in your lower back"),
                  .init(icon: "arrow.up", cue: "Elbows slightly forward at the start, not flared to the side"),
                  .init(icon: "eye", cue: "Press to full lockout — elbows fully extended at the top"),
                  .init(icon: "arrow.down", cue: "Lower to upper chest with full control"),
              ],
              commonMistake: "Lower back arching at the top — squeeze glutes and brace your abs through every rep"),

        .init(name: "dumbbell shoulder press",
              muscles: ["Shoulders", "Triceps"],
              equipment: "Dumbbells",
              category: .shoulders,
              kodaIntro: "Dumbbell shoulder press allows a natural range of motion that feels better on most joints. Each arm works independently — no hiding imbalances. Build strong, balanced delts rep by rep.",
              formCues: [
                  .init(icon: "figure.stand", cue: "Dumbbells at ear level, palms facing forward or neutral"),
                  .init(icon: "arrow.up", cue: "Press up and slightly together — a natural arc to the top"),
                  .init(icon: "eye", cue: "Don't let your lower back arch — stay neutral throughout"),
                  .init(icon: "arrow.down", cue: "Lower to ear level — feel the stretch in your deltoids"),
              ],
              commonMistake: "Starting with elbows too low — dumbbells at ear level, not chin level, to start"),

        .init(name: "arnold press",
              muscles: ["All 3 Deltoid Heads", "Triceps"],
              equipment: "Dumbbells",
              category: .shoulders,
              kodaIntro: "The Arnold Press cycles through all three heads of your deltoid in one movement. That rotation as you press is the key — it hits the front, side, and rear delt sequentially. Complete shoulder development in one exercise.",
              formCues: [
                  .init(icon: "arrow.up", cue: "Start with palms facing you, rotate outward as you press"),
                  .init(icon: "figure.stand", cue: "Rotate until palms face forward fully at the top"),
                  .init(icon: "arrow.down", cue: "Reverse the rotation on the way down — palms face you at bottom"),
                  .init(icon: "eye", cue: "Control the rotation — don't rush, feel each head engage"),
              ],
              commonMistake: "Forgetting the rotation — the rotation is the entire point. Without it, it's just a press"),

        .init(name: "lateral raise",
              muscles: ["Side Delts"],
              equipment: "Dumbbells",
              category: .shoulders,
              kodaIntro: "Lateral raises are the key to shoulder width. We're targeting the lateral head of your deltoid — the muscle that gives you that coveted rounded cap. Light weight, high quality, maximum contraction every rep.",
              formCues: [
                  .init(icon: "arrow.up", cue: "Lead with your elbows — slight forward tilt of the torso helps"),
                  .init(icon: "eye", cue: "Pinky slightly higher than thumb at the top — 'pour the pitcher'"),
                  .init(icon: "clock", cue: "Control the descent — resist gravity on the way down"),
                  .init(icon: "figure.stand", cue: "Slight bend in elbows — don't straight-arm the movement"),
              ],
              commonMistake: "Using momentum to swing the weight — if you can't control it, the load is too heavy"),

        .init(name: "face pull",
              muscles: ["Rear Delts", "External Rotators", "Traps"],
              equipment: "Cable Machine",
              category: .shoulders,
              kodaIntro: "Face pulls are the most important shoulder health exercise you can do. Every heavy presser needs these. External rotation strength protects your rotator cuff and builds the rear delts that complete your shoulders.",
              formCues: [
                  .init(icon: "arrow.forward", cue: "Cable set at head height, rope attachment"),
                  .init(icon: "arrow.up", cue: "Pull toward your face — elbows higher than wrists throughout"),
                  .init(icon: "arrow.up", cue: "External rotate at the end — hands go behind your elbows"),
                  .init(icon: "clock", cue: "Hold the external rotation for 1 second each rep"),
              ],
              commonMistake: "Skipping the external rotation at the end — that rotation is the entire therapeutic point"),

        // ── PULL PATTERN ──────────────────────────────────────────────────────────

        .init(name: "pull-up",
              muscles: ["Lats", "Biceps", "Upper Back"],
              equipment: "Pull-up Bar",
              category: .back,
              kodaIntro: "Pull-ups are the ultimate back and bicep test. Your lats are moving your entire bodyweight — there's no bigger stimulus for back development. Dead hang, initiate with your lats, and get your chin over that bar.",
              formCues: [
                  .init(icon: "arrow.down", cue: "Start from a dead hang — full arm extension before each rep"),
                  .init(icon: "arrow.up", cue: "Lead with your elbows — pull them toward your pockets"),
                  .init(icon: "figure.stand", cue: "Chest up, slight arch — pull toward your upper chest"),
                  .init(icon: "eye", cue: "No kipping — controlled throughout, no swinging legs"),
              ],
              commonMistake: "Pulling with your biceps instead of lats — cue: 'drive elbows down to your pockets'"),

        .init(name: "weighted pull-up",
              muscles: ["Lats", "Biceps", "Rhomboids"],
              equipment: "Pull-up Bar + Weight Belt",
              category: .back,
              kodaIntro: "Weighted pull-ups — elite territory. Adding load to a bodyweight movement that's already demanding. Every gram of that added weight amplifies the lat stimulus. Your back is about to grow.",
              formCues: [
                  .init(icon: "arrow.down", cue: "Dead hang start — let the weight pull you to full extension"),
                  .init(icon: "arrow.up", cue: "Initiate with your lats — not a bicep curl motion"),
                  .init(icon: "figure.stand", cue: "Full chin over bar — no half reps, ever"),
                  .init(icon: "arrow.down", cue: "Lower slowly — don't just drop back to the hang position"),
              ],
              commonMistake: "Short-changing the range — every rep must start from full extension, no exceptions"),

        .init(name: "lat pulldown",
              muscles: ["Lats", "Biceps"],
              equipment: "Cable Machine",
              category: .back,
              kodaIntro: "Lat pulldown teaches your lats to pull — same muscles as the pull-up, but with perfectly controlled load. Focus on initiating every single rep with your lats, not with your biceps.",
              formCues: [
                  .init(icon: "figure.stand", cue: "Slight lean back, chest up — pull bar to your upper chest"),
                  .init(icon: "arrow.down", cue: "Lead with elbows — feel your lats fire, not your biceps"),
                  .init(icon: "arrow.up", cue: "Fully extend at the top — get the full lat stretch every rep"),
                  .init(icon: "eye", cue: "Don't lean back excessively — this is a back movement"),
              ],
              commonMistake: "Pulling behind the head — this loads your shoulder joints unnecessarily and dangerously"),

        .init(name: "barbell row",
              muscles: ["Lats", "Rhomboids", "Rear Delts", "Biceps"],
              equipment: "Barbell",
              category: .back,
              kodaIntro: "Barbell bent-over row is your mass builder for the entire back. Lower back and hamstrings hold your position while your lats pull the weight. This is a full posterior chain event in one movement.",
              formCues: [
                  .init(icon: "figure.stand", cue: "Hinge forward at 45-60 degrees — hold that position firmly"),
                  .init(icon: "arrow.up", cue: "Pull to your lower sternum — lead with your elbows back"),
                  .init(icon: "eye", cue: "Neutral spine — don't round your lower back at any point"),
                  .init(icon: "arrow.down", cue: "Lower with control — feel the lat stretch at the bottom"),
              ],
              commonMistake: "Using your hips to jerk the bar — this is a back exercise, not a hip drive competition"),

        .init(name: "bent over row",
              muscles: ["Lats", "Rhomboids", "Biceps"],
              equipment: "Barbell / Dumbbells",
              category: .back,
              kodaIntro: "Bent over row — every rep is strict, controlled, and loaded into your lats. Don't let your hips bounce the weight. The quality of your hinge determines the quality of your back growth.",
              formCues: [
                  .init(icon: "figure.stand", cue: "Hinge forward 45-60 degrees, spine neutral throughout"),
                  .init(icon: "arrow.up", cue: "Pull toward your belly button — elbows drag back"),
                  .init(icon: "eye", cue: "Don't flare elbows wide — keep them dragging back"),
                  .init(icon: "arrow.down", cue: "Full extension at the bottom — don't shorten the range"),
              ],
              commonMistake: "Bouncing at the hips to help the weight — if you need momentum, reduce the load"),

        .init(name: "dumbbell row",
              muscles: ["Lats", "Rhomboids"],
              equipment: "Dumbbell",
              category: .back,
              kodaIntro: "Single arm dumbbell row — each side works completely independently. Massive range of motion, huge lat activation. Row the dumbbell to your hip, not your armpit. Feel the difference.",
              formCues: [
                  .init(icon: "figure.stand", cue: "Brace your hand on the bench — spine parallel to the floor"),
                  .init(icon: "arrow.up", cue: "Pull the dumbbell to your hip — elbow drives up and back"),
                  .init(icon: "eye", cue: "Don't rotate your torso — keep your hips square throughout"),
                  .init(icon: "arrow.down", cue: "Fully extend at the bottom — let the lat stretch completely"),
              ],
              commonMistake: "Pulling toward your shoulder instead of your hip — lat insertion is at your hip"),

        .init(name: "single-arm row",
              muscles: ["Lats", "Rhomboids"],
              equipment: "Dumbbell",
              category: .back,
              kodaIntro: "Single-arm row eliminates any bilateral compensation and forces each lat to work at full capacity. Row to the hip, not the armpit, and let the lat fully stretch at the bottom of every rep.",
              formCues: [
                  .init(icon: "figure.stand", cue: "Support hand on bench — spine neutral and parallel to floor"),
                  .init(icon: "arrow.up", cue: "Drive your elbow up and back — lead with your elbow, not your hand"),
                  .init(icon: "eye", cue: "Hips stay square — resist the urge to rotate"),
                  .init(icon: "arrow.down", cue: "Full lat stretch at the bottom before the next rep"),
              ],
              commonMistake: "Hip rotation to assist the pull — lock your hips square and isolate the lat"),

        .init(name: "chest-supported row",
              muscles: ["Rhomboids", "Rear Delts", "Lats"],
              equipment: "Dumbbells / Machine",
              category: .back,
              kodaIntro: "Chest-supported row removes your lower back from the equation entirely — your back muscles do 100% of the work with zero cheating possible. This is the safest, most effective row for pure back hypertrophy.",
              formCues: [
                  .init(icon: "figure.stand", cue: "Chest on the pad — stay in full contact throughout"),
                  .init(icon: "arrow.up", cue: "Pull elbows back and together — squeeze your shoulder blades"),
                  .init(icon: "clock", cue: "Pause at the top for 1 second — hold the full contraction"),
                  .init(icon: "arrow.down", cue: "Lower fully — let your shoulders protract completely at bottom"),
              ],
              commonMistake: "Lifting your chest off the pad — if this happens, momentum is doing the work, not your back"),

        .init(name: "inverted row",
              muscles: ["Lats", "Rhomboids", "Biceps"],
              equipment: "Bar / Rings",
              category: .back,
              kodaIntro: "Inverted rows are a bodyweight back builder that scales with your body position. The more horizontal your body, the harder it gets. Squeeze your shoulder blades together hard at the top of every rep.",
              formCues: [
                  .init(icon: "figure.stand", cue: "Body rigid like a plank — no sagging hips"),
                  .init(icon: "arrow.up", cue: "Pull your chest to the bar — lead with your elbows"),
                  .init(icon: "eye", cue: "Squeeze your shoulder blades together at the top"),
                  .init(icon: "arrow.down", cue: "Lower to full arm extension before each rep"),
              ],
              commonMistake: "Hips sagging — your body should be one rigid line throughout the entire movement"),

        .init(name: "back extension",
              muscles: ["Lower Back", "Glutes", "Hamstrings"],
              equipment: "Hyperextension Bench",
              category: .back,
              kodaIntro: "Back extensions strengthen the erector spinae and posterior chain in a safe, controlled way. This is essential spine health work. Control each rep — don't hyperextend, don't rush.",
              formCues: [
                  .init(icon: "figure.stand", cue: "Hips on the pad — fold down, then extend to a neutral spine"),
                  .init(icon: "arrow.up", cue: "Squeeze glutes and lower back together at the top"),
                  .init(icon: "eye", cue: "Stop at neutral spine — not hyperextended, just straight"),
                  .init(icon: "arrow.down", cue: "Lower with control — gravity is not your training partner here"),
              ],
              commonMistake: "Hyperextending at the top — this compresses your lumbar spine. Neutral is the goal"),

        // ── CORE ──────────────────────────────────────────────────────────────────

        .init(name: "plank",
              muscles: ["Core", "Shoulders", "Glutes"],
              equipment: "Bodyweight",
              category: .core,
              kodaIntro: "The plank looks simple. It is not. Your entire body is fighting gravity while your core keeps you completely rigid. Every second counts — squeeze your glutes, brace your abs, and breathe steadily through it.",
              formCues: [
                  .init(icon: "figure.stand", cue: "Elbows under shoulders, forearms on the floor"),
                  .init(icon: "eye", cue: "Look down at the floor — neutral neck, don't crane forward"),
                  .init(icon: "figure.stand", cue: "Squeeze glutes and quads — your whole body is a plank"),
                  .init(icon: "lungs", cue: "Breathe steadily — don't hold your breath"),
              ],
              commonMistake: "Hips too high or sagging too low — your body should be one perfectly straight line"),

        .init(name: "dead bug",
              muscles: ["Deep Core", "Transverse Abdominis"],
              equipment: "Bodyweight",
              category: .core,
              kodaIntro: "Dead bug is deceptively challenging deep core work. The goal is keeping your lower back pressed to the floor while your limbs move — that tension is your anti-extension core doing exactly what it should.",
              formCues: [
                  .init(icon: "arrow.down", cue: "Lower back pressed firmly into the floor — don't let it arch"),
                  .init(icon: "arrow.forward", cue: "Extend opposite arm and leg together — slow and controlled"),
                  .init(icon: "lungs", cue: "Exhale as you extend — breathing drives the deep core activation"),
                  .init(icon: "eye", cue: "If your back arches off the floor, reduce your range of motion"),
              ],
              commonMistake: "Lower back arching off the floor — that's your core failing. If it arches, stop and reset"),

        .init(name: "ab rollout",
              muscles: ["Core", "Lats", "Shoulders"],
              equipment: "Ab Wheel",
              category: .core,
              kodaIntro: "Ab rollouts are one of the hardest core exercises available. Anti-extension work under full load — no crunch or sit-up comes close to this stimulus. Start short and earn your way to full extension.",
              formCues: [
                  .init(icon: "figure.stand", cue: "Kneel with hands on the wheel — hips over knees"),
                  .init(icon: "arrow.forward", cue: "Roll out slowly — stop the moment your lower back breaks"),
                  .init(icon: "arrow.up", cue: "Pull back with your lats and core together — explosive return"),
                  .init(icon: "eye", cue: "Brace your abs hard — don't let your hips drop at all"),
              ],
              commonMistake: "Rolling out too far before you're ready — reduce range until your back stays perfectly neutral"),

        .init(name: "mountain climber",
              muscles: ["Core", "Shoulders", "Hip Flexors"],
              equipment: "Bodyweight",
              category: .core,
              kodaIntro: "Mountain climbers combine conditioning and core work in one movement. Your core keeps you in plank position while your legs drive alternately. Consistent pace, hips low, breathe rhythmically.",
              formCues: [
                  .init(icon: "figure.stand", cue: "Solid plank position — hips don't rise as you drive knees"),
                  .init(icon: "arrow.forward", cue: "Drive knees toward your chest in a controlled manner"),
                  .init(icon: "eye", cue: "Breathe rhythmically with each rep — find your tempo"),
                  .init(icon: "clock", cue: "Consistent pace — rushing kills form and core engagement"),
              ],
              commonMistake: "Hips bouncing up and down — squeeze your core, keep the hips level throughout"),

        // ── ARMS ──────────────────────────────────────────────────────────────────

        .init(name: "bicep curl",
              muscles: ["Biceps", "Brachialis"],
              equipment: "Dumbbells / Barbell",
              category: .arms,
              kodaIntro: "Bicep curls, done right, build serious arm mass. The key is the eccentric — resist the weight on the way down as hard as you lifted on the way up. No swinging, no momentum. Strict reps only.",
              formCues: [
                  .init(icon: "figure.stand", cue: "Elbows pinned to your sides — they must not move"),
                  .init(icon: "arrow.up", cue: "Curl with your supinated wrist — turn the pinky up at the top"),
                  .init(icon: "clock", cue: "Full contraction at the top — squeeze your bicep hard"),
                  .init(icon: "arrow.down", cue: "Lower slowly — 2-3 second eccentric on every rep"),
              ],
              commonMistake: "Swinging your body to help the weight — reduce load and keep it completely strict"),

        .init(name: "hammer curl",
              muscles: ["Biceps", "Brachialis", "Forearms"],
              equipment: "Dumbbells",
              category: .arms,
              kodaIntro: "Hammer curls with the neutral grip target the brachialis — the muscle under your bicep that pushes it up, making your arms look significantly bigger. Plus you're building forearm strength simultaneously.",
              formCues: [
                  .init(icon: "figure.stand", cue: "Neutral grip throughout — thumbs pointing up toward ceiling"),
                  .init(icon: "arrow.up", cue: "Curl up while maintaining the neutral wrist position"),
                  .init(icon: "clock", cue: "Full contraction at shoulder height — hold and squeeze"),
                  .init(icon: "arrow.down", cue: "Lower fully to complete extension at the bottom"),
              ],
              commonMistake: "Rotating the wrist during the movement — maintain the neutral grip throughout"),

        .init(name: "tricep pushdown",
              muscles: ["Triceps"],
              equipment: "Cable Machine",
              category: .arms,
              kodaIntro: "Tricep pushdown isolates the lateral and long heads of your triceps. Elbows locked at your sides, triceps do every inch of the work. Full extension at the bottom, squeeze hard.",
              formCues: [
                  .init(icon: "figure.stand", cue: "Elbows pinned to your sides — they do not move"),
                  .init(icon: "arrow.down", cue: "Push down to full extension — lock out your elbows completely"),
                  .init(icon: "clock", cue: "Squeeze your triceps hard at full extension"),
                  .init(icon: "arrow.up", cue: "Let your forearms rise to 90 degrees at the top — no more"),
              ],
              commonMistake: "Elbows flaring out or drifting forward — pin them down and keep them there"),

        .init(name: "skull crusher",
              muscles: ["Triceps Long Head"],
              equipment: "EZ Bar / Barbell",
              category: .arms,
              kodaIntro: "Skull crushers put your triceps in a stretched position that's unmatched for long-head development — the biggest portion of your triceps. Control the descent, feel that stretch, and press back up.",
              formCues: [
                  .init(icon: "figure.stand", cue: "Lie on bench — upper arms vertical and completely still"),
                  .init(icon: "arrow.down", cue: "Lower toward your forehead — elbows point straight up"),
                  .init(icon: "arrow.up", cue: "Press back to start — only your forearms move"),
                  .init(icon: "eye", cue: "Upper arms stay vertical — they are the pivot point"),
              ],
              commonMistake: "Elbows flaring or upper arms drifting — lock the upper arm position, move only the forearm"),

        // ── LEGS (MACHINES + ACCESSORIES) ────────────────────────────────────────

        .init(name: "leg press",
              muscles: ["Quads", "Glutes", "Hamstrings"],
              equipment: "Leg Press Machine",
              category: .legs,
              kodaIntro: "Leg press lets you load your legs heavily with your lower back fully supported. High foot placement hits glutes and hamstrings more; lower and wider placement targets quads. Push your volume here.",
              formCues: [
                  .init(icon: "figure.stand", cue: "Feet shoulder-width at an angle natural for your anatomy"),
                  .init(icon: "arrow.down", cue: "Lower until knees reach 90 degrees — more depth if flexibility allows"),
                  .init(icon: "arrow.up", cue: "Press through your whole foot — don't rise onto your toes"),
                  .init(icon: "eye", cue: "Don't lock out your knees at the top — keep tension on the muscle"),
              ],
              commonMistake: "Not going deep enough — knees at 90 degrees is the minimum for real stimulus"),

        .init(name: "leg curl",
              muscles: ["Hamstrings"],
              equipment: "Machine",
              category: .legs,
              kodaIntro: "Lying leg curl isolates your hamstrings in a lengthened position — excellent for hamstring hypertrophy and injury prevention. Curl with intention and squeeze hard at the top of every rep.",
              formCues: [
                  .init(icon: "figure.stand", cue: "Hips pressed into the pad — don't let them lift during the curl"),
                  .init(icon: "arrow.up", cue: "Curl your heels toward your glutes with full intention"),
                  .init(icon: "clock", cue: "Squeeze hard at the top — heels should nearly touch your glutes"),
                  .init(icon: "arrow.down", cue: "Resist the weight on the way down — 2-3 second eccentric"),
              ],
              commonMistake: "Hips rising off the pad — this shifts the work away from hamstrings immediately"),

        .init(name: "calf raise",
              muscles: ["Gastrocnemius", "Soleus"],
              equipment: "Machine / Bodyweight",
              category: .legs,
              kodaIntro: "Calves are stubborn — they need full range of motion and high volume to respond. Go all the way up onto your toes, pause, and go all the way down for a real stretch. No partial reps allowed here.",
              formCues: [
                  .init(icon: "arrow.down", cue: "Lower your heels fully — get a real deep stretch at the bottom"),
                  .init(icon: "arrow.up", cue: "Rise onto the balls of your feet — maximum contraction"),
                  .init(icon: "clock", cue: "Pause at the top for 1-2 seconds — squeeze hard"),
                  .init(icon: "arrow.down", cue: "Full stretch at the bottom on every single rep"),
              ],
              commonMistake: "Short partial reps — tiny reps mean no stimulus. Full range is the only way calves grow"),

        // ── CONDITIONING ──────────────────────────────────────────────────────────

        .init(name: "kettlebell swing",
              muscles: ["Glutes", "Hamstrings", "Core", "Shoulders"],
              equipment: "Kettlebell",
              category: .conditioning,
              kodaIntro: "The kettlebell swing is a ballistic hip hinge that builds explosive posterior chain power. The bell is just along for the ride — your hips are the engine. Sharp hinge back, explosive hip snap forward. Every rep.",
              formCues: [
                  .init(icon: "arrow.back", cue: "Hike the bell back between your legs — feel the hamstring load"),
                  .init(icon: "arrow.forward", cue: "Explode with your hips — stand up sharply, don't squat the movement"),
                  .init(icon: "eye", cue: "The bell floats to chest height from hip power — you're not lifting it with your arms"),
                  .init(icon: "figure.stand", cue: "Squeeze glutes hard at the top — that's the lockout"),
              ],
              commonMistake: "Squatting the swing instead of hinging — arms stay relaxed, all power comes from hips"),

        .init(name: "battle ropes",
              muscles: ["Shoulders", "Core", "Conditioning"],
              equipment: "Battle Ropes",
              category: .conditioning,
              kodaIntro: "Battle ropes are metabolic conditioning at its finest. Shoulders, core, legs — everything works. Control your breathing, keep the waves big and consistent, and push through the burn without breaking form.",
              formCues: [
                  .init(icon: "figure.stand", cue: "Athletic stance, slight squat — load your legs from the start"),
                  .init(icon: "arrow.up", cue: "Alternating waves — drive from your hips and shoulders together"),
                  .init(icon: "lungs", cue: "Breathe with the rhythm — don't hold your breath"),
                  .init(icon: "eye", cue: "Keep the wave amplitude consistent — maintain it throughout"),
              ],
              commonMistake: "Flat feet and arms-only effort — load your legs and drive from your entire body"),

        .init(name: "burpees",
              muscles: ["Full Body", "Conditioning"],
              equipment: "Bodyweight",
              category: .conditioning,
              kodaIntro: "Burpees — the exercise everyone loves to hate. Full-body conditioning, metabolic challenge, mental test. Each rep is a movement quality test — fatigue will want to make you sloppy. Don't let it.",
              formCues: [
                  .init(icon: "arrow.down", cue: "Plant your hands, jump feet back to a solid plank position"),
                  .init(icon: "arrow.down", cue: "Chest to floor — a real push-up, not a sagging mess"),
                  .init(icon: "arrow.up", cue: "Jump feet back to your hands, drive up and explode into the jump"),
                  .init(icon: "lungs", cue: "Find a breathing rhythm — one full breath per rep helps"),
              ],
              commonMistake: "Sagging at the plank phase — every rep deserves a proper push-up. Maintain the standard"),

        .init(name: "box jump",
              muscles: ["Quads", "Glutes", "Explosive Power"],
              equipment: "Plyo Box",
              category: .conditioning,
              kodaIntro: "Box jumps train explosive power — the ability to generate maximum force in minimum time. It's not about box height, it's about jump quality. Load your hips, explode, land soft, step down safely.",
              formCues: [
                  .init(icon: "arrow.down", cue: "Load your hips — slight squat, arms swing back to load"),
                  .init(icon: "arrow.up", cue: "Drive arms up as you explode — maximum effort on every jump"),
                  .init(icon: "figure.stand", cue: "Land softly in a quarter-squat — absorb the force through your legs"),
                  .init(icon: "arrow.down", cue: "Step down (never jump down) — protect your joints and tendons"),
              ],
              commonMistake: "Landing stiff-legged — bend your knees and hips to absorb the landing safely every time"),

        .init(name: "jump rope",
              muscles: ["Calves", "Coordination", "Conditioning"],
              equipment: "Jump Rope",
              category: .conditioning,
              kodaIntro: "Jump rope is pure cardiovascular conditioning with coordination as the bonus. Rhythmic, intense, and builds calf endurance nothing else matches. Stay on the balls of your feet and find your rhythm.",
              formCues: [
                  .init(icon: "figure.stand", cue: "Stay on balls of your feet — heels never touch the ground"),
                  .init(icon: "eye", cue: "Small jumps — just enough clearance for the rope to pass"),
                  .init(icon: "figure.stand", cue: "Elbows close to your sides, wrists do the rope rotation"),
                  .init(icon: "lungs", cue: "Find a breathing rhythm — 2 jumps per breath works for many"),
              ],
              commonMistake: "Jumping too high — stay low, efficiency is the goal, not acrobatics"),

        .init(name: "rowing machine",
              muscles: ["Back", "Legs", "Core", "Arms"],
              equipment: "Rowing Ergometer",
              category: .conditioning,
              kodaIntro: "Rowing is a full-body conditioning masterpiece — 70% legs, 30% upper body. The power comes from your legs driving, not your arms pulling. If your back is doing all the work, your technique needs work.",
              formCues: [
                  .init(icon: "figure.stand", cue: "Drive with LEGS first — arms are the last thing to engage"),
                  .init(icon: "arrow.forward", cue: "Sequence: legs drive → lean back → arms pull to your chest"),
                  .init(icon: "arrow.back", cue: "Recovery: arms extend → lean forward → legs compress forward"),
                  .init(icon: "lungs", cue: "Breathe on the drive, exhale on the recovery stroke"),
              ],
              commonMistake: "Pulling primarily with arms and back — your legs should initiate and drive every stroke"),

        // ── MOBILITY ──────────────────────────────────────────────────────────────

        .init(name: "cat-cow",
              muscles: ["Spine", "Core", "Hip Flexors"],
              equipment: "Bodyweight",
              category: .mobility,
              kodaIntro: "Cat-cow warms up your entire spine and gets blood flowing into the discs. This is your spine saying good morning. Take your time with each rep — feel every vertebra move independently.",
              formCues: [
                  .init(icon: "figure.stand", cue: "Hands under shoulders, knees under hips to start"),
                  .init(icon: "arrow.down", cue: "Cow: belly drops, head and tailbone lift toward ceiling"),
                  .init(icon: "arrow.up", cue: "Cat: round your entire back, tuck chin and tailbone"),
                  .init(icon: "clock", cue: "Move slowly — feel each segment of your spine moving"),
              ],
              commonMistake: "Rushing through the reps — slow down and feel each vertebra move individually"),

        .init(name: "foam rolling",
              muscles: ["General Recovery"],
              equipment: "Foam Roller",
              category: .mobility,
              kodaIntro: "Foam rolling is self-myofascial release — working out knots and adhesions in your fascia. Spend real time on tight spots, breathe into the tension, and let the roller do its work. Slow and deliberate.",
              formCues: [
                  .init(icon: "clock", cue: "Roll slowly — 1 inch per second, never fast passes"),
                  .init(icon: "eye", cue: "Find tender spots and pause there for 30-60 seconds"),
                  .init(icon: "lungs", cue: "Breathe deeply into the tight spots — helps release the fascia"),
                  .init(icon: "figure.stand", cue: "Never roll directly over joints or your lower back vertebrae"),
              ],
              commonMistake: "Rolling too fast — pause on the tight spots, don't just skim through them"),

        .init(name: "stretching",
              muscles: ["Multiple"],
              equipment: "Bodyweight",
              category: .mobility,
              kodaIntro: "Active stretching improves range of motion that carries over directly to your lifts. Hold each position long enough to feel real change — breathe deeply, relax into the stretch, and own the new range.",
              formCues: [
                  .init(icon: "clock", cue: "Hold each stretch for 30-60 seconds minimum — short holds do nothing"),
                  .init(icon: "lungs", cue: "Breathe steadily into the stretch — never hold your breath"),
                  .init(icon: "eye", cue: "Move into each stretch gradually — never force the range"),
                  .init(icon: "figure.stand", cue: "Focus on the areas that are tightest from this specific session"),
              ],
              commonMistake: "10-second stretches — real flexibility requires 30+ seconds per position, minimum"),

        .init(name: "world's greatest stretch",
              muscles: ["Hip Flexors", "Thoracic Spine", "Hamstrings"],
              equipment: "Bodyweight",
              category: .mobility,
              kodaIntro: "It earns its name. The world's greatest stretch opens your hip flexors, thoracic spine, and hamstrings all in one fluid movement. This is essential pre- and post-workout mobility work.",
              formCues: [
                  .init(icon: "arrow.forward", cue: "Step one foot forward into a deep lunge position"),
                  .init(icon: "arrow.down", cue: "Drop your back knee to the floor, back foot extended"),
                  .init(icon: "arrow.up", cue: "Reach the arm on the same side as the front foot up toward the ceiling"),
                  .init(icon: "clock", cue: "Hold for a breath, then rotate — slow and controlled"),
              ],
              commonMistake: "Rushing through the rotation — pause and breathe in each position for real benefit"),

        .init(name: "pigeon pose",
              muscles: ["Hip External Rotators", "Glutes", "Hip Flexors"],
              equipment: "Bodyweight",
              category: .mobility,
              kodaIntro: "Pigeon pose targets your hip external rotators and glutes — areas that get brutally tight from heavy squatting and sitting. This is the stretch that unlocks your hips. Breathe into it.",
              formCues: [
                  .init(icon: "figure.stand", cue: "Front shin as close to parallel with your shoulders as possible"),
                  .init(icon: "arrow.down", cue: "Fold forward over the front leg to deepen the stretch"),
                  .init(icon: "lungs", cue: "Deep breaths into the hip — feel it release with each exhale"),
                  .init(icon: "clock", cue: "Hold for 60-90 seconds per side — this takes time to open"),
              ],
              commonMistake: "Rushing out of the position — hold it long enough to actually create change in the tissue"),

        .init(name: "couch stretch",
              muscles: ["Hip Flexors", "Quads"],
              equipment: "Bodyweight",
              category: .mobility,
              kodaIntro: "The couch stretch addresses hip flexor and quad tightness — the root cause of anterior pelvic tilt and knee pain for many athletes. It's uncomfortable because it's working. Breathe through it.",
              formCues: [
                  .init(icon: "figure.stand", cue: "Rear foot against the wall, knee at the base of the wall"),
                  .init(icon: "arrow.up", cue: "Torso upright — resist the urge to lean forward"),
                  .init(icon: "lungs", cue: "Breathe deeply and let the hip flexor lengthen with each exhale"),
                  .init(icon: "clock", cue: "Hold 60-90 seconds per side — this is slow therapeutic work"),
              ],
              commonMistake: "Leaning forward with your torso — stay upright to actually stretch the hip flexor"),

    ] // end _all
    // swiftlint:enable function_body_length
}
