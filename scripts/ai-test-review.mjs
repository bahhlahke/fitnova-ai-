#!/usr/bin/env node
/**
 * AI Test Review — runs the test suite, then asks an LLM to review test quality,
 * suggest missing tests, and prioritize improvements. Requires OPENROUTER_API_KEY.
 *
 * Usage:
 *   node scripts/ai-test-review.mjs              # run tests + AI review
 *   node scripts/ai-test-review.mjs --no-ai      # run tests only, no LLM
 *   node scripts/ai-test-review.mjs --coverage    # include coverage in review
 *   node scripts/ai-test-review.mjs --output path/report.md
 */

import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const DEFAULT_MODEL = process.env.AI_TEST_REVIEW_MODEL ?? "openai/gpt-4o-mini";

function parseArgs(argv) {
  const args = { useAi: true, coverage: false, outputPath: "" };
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === "--no-ai") args.useAi = false;
    else if (argv[i] === "--coverage") args.coverage = true;
    else if (argv[i] === "--output" && argv[i + 1]) {
      args.outputPath = path.resolve(ROOT, argv[i + 1]);
      i++;
    }
  }
  return args;
}

function run(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      cwd: ROOT,
      shell: true,
      stdio: ["ignore", "pipe", "pipe"],
      ...opts,
    });
    let stdout = "";
    let stderr = "";
    child.stdout?.on("data", (d) => { stdout += d; });
    child.stderr?.on("data", (d) => { stderr += d; });
    child.on("error", reject);
    child.on("close", (code) => resolve({ code, stdout, stderr }));
  });
}

async function listTestFiles() {
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
        if (e.name !== "node_modules" && !e.name.startsWith(".")) await walk(full);
      } else if (/\.test\.(ts|tsx)$/.test(e.name)) {
        files.push(path.relative(ROOT, full));
      }
    }
  }
  await walk(ROOT);
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

async function runTests(withCoverage) {
  const args = ["run", "--reporter=verbose"];
  if (withCoverage) args.push("--coverage");
  const { code, stdout, stderr } = await run("npx", ["vitest", ...args], {});
  return { code, stdout, stderr, passed: code === 0 };
}

async function readCoverageSummary() {
  const candidates = [
    path.join(ROOT, "coverage", "coverage-summary.json"),
    path.join(ROOT, "coverage", "coverage", "coverage-summary.json"),
  ];
  for (const p of candidates) {
    try {
      const raw = await fs.readFile(p, "utf8");
      return JSON.stringify(JSON.parse(raw), null, 2);
    } catch {
      // continue
    }
  }
  return null;
}

async function askAiReview({ testFiles, testOutput, coverageSummary, apiKey, model }) {
  if (!apiKey) return null;

  const systemPrompt = `You are a senior test engineer reviewing a Next.js + Vitest codebase. You will receive:
1. A list of test files
2. The raw output of "vitest run" (and optionally coverage summary)

Respond with valid JSON only (no markdown code fence). Use this exact shape:
{
  "verdict": "healthy|needs_work|critical",
  "summary": "2-3 sentence overall assessment",
  "gaps": [
    {
      "area": "e.g. app/api/v1/ai/projection",
      "description": "what is missing",
      "priority": "P0|P1|P2",
      "suggested_test": "optional one-line describe/it idea"
    }
  ],
  "assertion_risks": [
    {
      "file": "path/to/test.ts",
      "concern": "flakiness or weak assertion",
      "recommendation": "what to change"
    }
  ],
  "suggested_tests": [
    {
      "file": "path/to/new-or-existing.test.ts",
      "describe": "suite name",
      "cases": ["it('...')", "it('...')"]
    }
  ]
}
Prioritize: P0 = critical paths (auth, billing, data loss); P1 = important API routes; P2 = nice-to-have.`;

  const userContent = [
    "Test files in repo:",
    testFiles.join("\n"),
    "",
    "--- Test run output ---",
    testOutput.slice(-12000),
  ];
  if (coverageSummary) {
    userContent.push("", "--- Coverage summary (excerpt) ---", coverageSummary.slice(0, 6000));
  }

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
          { role: "user", content: userContent.join("\n") },
        ],
      }),
      signal: timeout.signal,
    });
    timeout.done();

    if (!res.ok) {
      return {
        verdict: "needs_work",
        summary: `AI review request failed (HTTP ${res.status}).`,
        gaps: [],
        assertion_risks: [],
        suggested_tests: [],
      };
    }

    const data = await res.json();
    const raw = data?.choices?.[0]?.message?.content ?? "";
    const parsed = JSON.parse(cleanJsonString(raw));
    return {
      verdict: ["healthy", "needs_work", "critical"].includes(parsed.verdict) ? parsed.verdict : "needs_work",
      summary: typeof parsed.summary === "string" ? parsed.summary : "No summary.",
      gaps: Array.isArray(parsed.gaps) ? parsed.gaps : [],
      assertion_risks: Array.isArray(parsed.assertion_risks) ? parsed.assertion_risks : [],
      suggested_tests: Array.isArray(parsed.suggested_tests) ? parsed.suggested_tests : [],
    };
  } catch (err) {
    timeout.done();
    return {
      verdict: "needs_work",
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

function toMarkdownReport({ testFiles, testResult, coverageSummary, aiReview, startedAt, finishedAt }) {
  let md = "# AI Test Review Report\n\n";
  md += `- Generated: ${startedAt.toISOString()} – ${finishedAt.toISOString()}\n`;
  md += `- Tests: ${testResult.passed ? "passed" : "failed"} (exit ${testResult.code})\n`;
  if (coverageSummary) md += "- Coverage: included in AI context\n";
  md += "\n";

  md += "## Test files (" + testFiles.length + ")\n\n";
  md += "```\n" + testFiles.join("\n") + "\n```\n\n";

  if (aiReview) {
    md += "## AI review\n\n";
    md += `- **Verdict:** ${aiReview.verdict}\n`;
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

  md += "## Test run output (tail)\n\n";
  md += "```\n" + (testResult.stderr || testResult.stdout).slice(-4000) + "\n```\n";

  return md;
}

async function main() {
  const args = parseArgs(process.argv);
  const startedAt = new Date();

  console.log("Running test suite…");
  const testResult = await runTests(args.coverage);
  if (!testResult.passed) {
    console.log("Tests failed. Continuing to collect output for AI review.");
  } else {
    console.log("Tests passed.");
  }

  const testFiles = await listTestFiles();
  console.log(`Found ${testFiles.length} test files.`);

  let coverageSummary = null;
  if (args.coverage) {
    coverageSummary = await readCoverageSummary();
    if (coverageSummary) console.log("Coverage summary read.");
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
        testOutput,
        coverageSummary,
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
    coverageSummary,
    aiReview,
    startedAt,
    finishedAt,
  });

  const defaultPath = path.join(ROOT, "docs", "reports", `ai-test-review-${timestampSlug(finishedAt)}.md`);
  const outputPath = args.outputPath || defaultPath;
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, report, "utf8");

  console.log("Report written to", outputPath);
  if (!testResult.passed) process.exitCode = 1;
}

main().catch((err) => {
  console.error("ai-test-review failed:", err);
  process.exit(1);
});
