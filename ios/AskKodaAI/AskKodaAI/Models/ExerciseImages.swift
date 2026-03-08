//
//  ExerciseImages.swift
//  Koda AI
//
//  Maps exercise names to background videos for Guided Workouts.
//  Matches lib/workout/exercise-images.ts in the web app.
//

import Foundation

enum ExerciseImages {
    
    private static let rawPexels: [String: String] = [
        "gym_dark": "https://videos.pexels.com/video-files/32239226/13749268_2560_1440_24fps.mp4",
        "squat_heavy": "https://videos.pexels.com/video-files/7934710/7934710-hd_1920_1080_25fps.mp4",
        "rdl_sweat": "https://videos.pexels.com/video-files/7674502/7674502-uhd_2732_1440_25fps.mp4",
        "barbell_row": "https://videos.pexels.com/video-files/3129208/3129208-uhd_2560_1440_25fps.mp4",
        "kettlebell_swing": "https://videos.pexels.com/video-files/8056269/8056269-hd_1920_1080_25fps.mp4",
        "battle_ropes": "https://videos.pexels.com/video-files/4761405/4761405-uhd_2560_1440_25fps.mp4",
        "pushups_dark": "https://videos.pexels.com/video-files/5243160/5243160-uhd_2560_1440_25fps.mp4",
        "pullups_intense": "https://videos.pexels.com/video-files/4761793/4761793-uhd_2560_1440_25fps.mp4",
        "deadlift_max": "https://videos.pexels.com/video-files/32239226/13749268_2560_1440_24fps.mp4",
        "stretching_floor": "https://videos.pexels.com/video-files/4944021/4944021-uhd_2732_1440_24fps.mp4",
        "db_curl": "https://videos.pexels.com/video-files/4754029/4754029-uhd_2560_1440_30fps.mp4",
        "core_crunch": "https://videos.pexels.com/video-files/4753956/4753956-uhd_2560_1440_25fps.mp4",
        "sprint_treadmill": "https://videos.pexels.com/video-files/8055998/8055998-hd_1920_1080_25fps.mp4",
        "box_jumps": "https://videos.pexels.com/video-files/7673998/7673998-uhd_2732_1440_25fps.mp4",
        "inverted_row": "https://videos.pexels.com/video-files/4665484/4665484-hd_1920_1080_30fps.mp4",
        "block_pull": "https://videos.pexels.com/video-files/7674502/7674502-uhd_2732_1440_25fps.mp4",
        "chest_row": "https://videos.pexels.com/video-files/4010375/4010375-hd_1920_1080_25fps.mp4",
        "zone2": "https://videos.pexels.com/video-files/5267151/5267151-hd_1920_1080_24fps.mp4"
    ]

    private static let byName: [String: String] = {
        var map: [String: String] = [:]
        
        // --- CHEST ---
        let chestVideo = rawPexels["gym_dark"]!
        for name in ["bench press", "barbell bench press", "dumbbell bench press", "incline bench press", "incline dumbbell press", "decline bench press", "chest fly", "cable fly", "dumbbell fly", "pec deck", "machine chest press", "svend press", "floor press", "lateral raise", "dumbbell lateral raise", "cable lateral raise", "front raise", "rear delt fly", "face pull", "upright row", "tricep pushdown", "rope pushdown", "tricep extension", "overhead tricep extension", "skull crusher", "close grip bench press"] {
            map[name] = chestVideo
        }
        
        let pushupsVideo = rawPexels["pushups_dark"]!
        for name in ["push-up", "pushups", "push up", "diamond push-up", "decline push-up", "incline push-up", "dips", "dip", "bench dip"] {
            map[name] = pushupsVideo
        }
        
        // --- BACK ---
        let deadliftVideo = rawPexels["deadlift_max"]!
        for name in ["deadlift", "barbell deadlift", "sumo deadlift", "trap bar deadlift", "shrugs", "dumbbell shrugs", "power clean"] {
            map[name] = deadliftVideo
        }
        
        let rdlVideo = rawPexels["rdl_sweat"]!
        for name in ["romanian deadlift", "rdl", "stiff-leg deadlift", "good morning", "hip thrust", "barbell hip thrust", "glute bridge", "leg curl", "lying leg curl", "seated leg curl"] {
            map[name] = rdlVideo
        }
        
        let pullupVideo = rawPexels["pullups_intense"]!
        for name in ["pull-up", "pull up", "pullups", "weighted pull-up", "chin-up", "chin up", "lat pulldown", "reverse grip pulldown", "straight arm pulldown", "hanging leg raise"] {
            map[name] = pullupVideo
        }

        let rowVideo = rawPexels["barbell_row"]!
        for name in ["barbell row", "bent over row", "dumbbell row", "single-arm row", "seated row", "cable row", "t-bar row", "pendlay row", "meadows row", "row", "overhead press", "military press", "dumbbell shoulder press", "arnold press", "push press"] {
            map[name] = rowVideo
        }

        let stretchingVideo = rawPexels["stretching_floor"]!
        for name in ["back extension", "superman", "dead bug", "world's greatest stretch", "stretching", "cat cow", "cat-cow", "childs pose", "child's pose", "downward dog", "foam rolling", "pigeon pose", "couch stretch", "90/90 stretch"] {
            map[name] = stretchingVideo
        }
        
        // --- LEGS / GLUTES ---
        let squatVideo = rawPexels["squat_heavy"]!
        for name in ["squat", "back squat", "barbell squat", "front squat", "box squat", "zercher squat", "goblet squat", "split squat", "bulgarian split squat", "lunges", "lunge", "walking lunges", "reverse lunge", "forward lunge", "lateral lunge", "curtsy lunge", "leg press", "hack squat", "leg extension", "calf raise", "standing calf raise", "seated calf raise", "clean and jerk", "snatch", "push jerk", "thruster", "wall ball"] {
            map[name] = squatVideo
        }
        
        let boxjumpsVideo = rawPexels["box_jumps"]!
        for name in ["step-up", "step ups", "burpee", "box jump", "jump rope", "jumping jacks"] {
            map[name] = boxjumpsVideo
        }
        
        // --- ARMS ---
        let curlVideo = rawPexels["db_curl"]!
        for name in ["bicep curl", "curl", "dumbbell curl", "barbell curl", "ez bar curl", "hammer curl", "preacher curl", "concentration curl", "cable curl"] {
            map[name] = curlVideo
        }
        
        // --- CORE & CONDITIONING ---
        let crunchVideo = rawPexels["core_crunch"]!
        for name in ["plank", "side plank", "crunch", "sit-up", "sit up", "bicycle crunch", "russian twist", "leg raise", "ab rollout", "mountain climber"] {
            map[name] = crunchVideo
        }
        
        map["kettlebell swing"] = rawPexels["kettlebell_swing"]!
        map["battle ropes"] = rawPexels["battle_ropes"]!
        
        let sprintVideo = rawPexels["sprint_treadmill"]!
        for name in ["sprints", "treadmill", "rowing machine", "high knees", "zone 2 finisher"] {
            map[name] = sprintVideo
        }
        
        map["zone 2 finisher"] = rawPexels["zone2"]!
        map["inverted row"] = rawPexels["inverted_row"]!
        map["block pull"] = rawPexels["block_pull"]!
        map["chest-supported row"] = rawPexels["chest_row"]!
        map["renegade row"] = rawPexels["barbell_row"]!

        // PRO IMAGES
        map["leg press"] = "/images/refined/leg_press_pro.png"
        map["front squat"] = "/images/refined/front_squat_pro.png"
        map["bodyweight squat"] = "/images/refined/bodyweight_squat_pro.png"
        map["incline dumbbell press"] = "/images/refined/incline_db_press_pro.png"
        map["dumbbell press"] = "/images/refined/dumbbell_press_pro.png"
        map["dumbbell rdl"] = "/images/refined/dumbbell_rdl_pro.png"
        map["kettlebell swing"] = "/images/refined/kettlebell_swing_pro.png"
        map["seated row"] = "/images/refined/seated_row_pro.png"
        map["lat pulldown"] = "/images/refined/lat_pulldown_pro.png"
        map["barbell row"] = "/images/refined/barbell_row_pro.png"
        map["couch stretch"] = "/images/refined/couch_stretch_pro.png"
        map["dead bug"] = "/images/refined/dead_bug_pro.png"
        map["pause squat"] = "/images/refined/pause_squat_pro.png"
        map["tempo goblet squat"] = "/images/refined/tempo_goblet_squat_pro.png"
        map["close-grip bench press"] = "/images/refined/close_grip_bench_pro.png"
        map["decline push-up"] = "/images/refined/decline_pushup_pro.png"
        map["deficit rdl"] = "/images/refined/deficit_rdl_pro.png"
        map["push-up"] = "/images/refined/pushup_pro.png"
        map["goblet squat"] = "/images/refined/goblet_squat_pro.png"
        
        return map
    }()

    private static let defaultVideo = rawPexels["gym_dark"]!

    private static func normalize(_ name: String) -> String {
        return name.lowercased()
            .trimmingCharacters(in: .whitespacesAndNewlines)
            .replacingOccurrences(of: "\\s+", with: " ", options: .regularExpression)
    }

    /// Returns the display URL for an exercise video.
    static func getExerciseImageUrl(exerciseName: String, overrideUrl: String? = nil) -> String {
        if let over = overrideUrl?.trimmingCharacters(in: .whitespacesAndNewlines), !over.isEmpty {
            return over
        }
        let key = normalize(exerciseName)
        return byName[key] ?? defaultVideo
    }
}
