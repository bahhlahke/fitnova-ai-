//
//  DebugLaunchSurfaceView.swift
//  Koda AI
//
//  Debug-only smoke surface launcher for simulator QA.
//

import SwiftUI

struct DebugLaunchSurfaceView: View {
    let surface: String

    var body: some View {
        switch surface {
        case "home":
            HomeView()
        case "plan":
            PlanView()
        case "coach":
            CoachView()
        case "log":
            LogTabView()
        case "log-workout":
            NavigationStack { LogWorkoutView() }
        case "log-nutrition":
            NavigationStack { LogNutritionView() }
        case "guided-workout":
            NavigationStack { GuidedWorkoutView(exercises: sampleExercises) }
        case "motion-lab":
            NavigationStack { MotionLabView() }
        case "progress":
            BodyProgressView()
        case "body-scan":
            NavigationStack { BodyCompScanView() }
        case "history":
            NavigationStack { HistoryView() }
        case "check-in":
            CheckInView()
        case "community":
            CommunityView()
        case "settings":
            SettingsView()
        case "integrations":
            IntegrationsView()
        case "vitals":
            VitalsView()
        case "pricing":
            PricingView()
        case "badges":
            NavigationStack { BadgesView() }
        case "coach-support":
            CoachEscalateView()
        case "meal-plan":
            NavigationStack { MealPlanView() }
        case "fridge-scanner":
            NavigationStack { FridgeScannerView() }
        case "onboarding":
            OnboardingView()
        default:
            MainTabView()
        }
    }

    private var sampleExercises: [PlanExercise] {
        [
            PlanExercise(
                name: "Barbell Back Squat",
                sets: 4,
                reps: "6",
                intensity: "RPE 8",
                notes: "Brace hard and drive through the floor.",
                tempo: "31X0",
                breathing: "Big breath before each rep",
                intent: "Maximal force with perfect depth",
                rationale: "Primary lower-body strength exposure.",
                target_rir: 2,
                target_load_kg: 100,
                video_url: nil,
                cinema_video_url: nil,
                image_url: nil
            ),
            PlanExercise(
                name: "Romanian Deadlift",
                sets: 3,
                reps: "8",
                intensity: "RPE 7",
                notes: "Own the eccentric.",
                tempo: "3010",
                breathing: "Exhale through lockout",
                intent: "Hamstring tension",
                rationale: "Posterior-chain hypertrophy.",
                target_rir: 2,
                target_load_kg: 70,
                video_url: nil,
                cinema_video_url: nil,
                image_url: nil
            )
        ]
    }
}
