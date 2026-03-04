export type ExerciseExpertCues = {
    tempo: string;
    breathing: string;
    intent: string;
    rationale: string;
};

export const EXPERT_COACHING_CUES: Record<string, ExerciseExpertCues> = {
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
    return EXPERT_COACHING_CUES[normalized] || DEFAULT_CUES;
}
