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
            NavigationStack { GuidedWorkoutView(exercises: DemoContent.sampleExercises) }
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
}
