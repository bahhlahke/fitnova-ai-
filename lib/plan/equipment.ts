/**
 * Equipment profile for a user.
 * Stored in user_profile.devices.equipment
 */

export type GymAccessLevel = "full_gym" | "basic_gym" | "home_only" | "outdoor_only";
export type EquipmentTag =
    // Barbells & racks
    | "barbell" | "squat_rack" | "power_rack" | "bench_press"
    // Dumbbells & kettlebells
    | "dumbbells" | "kettlebells"
    // Machines
    | "cable_machine" | "lat_pulldown" | "leg_press" | "leg_curl" | "chest_fly_machine" | "smith_machine"
    // Cardio
    | "treadmill" | "rowing_machine" | "stationary_bike" | "assault_bike" | "jump_rope"
    // BW & bands
    | "pull_up_bar" | "resistance_bands" | "trx_suspension" | "dip_bars"
    // Other
    | "foam_roller" | "medicine_ball" | "battle_ropes" | "plyo_box" | "ab_wheel"
    // Bodyweight only
    | "bodyweight_only";

export type EquipmentProfile = {
    gym_access: GymAccessLevel;
    available_equipment: EquipmentTag[];
    /** Primary training location per day-of-week (0=Sun..6=Sat), if varies */
    location_by_weekday?: Partial<Record<string, "gym" | "home">>;
    notes?: string;
};

export const EQUIPMENT_PRESETS: Record<GymAccessLevel, { label: string; description: string; equipment: EquipmentTag[] }> = {
    full_gym: {
        label: "Full Commercial Gym",
        description: "Barbells, cable machines, full machine suite, cardio deck",
        equipment: [
            "barbell", "squat_rack", "power_rack", "bench_press", "dumbbells", "kettlebells",
            "cable_machine", "lat_pulldown", "leg_press", "leg_curl", "chest_fly_machine", "smith_machine",
            "treadmill", "rowing_machine", "stationary_bike", "assault_bike",
            "pull_up_bar", "resistance_bands", "trx_suspension", "dip_bars",
            "foam_roller", "medicine_ball", "battle_ropes", "plyo_box",
        ],
    },
    basic_gym: {
        label: "Basic Gym / Budget Box",
        description: "Dumbbells, some barbells, basic cardio, limited machines",
        equipment: [
            "barbell", "squat_rack", "bench_press", "dumbbells", "kettlebells",
            "cable_machine", "lat_pulldown", "leg_press",
            "treadmill", "stationary_bike",
            "pull_up_bar", "resistance_bands",
            "foam_roller",
        ],
    },
    home_only: {
        label: "Home Gym",
        description: "Dumbbells, bands, pull-up bar — no commercial machines",
        equipment: [
            "dumbbells", "kettlebells", "resistance_bands", "pull_up_bar", "dip_bars",
            "jump_rope", "foam_roller", "ab_wheel",
        ],
    },
    outdoor_only: {
        label: "Outdoor / Bodyweight",
        description: "No equipment — parks, outdoor pull-up bars, bodyweight only",
        equipment: ["pull_up_bar", "resistance_bands", "jump_rope", "foam_roller", "bodyweight_only"],
    },
};

/** Readable labels for equipment tags shown in the UI */
export const EQUIPMENT_LABELS: Record<EquipmentTag, string> = {
    barbell: "Barbell",
    squat_rack: "Squat Rack",
    power_rack: "Power Rack",
    bench_press: "Bench Press",
    dumbbells: "Dumbbells",
    kettlebells: "Kettlebells",
    cable_machine: "Cable Machine",
    lat_pulldown: "Lat Pulldown",
    leg_press: "Leg Press",
    leg_curl: "Leg Curl Machine",
    chest_fly_machine: "Chest Fly Machine",
    smith_machine: "Smith Machine",
    treadmill: "Treadmill",
    rowing_machine: "Rowing Machine",
    stationary_bike: "Stationary Bike",
    assault_bike: "Assault Bike",
    jump_rope: "Jump Rope",
    pull_up_bar: "Pull-Up Bar",
    resistance_bands: "Resistance Bands",
    trx_suspension: "TRX / Suspension",
    dip_bars: "Dip Bars",
    foam_roller: "Foam Roller",
    medicine_ball: "Medicine Ball",
    battle_ropes: "Battle Ropes",
    plyo_box: "Plyo Box",
    ab_wheel: "Ab Wheel",
    bodyweight_only: "Bodyweight Only",
};

/** Derive a readable equipment summary string for AI prompts */
export function describeEquipmentForAI(profile: EquipmentProfile): string {
    const lines: string[] = [
        `Gym access level: ${EQUIPMENT_PRESETS[profile.gym_access]?.label ?? profile.gym_access}`,
        `Available equipment: ${profile.available_equipment.map(e => EQUIPMENT_LABELS[e]).join(", ") || "bodyweight only"}`,
    ];
    if (profile.notes) lines.push(`Notes: ${profile.notes}`);
    return lines.join("\n");
}
