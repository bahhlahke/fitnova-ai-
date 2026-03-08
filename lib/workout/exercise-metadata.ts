export type ExerciseExpertCues = {
    tempo: string;
    breathing: string;
    intent: string;
    rationale: string;
};

export const EXERCISE_METADATA: Record<string, ExerciseExpertCues> = {
    "back squat": {
        tempo: "3-0-1-0 (3s down, explode up)",
        breathing: "Inhale/Brace at top, Exhale past sticking point",
        intent: "Drive the floor away, keep chest up.",
        rationale: "Builds absolute lower body strength and axial loading tolerance."
    },
    "goblet squat": {
        tempo: "2-1-1-0 (Pause at bottom)",
        breathing: "Inhale down, Exhale up",
        intent: "Elbows inside knees, stay upright.",
        rationale: "Excellent for reinforcing squat mechanics and core stability."
    },
    "bench press": {
        tempo: "2-0-1-0",
        breathing: "Big air before decent, Exhale on drive",
        intent: "Pull the bar apart to engage lats.",
        rationale: "Primary upper body horizontal push for chest and triceps."
    },
    "push-up": {
        tempo: "2-0-1-1",
        breathing: "Standard rhythm",
        intent: "Pike the floor away, rigid core.",
        rationale: "Closed-kinetic chain movement for shoulder health and serratus activation."
    },
    "romanian deadlift": {
        tempo: "3-0-1-0 (Slow eccentric)",
        breathing: "Brace hard before hinge",
        intent: "Push hips back like closing a door with your glutes.",
        rationale: "Targets posterior chain hypertrophy while minimizing fatigue compared to standard deadlifts."
    },
    "deadlift": {
        tempo: "1-0-1-0",
        breathing: "Maximum brace at start",
        intent: "Pull the slack out of the bar, then drive legs.",
        rationale: "Ultimate test of full body strength and CNS recruitment."
    },
    "dumbbell row": {
        tempo: "2-0-1-1",
        breathing: "Exhale on pull",
        intent: "Pull elbow to hip, don't rotate torso.",
        rationale: "Addresses unilateral imbalances and builds back thickness."
    },
    "world's greatest stretch": {
        tempo: "Controlled",
        breathing: "Deep belly breaths",
        intent: "Reach long, open the thoracic spine.",
        rationale: "Total body opener for hips, T-spine, and ankles."
    },
    "box squat": {
        tempo: "2-1-1-0 (Pause on box)",
        breathing: "Brace hard, exhale on drive",
        intent: "Control the descent, avoid plonking on the box.",
        rationale: "Develops explosive concentric strength and preserves knee health."
    },
    "incline push-up": {
        tempo: "2-0-1-0",
        breathing: "Inhale down, exhale up",
        intent: "Maintain a straight line from head to heels.",
        rationale: "Reduces absolute load while maintaining pushing volume and shoulder integrity."
    },
    "leg press": {
        tempo: "3-1-1-0",
        breathing: "Inhale down, exhale up",
        intent: "Control the weight, don't lock out knees at top.",
        rationale: "Hypertrophy focused volume for quads and glutes without lumbar loading."
    },
    "front squat": {
        tempo: "3-0-1-0",
        breathing: "Shelf chest high, brace hard",
        intent: "Elbows up, drive hips through.",
        rationale: "Increases quad demand and upright torso mechanics."
    },
    "bodyweight squat": {
        tempo: "2-0-1-0",
        breathing: "Standard rhythm",
        intent: "Sink hips back, track knees over toes.",
        rationale: "Foundational movement for mobility and high-rep volume."
    },
    "incline dumbbell press": {
        tempo: "2-0-1-0",
        breathing: "Inhale down, exhale up",
        intent: "Drive dumbbells toward center at top.",
        rationale: "Targets upper pectoral development and shoulder stability."
    },
    "dumbbell press": {
        tempo: "2-0-1-0",
        breathing: "Inhale down, exhale up",
        intent: "Control the eccentric, full range of motion.",
        rationale: "Builds pressing strength and horizontal stability."
    },
    "dumbbell rdl": {
        tempo: "3-0-1-0",
        breathing: "Inhale/Brace on hinge",
        intent: "Feel the stretch in hamstrings, drive hips forward.",
        rationale: "Unilateral control and posterior chain isolation."
    },
    "kettlebell swing": {
        tempo: "Explosive",
        breathing: "Sharp exhale on the 'snap'",
        intent: "Hinge deep, snap the hips forward.",
        rationale: "Develops explosive posterior power and conditioning."
    },
    "seated row": {
        tempo: "2-0-1-1",
        breathing: "Exhale on pull",
        intent: "Pull shoulders back first, then elbows.",
        rationale: "Focuses on mid-back thickness and postural health."
    },
    "lat pulldown": {
        tempo: "2-0-1-1",
        breathing: "Exhale on pull",
        intent: "Pull bar to chin, squeeze shoulder blades.",
        rationale: "Vertical pull for lat width and overhead strength."
    },
    "barbell row": {
        tempo: "2-0-1-0",
        breathing: "Exhale on pull",
        intent: "Pull bar to lower sternum, keep spine neutral.",
        rationale: "Primary builder of back thickness and hinge stability."
    },
    "single-arm row": {
        tempo: "2-0-1-1",
        breathing: "Exhale on pull",
        intent: "Pull elbow to hip, control the descent.",
        rationale: "Corrects asymmetries and improves grip strength."
    },
    "inverted row": {
        tempo: "2-0-1-1",
        breathing: "Exhale on pull",
        intent: "Touch chest to bar, stay rigid.",
        rationale: "Horizontal pulling bodyweight variant for scapular control."
    },
    "couch stretch": {
        tempo: "Static hold",
        breathing: "Deep belly breaths",
        intent: "Tuck tailbone, feel the hip flexor stretch.",
        rationale: "Opens the anterior chain, vital for desk-bound users."
    },
    "dead bug": {
        tempo: "Slow & controlled",
        breathing: "Exhale as limbs extend",
        intent: "Keep lower back glued to the floor.",
        rationale: "Core stabilization and rib-cage positioning mechanics."
    },
    "zone 2 finisher": {
        tempo: "Moderate/Easy",
        breathing: "Nasal breathing preferred",
        intent: "Maintain a pace you can talk at.",
        rationale: "Builds aerobic base and facilitates metabolic recovery."
    },
    "pause squat": {
        tempo: "2-2-1-0 (2s pause at bottom)",
        breathing: "Hold brace through pause, exhale on drive",
        intent: "Stay tight in the hole, don't relax.",
        rationale: "Builds enormous starting strength and positional awareness."
    },
    "tempo goblet squat": {
        tempo: "3-3-1-0 (Slow down, slow pause)",
        breathing: "Continuous control",
        intent: "Focus on vertical torso and knee tracking.",
        rationale: "Refines squat mechanics and increases time under tension."
    },
    "close-grip bench press": {
        tempo: "2-0-1-0",
        breathing: "Standard bench rhythm",
        intent: "Keep elbows tucked to prioritize triceps.",
        rationale: "Targets tricep hypertrophy and lock-out strength."
    },
    "decline push-up": {
        tempo: "2-0-1-0",
        breathing: "Standard rhythm",
        intent: "Pike slightly, focus on upper chest.",
        rationale: "Increases difficulty of the push-up and targets upper pecs."
    },
    "deficit rdl": {
        tempo: "3-0-1-0",
        breathing: "Maximum brace for depth",
        intent: "Reach for depth without rounding back.",
        rationale: "Extended range of motion for maximum hamstring recruitment."
    },
    "block pull": {
        tempo: "1-0-1-0",
        breathing: "Brace hard at start",
        intent: "Drive through the floor, snap hips.",
        rationale: "Focuses on the top half of the deadlift and allows heavier loading."
    },
    "chest-supported row": {
        tempo: "2-0-1-1",
        breathing: "Exhale on pull",
        intent: "Squeeze the bench with your chest, pull wide.",
        rationale: "Isolates the mid-back by removing lower back involvement."
    },
    "renegade row": {
        tempo: "Controlled",
        breathing: "Brace hard to prevent rotation",
        intent: "Don't let hips tilt as you pull.",
        rationale: "Combines horizontal pulling with intense anti-rotational core work."
    }
};

export const DEFAULT_CUES: ExerciseExpertCues = {
    tempo: "Controlled",
    breathing: "Don't hold breath",
    intent: "Focus on the working muscle",
    rationale: "Supportive movement for today's focus."
};

export function getExpertCues(name: string): ExerciseExpertCues {
    const normalized = name.toLowerCase().trim().replace(/\s+/g, " ");
    return EXERCISE_METADATA[normalized] || DEFAULT_CUES;
}
