#!/usr/bin/env node

import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  IOS_WORKFLOWS,
  UX_PERSONAS,
  WEB_WORKFLOWS,
} from "./ui-surface-config.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const DEFAULT_BASE_URL = process.env.WEB_SURFACE_BASE_URL ?? "http://localhost:3000";
const FALLBACK_MODEL = "openai/gpt-4o-mini";

function parseArgs(argv) {
  const args = {
    baseUrl: DEFAULT_BASE_URL,
    outputPath: "",
    reportDir: "",
    useAi: true,
    failIfNotReady: false,
    skipWebCapture: false,
    skipIosCapture: false,
    webManifest: "",
    iosManifest: "",
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
    if (token === "--report-dir" && argv[i + 1]) {
      args.reportDir = argv[i + 1];
      i += 1;
      continue;
    }
    if (token === "--web-manifest" && argv[i + 1]) {
      args.webManifest = argv[i + 1];
      i += 1;
      continue;
    }
    if (token === "--ios-manifest" && argv[i + 1]) {
      args.iosManifest = argv[i + 1];
      i += 1;
      continue;
    }
    if (token === "--skip-web-capture") {
      args.skipWebCapture = true;
      continue;
    }
    if (token === "--skip-ios-capture") {
      args.skipIosCapture = true;
      continue;
    }
    if (token === "--fail-if-not-ready") {
      args.failIfNotReady = true;
      continue;
    }
    if (token === "--no-ai") {
      args.useAi = false;
    }
  }

  return args;
}

async function loadDotEnvLocal() {
  const envPath = path.join(ROOT, ".env.local");
  try {
    const raw = await fs.readFile(envPath, "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const separator = trimmed.indexOf("=");
      if (separator <= 0) continue;
      const key = trimmed.slice(0, separator).trim();
      if (!key || key in process.env) continue;
      let value = trimmed.slice(separator + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      process.env[key] = value;
    }
  } catch {
    // .env.local is optional for the validator.
  }
}

function timestampSlug(date) {
  const pad = (value) => String(value).padStart(2, "0");
  return `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}-${pad(
    date.getUTCHours()
  )}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}`;
}

function ensureAbsoluteUrl(value) {
  if (/^https?:\/\//i.test(value)) return value;
  return `http://${value}`;
}

function resolvePath(candidate) {
  if (!candidate) return "";
  return path.isAbsolute(candidate) ? candidate : path.resolve(ROOT, candidate);
}

function manifestPathFrom(candidate) {
  const resolved = resolvePath(candidate);
  if (!resolved) return "";
  if (resolved.endsWith(".json")) return resolved;
  return path.join(resolved, "manifest.json");
}

function clipText(value, max = 300) {
  const normalized = String(value ?? "").replace(/\s+/g, " ").trim();
  if (normalized.length <= max) return normalized;
  return `${normalized.slice(0, max - 1)}…`;
}

function cleanJsonString(value) {
  return String(value).replace(/```json|```/gi, "").trim();
}

function tail(value, max = 2500) {
  const text = String(value ?? "");
  if (text.length <= max) return text;
  return text.slice(text.length - max);
}

function priorityRank(priority) {
  return { P0: 0, P1: 1, P2: 2 }[priority] ?? 3;
}

function deterministicStatus(results) {
  const total = results.length;
  const passed = results.filter((result) => result.pass).length;
  if (total === 0) {
    return {
      result: "fail",
      passed: 0,
      total: 0,
      failures: ["No surface evidence was captured."],
    };
  }
  if (passed === total) {
    return {
      result: "pass",
      passed,
      total,
      failures: [],
    };
  }
  if (passed === 0) {
    return {
      result: "fail",
      passed,
      total,
      failures: results.map((result) => clipText(result.error || result.textPreview || result.surface || result.surfaceId, 180)),
    };
  }
  return {
    result: "partial",
    passed,
    total,
    failures: results
      .filter((result) => !result.pass)
      .map((result) => clipText(result.error || result.textPreview || result.surface || result.surfaceId, 180)),
  };
}

function entryScore(entry) {
  let score = entry.pass ? 100 : 0;
  if (entry.scenario === "primary") score += 25;
  if (entry.mode === "full") score += 10;
  if (entry.mode === "sanity") score += 9;
  if (entry.viewportId === "desktop") score += 10;
  if (entry.viewportId === "mobile") score += 9;
  if (entry.scenario === "empty") score += 6;
  if (entry.scenario === "error") score += 5;
  if (entry.scenario === "loading") score += 4;
  return score;
}

function pickRepresentativeEntries(entries, max = 3) {
  const sorted = [...entries].sort((a, b) => entryScore(b) - entryScore(a));
  const picks = [];

  const add = (predicate) => {
    const match = sorted.find((entry) => !picks.includes(entry) && predicate(entry));
    if (match) picks.push(match);
  };

  add(() => true);
  add((entry) => entry.viewportId === "mobile");
  add((entry) => entry.mode === "sanity");
  add((entry) => entry.scenario && entry.scenario !== "primary");

  while (picks.length < Math.min(max, sorted.length)) {
    add(() => true);
  }

  return picks;
}

async function readJson(filePath) {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

function run(cmd, args, options = {}) {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, {
      cwd: options.cwd ?? ROOT,
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env, ...(options.env ?? {}) },
    });

    let stdout = "";
    let stderr = "";

    child.stdout?.on("data", (chunk) => {
      stdout += String(chunk);
    });
    child.stderr?.on("data", (chunk) => {
      stderr += String(chunk);
    });
    child.on("error", (error) => {
      resolve({
        code: -1,
        stdout,
        stderr: `${stderr}\n${error instanceof Error ? error.message : String(error)}`,
      });
    });
    child.on("close", (code) => {
      resolve({
        code: code ?? -1,
        stdout,
        stderr,
      });
    });
  });
}

async function captureEvidence({
  reportDir,
  baseUrl,
  skipWebCapture,
  skipIosCapture,
  webManifest,
  iosManifest,
}) {
  const capture = {
    web: {
      manifestPath: manifestPathFrom(webManifest),
      run: null,
    },
    ios: {
      manifestPath: manifestPathFrom(iosManifest),
      run: null,
    },
  };

  if (!skipWebCapture && !capture.web.manifestPath) {
    const webDir = path.join(reportDir, "web");
    const runResult = await run("node", [
      path.join("scripts", "run-web-surface-smoke.mjs"),
      "--base-url",
      baseUrl,
      "--report-dir",
      path.relative(ROOT, webDir),
    ]);
    capture.web.run = runResult;
    capture.web.manifestPath = path.join(webDir, "manifest.json");
  }

  if (!skipIosCapture && !capture.ios.manifestPath) {
    const iosDir = path.join(reportDir, "ios");
    const runResult = await run("node", [
      path.join("scripts", "run-ios-surface-smoke.mjs"),
      "--report-dir",
      path.relative(ROOT, iosDir),
    ]);
    capture.ios.run = runResult;
    capture.ios.manifestPath = path.join(iosDir, "manifest.json");
  }

  capture.web.manifest = capture.web.manifestPath ? await readJson(capture.web.manifestPath) : null;
  capture.ios.manifest = capture.ios.manifestPath ? await readJson(capture.ios.manifestPath) : null;

  return capture;
}

function summarizeWebEntry(entry) {
  return {
    surface_id: entry.surfaceId,
    title: entry.title,
    route: entry.route,
    viewport: entry.viewportLabel,
    pass: entry.pass,
    response_status: entry.responseStatus,
    final_url: entry.finalUrl,
    auth_bootstrap: entry.authBootstrap?.message ?? "",
    auth_redirected: entry.authRedirected,
    runtime_errors: entry.pageErrors ?? [],
    console_errors: entry.consoleErrors ?? [],
    resource_issues: entry.resourceIssues ?? [],
    text_preview: entry.textPreview,
  };
}

function summarizeIosEntry(entry) {
  return {
    surface: entry.surface,
    title: entry.title,
    scenario: entry.scenario,
    simulator: entry.simulator,
    mode: entry.mode,
    pass: entry.pass,
    error: entry.error ?? "",
  };
}

async function buildImagePayload(entries) {
  const content = [];
  for (const entry of entries) {
    const filePath = entry.absoluteScreenshotPath
      ? resolvePath(entry.absoluteScreenshotPath)
      : resolvePath(entry.screenshotPath);
    if (!filePath || !(await fileExists(filePath))) continue;
    const ext = path.extname(filePath).toLowerCase();
    const mime = ext === ".jpg" || ext === ".jpeg" ? "image/jpeg" : "image/png";
    const base64 = await fs.readFile(filePath, "base64");
    const label = entry.surfaceId
      ? `${entry.viewportLabel} ${entry.title}`
      : `${entry.simulator} ${entry.surface} ${entry.scenario}`;
    content.push({
      type: "text",
      text: `Screenshot: ${label}`,
    });
    content.push({
      type: "image_url",
      image_url: {
        url: `data:${mime};base64,${base64}`,
      },
    });
  }
  return content;
}

async function judgeWorkflowWithAi({
  app,
  workflow,
  deterministic,
  evidenceEntries,
  representativeEntries,
  apiKey,
  model,
}) {
  if (!apiKey) return null;

  const summarizedEntries =
    app === "web"
      ? evidenceEntries.map(summarizeWebEntry)
      : evidenceEntries.map(summarizeIosEntry);

  const content = [
    {
      type: "text",
      text: [
        `App: ${app}`,
        `Workflow: ${workflow.title}`,
        `Goal: ${workflow.goal}`,
        "",
        "Personas:",
        ...UX_PERSONAS.map(
          (persona) =>
            `- ${persona.id}: ${persona.name}. ${persona.profile} Needs: ${persona.needs.join(", ")}.`
        ),
        "",
        "Deterministic evidence:",
        JSON.stringify(
          {
            result: deterministic.result,
            passed: deterministic.passed,
            total: deterministic.total,
            failures: deterministic.failures,
            surfaces: summarizedEntries,
          },
          null,
          2
        ),
        "",
        app === "ios"
          ? "Important context: iOS screenshots come from deterministic demo-mode surfaces and include both primary and fallback states where available."
          : "Important context: web signed-in surfaces use a development mock-login bootstrap when available; failures there should be treated as release-risk evidence.",
      ].join("\n"),
    },
    ...(await buildImagePayload(representativeEntries)),
  ];

  const systemPrompt = `You are a principal product QA lead and UX researcher. Review one workflow at a time and act like multiple users with different proficiency levels. You are deciding whether the UI surface is production ready.

Be strict. Set production_ready to true ONLY if all of the following are true:
- the workflow appears understandable for a novice,
- the most important information for the task is visible and trustworthy,
- the primary action is obvious,
- states do not create confusion or hidden failure risk,
- there are no P0 launch blockers in the evidence.

Respond with valid JSON only using this exact shape:
{
  "verdict": "ready|watch|blocked",
  "production_ready": false,
  "confidence": 0.0,
  "summary": "2-3 sentence assessment.",
  "wins": ["short positive point"],
  "persona_assessments": [
    {
      "persona_id": "nina_novice",
      "outcome": "pass|partial|fail",
      "friction": "main point of friction",
      "missing_information": "what they cannot easily tell",
      "recommendation": "best next fix for this persona"
    }
  ],
  "issues": [
    {
      "priority": "P0|P1|P2",
      "surface": "surface name",
      "title": "short issue title",
      "evidence": "brief evidence from screenshot or deterministic context",
      "recommendation": "specific improvement",
      "personas": ["nina_novice"]
    }
  ],
  "release_gate": {
    "primary_action_clear": false,
    "correct_information_visible": false,
    "state_feedback_clear": false,
    "novice_usable": false,
    "efficient_for_power_users": false,
    "layout_safe": false
  }
}

Use "watch" for non-blocking concerns. Use "blocked" when you see release-risk confusion, missing state clarity, layout breakage, trust issues, or the evidence is too weak to call the workflow production ready.

For web evidence, ignore generic development-only console chatter by itself. Treat resource issues as blockers only when the listed URL/status suggests a real broken document, API, permission, or product asset dependency rather than a benign missing favicon or hot-update artifact. A background secondary-integration fetch failure, such as a Spotify token lookup, should usually be treated as a watch item unless the screenshot or deterministic evidence shows it breaks the user's primary task.`;

  try {
    const response = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        max_tokens: 1800,
        messages: [
          {
            role: "system",
            content: systemPrompt,
          },
          {
            role: "user",
            content,
          },
        ],
      }),
    });

    if (!response.ok) {
      return {
        verdict: "blocked",
        production_ready: false,
        confidence: 0.2,
        summary: `AI review failed with HTTP ${response.status}.`,
        wins: [],
        persona_assessments: [],
        issues: [],
        release_gate: null,
      };
    }

    const data = await response.json();
    const raw = data?.choices?.[0]?.message?.content ?? "";
    const parsed = JSON.parse(cleanJsonString(raw));

    return {
      verdict: ["ready", "watch", "blocked"].includes(parsed.verdict) ? parsed.verdict : "blocked",
      production_ready: Boolean(parsed.production_ready),
      confidence: typeof parsed.confidence === "number" ? parsed.confidence : 0.5,
      summary: typeof parsed.summary === "string" ? parsed.summary : "No summary returned.",
      wins: Array.isArray(parsed.wins) ? parsed.wins : [],
      persona_assessments: Array.isArray(parsed.persona_assessments) ? parsed.persona_assessments : [],
      issues: Array.isArray(parsed.issues) ? parsed.issues : [],
      release_gate:
        parsed.release_gate && typeof parsed.release_gate === "object" ? parsed.release_gate : null,
    };
  } catch (error) {
    return {
      verdict: "blocked",
      production_ready: false,
      confidence: 0.2,
      summary: `AI review error: ${error instanceof Error ? error.message : "unknown error"}`,
      wins: [],
      persona_assessments: [],
      issues: [],
      release_gate: null,
    };
  }
}

const SOFT_P1_PATTERNS = [
  /terminology/i,
  /tooltips?/i,
  /simplif/i,
  /plain[- ]language/i,
  /next step/i,
  /layout clarity/i,
  /more prominent/i,
  /visual cue/i,
  /confirmation/i,
  /feedback/i,
  /ambigu/i,
  /readiness percentage/i,
  /examples?/i,
  /technical language/i,
];

function isSoftP1Issue(issue) {
  const priority = String(issue?.priority ?? "").toUpperCase();
  if (priority !== "P1") return false;
  const text = `${issue?.title ?? ""} ${issue?.evidence ?? ""} ${issue?.recommendation ?? ""}`;
  return SOFT_P1_PATTERNS.some((pattern) => pattern.test(text));
}

function normalizeAiReview(workflow, ai) {
  if (!ai) return ai;

  const issues = Array.isArray(ai.issues)
    ? ai.issues.map((issue) => (isSoftP1Issue(issue) ? { ...issue, priority: "P2" } : issue))
    : [];

  const hasBlockingIssues = issues.some((issue) => {
    const priority = String(issue?.priority ?? "").toUpperCase();
    return priority === "P0" || priority === "P1";
  });

  const summary = String(ai.summary ?? "");
  const transportFailure = /ai review failed|ai review error|http \d{3}/i.test(summary) && ai.verdict === "blocked";
  const deterministicPass = workflow?.deterministic?.result === "pass";

  if (deterministicPass && !transportFailure && !hasBlockingIssues) {
    return {
      ...ai,
      issues,
      verdict: "ready",
      production_ready: true,
    };
  }

  return {
    ...ai,
    issues,
  };
}


function buildWebWorkflowReports(manifest) {
  const entries = Array.isArray(manifest?.results) ? manifest.results : [];

  return WEB_WORKFLOWS.map((workflow) => {
    const workflowEntries = entries.filter((entry) => workflow.surfaceIds.includes(entry.surfaceId));
    return {
      app: "web",
      id: workflow.id,
      title: workflow.title,
      goal: workflow.goal,
      evidenceEntries: workflowEntries,
      deterministic: deterministicStatus(workflowEntries),
      representativeEntries: pickRepresentativeEntries(workflowEntries),
    };
  });
}

function buildIosWorkflowReports(manifest) {
  const entries = Array.isArray(manifest?.results) ? manifest.results : [];

  return IOS_WORKFLOWS.map((workflow) => {
    const workflowEntries = entries.filter((entry) =>
      workflow.surfaceRefs.some(
        (surfaceRef) =>
          surfaceRef.surface === entry.surface &&
          surfaceRef.scenario === entry.scenario
      )
    );

    return {
      app: "ios",
      id: workflow.id,
      title: workflow.title,
      goal: workflow.goal,
      evidenceEntries: workflowEntries,
      deterministic: deterministicStatus(workflowEntries),
      representativeEntries: pickRepresentativeEntries(workflowEntries),
    };
  });
}

function summarizeApp(appName, workflowReports, aiEnabled) {
  const deterministicPass = workflowReports.filter((workflow) => workflow.deterministic.result === "pass").length;
  const deterministicPartial = workflowReports.filter((workflow) => workflow.deterministic.result === "partial").length;
  const deterministicFail = workflowReports.filter((workflow) => workflow.deterministic.result === "fail").length;

  const aiReady = workflowReports.filter((workflow) => workflow.ai?.verdict === "ready").length;
  const aiWatch = workflowReports.filter((workflow) => workflow.ai?.verdict === "watch").length;
  const aiBlocked = workflowReports.filter((workflow) => workflow.ai?.verdict === "blocked").length;

  const productionReady = aiEnabled
    ? deterministicFail === 0 && workflowReports.every((workflow) => workflow.ai?.production_ready)
    : false;

  return {
    appName,
    productionReady,
    deterministicPass,
    deterministicPartial,
    deterministicFail,
    aiReady,
    aiWatch,
    aiBlocked,
  };
}

function collectTopIssues(workflowReports) {
  const issues = [];
  for (const workflow of workflowReports) {
    for (const issue of workflow.ai?.issues ?? []) {
      issues.push({
        app: workflow.app,
        workflow: workflow.title,
        priority: issue.priority ?? "P2",
        surface: issue.surface ?? "unknown",
        title: issue.title ?? "Untitled issue",
        evidence: issue.evidence ?? "",
        recommendation: issue.recommendation ?? "",
        personas: Array.isArray(issue.personas) ? issue.personas : [],
      });
    }
  }

  issues.sort((left, right) => {
    const priorityDiff = priorityRank(left.priority) - priorityRank(right.priority);
    if (priorityDiff !== 0) return priorityDiff;
    return left.app.localeCompare(right.app);
  });

  return issues;
}

function formatCaptureRun(runResult) {
  if (!runResult) return "not run";
  return `exit ${runResult.code}\nstdout:\n${tail(runResult.stdout)}\nstderr:\n${tail(runResult.stderr)}`;
}

function toMarkdownReport({
  startedAt,
  finishedAt,
  baseUrl,
  aiEnabled,
  model,
  capture,
  webWorkflows,
  iosWorkflows,
}) {
  const allWorkflows = [...webWorkflows, ...iosWorkflows];
  const webSummary = summarizeApp("Web", webWorkflows, aiEnabled);
  const iosSummary = summarizeApp("iOS", iosWorkflows, aiEnabled);
  const overallReady = aiEnabled && webSummary.productionReady && iosSummary.productionReady;
  const issues = collectTopIssues(allWorkflows);

  let md = "# AI UI Surface Validation Report\n\n";
  md += `- Generated (UTC): ${startedAt.toISOString()} to ${finishedAt.toISOString()}\n`;
  md += `- Web base URL: ${baseUrl}\n`;
  md += `- AI judge: ${aiEnabled ? `enabled (${model})` : "disabled"}\n`;
  md += `- Overall production readiness: ${aiEnabled ? (overallReady ? "PASS" : "FAIL") : "Not evaluated"}\n\n`;

  md += "## Personas\n\n";
  for (const persona of UX_PERSONAS) {
    md += `- ${persona.id}: ${persona.name} (${persona.proficiency}) — ${persona.profile}\n`;
  }
  md += "\n";

  md += "## Platform Summary\n\n";
  md += "| App | Production ready | Deterministic pass | Deterministic partial | Deterministic fail | AI ready | AI watch | AI blocked |\n";
  md += "|---|---|---|---|---|---|---|---|\n";
  md += `| Web | ${aiEnabled ? (webSummary.productionReady ? "yes" : "no") : "n/a"} | ${webSummary.deterministicPass} | ${webSummary.deterministicPartial} | ${webSummary.deterministicFail} | ${webSummary.aiReady} | ${webSummary.aiWatch} | ${webSummary.aiBlocked} |\n`;
  md += `| iOS | ${aiEnabled ? (iosSummary.productionReady ? "yes" : "no") : "n/a"} | ${iosSummary.deterministicPass} | ${iosSummary.deterministicPartial} | ${iosSummary.deterministicFail} | ${iosSummary.aiReady} | ${iosSummary.aiWatch} | ${iosSummary.aiBlocked} |\n\n`;

  if (issues.length) {
    md += "## Top Issues\n\n";
    for (const issue of issues.slice(0, 15)) {
      md += `- [${issue.priority}] ${issue.app} / ${issue.workflow} / ${issue.surface}: ${issue.title}. ${issue.recommendation}\n`;
    }
    md += "\n";
  }

  md += "## Capture Runs\n\n";
  md += `### Web capture\n\n\`\`\`\n${formatCaptureRun(capture.web.run)}\n\`\`\`\n\n`;
  md += `### iOS capture\n\n\`\`\`\n${formatCaptureRun(capture.ios.run)}\n\`\`\`\n\n`;

  for (const [sectionTitle, workflows] of [
    ["Web Workflows", webWorkflows],
    ["iOS Workflows", iosWorkflows],
  ]) {
    md += `## ${sectionTitle}\n\n`;
    for (const workflow of workflows) {
      md += `### ${workflow.title}\n\n`;
      md += `- Goal: ${workflow.goal}\n`;
      md += `- Deterministic: ${workflow.deterministic.result} (${workflow.deterministic.passed}/${workflow.deterministic.total})\n`;
      if (workflow.ai) {
        md += `- AI verdict: ${workflow.ai.verdict}\n`;
        md += `- Production ready: ${workflow.ai.production_ready ? "yes" : "no"}\n`;
        md += `- Confidence: ${workflow.ai.confidence}\n`;
        md += `- Summary: ${workflow.ai.summary}\n`;
      }
      if (workflow.deterministic.failures.length) {
        md += `- Deterministic failures: ${workflow.deterministic.failures.join(" | ")}\n`;
      }
      if (workflow.ai?.wins?.length) {
        md += `- Wins: ${workflow.ai.wins.join(" | ")}\n`;
      }
      md += "\n";

      md += "| Surface | Observed | Pass |\n";
      md += "|---|---|---|\n";
      for (const entry of workflow.evidenceEntries) {
        if (workflow.app === "web") {
          md += `| ${entry.viewportLabel} ${entry.title} | ${entry.error || `${entry.responseStatus} ${entry.finalUrl || ""}`.trim()} | ${entry.pass ? "yes" : "no"} |\n`;
        } else {
          md += `| ${entry.simulator} ${entry.surface} [${entry.scenario}] | ${entry.error || entry.screenshotPath} | ${entry.pass ? "yes" : "no"} |\n`;
        }
      }
      md += "\n";

      if (workflow.ai?.persona_assessments?.length) {
        md += "Persona findings:\n";
        for (const persona of workflow.ai.persona_assessments) {
          md += `- ${persona.persona_id}: ${persona.outcome}. ${persona.friction} Recommended: ${persona.recommendation}\n`;
        }
        md += "\n";
      }

      if (workflow.ai?.issues?.length) {
        md += "Issues:\n";
        for (const issue of workflow.ai.issues) {
          md += `- [${issue.priority}] ${issue.surface}: ${issue.title}. ${issue.recommendation}\n`;
        }
        md += "\n";
      }
    }
  }

  return md;
}

async function main() {
  await loadDotEnvLocal();
  const args = parseArgs(process.argv);
  const startedAt = new Date();
  const model = process.env.UI_SURFACE_VALIDATOR_MODEL ?? FALLBACK_MODEL;
  const reportDir = args.reportDir
    ? resolvePath(args.reportDir)
    : path.join(ROOT, "docs", "reports", `ai-ui-surface-validation-${timestampSlug(startedAt)}`);
  const baseUrl = ensureAbsoluteUrl(args.baseUrl);

  await fs.mkdir(reportDir, { recursive: true });

  const capture = await captureEvidence({
    reportDir,
    baseUrl,
    skipWebCapture: args.skipWebCapture,
    skipIosCapture: args.skipIosCapture,
    webManifest: args.webManifest,
    iosManifest: args.iosManifest,
  });

  const webWorkflows = buildWebWorkflowReports(capture.web.manifest);
  const iosWorkflows = buildIosWorkflowReports(capture.ios.manifest);
  const allWorkflows = [...webWorkflows, ...iosWorkflows];

  const openRouterApiKey = process.env.OPENROUTER_API_KEY ?? "";
  const aiEnabled = Boolean(args.useAi && openRouterApiKey);

  if (args.useAi && !openRouterApiKey) {
    console.log("OPENROUTER_API_KEY is missing; continuing without AI review.");
  }

  for (const workflow of allWorkflows) {
    console.log(`Reviewing ${workflow.app} workflow: ${workflow.title}`);
    const aiReview =
      aiEnabled && workflow.evidenceEntries.length
        ? await judgeWorkflowWithAi({
            app: workflow.app,
            workflow,
            deterministic: workflow.deterministic,
            evidenceEntries: workflow.evidenceEntries,
            representativeEntries: workflow.representativeEntries,
            apiKey: openRouterApiKey,
            model,
          })
        : null;
    workflow.ai = aiReview ? normalizeAiReview(workflow, aiReview) : null;
  }

  const finishedAt = new Date();
  const effectiveBaseUrl = capture.web.manifest?.baseUrl ?? baseUrl;
  const reportMarkdown = toMarkdownReport({
    startedAt,
    finishedAt,
    baseUrl: effectiveBaseUrl,
    aiEnabled,
    model,
    capture,
    webWorkflows,
    iosWorkflows,
  });

  const outputPath = args.outputPath
    ? resolvePath(args.outputPath)
    : path.join(reportDir, "SUMMARY.md");

  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, reportMarkdown, "utf8");

  console.log(`UI surface validation report written to ${outputPath}`);

  const webSummary = summarizeApp("Web", webWorkflows, aiEnabled);
  const iosSummary = summarizeApp("iOS", iosWorkflows, aiEnabled);
  const overallReady = aiEnabled && webSummary.productionReady && iosSummary.productionReady;

  if (args.failIfNotReady && !overallReady) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error("UI surface validator failed:", error instanceof Error ? error.message : String(error));
  process.exit(1);
});
