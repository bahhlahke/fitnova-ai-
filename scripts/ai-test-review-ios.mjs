#!/usr/bin/env node
/**
 * AI Test Review — iOS. Lists iOS test files, runs xcodebuild test when an Xcode
 * project exists, then sends results to an LLM for review (gaps, suggested tests,
 * assertion risks). Requires OPENROUTER_API_KEY for the AI section.
 *
 * Usage:
 *   node scripts/ai-test-review-ios.mjs              # discover tests, run if project exists, AI review
 *   node scripts/ai-test-review-ios.mjs --no-ai      # no LLM call
 *   node scripts/ai-test-review-ios.mjs --fail-if-not-ready   # exit 1 when not production ready
 *   node scripts/ai-test-review-ios.mjs --output path/report.md
 */

import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const IOS_DIR = path.join(ROOT, "ios");

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const DEFAULT_MODEL = process.env.AI_TEST_REVIEW_MODEL ?? "openai/gpt-4o-mini";

function parseArgs(argv) {
  const args = { useAi: true, outputPath: "", failIfNotReady: false };
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === "--no-ai") args.useAi = false;
    else if (argv[i] === "--fail-if-not-ready") args.failIfNotReady = true;
    else if (argv[i] === "--output" && argv[i + 1]) {
      args.outputPath = path.resolve(ROOT, argv[i + 1]);
      i++;
    }
  }
  return args;
}

function run(cmd, args, opts = {}) {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, {
      cwd: opts.cwd || ROOT,
      stdio: ["ignore", "pipe", "pipe"],
      ...opts,
    });
    let stdout = "";
    let stderr = "";
    child.stdout?.on("data", (d) => { stdout += d; });
    child.stderr?.on("data", (d) => { stderr += d; });
    child.on("error", (err) => resolve({ code: -1, stdout: "", stderr: String(err?.message ?? err) }));
    child.on("close", (code) => resolve({ code: code ?? -1, stdout, stderr }));
  });
}

async function findXcodeProject(dir = IOS_DIR) {
  const { readdir } = await import("node:fs/promises");
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const e of entries) {
      if (e.isDirectory() && e.name.endsWith(".xcodeproj")) return path.join(dir, e.name);
      if (e.isDirectory() && !e.name.startsWith(".") && e.name !== "build" && e.name !== "KodaAITests") {
        const found = await findXcodeProject(path.join(dir, e.name));
        if (found) return found;
      }
    }
    return null;
  } catch {
    return null;
  }
}

async function listIOSTestFiles() {
  const { readdir } = await import("node:fs/promises");
  const files = [];
  async function walk(dir) {
    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) {
        if (e.name !== "node_modules" && !e.name.startsWith(".") && e.name !== "build") {
          await walk(full);
        }
      } else if (e.name.endsWith("Tests.swift") || e.name.endsWith("Test.swift") || (e.name.includes("Test") && e.name.endsWith(".swift"))) {
        files.push(path.relative(ROOT, full));
      }
    }
  }
  await walk(IOS_DIR);
  return files.sort();
}

function withTimeout(ms) {
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), ms);
  return { signal: ctrl.signal, done: () => clearTimeout(id) };
}

function cleanJsonString(str) {
  return String(str).replace(/```json|```/gi, "").trim();
}

async function runXcodebuildTest(projectPath) {
  const schemeName = path.basename(projectPath, ".xcodeproj");
  const projectDir = path.dirname(projectPath);
  const args = [
    "test",
    "-project", projectPath,
    "-scheme", schemeName,
    "-destination", "platform=iOS Simulator,name=iPhone 17",
    "-resultBundlePath", path.join(projectDir, "build", "TestResults.xcresult"),
  ];
  const { code, stdout, stderr } = await run("xcodebuild", args, { cwd: projectDir });
  return { code, stdout, stderr, ran: true };
}

async function askAiReview({ testFiles, testOutput, apiKey, model }) {
  if (!apiKey) return null;

  const systemPrompt = `You are a senior iOS engineer and release manager. You are reviewing XCTest coverage for a SwiftUI app (Koda AI) that talks to a Next.js API. Your job is to determine if the app is PRODUCTION READY based on test evidence.

You will receive:
1. A list of iOS test files (Swift/XCTest)
2. The raw output of "xcodebuild test" (or a note that tests were not run)

Production readiness means: when these tests pass, we can ship. Set production_ready to true ONLY if ALL of the following hold:
- Tests actually ran and passed (evidence in output). If no test run or tests failed, production_ready must be false.
- No P0 gaps: auth/session, API response decoding, critical data models (workout, nutrition, progress, nudges) must be covered.
- No critical assertion risks (e.g. flaky or missing assertions on critical paths).
- Verdict is "healthy" (not needs_work or critical).

Respond with valid JSON only (no markdown code fence). Use this exact shape:
{
  "verdict": "healthy|needs_work|critical",
  "production_ready": false,
  "production_checklist": {
    "tests_ran_and_passed": false,
    "auth_or_session_covered": false,
    "api_decoding_covered": false,
    "critical_data_models_covered": false,
    "no_p0_gaps": false,
    "no_critical_assertion_risks": false
  },
  "summary": "2-3 sentence overall assessment; if not production ready, state why.",
  "gaps": [
    {
      "area": "e.g. KodaAPIService, SupabaseService",
      "description": "what is missing",
      "priority": "P0|P1|P2",
      "suggested_test": "optional one-line test idea"
    }
  ],
  "assertion_risks": [
    {
      "file": "path/to/Test.swift",
      "concern": "flakiness or weak assertion",
      "recommendation": "what to change"
    }
  ],
  "suggested_tests": [
    {
      "file": "KodaAITests/NewTests.swift",
      "describe": "suite name",
      "cases": ["test that ...", "test that ..."]
    }
  ]
}
P0 = auth, API client, data persistence, critical decoding. P1 = view state, edge cases. P2 = UI snapshots. Be strict: production_ready true only when the checklist is fully satisfied.`;

  const userContent = [
    "iOS test files:",
    testFiles.length ? testFiles.join("\n") : "(none found)",
    "",
    "--- Test run output ---",
    testOutput || "Tests were not run (no Xcode project found or xcodebuild failed).",
  ].join("\n");

  const timeout = withTimeout(25_000);
  try {
    const res = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        max_tokens: 2000,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent.slice(-14000) },
        ],
      }),
      signal: timeout.signal,
    });
    timeout.done();

    if (!res.ok) {
      return {
        verdict: "needs_work",
        production_ready: false,
        production_checklist: null,
        summary: `AI review request failed (HTTP ${res.status}).`,
        gaps: [],
        assertion_risks: [],
        suggested_tests: [],
      };
    }

    const data = await res.json();
    const raw = data?.choices?.[0]?.message?.content ?? "";
    const parsed = JSON.parse(cleanJsonString(raw));
    const checklist = parsed.production_checklist && typeof parsed.production_checklist === "object"
      ? parsed.production_checklist
      : null;
    const productionReady = checklist && typeof parsed.production_ready === "boolean"
      ? parsed.production_ready
      : false;

    return {
      verdict: ["healthy", "needs_work", "critical"].includes(parsed.verdict) ? parsed.verdict : "needs_work",
      production_ready: productionReady,
      production_checklist: checklist,
      summary: typeof parsed.summary === "string" ? parsed.summary : "No summary.",
      gaps: Array.isArray(parsed.gaps) ? parsed.gaps : [],
      assertion_risks: Array.isArray(parsed.assertion_risks) ? parsed.assertion_risks : [],
      suggested_tests: Array.isArray(parsed.suggested_tests) ? parsed.suggested_tests : [],
    };
  } catch (err) {
    timeout.done();
    return {
      verdict: "needs_work",
      production_ready: false,
      production_checklist: null,
      summary: `AI review error: ${err instanceof Error ? err.message : "unknown"}`,
      gaps: [],
      assertion_risks: [],
      suggested_tests: [],
    };
  }
}

function timestampSlug(date) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}-${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}`;
}

function toMarkdownReport({ testFiles, testResult, aiReview, projectPath, startedAt, finishedAt }) {
  let md = "# iOS AI Test Review Report\n\n";
  md += `- Generated: ${startedAt.toISOString()} – ${finishedAt.toISOString()}\n`;
  md += `- Xcode project: ${projectPath || "not found"}\n`;
  if (testResult?.ran) {
    md += `- xcodebuild test: ${testResult.passed ? "passed" : "failed"} (exit ${testResult.code})\n`;
  } else {
    md += "- xcodebuild test: not run\n";
  }
  md += "\n";

  if (aiReview && typeof aiReview.production_ready === "boolean") {
    const ready = aiReview.production_ready;
    md += "## Production readiness: " + (ready ? "**PASS**" : "**FAIL**") + "\n\n";
    if (aiReview.production_checklist && typeof aiReview.production_checklist === "object") {
      const c = aiReview.production_checklist;
      md += "| Criterion | Status |\n|-----------|--------|\n";
      for (const [key, value] of Object.entries(c)) {
        const label = key.replace(/_/g, " ");
        md += `| ${label} | ${value ? "yes" : "no"} |\n`;
      }
      md += "\n";
    }
  }

  md += "## iOS test files (" + testFiles.length + ")\n\n";
  if (testFiles.length) {
    md += "```\n" + testFiles.join("\n") + "\n```\n\n";
  } else {
    md += "No test files found under `ios/`. Add a KodaAITests target and add tests (see ios/README.md).\n\n";
  }

  if (aiReview) {
    md += "## AI review\n\n";
    md += `- **Verdict:** ${aiReview.verdict}\n`;
    if (typeof aiReview.production_ready === "boolean") {
      md += `- **Production ready:** ${aiReview.production_ready ? "yes" : "no"}\n`;
    }
    md += `- **Summary:** ${aiReview.summary}\n\n`;

    if (aiReview.gaps?.length) {
      md += "### Gaps (missing or weak coverage)\n\n";
      for (const g of aiReview.gaps) {
        md += `- **[${g.priority ?? "P2"}]** ${g.area ?? "unknown"}: ${g.description ?? ""}\n`;
        if (g.suggested_test) md += `  - Suggested: ${g.suggested_test}\n`;
      }
      md += "\n";
    }

    if (aiReview.assertion_risks?.length) {
      md += "### Assertion / flakiness risks\n\n";
      for (const r of aiReview.assertion_risks) {
        md += `- **${r.file ?? "?"}**: ${r.concern ?? ""}\n`;
        if (r.recommendation) md += `  - ${r.recommendation}\n`;
      }
      md += "\n";
    }

    if (aiReview.suggested_tests?.length) {
      md += "### Suggested tests\n\n";
      for (const s of aiReview.suggested_tests) {
        md += `- **${s.file ?? "?"}** — \`${s.describe ?? "describe"}\`\n`;
        for (const c of s.cases ?? []) md += `  - \`${c}\`\n`;
      }
      md += "\n";
    }
  }

  if (testResult?.ran && (testResult.stdout || testResult.stderr)) {
    md += "## xcodebuild output (tail)\n\n";
    md += "```\n" + (testResult.stderr || testResult.stdout).slice(-5000) + "\n```\n";
  }

  return md;
}

async function main() {
  const args = parseArgs(process.argv);
  const startedAt = new Date();

  const testFiles = await listIOSTestFiles();
  console.log("Found", testFiles.length, "iOS test file(s).");

  const projectPath = await findXcodeProject();
  let testResult = { ran: false, passed: false, code: -1, stdout: "", stderr: "" };

  if (projectPath) {
    console.log("Running xcodebuild test…");
    testResult = await runXcodebuildTest(projectPath);
    testResult.passed = testResult.code === 0;
    if (testResult.passed) {
      console.log("iOS tests passed.");
    } else {
      console.log("iOS tests failed or did not run (exit", testResult.code, ").");
    }
  } else {
    console.log("No .xcodeproj found under ios/. Add a project and test target to run tests (see ios/README.md).");
  }

  const testOutput = [testResult.stdout, testResult.stderr].filter(Boolean).join("\n");
  let aiReview = null;
  if (args.useAi) {
    const apiKey = process.env.OPENROUTER_API_KEY ?? "";
    if (!apiKey) {
      console.log("OPENROUTER_API_KEY not set; skipping AI review.");
    } else {
      console.log("Requesting AI review…");
      aiReview = await askAiReview({
        testFiles,
        testOutput: testOutput || "No test run (Xcode project missing).",
        apiKey,
        model: DEFAULT_MODEL,
      });
      console.log("AI verdict:", aiReview?.verdict ?? "n/a");
    }
  }

  const finishedAt = new Date();
  const report = toMarkdownReport({
    testFiles,
    testResult,
    aiReview,
    projectPath,
    startedAt,
    finishedAt,
  });

  const defaultPath = path.join(ROOT, "docs", "reports", `ai-test-review-ios-${timestampSlug(finishedAt)}.md`);
  const outputPath = args.outputPath || defaultPath;
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, report, "utf8");

  console.log("Report written to", outputPath);

  if (args.failIfNotReady) {
    const testsOk = !testResult.ran || testResult.passed;
    const aiOk = aiReview && aiReview.verdict !== "critical" && aiReview.production_ready === true;
    if (!testsOk || !aiOk) {
      console.error("Production readiness check failed: tests passed=" + (testResult.ran && testResult.passed) + ", production_ready=" + (aiReview?.production_ready ?? "n/a (set OPENROUTER_API_KEY for AI review)"));
      process.exitCode = 1;
    }
  } else if (testResult.ran && !testResult.passed) {
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error("ai-test-review-ios failed:", err);
  process.exit(1);
});
