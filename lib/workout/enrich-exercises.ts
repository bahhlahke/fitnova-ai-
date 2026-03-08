import { EXERCISE_METADATA } from "./exercise-metadata";

/**
 * Maps exercise names to specific visual assets (videos or high-quality images).
 * We prioritize premium external videos for major compounds and custom "pro" images for accessory moves.
 */
export const EXERCISE_VIDEO_MAP: Record<string, string> = {
    // COMPOUND BASICS (4K External Videos)
    "back squat": "https://videos.pexels.com/video-files/7934710/7934710-hd_1920_1080_25fps.mp4",
    "bench press": "https://videos.pexels.com/video-files/32239226/13749268_2560_1440_24fps.mp4",
    "deadlift": "https://videos.pexels.com/video-files/32239226/13749268_2560_1440_24fps.mp4",
    "squat": "https://videos.pexels.com/video-files/7934710/7934710-hd_1920_1080_25fps.mp4",
    "dumbbell row": "https://videos.pexels.com/video-files/3129208/3129208-uhd_2560_1440_25fps.mp4",
    "world's greatest stretch": "https://videos.pexels.com/video-files/4944021/4944021-uhd_2732_1440_24fps.mp4",

    // "PRO" ASSETS (Custom Generated - Sexy Female Fit Style)
    "leg press": "/images/refined/leg_press_pro.png",
    "front squat": "/images/refined/front_squat_pro.png",
    "bodyweight squat": "/images/refined/bodyweight_squat_pro.png",
    "incline dumbbell press": "/images/refined/incline_db_press_pro.png",
    "dumbbell press": "/images/refined/dumbbell_press_pro.png",
    "dumbbell rdl": "/images/refined/dumbbell_rdl_pro.png",
    "kettlebell swing": "/images/refined/kettlebell_swing_pro.png",
    "seated row": "/images/refined/seated_row_pro.png",
    "lat pulldown": "/images/refined/lat_pulldown_pro.png",
    "barbell row": "/images/refined/barbell_row_pro.png",
    "couch stretch": "/images/refined/couch_stretch_pro.png",
    "dead bug": "/images/refined/dead_bug_pro.png",
    "pause squat": "/images/refined/pause_squat_pro.png",
    "tempo goblet squat": "/images/refined/tempo_goblet_squat_pro.png",
    "close-grip bench press": "/images/refined/close_grip_bench_pro.png",
    "decline push-up": "/images/refined/decline_pushup_pro.png",
    "deficit rdl": "/images/refined/deficit_rdl_pro.png",
    "push-up": "/images/refined/pushup_pro.png",
    "goblet squat": "/images/refined/goblet_squat_pro.png",
    "single-arm row": "https://videos.pexels.com/video-files/3129208/3129208-uhd_2560_1440_25fps.mp4",
    "inverted row": "https://videos.pexels.com/video-files/4665484/4665484-hd_1920_1080_30fps.mp4",
    "block pull": "https://videos.pexels.com/video-files/7674502/7674502-uhd_2732_1440_25fps.mp4",
    "chest-supported row": "https://videos.pexels.com/video-files/4010375/4010375-hd_1920_1080_25fps.mp4",
    "renegade row": "https://videos.pexels.com/video-files/3129208/3129208-uhd_2560_1440_25fps.mp4",
    "zone 2 finisher": "https://videos.pexels.com/video-files/5267151/5267151-hd_1920_1080_24fps.mp4",
    "pull-up": "https://videos.pexels.com/video-files/4366620/4366620-hd_1080_1920_25fps.mp4",
    "overhead press": "https://videos.pexels.com/video-files/5267149/5267149-hd_1080_1920_24fps.mp4",
    "treadmill": "https://videos.pexels.com/video-files/4405105/4405105-hd_1080_1920_30fps.mp4",
    "battle ropes": "https://videos.pexels.com/video-files/4665484/4665484-hd_1920_1080_30fps.mp4",
    "rowing": "https://videos.pexels.com/video-files/4010375/4010375-hd_1920_1080_25fps.mp4",
};

/**
 * High-bitrate Cinema Loops for Koda Elite.
 * Sourced for 4K quality and Masterclass aesthetics.
 */
export const CINEMA_ASSET_MAP: Record<string, string> = {
    "back squat": "https://videos.pexels.com/video-files/7934710/7934710-hd_1920_1080_25fps.mp4",
    "bench press": "https://videos.pexels.com/video-files/32239226/13749268_2560_1440_24fps.mp4",
    "deadlift": "https://videos.pexels.com/video-files/32239226/13749268_2560_1440_24fps.mp4",
    "pull-up": "https://videos.pexels.com/video-files/4366620/4366620-hd_1080_1920_25fps.mp4",
    "overhead press": "https://videos.pexels.com/video-files/5267149/5267149-hd_1080_1920_24fps.mp4",
    "goblet squat": "https://videos.pexels.com/video-files/4366623/4366623-hd_1080_1920_25fps.mp4",
    "front squat": "https://videos.pexels.com/video-files/7934710/7934710-hd_1920_1080_25fps.mp4",
    "leg press": "https://videos.pexels.com/video-files/4366623/4366623-hd_1080_1920_25fps.mp4",
    "bulgarian split squat": "https://videos.pexels.com/video-files/4366623/4366623-hd_1080_1920_25fps.mp4",
    "box jumps": "https://videos.pexels.com/video-files/4405105/4405105-hd_1080_1920_30fps.mp4",
    "jump rope": "https://videos.pexels.com/video-files/4915605/4915605-hd_1080_1920_25fps.mp4",
    "burpees": "https://videos.pexels.com/video-files/5319451/5319451-hd_1080_1920_25fps.mp4",
    "kettlebell swing": "https://videos.pexels.com/video-files/4804368/4804368-hd_1080_1920_25fps.mp4",
    "treadmill": "https://videos.pexels.com/video-files/4405105/4405105-hd_1080_1920_30fps.mp4",
    "battle ropes": "https://videos.pexels.com/video-files/4665484/4665484-hd_1920_1080_30fps.mp4",
    "rowing": "https://videos.pexels.com/video-files/4010375/4010375-hd_1920_1080_25fps.mp4",
    "dumbbell press": "https://videos.pexels.com/video-files/5320015/5320015-hd_1080_1920_25fps.mp4",
    "chest-supported row": "https://videos.pexels.com/video-files/4010375/4010375-hd_1920_1080_25fps.mp4",
    "dips": "https://videos.pexels.com/video-files/5267149/5267149-hd_1080_1920_24fps.mp4",
    "mountain climbers": "https://videos.pexels.com/video-files/4366623/4366623-hd_1080_1920_25fps.mp4",
    "sled push": "https://videos.pexels.com/video-files/5267151/5267151-hd_1920_1080_24fps.mp4",
    "sled pull": "https://videos.pexels.com/video-files/5267151/5267151-hd_1920_1080_24fps.mp4",
    "neural core": "https://videos.pexels.com/video-files/3129957/3129957-uhd_2560_1440_30fps.mp4",
};

export function enrichExercise(name: string) {
    const normalized = name.toLowerCase().trim().replace(/\s+/g, " ");
    const metadata = EXERCISE_METADATA[normalized as keyof typeof EXERCISE_METADATA];
    const assetUrl = EXERCISE_VIDEO_MAP[normalized as keyof typeof EXERCISE_VIDEO_MAP];
    const cinemaUrl = CINEMA_ASSET_MAP[normalized as keyof typeof CINEMA_ASSET_MAP];

    return {
        tempo: metadata?.tempo,
        breathing: metadata?.breathing,
        intent: metadata?.intent,
        rationale: metadata?.rationale,
        video_url: assetUrl?.endsWith(".mp4") ? assetUrl : null,
        cinema_video_url: cinemaUrl || null,
        image_url: assetUrl?.match(/\.(png|jpg|jpeg)$/) ? assetUrl : null,
    };
}
