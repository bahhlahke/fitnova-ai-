"use client";

import Link from "next/link";
import { useState } from "react";
import { Card, Button } from "@/components/ui";

/* ── Types ──────────────────────────────────────────────────────── */
interface Exercise {
  name: string;
  sets: number;
  reps: string;
  rest: string;
}

interface Template {
  id: string;
  title: string;
  category: string;
  duration: number;
  difficulty: "Beginner" | "Intermediate" | "Advanced";
  focus: string[];
  exercises: Exercise[];
  description: string;
  emoji: string;
  color: string;
}

type Category = "All" | "Strength" | "Cardio" | "Mobility" | "HIIT" | "My Templates";

/* ── Demo data ──────────────────────────────────────────────────── */
const TEMPLATES: Template[] = [
  {
    id: "push-a",
    title: "Push Day A",
    category: "Strength",
    duration: 55,
    difficulty: "Intermediate",
    focus: ["Chest", "Shoulders", "Triceps"],
    description: "Classic push-focused compound session with progressive overload structure.",
    emoji: "🏋️",
    color: "from-fn-primary to-violet-600",
    exercises: [
      { name: "Barbell Bench Press", sets: 4, reps: "6–8", rest: "2–3 min" },
      { name: "Overhead Press",      sets: 3, reps: "8–10", rest: "90 s"   },
      { name: "Incline DB Press",    sets: 3, reps: "10–12", rest: "90 s"  },
      { name: "Lateral Raises",      sets: 3, reps: "12–15", rest: "60 s"  },
      { name: "Tricep Dips",         sets: 3, reps: "10–12", rest: "60 s"  },
    ],
  },
  {
    id: "pull-a",
    title: "Pull Day A",
    category: "Strength",
    duration: 50,
    difficulty: "Intermediate",
    focus: ["Back", "Biceps", "Rear Delts"],
    description: "Vertical and horizontal pulling patterns for balanced back development.",
    emoji: "💪",
    color: "from-fn-accent to-fn-accent-dim",
    exercises: [
      { name: "Pull-ups",            sets: 4, reps: "6–8", rest: "2 min"  },
      { name: "Barbell Row",         sets: 3, reps: "8–10", rest: "90 s"  },
      { name: "Cable Row",           sets: 3, reps: "10–12", rest: "75 s" },
      { name: "Face Pulls",          sets: 3, reps: "15–20", rest: "60 s" },
      { name: "DB Curls",            sets: 3, reps: "10–12", rest: "60 s" },
    ],
  },
  {
    id: "leg-a",
    title: "Leg Day A",
    category: "Strength",
    duration: 60,
    difficulty: "Advanced",
    focus: ["Quads", "Hamstrings", "Glutes"],
    description: "Squat-focused lower body session with posterior chain accessory work.",
    emoji: "🦵",
    color: "from-amber-500 to-orange-500",
    exercises: [
      { name: "Back Squat",         sets: 5, reps: "5",    rest: "3 min" },
      { name: "Romanian Deadlift",  sets: 3, reps: "8–10", rest: "2 min" },
      { name: "Leg Press",          sets: 3, reps: "12",   rest: "90 s"  },
      { name: "Leg Curl",           sets: 3, reps: "12–15", rest: "60 s" },
      { name: "Calf Raises",        sets: 4, reps: "15–20", rest: "45 s" },
    ],
  },
  {
    id: "fullbody-30",
    title: "Full Body 30",
    category: "Strength",
    duration: 30,
    difficulty: "Beginner",
    focus: ["Full body", "Compound"],
    description: "Time-efficient full body session for busy days — no equipment needed.",
    emoji: "⚡",
    color: "from-pink-500 to-rose-500",
    exercises: [
      { name: "Goblet Squat",     sets: 3, reps: "12", rest: "60 s" },
      { name: "Push-ups",         sets: 3, reps: "15", rest: "45 s" },
      { name: "DB Row",           sets: 3, reps: "12 each", rest: "45 s" },
      { name: "Hip Hinge",        sets: 3, reps: "15", rest: "45 s" },
      { name: "Plank",            sets: 3, reps: "30 s", rest: "30 s" },
    ],
  },
  {
    id: "hiit-20",
    title: "HIIT Blast 20",
    category: "HIIT",
    duration: 20,
    difficulty: "Intermediate",
    focus: ["Conditioning", "Fat loss"],
    description: "4 rounds of 5 exercises. 40s on, 20s off. Maximum metabolic impact.",
    emoji: "🔥",
    color: "from-red-500 to-orange-400",
    exercises: [
      { name: "Jump Squats",    sets: 4, reps: "40 s", rest: "20 s" },
      { name: "Burpees",        sets: 4, reps: "40 s", rest: "20 s" },
      { name: "Mountain Climbers", sets: 4, reps: "40 s", rest: "20 s" },
      { name: "Push-up Burpee", sets: 4, reps: "40 s", rest: "20 s" },
      { name: "High Knees",     sets: 4, reps: "40 s", rest: "60 s" },
    ],
  },
  {
    id: "mobility-am",
    title: "Morning Mobility",
    category: "Mobility",
    duration: 20,
    difficulty: "Beginner",
    focus: ["Flexibility", "Joint health", "Recovery"],
    description: "A gentle morning flow to open hips, thoracic spine, and shoulders.",
    emoji: "🧘",
    color: "from-sky-400 to-blue-500",
    exercises: [
      { name: "Cat-Cow",           sets: 2, reps: "10", rest: "none"  },
      { name: "World's Greatest Stretch", sets: 2, reps: "5 each", rest: "none" },
      { name: "Hip Flexor Stretch", sets: 2, reps: "45 s each", rest: "none" },
      { name: "Thoracic Rotation", sets: 2, reps: "10 each",    rest: "none" },
      { name: "Child's Pose",      sets: 2, reps: "60 s",        rest: "none" },
    ],
  },
];

const CATS: Category[] = ["All", "Strength", "HIIT", "Mobility", "Cardio", "My Templates"];
const DIFF_COLOR: Record<string, string> = {
  Beginner:     "bg-fn-accent-light text-fn-accent",
  Intermediate: "bg-fn-primary-light text-fn-primary",
  Advanced:     "bg-fn-danger-light text-fn-danger",
};

/* ─────────────────────────────────────────────────────────────────
   PAGE
───────────────────────────────────────────────────────────────── */
export default function TemplatesPage() {
  const [filter,   setFilter]   = useState<Category>("All");
  const [expanded, setExpanded] = useState<string | null>(null);

  const visible = filter === "All" || filter === "My Templates"
    ? TEMPLATES
    : TEMPLATES.filter(t => t.category === filter);

  return (
    <div className="mx-auto w-full max-w-shell px-4 pb-10 pt-6 sm:px-6">

      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="hero-reveal mb-8">
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm font-medium text-fn-muted hover:text-fn-ink mb-4">
          <svg viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5 rotate-180">
            <path fillRule="evenodd" d="M2 8a.75.75 0 01.75-.75h8.69L8.22 4.03a.75.75 0 011.06-1.06l4.5 4.5a.75.75 0 010 1.06l-4.5 4.5a.75.75 0 01-1.06-1.06l3.22-3.22H2.75A.75.75 0 012 8z" clipRule="evenodd" />
          </svg>
          Back
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-fn-primary">Workout library</p>
            <h1 className="display-md mt-2 text-fn-ink-rich">Templates</h1>
            <p className="mt-2 text-fn-muted">Curated sessions ready to launch — or build your own.</p>
          </div>
          <Button
            icon={
              <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
              </svg>
            }
          >
            Create template
          </Button>
        </div>
      </div>

      {/* ── Filter tabs ────────────────────────────────────────── */}
      <div className="mb-6 flex gap-2 overflow-x-auto no-scrollbar pb-1">
        {CATS.map(c => (
          <button
            key={c}
            type="button"
            onClick={() => setFilter(c)}
            className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition-all duration-200 ${
              filter === c
                ? "bg-fn-ink-rich text-white shadow-fn-soft"
                : "border border-fn-border bg-white text-fn-muted hover:border-fn-primary/30 hover:text-fn-ink"
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {/* ── Template grid ──────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map((t, i) => (
          <Card
            key={t.id}
            variant="default"
            padding="none"
            className={`rise-reveal ${i > 0 ? `rise-reveal-delay-${Math.min(i, 4)}` : ""} overflow-hidden`}
          >
            {/* Gradient header */}
            <div className={`relative bg-gradient-to-br ${t.color} px-5 py-5`}>
              <div className="flex items-start justify-between">
                <span className="text-3xl">{t.emoji}</span>
                <span className={`rounded-full px-2.5 py-1 text-xs font-bold text-white bg-white/20`}>
                  {t.duration} min
                </span>
              </div>
              <h3 className="mt-3 text-lg font-bold text-white">{t.title}</h3>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {t.focus.map(f => (
                  <span key={f} className="rounded-full bg-white/20 px-2 py-0.5 text-xs font-medium text-white">{f}</span>
                ))}
              </div>
            </div>

            {/* Body */}
            <div className="p-5">
              <div className="mb-3 flex items-center gap-2">
                <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${DIFF_COLOR[t.difficulty]}`}>
                  {t.difficulty}
                </span>
                <span className="text-xs text-fn-muted">{t.exercises.length} exercises</span>
              </div>
              <p className="text-xs leading-relaxed text-fn-muted">{t.description}</p>

              {/* Expandable exercise list */}
              {expanded === t.id && (
                <div className="mt-4 space-y-2">
                  <div className="grid grid-cols-4 gap-1 text-[10px] font-semibold uppercase tracking-wider text-fn-muted">
                    <span className="col-span-2">Exercise</span><span>Sets</span><span>Reps</span>
                  </div>
                  {t.exercises.map(ex => (
                    <div key={ex.name} className="grid grid-cols-4 gap-1 rounded-lg bg-fn-bg-alt px-2 py-2 text-xs">
                      <span className="col-span-2 font-medium text-fn-ink truncate">{ex.name}</span>
                      <span className="text-fn-muted">{ex.sets}</span>
                      <span className="text-fn-muted">{ex.reps}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-4 flex gap-2">
                <Link href="/log/workout" className="flex-1">
                  <Button size="sm" className="w-full">Start</Button>
                </Link>
                <button
                  type="button"
                  onClick={() => setExpanded(expanded === t.id ? null : t.id)}
                  className="rounded-lg border border-fn-border px-3 py-2 text-xs font-semibold text-fn-muted hover:bg-fn-bg-alt transition-colors"
                >
                  {expanded === t.id ? "Hide" : "Preview"}
                </button>
              </div>
            </div>
          </Card>
        ))}

        {/* My templates CTA */}
        {filter === "My Templates" && (
          <Card variant="outline" padding="lg" className="flex flex-col items-center justify-center text-center gap-3 min-h-[220px] border-dashed">
            <span className="text-4xl">➕</span>
            <p className="font-semibold text-fn-ink">Create your first template</p>
            <p className="text-xs text-fn-muted">Save any workout as a reusable template for quick launch.</p>
            <Button size="sm">Create template</Button>
          </Card>
        )}
      </div>
    </div>
  );
}
