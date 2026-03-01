#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const DEFAULT_BASE_URL = process.env.WORKFLOW_BASE_URL ?? "http://localhost:3000";
const DEFAULT_MODEL = process.env.WORKFLOW_VALIDATOR_MODEL ?? "openai/gpt-4o-mini";
const DEFAULT_TIMEOUT_MS = Number.parseInt(process.env.WORKFLOW_TIMEOUT_MS ?? "12000", 10);

const WORKFLOWS = [
  {
    id: "signed_out_acquisition",
    title: "Signed-out acquisition funnel",
    persona: "New visitor evaluating whether this product can coach them effectively",
    goal: "Land on the site, understand value, and reach auth from assessment flow",
    steps: [
      { label: "Landing page loads", path: "/", method: "GET", expectedStatus: [200] },
      { label: "Assessment page loads", path: "/start", method: "GET", expectedStatus: [200] },
      { label: "Auth page loads", path: "/auth", method: "GET", expectedStatus: [200] },
    ],
  },
  {
    id: "onboarding_and_shell",
    title: "Onboarding and app shell entry",
    persona: "Recently signed-up user setting up profile and entering core product",
    goal: "Open onboarding and access shell routes without route failures",
    steps: [
      { label: "Onboarding route loads", path: "/onboarding", method: "GET", expectedStatus: [200] },
      { label: "Settings route loads", path: "/settings", method: "GET", expectedStatus: [200] },
      { label: "History route loads", path: "/history?tab=workouts", method: "GET", expectedStatus: [200] },
    ],
  },
  {
    id: "dashboard_ai",
    title: "Dashboard AI command center",
    persona: "Daily active user using natural language to log and ask questions",
    goal: "Reach dashboard AI and verify chat endpoint behavior",
    steps: [
      { label: "Dashboard focus route loads", path: "/?focus=ai", method: "GET", expectedStatus: [200] },
      {
        label: "AI respond endpoint accepts request shape",
        path: "/api/v1/ai/respond",
        method: "POST",
        body: { message: "Log a 30 minute workout", localDate: "2026-03-01" },
        expectedStatus: [200, 401, 429, 503],
      },
      {
        label: "Daily plan generation endpoint responds",
        path: "/api/v1/plan/daily",
        method: "POST",
        body: { todayConstraints: { minutesAvailable: 35, location: "gym" } },
        expectedStatus: [200, 401, 429, 500],
      },
      {
        label: "Weekly plan endpoint responds",
        path: "/api/v1/plan/weekly",
        method: "GET",
        expectedStatus: [200, 401, 429, 500],
      },
    ],
  },
  {
    id: "nutrition_workflow",
    title: "Nutrition logging workflow",
    persona: "User logging meals quickly and relying on AI estimates",
    goal: "Open nutrition view and validate AI nutrition endpoints",
    steps: [
      { label: "Nutrition route loads", path: "/log/nutrition", method: "GET", expectedStatus: [200] },
      {
        label: "Analyze meal endpoint responds",
        path: "/api/v1/ai/analyze-meal",
        method: "POST",
        body: { type: "text", description: "3 eggs and toast" },
        expectedStatus: [200, 401, 400, 500],
      },
      {
        label: "Meal suggestions endpoint responds",
        path: "/api/v1/ai/meal-suggestions",
        method: "POST",
        body: { context: "post workout dinner" },
        expectedStatus: [200, 401, 429, 503],
      },
      {
        label: "Nutrition insight endpoint responds",
        path: "/api/v1/ai/nutrition-insight",
        method: "POST",
        body: {},
        expectedStatus: [200, 401, 429, 503],
      },
    ],
  },
  {
    id: "workout_workflow",
    title: "Workout logging and guided execution",
    persona: "User completing planned workouts and expecting immediate feedback",
    goal: "Validate workout, guided, and post-workout insight surfaces",
    steps: [
      { label: "Workout route loads", path: "/log/workout", method: "GET", expectedStatus: [200] },
      { label: "Guided workout route loads", path: "/log/workout/guided", method: "GET", expectedStatus: [200] },
      {
        label: "Post-workout insight endpoint responds",
        path: "/api/v1/ai/post-workout-insight",
        method: "POST",
        body: {},
        expectedStatus: [200, 401, 429, 503],
      },
      {
        label: "Readiness insight endpoint responds",
        path: "/api/v1/ai/readiness-insight",
        method: "POST",
        body: {},
        expectedStatus: [200, 401, 429, 503],
      },
      {
        label: "Swap exercise endpoint responds",
        path: "/api/v1/plan/swap-exercise",
        method: "POST",
        body: { currentExercise: "Back Squat", reason: "knee soreness", location: "gym" },
        expectedStatus: [200, 400, 401, 429, 500],
      },
    ],
  },
  {
    id: "motion_and_body_comp",
    title: "Motion analysis and body composition scanning",
    persona: "User looking for form correction and composition updates",
    goal: "Validate motion/body scan routes and AI endpoints",
    steps: [
      { label: "Motion route loads", path: "/motion", method: "GET", expectedStatus: [200] },
      { label: "Body comp scanner route loads", path: "/progress/scan", method: "GET", expectedStatus: [200] },
      {
        label: "Vision endpoint validates request",
        path: "/api/v1/ai/vision",
        method: "POST",
        body: { images: [] },
        expectedStatus: [200, 400, 401, 500],
      },
      {
        label: "Body comp endpoint validates request",
        path: "/api/v1/ai/body-comp",
        method: "POST",
        body: { images: {} },
        expectedStatus: [200, 400, 401, 500],
      },
    ],
  },
  {
    id: "progress_and_checkin",
    title: "Progress tracking and daily check-in",
    persona: "User monitoring trend and readiness across the week",
    goal: "Validate progress/check-in routes and narrative endpoints",
    steps: [
      { label: "Check-in route loads", path: "/check-in", method: "GET", expectedStatus: [200] },
      { label: "Progress route loads", path: "/progress", method: "GET", expectedStatus: [200] },
      { label: "Add progress route loads", path: "/progress/add", method: "GET", expectedStatus: [200] },
      {
        label: "Progress insight endpoint responds",
        path: "/api/v1/ai/progress-insight",
        method: "POST",
        body: {},
        expectedStatus: [200, 401, 429, 503],
      },
      {
        label: "Projection endpoint responds",
        path: "/api/v1/ai/projection",
        method: "GET",
        expectedStatus: [200, 401, 500],
      },
      {
        label: "Retention risk endpoint responds",
        path: "/api/v1/ai/retention-risk",
        method: "POST",
        body: {},
        expectedStatus: [200, 401, 429, 500],
      },
      {
        label: "Performance analytics endpoint responds",
        path: "/api/v1/analytics/performance",
        method: "GET",
        expectedStatus: [200, 401, 500],
      },
    ],
  },
  {
    id: "settings_billing_exports",
    title: "Settings, billing, and exports",
    persona: "User managing account, data, and subscription",
    goal: "Validate settings route plus export and billing APIs",
    steps: [
      { label: "Settings route loads", path: "/settings", method: "GET", expectedStatus: [200] },
      { label: "Export JSON endpoint responds", path: "/api/v1/export?format=json", method: "GET", expectedStatus: [200, 401, 429, 500] },
      { label: "Export CSV endpoint responds", path: "/api/v1/export?format=csv", method: "GET", expectedStatus: [200, 401, 429, 500] },
      {
        label: "Stripe checkout endpoint responds",
        path: "/api/v1/stripe/checkout",
        method: "POST",
        body: {},
        expectedStatus: [200, 401, 500, 503],
      },
      {
        label: "Coach escalation page loads",
        path: "/coach/escalate",
        method: "GET",
        expectedStatus: [200],
      },
      {
        label: "Coach escalation API validates payload",
        path: "/api/v1/coach/escalate",
        method: "POST",
        body: { topic: "Need plan review", urgency: "normal" },
        expectedStatus: [200, 401, 429, 500],
      },
      {
        label: "Reminder dispatch job endpoint responds",
        path: "/api/v1/jobs/reminders",
        method: "POST",
        body: {},
        expectedStatus: [200, 401, 500],
      },
    ],
  },
  {
    id: "legacy_redirects",
    title: "Legacy route compatibility",
    persona: "Returning user from old deep links",
    goal: "Ensure old routes redirect to current destinations",
    steps: [
      {
        label: "Coach route redirects to dashboard AI",
        path: "/coach",
        method: "GET",
        expectedStatus: [307, 308],
        expectedLocationIncludes: "/?focus=ai",
      },
      {
        label: "Omni route redirects to dashboard AI",
        path: "/omni",
        method: "GET",
        expectedStatus: [307, 308],
        expectedLocationIncludes: "/?focus=ai",
      },
      {
        label: "Log route redirects to workout",
        path: "/log",
        method: "GET",
        expectedStatus: [307, 308],
        expectedLocationIncludes: "/log/workout",
      },
      {
        label: "Legacy motion lab route redirects",
        path: "/coach/motion-lab",
        method: "GET",
        expectedStatus: [307, 308],
        expectedLocationIncludes: "/motion",
      },
    ],
  },
];

function parseArgs(argv) {
  const args = {
    baseUrl: DEFAULT_BASE_URL,
    outputPath: "",
    useAi: true,
    timeoutMs: Number.isFinite(DEFAULT_TIMEOUT_MS) ? DEFAULT_TIMEOUT_MS : 12000,
  };

  for (let i = 2; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === "--base-url" && argv[i + 1]) {
      args.baseUrl = argv[i + 1];
      i += 1;
      continue;
    }
    if (token === "--output" && argv[i + 1]) {
      args.outputPath = argv[i + 1];
      i += 1;
      continue;
    }
    if (token === "--no-ai") {
      args.useAi = false;
      continue;
    }
    if (token === "--timeout-ms" && argv[i + 1]) {
      const parsed = Number.parseInt(argv[i + 1], 10);
      if (Number.isFinite(parsed) && parsed > 0) args.timeoutMs = parsed;
      i += 1;
      continue;
    }
  }

  return args;
}

function withTimeout(ms) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), ms);
  return {
    signal: controller.signal,
    done: () => clearTimeout(id),
  };
}

function clipText(value, max = 180) {
  if (!value) return "";
  const compact = value.replace(/\s+/g, " ").trim();
  if (compact.length <= max) return compact;
  return `${compact.slice(0, max - 1)}…`;
}

function cleanJsonString(value) {
  return value.replace(/```json|```/gi, "").trim();
}

async function runStep(baseUrl, step, timeoutMs) {
  const url = new URL(step.path, baseUrl).toString();
  const method = step.method ?? "GET";
  const headers = {
    Accept: "application/json, text/html;q=0.9,*/*;q=0.8",
  };
  let body;

  if (step.body !== undefined && method !== "GET") {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(step.body);
  }

  const timeout = withTimeout(timeoutMs);

  try {
    const response = await fetch(url, {
      method,
      headers,
      body,
      redirect: "manual",
      signal: timeout.signal,
    });

    const text = await response.text();
    const location = response.headers.get("location") ?? "";
    const statusPass = step.expectedStatus.includes(response.status);
    const locationPass = step.expectedLocationIncludes
      ? location.includes(step.expectedLocationIncludes)
      : true;

    return {
      label: step.label,
      path: step.path,
      method,
      status: response.status,
      location,
      expectedStatus: step.expectedStatus,
      expectedLocationIncludes: step.expectedLocationIncludes ?? "",
      pass: statusPass && locationPass,
      snippet: clipText(text),
      error: "",
    };
  } catch (error) {
    return {
      label: step.label,
      path: step.path,
      method,
      status: 0,
      location: "",
      expectedStatus: step.expectedStatus,
      expectedLocationIncludes: step.expectedLocationIncludes ?? "",
      pass: false,
      snippet: "",
      error: error instanceof Error ? error.message : "Unknown request error",
    };
  } finally {
    timeout.done();
  }
}

async function judgeWorkflowWithAi({ workflow, deterministicResult, steps, apiKey, model }) {
  if (!apiKey) return null;

  const payload = {
    model,
    temperature: 0.2,
    max_tokens: 900,
    messages: [
      {
        role: "system",
        content:
          "You are a QA lead simulating a realistic app user. Evaluate workflow evidence and output strict JSON only with this shape: {\"verdict\":\"pass|partial|fail\",\"confidence\":0.0,\"ux_risk\":\"low|medium|high\",\"summary\":\"...\",\"friction_points\":[{\"step\":\"...\",\"issue\":\"...\",\"impact\":\"...\",\"priority\":\"P0|P1|P2\",\"recommendation\":\"...\"}],\"suggested_metrics\":[\"...\"] }.",
      },
      {
        role: "user",
        content: JSON.stringify(
          {
            workflow: {
              id: workflow.id,
              title: workflow.title,
              persona: workflow.persona,
              goal: workflow.goal,
            },
            deterministic_result: deterministicResult,
            evidence: steps,
          },
          null,
          2
        ),
      },
    ],
  };

  const timeout = withTimeout(15_000);

  try {
    const response = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
      signal: timeout.signal,
    });

    if (!response.ok) {
      return {
        verdict: "partial",
        confidence: 0.25,
        ux_risk: "medium",
        summary: `AI judge unavailable (HTTP ${response.status}).`,
        friction_points: [],
        suggested_metrics: [],
      };
    }

    const data = await response.json();
    const raw = data?.choices?.[0]?.message?.content ?? "";
    const parsed = JSON.parse(cleanJsonString(String(raw)));

    return {
      verdict: ["pass", "partial", "fail"].includes(parsed.verdict) ? parsed.verdict : "partial",
      confidence: typeof parsed.confidence === "number" ? parsed.confidence : 0.5,
      ux_risk: ["low", "medium", "high"].includes(parsed.ux_risk) ? parsed.ux_risk : "medium",
      summary: typeof parsed.summary === "string" ? parsed.summary : "No summary provided.",
      friction_points: Array.isArray(parsed.friction_points) ? parsed.friction_points : [],
      suggested_metrics: Array.isArray(parsed.suggested_metrics) ? parsed.suggested_metrics : [],
    };
  } catch (error) {
    return {
      verdict: "partial",
      confidence: 0.2,
      ux_risk: "medium",
      summary: `AI judge error: ${error instanceof Error ? error.message : "unknown error"}`,
      friction_points: [],
      suggested_metrics: [],
    };
  } finally {
    timeout.done();
  }
}

function workflowDeterministicStatus(stepResults) {
  const total = stepResults.length;
  const passed = stepResults.filter((step) => step.pass).length;
  if (passed === total) return "pass";
  if (passed === 0) return "fail";
  return "partial";
}

function timestampSlug(date) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}-${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}`;
}

function formatStatusCell(step) {
  if (step.error) return `error (${step.error})`;
  return `${step.status}${step.location ? ` -> ${step.location}` : ""}`;
}

function toMarkdownReport({ startedAt, finishedAt, baseUrl, useAi, model, workflows }) {
  const totalWorkflows = workflows.length;
  const deterministicPass = workflows.filter((w) => w.deterministic.result === "pass").length;
  const deterministicPartial = workflows.filter((w) => w.deterministic.result === "partial").length;
  const deterministicFail = workflows.filter((w) => w.deterministic.result === "fail").length;

  const aiPass = workflows.filter((w) => w.ai?.verdict === "pass").length;
  const aiPartial = workflows.filter((w) => w.ai?.verdict === "partial").length;
  const aiFail = workflows.filter((w) => w.ai?.verdict === "fail").length;

  const recommendationPool = [];
  for (const workflow of workflows) {
    const points = workflow.ai?.friction_points ?? [];
    for (const point of points) {
      if (typeof point?.recommendation === "string" && point.recommendation.trim()) {
        recommendationPool.push({
          priority: typeof point.priority === "string" ? point.priority : "P2",
          text: point.recommendation.trim(),
          workflow: workflow.title,
        });
      }
    }
  }

  const uniqueRecommendations = [];
  for (const item of recommendationPool) {
    if (!uniqueRecommendations.find((existing) => existing.text === item.text)) {
      uniqueRecommendations.push(item);
    }
  }

  uniqueRecommendations.sort((a, b) => a.priority.localeCompare(b.priority));

  let md = "";
  md += "# AI Workflow Validation Report\n\n";
  md += `- Generated (UTC): ${startedAt.toISOString()} to ${finishedAt.toISOString()}\n`;
  md += `- Base URL: ${baseUrl}\n`;
  md += `- AI judge: ${useAi ? `enabled (${model})` : "disabled"}\n\n`;

  md += "## Summary\n\n";
  md += `- Workflows checked: ${totalWorkflows}\n`;
  md += `- Deterministic status: pass ${deterministicPass}, partial ${deterministicPartial}, fail ${deterministicFail}\n`;
  if (useAi) {
    md += `- AI-simulated status: pass ${aiPass}, partial ${aiPartial}, fail ${aiFail}\n`;
  }
  md += "\n";

  md += "| Workflow | Deterministic | AI Verdict |\n";
  md += "|---|---|---|\n";
  for (const workflow of workflows) {
    md += `| ${workflow.title} | ${workflow.deterministic.result} (${workflow.deterministic.passed}/${workflow.deterministic.total}) | ${workflow.ai?.verdict ?? "n/a"} |\n`;
  }
  md += "\n";

  if (uniqueRecommendations.length > 0) {
    md += "## Cross-Workflow Priority Recommendations\n\n";
    for (const item of uniqueRecommendations.slice(0, 12)) {
      md += `- [${item.priority}] ${item.text} (from ${item.workflow})\n`;
    }
    md += "\n";
  }

  md += "## Workflow Details\n\n";
  for (const workflow of workflows) {
    md += `### ${workflow.title}\n\n`;
    md += `- Persona: ${workflow.persona}\n`;
    md += `- Goal: ${workflow.goal}\n`;
    md += `- Deterministic status: ${workflow.deterministic.result} (${workflow.deterministic.passed}/${workflow.deterministic.total})\n`;
    if (workflow.ai) {
      md += `- AI verdict: ${workflow.ai.verdict} (confidence ${workflow.ai.confidence})\n`;
      md += `- AI UX risk: ${workflow.ai.ux_risk}\n`;
      md += `- AI summary: ${workflow.ai.summary}\n`;
    }
    md += "\n";

    md += "| Step | Expected | Observed | Pass |\n";
    md += "|---|---|---|---|\n";
    for (const step of workflow.steps) {
      const expected = step.expectedLocationIncludes
        ? `${step.expectedStatus.join(",")} + location contains \`${step.expectedLocationIncludes}\``
        : step.expectedStatus.join(",");
      md += `| ${step.label} | ${expected} | ${formatStatusCell(step)} | ${step.pass ? "yes" : "no"} |\n`;
    }
    md += "\n";

    if (workflow.ai?.friction_points?.length) {
      md += "AI friction points:\n";
      for (const point of workflow.ai.friction_points) {
        const priority = typeof point.priority === "string" ? point.priority : "P2";
        const issue = typeof point.issue === "string" ? point.issue : "Unknown issue";
        const rec = typeof point.recommendation === "string" ? point.recommendation : "No recommendation";
        md += `- [${priority}] ${issue}. Recommended: ${rec}\n`;
      }
      md += "\n";
    }

    const stepWithError = workflow.steps.find((step) => step.error);
    if (stepWithError) {
      md += "Request errors detected:\n";
      for (const step of workflow.steps.filter((entry) => entry.error)) {
        md += `- ${step.label}: ${step.error}\n`;
      }
      md += "\n";
    }
  }

  return md;
}

async function main() {
  const args = parseArgs(process.argv);
  const baseUrl = args.baseUrl.endsWith("/") ? args.baseUrl : `${args.baseUrl}/`;
  const startedAt = new Date();

  console.log(`Running workflow validation against ${baseUrl}`);

  const useAi = args.useAi;
  const openRouterApiKey = process.env.OPENROUTER_API_KEY ?? "";
  if (useAi && !openRouterApiKey) {
    console.log("OPENROUTER_API_KEY is missing; continuing without AI judge.");
  }

  const workflowResults = [];

  for (const workflow of WORKFLOWS) {
    console.log(`- ${workflow.title}`);
    const stepResults = [];

    for (const step of workflow.steps) {
      const result = await runStep(baseUrl, step, args.timeoutMs);
      stepResults.push(result);
      const state = result.pass ? "pass" : "fail";
      const statusText = result.error ? `error: ${result.error}` : `status ${result.status}`;
      console.log(`  · ${step.label}: ${state} (${statusText})`);
    }

    const deterministic = {
      result: workflowDeterministicStatus(stepResults),
      passed: stepResults.filter((step) => step.pass).length,
      total: stepResults.length,
    };

    const ai = useAi && openRouterApiKey
      ? await judgeWorkflowWithAi({
          workflow,
          deterministicResult: deterministic.result,
          steps: stepResults,
          apiKey: openRouterApiKey,
          model: DEFAULT_MODEL,
        })
      : null;

    workflowResults.push({
      ...workflow,
      steps: stepResults,
      deterministic,
      ai,
    });
  }

  const finishedAt = new Date();

  const reportMarkdown = toMarkdownReport({
    startedAt,
    finishedAt,
    baseUrl,
    useAi: Boolean(useAi && openRouterApiKey),
    model: DEFAULT_MODEL,
    workflows: workflowResults,
  });

  const defaultOutput = path.join(
    process.cwd(),
    "docs",
    "reports",
    `ai-workflow-validation-${timestampSlug(finishedAt)}.md`
  );
  const outputPath = args.outputPath
    ? path.resolve(process.cwd(), args.outputPath)
    : defaultOutput;

  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, reportMarkdown, "utf8");

  console.log(`Report written to ${outputPath}`);
}

main().catch((error) => {
  console.error("Workflow validator failed:", error);
  process.exitCode = 1;
});
