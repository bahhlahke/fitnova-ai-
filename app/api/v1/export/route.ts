/**
 * GET /api/v1/export?format=json|csv — Export user data (workouts, nutrition, progress). Auth required.
 */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { jsonError } from "@/lib/api/errors";
import { consumeToken } from "@/lib/api/rate-limit";

const RATE_LIMIT_CAPACITY = 5;
const RATE_LIMIT_REFILL_PER_SECOND = 5 / 3600;

function escapeCsvCell(value: unknown): string {
  const s = value == null ? "" : String(value);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const format = searchParams.get("format") === "csv" ? "csv" : "json";

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return jsonError(401, "AUTH_REQUIRED", "Sign in is required.");
    }

    const limiter = consumeToken(
      `export:${user.id}`,
      RATE_LIMIT_CAPACITY,
      RATE_LIMIT_REFILL_PER_SECOND
    );
    if (!limiter.allowed) {
      return NextResponse.json(
        { error: "Too many requests", code: "RATE_LIMITED" },
        { status: 429, headers: { "Retry-After": String(limiter.retryAfterSeconds) } }
      );
    }

    const [workoutsRes, nutritionRes, progressRes] = await Promise.all([
      supabase.from("workout_logs").select("*").eq("user_id", user.id).order("date", { ascending: false }),
      supabase.from("nutrition_logs").select("*").eq("user_id", user.id).order("date", { ascending: false }),
      supabase.from("progress_tracking").select("*").eq("user_id", user.id).order("date", { ascending: false }),
    ]);

    const workouts = workoutsRes.data ?? [];
    const nutrition = nutritionRes.data ?? [];
    const progress = progressRes.data ?? [];

    if (format === "csv") {
      const workoutRows = workouts as Record<string, unknown>[];
      const workoutHeader = ["date", "workout_type", "duration_minutes", "notes", "exercises"];
      const workoutCsv =
        workoutHeader.join(",") +
        "\n" +
        workoutRows
          .map((r) =>
            workoutHeader.map((h) => escapeCsvCell(h === "exercises" ? JSON.stringify(r[h]) : r[h])).join(",")
          )
          .join("\n");

      const nutritionRows = nutrition as Record<string, unknown>[];
      const nutritionHeader = ["date", "total_calories", "meals"];
      const nutritionCsv =
        nutritionHeader.join(",") +
        "\n" +
        nutritionRows
          .map((r) => nutritionHeader.map((h) => escapeCsvCell(r[h])).join(","))
          .join("\n");

      const progressRows = progress as Record<string, unknown>[];
      const progressHeader = ["date", "weight", "body_fat_percent", "measurements", "notes"];
      const progressCsv =
        progressHeader.join(",") +
        "\n" +
        progressRows
          .map((r) => progressHeader.map((h) => escapeCsvCell(h === "measurements" ? JSON.stringify(r[h]) : r[h])).join(","))
          .join("\n");

      const combined = `# Workouts\n${workoutCsv}\n\n# Nutrition\n${nutritionCsv}\n\n# Progress\n${progressCsv}`;
      return new NextResponse(combined, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": "attachment; filename=fitnova-export.csv",
        },
      });
    }

    const payload = {
      exported_at: new Date().toISOString(),
      workouts,
      nutrition,
      progress,
    };
    return NextResponse.json(payload, {
      headers: {
        "Content-Disposition": "attachment; filename=fitnova-export.json",
      },
    });
  } catch (error) {
    console.error("export_unhandled", { error: error instanceof Error ? error.message : "unknown" });
    return jsonError(500, "INTERNAL_ERROR", "Export failed.");
  }
}
