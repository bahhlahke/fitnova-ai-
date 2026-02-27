/**
 * Default demo images per exercise for guided workouts.
 * Keys are normalized (lowercase, trim).
 */

const RAW_PEXELS = {
  gym_dark: "https://videos.pexels.com/video-files/32239226/13749268_2560_1440_24fps.mp4",
  squat_heavy: "https://videos.pexels.com/video-files/7934710/7934710-hd_1920_1080_25fps.mp4",
  rdl_sweat: "https://videos.pexels.com/video-files/7674502/7674502-uhd_2732_1440_25fps.mp4",
  barbell_row: "https://videos.pexels.com/video-files/3129208/3129208-uhd_2560_1440_25fps.mp4",
  kettlebell_swing: "https://videos.pexels.com/video-files/8056269/8056269-hd_1920_1080_25fps.mp4",
  battle_ropes: "https://videos.pexels.com/video-files/4761405/4761405-uhd_2560_1440_25fps.mp4",
  pushups_dark: "https://videos.pexels.com/video-files/5243160/5243160-uhd_2560_1440_25fps.mp4",
  pullups_intense: "https://videos.pexels.com/video-files/4761793/4761793-uhd_2560_1440_25fps.mp4",
  deadlift_max: "https://videos.pexels.com/video-files/32239226/13749268_2560_1440_24fps.mp4", // re-using bench press dark aesthetic for now
  stretching_floor: "https://videos.pexels.com/video-files/4944021/4944021-uhd_2732_1440_24fps.mp4",
  db_curl: "https://videos.pexels.com/video-files/4754029/4754029-uhd_2560_1440_30fps.mp4",
  core_crunch: "https://videos.pexels.com/video-files/4753956/4753956-uhd_2560_1440_25fps.mp4",
  sprint_treadmill: "https://videos.pexels.com/video-files/8055998/8055998-hd_1920_1080_25fps.mp4",
  box_jumps: "https://videos.pexels.com/video-files/7673998/7673998-uhd_2732_1440_25fps.mp4"
};

const BY_NAME: Record<string, string> = {
  // --- CHEST ---
  "bench press": RAW_PEXELS.gym_dark,
  "barbell bench press": RAW_PEXELS.gym_dark,
  "dumbbell bench press": RAW_PEXELS.gym_dark,
  "incline bench press": RAW_PEXELS.gym_dark,
  "incline dumbbell press": RAW_PEXELS.gym_dark,
  "decline bench press": RAW_PEXELS.gym_dark,
  "push-up": RAW_PEXELS.pushups_dark,
  "pushups": RAW_PEXELS.pushups_dark,
  "push up": RAW_PEXELS.pushups_dark,
  "diamond push-up": RAW_PEXELS.pushups_dark,
  "decline push-up": RAW_PEXELS.pushups_dark,
  "incline push-up": RAW_PEXELS.pushups_dark,
  "chest fly": RAW_PEXELS.gym_dark,
  "cable fly": RAW_PEXELS.gym_dark,
  "dumbbell fly": RAW_PEXELS.gym_dark,
  "pec deck": RAW_PEXELS.gym_dark,
  "machine chest press": RAW_PEXELS.gym_dark,
  "svend press": RAW_PEXELS.gym_dark,
  "floor press": RAW_PEXELS.gym_dark,

  // --- BACK ---
  "deadlift": RAW_PEXELS.deadlift_max,
  "barbell deadlift": RAW_PEXELS.deadlift_max,
  "sumo deadlift": RAW_PEXELS.deadlift_max,
  "romanian deadlift": RAW_PEXELS.rdl_sweat,
  "rdl": RAW_PEXELS.rdl_sweat,
  "stiff-leg deadlift": RAW_PEXELS.rdl_sweat,
  "trap bar deadlift": RAW_PEXELS.deadlift_max,
  "pull-up": RAW_PEXELS.pullups_intense,
  "pull up": RAW_PEXELS.pullups_intense,
  "pullups": RAW_PEXELS.pullups_intense,
  "weighted pull-up": RAW_PEXELS.pullups_intense,
  "chin-up": RAW_PEXELS.pullups_intense,
  "chin up": RAW_PEXELS.pullups_intense,
  "lat pulldown": RAW_PEXELS.pullups_intense,
  "reverse grip pulldown": RAW_PEXELS.pullups_intense,
  "straight arm pulldown": RAW_PEXELS.pullups_intense,
  "barbell row": RAW_PEXELS.barbell_row,
  "bent over row": RAW_PEXELS.barbell_row,
  "dumbbell row": RAW_PEXELS.barbell_row,
  "single-arm row": RAW_PEXELS.barbell_row,
  "seated row": RAW_PEXELS.barbell_row,
  "cable row": RAW_PEXELS.barbell_row,
  "t-bar row": RAW_PEXELS.barbell_row,
  "pendlay row": RAW_PEXELS.barbell_row,
  "meadows row": RAW_PEXELS.barbell_row,
  "row": RAW_PEXELS.barbell_row,
  "good morning": RAW_PEXELS.rdl_sweat,
  "back extension": RAW_PEXELS.stretching_floor,
  "superman": RAW_PEXELS.stretching_floor,

  // --- LEGS / GLUTES ---
  "squat": RAW_PEXELS.squat_heavy,
  "back squat": RAW_PEXELS.squat_heavy,
  "barbell squat": RAW_PEXELS.squat_heavy,
  "front squat": RAW_PEXELS.squat_heavy,
  "box squat": RAW_PEXELS.squat_heavy,
  "zercher squat": RAW_PEXELS.squat_heavy,
  "goblet squat": RAW_PEXELS.squat_heavy,
  "split squat": RAW_PEXELS.squat_heavy,
  "bulgarian split squat": RAW_PEXELS.squat_heavy,
  "lunges": RAW_PEXELS.squat_heavy,
  "lunge": RAW_PEXELS.squat_heavy,
  "walking lunges": RAW_PEXELS.squat_heavy,
  "reverse lunge": RAW_PEXELS.squat_heavy,
  "forward lunge": RAW_PEXELS.squat_heavy,
  "lateral lunge": RAW_PEXELS.squat_heavy,
  "curtsy lunge": RAW_PEXELS.squat_heavy,
  "step-up": RAW_PEXELS.box_jumps,
  "step ups": RAW_PEXELS.box_jumps,
  "leg press": RAW_PEXELS.squat_heavy,
  "hack squat": RAW_PEXELS.squat_heavy,
  "hip thrust": RAW_PEXELS.rdl_sweat,
  "barbell hip thrust": RAW_PEXELS.rdl_sweat,
  "glute bridge": RAW_PEXELS.rdl_sweat,
  "leg curl": RAW_PEXELS.rdl_sweat,
  "lying leg curl": RAW_PEXELS.rdl_sweat,
  "seated leg curl": RAW_PEXELS.rdl_sweat,
  "leg extension": RAW_PEXELS.squat_heavy,
  "calf raise": RAW_PEXELS.squat_heavy,
  "standing calf raise": RAW_PEXELS.squat_heavy,
  "seated calf raise": RAW_PEXELS.squat_heavy,

  // --- SHOULDERS ---
  "overhead press": RAW_PEXELS.barbell_row,
  "military press": RAW_PEXELS.barbell_row,
  "dumbbell shoulder press": RAW_PEXELS.barbell_row,
  "arnold press": RAW_PEXELS.barbell_row,
  "push press": RAW_PEXELS.barbell_row,
  "lateral raise": RAW_PEXELS.gym_dark,
  "dumbbell lateral raise": RAW_PEXELS.gym_dark,
  "cable lateral raise": RAW_PEXELS.gym_dark,
  "front raise": RAW_PEXELS.gym_dark,
  "rear delt fly": RAW_PEXELS.gym_dark,
  "face pull": RAW_PEXELS.gym_dark,
  "shrugs": RAW_PEXELS.deadlift_max,
  "dumbbell shrugs": RAW_PEXELS.deadlift_max,
  "upright row": RAW_PEXELS.gym_dark,

  // --- ARMS ---
  "bicep curl": RAW_PEXELS.db_curl,
  "curl": RAW_PEXELS.db_curl,
  "dumbbell curl": RAW_PEXELS.db_curl,
  "barbell curl": RAW_PEXELS.db_curl,
  "ez bar curl": RAW_PEXELS.db_curl,
  "hammer curl": RAW_PEXELS.db_curl,
  "preacher curl": RAW_PEXELS.db_curl,
  "concentration curl": RAW_PEXELS.db_curl,
  "cable curl": RAW_PEXELS.db_curl,
  "tricep pushdown": RAW_PEXELS.gym_dark,
  "rope pushdown": RAW_PEXELS.gym_dark,
  "tricep extension": RAW_PEXELS.gym_dark,
  "overhead tricep extension": RAW_PEXELS.gym_dark,
  "skull crusher": RAW_PEXELS.gym_dark,
  "close grip bench press": RAW_PEXELS.gym_dark,
  "dips": RAW_PEXELS.pushups_dark,
  "dip": RAW_PEXELS.pushups_dark,
  "bench dip": RAW_PEXELS.pushups_dark,

  // --- CORE & CONDITIONING ---
  "plank": RAW_PEXELS.core_crunch,
  "side plank": RAW_PEXELS.core_crunch,
  "crunch": RAW_PEXELS.core_crunch,
  "sit-up": RAW_PEXELS.core_crunch,
  "sit up": RAW_PEXELS.core_crunch,
  "bicycle crunch": RAW_PEXELS.core_crunch,
  "russian twist": RAW_PEXELS.core_crunch,
  "leg raise": RAW_PEXELS.core_crunch,
  "hanging leg raise": RAW_PEXELS.pullups_intense,
  "dead bug": RAW_PEXELS.stretching_floor,
  "ab rollout": RAW_PEXELS.core_crunch,
  "mountain climber": RAW_PEXELS.core_crunch,
  "burpee": RAW_PEXELS.box_jumps,
  "box jump": RAW_PEXELS.box_jumps,
  "kettlebell swing": RAW_PEXELS.kettlebell_swing,
  "battle ropes": RAW_PEXELS.battle_ropes,
  "sprints": RAW_PEXELS.sprint_treadmill,
  "treadmill": RAW_PEXELS.sprint_treadmill,
  "rowing machine": RAW_PEXELS.sprint_treadmill,
  "jump rope": RAW_PEXELS.box_jumps,
  "jumping jacks": RAW_PEXELS.box_jumps,
  "high knees": RAW_PEXELS.sprint_treadmill,

  // --- MOBILITY / YOGA ---
  "world's greatest stretch": RAW_PEXELS.stretching_floor,
  "stretching": RAW_PEXELS.stretching_floor,
  "cat cow": RAW_PEXELS.stretching_floor,
  "cat-cow": RAW_PEXELS.stretching_floor,
  "childs pose": RAW_PEXELS.stretching_floor,
  "child's pose": RAW_PEXELS.stretching_floor,
  "downward dog": RAW_PEXELS.stretching_floor,
  "foam rolling": RAW_PEXELS.stretching_floor,
  "pigeon pose": RAW_PEXELS.stretching_floor,
  "couch stretch": RAW_PEXELS.stretching_floor,
  "90/90 stretch": RAW_PEXELS.stretching_floor,

  // --- OLYMPIC / POWER ---
  "power clean": RAW_PEXELS.deadlift_max,
  "clean and jerk": RAW_PEXELS.squat_heavy,
  "snatch": RAW_PEXELS.squat_heavy,
  "push jerk": RAW_PEXELS.squat_heavy,
  "thruster": RAW_PEXELS.squat_heavy,
  "wall ball": RAW_PEXELS.squat_heavy,
};

// Fallback is a dark, intense aesthetic gym shot
const DEFAULT_VIDEO = RAW_PEXELS.gym_dark;

function normalize(name: string): string {
  return name.toLowerCase().trim().replace(/\s+/g, " ");
}

/** True if the URL is a video file (guided workout will render <video> with loop/autoplay). */
export function isExerciseVideoUrl(url: string): boolean {
  return /\.(mp4|webm|mov)(\?|$)/i.test(url.trim());
}

/** True if the URL is an animated GIF (guided workout will render <img> so the GIF loops). */
export function isExerciseGifUrl(url: string): boolean {
  return /\.gif(\?|$)/i.test(url.trim());
}

/** Returns the display URL for an exercise (static image, GIF, or video). Plan can override via image_url. */
export function getExerciseImageUrl(
  exerciseName: string,
  overrideUrl?: string | null
): string {
  if (overrideUrl?.trim()) return overrideUrl.trim();
  const key = normalize(exerciseName);
  return BY_NAME[key] ?? DEFAULT_VIDEO;
}
