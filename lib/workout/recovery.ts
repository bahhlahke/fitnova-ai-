import { getMuscleGroup, MUSCLE_GROUPS, type MuscleGroup } from "./muscle-groups";

export type MuscleReadiness = Record<MuscleGroup, number> & { overall_score?: number };

// Decays: 28 days for fitness, 7 days for fatigue
const CHRONIC_DECAY = 28;
const ACUTE_DECAY = 7;

export function calculateReadiness(logs: any[]): MuscleReadiness {
    const ctl: Record<MuscleGroup, number> = {} as any; // Chronic Training Load (Fitness)
    const atl: Record<MuscleGroup, number> = {} as any; // Acute Training Load (Fatigue)

    MUSCLE_GROUPS.forEach(m => {
        ctl[m] = 0;
        atl[m] = 0;
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    logs.forEach(log => {
        const logDate = new Date(log.date);
        logDate.setHours(0, 0, 0, 0);
        const daysAgo = Math.floor((today.getTime() - logDate.getTime()) / (1000 * 60 * 60 * 24));

        const exercises = Array.isArray(log.exercises) ? log.exercises : [];

        exercises.forEach((ex: any) => {
            const muscle = getMuscleGroup(ex.name);
            if (muscle !== "Other") {
                // Approximate Volume Load: sets * reps * weight. If unavailable, use sets * RPE
                let sessionLoad = 0;
                if (ex.performed_sets && ex.performed_sets.length > 0) {
                    sessionLoad = ex.performed_sets.reduce((sum: number, set: any) => {
                        const weight = set.weight_kg || ex.weight || 0;
                        const reps = set.reps || ex.reps || 0;
                        // If bodyweight, default weight to 1
                        return sum + (weight > 0 ? weight : 1) * reps;
                    }, 0);
                } else {
                    const sets = Number(ex.sets) || 0;
                    const rpe = Number(ex.intensity?.match(/\d+/)?.[0]) || 7;
                    sessionLoad = sets * rpe * 10; // Scaling factor
                }

                if (sessionLoad > 0) {
                    // Exponentially Weighted Moving Averages (EWMA)
                    ctl[muscle as MuscleGroup] += sessionLoad * Math.exp(-daysAgo / CHRONIC_DECAY);
                    atl[muscle as MuscleGroup] += sessionLoad * Math.exp(-daysAgo / ACUTE_DECAY);
                }
            }
        });
    });

    // Readiness = Fitness (CTL) - Fatigue (ATL)
    // Positive means recovered & primed (Fitness > Fatigue)
    // Negative means under-recovered (Fatigue > Fitness)
    const readiness: MuscleReadiness = {} as any;

    let totalScore = 0;
    // To normalize to a 0-100 scale (100 = fully recovered & highly fit, 0 = highly fatigued)
    // We compute the Acute:Chronic Workload Ratio (ACWR). 
    // Sweet spot is 0.8 - 1.3. Danger zone is > 1.5.
    MUSCLE_GROUPS.forEach(m => {
        const acute = atl[m];
        const chronic = ctl[m];

        if (chronic === 0 && acute === 0) {
            readiness[m] = 50; // Baseline neutral if no data
        } else if (chronic === 0 && acute > 0) {
            readiness[m] = 20; // High fatigue, very low fitness (new lifter shock)
        } else {
            const acwr = acute / chronic;

            // Map ACWR to a 0-100 readiness score:
            // ACWR 0.8 to 1.3 -> High readiness (80-100) -> Primed
            // ACWR 1.3 to 1.5 -> Moderate readiness (50-80) -> Fatigued but okay
            // ACWR > 1.5 -> Low readiness (0-50) -> Danger / overtrained
            // ACWR < 0.8 -> Declining fitness (50-80) -> Undertraining

            let score = 50;
            if (acwr >= 0.8 && acwr <= 1.3) {
                // Peak performance zone
                score = 80 + ((1.3 - acwr) / 0.5) * 20;
            } else if (acwr > 1.3 && acwr <= 1.5) {
                // Overreaching
                score = 50 + ((1.5 - acwr) / 0.2) * 30;
            } else if (acwr > 1.5) {
                // Danger zone
                score = Math.max(0, 50 - (acwr - 1.5) * 50);
            } else if (acwr < 0.8) {
                // Detraining
                score = 50 + (acwr / 0.8) * 30;
            }

            readiness[m] = Math.max(0, Math.min(100, Math.round(score)));
        }
        totalScore += readiness[m];
    });

    readiness.overall_score = Math.round(totalScore / MUSCLE_GROUPS.length) / 100;

    return readiness;
}

