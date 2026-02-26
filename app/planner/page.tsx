"use client";

import Link from "next/link";
import { useState } from "react";
import { Card, Button } from "@/components/ui";

/* ── Types ──────────────────────────────────────────────────────── */
interface Meal {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  time: string;
}

interface DayPlan {
  day: string;
  short: string;
  meals: Meal[];
  targetCalories: number;
  targetProtein: number;
}

/* ── Demo meal bank ─────────────────────────────────────────────── */
const MEAL_BANK: Omit<Meal, "id" | "time">[] = [
  { name: "Greek yoghurt + berries",      calories: 220, protein: 18, carbs: 24, fat: 5  },
  { name: "Oats + whey + banana",         calories: 450, protein: 35, carbs: 55, fat: 8  },
  { name: "Eggs on toast (3 eggs)",       calories: 380, protein: 28, carbs: 30, fat: 14 },
  { name: "Chicken & rice bowl",          calories: 620, protein: 52, carbs: 68, fat: 10 },
  { name: "Salmon, sweet potato, greens", calories: 580, protein: 45, carbs: 48, fat: 16 },
  { name: "Turkey wrap + side salad",     calories: 520, protein: 40, carbs: 45, fat: 14 },
  { name: "Beef stir-fry, jasmine rice",  calories: 680, protein: 48, carbs: 72, fat: 18 },
  { name: "Protein shake + apple",        calories: 220, protein: 25, carbs: 22, fat: 3  },
  { name: "Cottage cheese + nuts",        calories: 250, protein: 22, carbs: 10, fat: 12 },
  { name: "Tuna salad, rye bread",        calories: 390, protein: 36, carbs: 32, fat: 10 },
];

function randomMeal(time: string): Meal {
  const idx  = Math.floor(Math.random() * MEAL_BANK.length);
  return { ...MEAL_BANK[idx], id: `${time}-${idx}`, time };
}

function makeDayPlan(day: string, short: string): DayPlan {
  return {
    day, short,
    targetCalories: 2200,
    targetProtein: 165,
    meals: [
      randomMeal("07:30"),
      randomMeal("12:30"),
      randomMeal("19:00"),
      randomMeal("21:30"),
    ],
  };
}

/* ── Initial state ───────────────────────────────────────────────── */
const DAYS_OF_WEEK = [
  { day: "Monday",    short: "Mon" },
  { day: "Tuesday",   short: "Tue" },
  { day: "Wednesday", short: "Wed" },
  { day: "Thursday",  short: "Thu" },
  { day: "Friday",    short: "Fri" },
  { day: "Saturday",  short: "Sat" },
  { day: "Sunday",    short: "Sun" },
];

const initialWeek = (): DayPlan[] =>
  DAYS_OF_WEEK.map(({ day, short }) => makeDayPlan(day, short));

/* ─────────────────────────────────────────────────────────────────
   PAGE
───────────────────────────────────────────────────────────────── */
export default function PlannerPage() {
  const [week,      setWeek]     = useState<DayPlan[]>(initialWeek);
  const [activeDay, setActiveDay] = useState(0);
  const [generating,setGen]      = useState(false);

  const day = week[activeDay];
  const totalCal = day.meals.reduce((s, m) => s + m.calories, 0);
  const totalPro = day.meals.reduce((s, m) => s + m.protein, 0);
  const totalCarb= day.meals.reduce((s, m) => s + m.carbs, 0);
  const totalFat = day.meals.reduce((s, m) => s + m.fat, 0);
  const calPct   = Math.min(100, (totalCal / day.targetCalories) * 100);
  const proPct   = Math.min(100, (totalPro / day.targetProtein) * 100);

  function regenerateDay() {
    setGen(true);
    setTimeout(() => {
      setWeek(prev => {
        const next = [...prev];
        next[activeDay] = makeDayPlan(day.day, day.short);
        return next;
      });
      setGen(false);
    }, 800);
  }

  function removeMeal(mealId: string) {
    setWeek(prev => {
      const next = [...prev];
      next[activeDay] = {
        ...next[activeDay],
        meals: next[activeDay].meals.filter(m => m.id !== mealId),
      };
      return next;
    });
  }

  return (
    <div className="mx-auto w-full max-w-shell px-4 pb-10 pt-6 sm:px-6">

      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="hero-reveal mb-6">
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm font-medium text-fn-muted hover:text-fn-ink mb-4">
          <svg viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5 rotate-180">
            <path fillRule="evenodd" d="M2 8a.75.75 0 01.75-.75h8.69L8.22 4.03a.75.75 0 011.06-1.06l4.5 4.5a.75.75 0 010 1.06l-4.5 4.5a.75.75 0 01-1.06-1.06l3.22-3.22H2.75A.75.75 0 012 8z" clipRule="evenodd" />
          </svg>
          Back
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-fn-accent">Nutrition planning</p>
            <h1 className="display-md mt-2 text-fn-ink-rich">Weekly Meal Planner</h1>
            <p className="mt-2 text-fn-muted">Plan the week ahead with AI-suggested meals and macro targets.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={regenerateDay} loading={generating}
              icon={<svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4"><path fillRule="evenodd" d="M15.312 11.424a5.5 5.5 0 01-9.201 2.466l-.312-.311h2.433a.75.75 0 000-1.5H3.989a.75.75 0 00-.75.75v4.242a.75.75 0 001.5 0v-2.43l.31.31a7 7 0 0011.712-3.138.75.75 0 00-1.449-.389zm1.23-3.723a.75.75 0 00.219-.53V2.929a.75.75 0 00-1.5 0V5.36l-.31-.31A7 7 0 003.239 8.188a.75.75 0 101.448.389A5.5 5.5 0 0113.89 6.11l.311.31h-2.432a.75.75 0 000 1.5h4.243a.75.75 0 00.53-.219z" clipRule="evenodd" /></svg>}
            >
              AI regenerate day
            </Button>
            <Button icon={<svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4"><path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" /></svg>}>
              Add meal
            </Button>
          </div>
        </div>
      </div>

      {/* ── Day selector ───────────────────────────────────────── */}
      <div className="mb-6 flex gap-2 overflow-x-auto no-scrollbar pb-1">
        {week.map((d, i) => {
          const dCal = d.meals.reduce((s, m) => s + m.calories, 0);
          const isOk = dCal >= d.targetCalories * 0.85 && dCal <= d.targetCalories * 1.1;
          return (
            <button
              key={d.day}
              type="button"
              onClick={() => setActiveDay(i)}
              className={`shrink-0 rounded-2xl px-4 py-3 text-center transition-all duration-200 ${
                activeDay === i
                  ? "bg-fn-ink-rich text-white shadow-fn-dark"
                  : "border border-fn-border bg-white text-fn-muted hover:border-fn-primary/30"
              }`}
            >
              <p className="text-xs font-bold uppercase">{d.short}</p>
              <div className={`mx-auto mt-1.5 h-1.5 w-6 rounded-full ${
                activeDay === i ? (isOk ? "bg-fn-accent" : "bg-fn-danger/70") : (isOk ? "bg-fn-accent/50" : "bg-fn-border")
              }`} />
            </button>
          );
        })}
      </div>

      {/* ── Main layout ─────────────────────────────────────────── */}
      <div className="grid gap-4 lg:grid-cols-[1fr_300px]">

        {/* Left: Meals ─────────────────────────────────────────── */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl text-fn-ink-rich">{day.day}</h2>
            <span className="text-xs text-fn-muted">{day.meals.length} meals planned</span>
          </div>

          {day.meals.map((meal, mi) => (
            <Card
              key={meal.id}
              variant="default"
              padding="default"
              className={`rise-reveal ${mi > 0 ? `rise-reveal-delay-${Math.min(mi, 3)}` : ""}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="shrink-0 rounded-lg bg-fn-bg-alt px-2 py-0.5 text-xs font-semibold text-fn-muted">{meal.time}</span>
                  </div>
                  <p className="font-semibold text-fn-ink-rich">{meal.name}</p>
                  <div className="mt-2 flex flex-wrap gap-3 text-xs text-fn-muted">
                    <span><b className="text-fn-ink">{meal.calories}</b> kcal</span>
                    <span><b className="text-fn-primary">{meal.protein}g</b> protein</span>
                    <span><b className="text-fn-ink">{meal.carbs}g</b> carbs</span>
                    <span><b className="text-fn-ink">{meal.fat}g</b> fat</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => removeMeal(meal.id)}
                  className="shrink-0 rounded-lg p-1.5 text-fn-muted hover:bg-fn-bg-alt hover:text-fn-danger transition-colors"
                  aria-label="Remove meal"
                >
                  <svg viewBox="0 0 16 16" fill="currentColor" className="h-4 w-4">
                    <path d="M5.28 4.22a.75.75 0 00-1.06 1.06L6.94 8l-2.72 2.72a.75.75 0 101.06 1.06L8 9.06l2.72 2.72a.75.75 0 101.06-1.06L9.06 8l2.72-2.72a.75.75 0 00-1.06-1.06L8 6.94 5.28 4.22z" />
                  </svg>
                </button>
              </div>
            </Card>
          ))}

          {/* Add meal prompt */}
          <button
            type="button"
            className="w-full rounded-2xl border-2 border-dashed border-fn-border py-4 text-sm font-semibold text-fn-muted hover:border-fn-primary/40 hover:text-fn-primary hover:bg-fn-primary-light transition-all duration-200"
          >
            + Add meal to {day.day}
          </button>
        </div>

        {/* Right: Macro summary ─────────────────────────────── */}
        <div className="space-y-4">
          <Card variant="default" padding="lg" className="rise-reveal">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-fn-muted mb-4">Daily totals</p>

            {/* Calorie ring */}
            <div className="flex flex-col items-center mb-5">
              <div className="relative h-32 w-32">
                <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
                  <circle cx="50" cy="50" r="40" fill="none" stroke="#eef1fb" strokeWidth="10" />
                  <circle
                    cx="50" cy="50" r="40" fill="none"
                    stroke="#335cff" strokeWidth="10"
                    strokeLinecap="round"
                    strokeDasharray="251"
                    strokeDashoffset={251 - (251 * calPct) / 100}
                    className="transition-all duration-1000"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <p className="text-2xl font-bold text-fn-ink-rich">{totalCal}</p>
                  <p className="text-xs text-fn-muted">/ {day.targetCalories} kcal</p>
                </div>
              </div>
              <p className={`mt-2 text-xs font-semibold ${calPct >= 85 && calPct <= 110 ? "text-fn-accent" : calPct < 85 ? "text-fn-primary" : "text-fn-danger"}`}>
                {calPct >= 85 && calPct <= 110 ? "On target ✓" : calPct < 85 ? `${(day.targetCalories - totalCal)} kcal remaining` : `${(totalCal - day.targetCalories)} kcal over`}
              </p>
            </div>

            {/* Macro bars */}
            <div className="space-y-3">
              {[
                { label: "Protein",  val: totalPro,  target: day.targetProtein, unit: "g", color: "bg-fn-primary" },
                { label: "Carbs",    val: totalCarb, target: Math.round(day.targetCalories * 0.45 / 4), unit: "g", color: "bg-amber-400" },
                { label: "Fat",      val: totalFat,  target: Math.round(day.targetCalories * 0.28 / 9), unit: "g", color: "bg-fn-accent" },
              ].map(({ label, val, target, unit, color }) => (
                <div key={label}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-semibold text-fn-ink">{label}</span>
                    <span className="text-fn-muted">{val}{unit} / {target}{unit}</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-fn-bg-alt">
                    <div
                      className={`h-full rounded-full ${color} transition-all duration-700`}
                      style={{ width: `${Math.min(100, (val / target) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Week overview */}
          <Card variant="default" padding="default" className="rise-reveal rise-reveal-delay-1">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-fn-muted mb-3">Week at a glance</p>
            <div className="space-y-1.5">
              {week.map((d, i) => {
                const dCal = d.meals.reduce((s, m) => s + m.calories, 0);
                const pct  = Math.min(100, (dCal / d.targetCalories) * 100);
                const isOk = pct >= 85 && pct <= 110;
                return (
                  <button
                    key={d.day}
                    type="button"
                    onClick={() => setActiveDay(i)}
                    className={`flex w-full items-center gap-3 rounded-lg px-2 py-1.5 text-left transition-colors ${activeDay === i ? "bg-fn-primary-light" : "hover:bg-fn-bg-alt"}`}
                  >
                    <span className={`text-xs font-bold w-8 shrink-0 ${activeDay === i ? "text-fn-primary" : "text-fn-muted"}`}>{d.short}</span>
                    <div className="flex-1 h-1.5 rounded-full bg-fn-bg-alt overflow-hidden">
                      <div className={`h-full rounded-full ${isOk ? "bg-fn-accent" : "bg-fn-primary"} transition-all duration-500`} style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-[10px] text-fn-muted shrink-0">{dCal} kcal</span>
                  </button>
                );
              })}
            </div>
          </Card>

          <Link href="/log/nutrition" className="block">
            <Button variant="accent" className="w-full">Log today&apos;s meals</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
