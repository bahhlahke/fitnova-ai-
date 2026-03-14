#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { chromium, devices } from "playwright";

import { WEB_SURFACES, WEB_VIEWPORTS } from "./ui-surface-config.mjs";

const DEFAULT_BASE_URL = process.env.WEB_SURFACE_BASE_URL ?? "http://localhost:3000";
const DEFAULT_AUTH_BOOTSTRAP_PATH =
  process.env.WEB_SURFACE_AUTH_BOOTSTRAP_PATH ?? "/api/v1/auth/mock-login?next=/";
const DEFAULT_TIMEOUT_MS = Number.parseInt(process.env.WEB_SURFACE_TIMEOUT_MS ?? "25000", 10);

function parseArgs(argv) {
  const args = {
    baseUrl: DEFAULT_BASE_URL,
    authBootstrapPath: DEFAULT_AUTH_BOOTSTRAP_PATH,
    reportDir: "",
    timeoutMs: Number.isFinite(DEFAULT_TIMEOUT_MS) ? DEFAULT_TIMEOUT_MS : 25000,
    skipAuthBootstrap: false,
  };

  for (let i = 2; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === "--base-url" && argv[i + 1]) {
      args.baseUrl = argv[i + 1];
      i += 1;
      continue;
    }
    if (token === "--auth-bootstrap-path" && argv[i + 1]) {
      args.authBootstrapPath = argv[i + 1];
      i += 1;
      continue;
    }
    if (token === "--report-dir" && argv[i + 1]) {
      args.reportDir = argv[i + 1];
      i += 1;
      continue;
    }
    if (token === "--timeout-ms" && argv[i + 1]) {
      const parsed = Number.parseInt(argv[i + 1], 10);
      if (Number.isFinite(parsed) && parsed > 0) args.timeoutMs = parsed;
      i += 1;
      continue;
    }
    if (token === "--skip-auth-bootstrap") {
      args.skipAuthBootstrap = true;
    }
  }

  return args;
}

function timestampSlug(date) {
  return date.toISOString().replace(/[:.]/g, "-");
}

function ensureAbsoluteUrl(value) {
  if (/^https?:\/\//i.test(value)) return value;
  return `http://${value}`;
}

function safeName(value) {
  return value.replace(/\s+/g, "-").replace(/[^a-zA-Z0-9-_]/g, "").toLowerCase();
}

function clipText(value, max = 1200) {
  const normalized = String(value ?? "").replace(/\s+/g, " ").trim();
  if (normalized.length <= max) return normalized;
  return `${normalized.slice(0, max - 1)}…`;
}

function normalizeResourceUrl(value) {
  try {
    const parsed = new URL(value);
    return `${parsed.pathname}${parsed.search}`;
  } catch {
    return value;
  }
}

function shouldIgnoreConsoleError(message) {
  const normalized = String(message ?? "").trim();
  return normalized === "Failed to load resource: the server responded with a status of 404 (Not Found)";
}

function shouldIgnoreResourceIssue(url, resourceType) {
  const normalized = normalizeResourceUrl(url);
  if (normalized === "/favicon.ico") return true;
  if (normalized.includes("apple-touch-icon")) return true;
  if (normalized.endsWith(".hot-update.json")) return true;
  if (normalized.includes("/_next/static/chunks/webpack")) return true;
  if (resourceType === "image" && normalized.includes("icon")) return true;
  return false;
}

function createViewportConfig(definition) {
  if (definition.deviceName) {
    return {
      ...devices[definition.deviceName],
      viewportId: definition.id,
      viewportLabel: definition.label,
    };
  }

  return {
    viewport: definition.viewport,
    viewportId: definition.id,
    viewportLabel: definition.label,
  };
}

async function attemptAuthBootstrap({ context, page, baseUrl, authBootstrapPath, timeoutMs }) {
  const result = {
    attempted: true,
    success: false,
    finalUrl: "",
    message: "",
  };

  try {
    const loginUrl = new URL(authBootstrapPath, baseUrl).toString();
    const response = await page.goto(loginUrl, {
      timeout: timeoutMs,
      waitUntil: "domcontentloaded",
    });

    await page.waitForLoadState("networkidle", { timeout: Math.min(timeoutMs, 7000) }).catch(() => {});
    await page.waitForTimeout(1500);

    const cookies = await context.cookies(baseUrl);
    const hasSupabaseCookie = cookies.some(
      (cookie) => cookie.name.startsWith("sb-") || cookie.name.includes("auth-token")
    );

    result.finalUrl = page.url();
    result.success = Boolean(hasSupabaseCookie);
    result.message = result.success
      ? `Authenticated via ${authBootstrapPath}`
      : `Bootstrap finished at ${result.finalUrl || "unknown location"} (HTTP ${response?.status?.() ?? "n/a"}) without a Supabase auth cookie.`;
  } catch (error) {
    result.message = error instanceof Error ? error.message : "Unknown auth bootstrap error";
  }

  return result;
}

async function captureSurface({
  context,
  baseUrl,
  authBootstrap,
  surface,
  reportDir,
  timeoutMs,
}) {
  const viewportDir = path.join(reportDir, safeName(authBootstrap.viewportId));
  fs.mkdirSync(viewportDir, { recursive: true });

  const page = await context.newPage();
  const consoleErrors = [];
  const pageErrors = [];
  const resourceIssues = [];
  page.on("console", (message) => {
    if (message.type() === "error" && !shouldIgnoreConsoleError(message.text())) {
      consoleErrors.push(clipText(message.text(), 300));
    }
  });
  page.on("pageerror", (error) => {
    pageErrors.push(clipText(error?.message ?? String(error), 300));
  });
  page.on("response", (response) => {
    if (response.status() < 400) return;
    const resourceType = response.request().resourceType();
    const url = response.url();
    if (shouldIgnoreResourceIssue(url, resourceType)) return;
    resourceIssues.push({
      status: response.status(),
      resourceType,
      url: normalizeResourceUrl(url),
    });
  });

  const screenshotPath = path.join(viewportDir, `${surface.id}.png`);
  const entry = {
    app: "web",
    workflowId: surface.workflowId,
    surfaceId: surface.id,
    title: surface.title,
    route: surface.route,
    requiresAuth: surface.requiresAuth,
    notes: surface.notes ?? "",
    viewportId: authBootstrap.viewportId,
    viewportLabel: authBootstrap.viewportLabel,
    authBootstrap,
    screenshotPath: path.relative(process.cwd(), screenshotPath),
    absoluteScreenshotPath: screenshotPath,
    finalUrl: "",
    titleText: "",
    responseStatus: 0,
    textLength: 0,
    textPreview: "",
    consoleErrors,
    pageErrors,
    resourceIssues,
    authRedirected: false,
    pass: false,
    error: "",
  };

  try {
    const targetUrl = new URL(surface.route, baseUrl).toString();
    const response = await page.goto(targetUrl, {
      timeout: timeoutMs,
      waitUntil: "domcontentloaded",
    });

    await page.waitForLoadState("networkidle", { timeout: Math.min(timeoutMs, 7000) }).catch(() => {});
    await page.waitForTimeout(surface.idleWaitMs ?? 1800);

    const finalUrl = page.url();
    const finalPath = new URL(finalUrl).pathname;
    const bodyText = await page.evaluate(() => document.body?.innerText ?? "");
    const titleText = await page.title();

    entry.finalUrl = finalUrl;
    entry.responseStatus = response?.status?.() ?? 0;
    entry.titleText = clipText(titleText, 180);
    entry.textLength = bodyText.trim().length;
    entry.textPreview = clipText(bodyText, 1200);
    entry.authRedirected = surface.requiresAuth && finalPath.startsWith("/auth");

    await page.screenshot({
      path: screenshotPath,
      fullPage: false,
    });

    const textLongEnough = entry.textLength >= (surface.minTextLength ?? 120);
    const statusOkay = entry.responseStatus > 0 && entry.responseStatus < 400;
    const authOkay = !entry.authRedirected;
    const runtimeOkay = pageErrors.length === 0;

    entry.pass = statusOkay && authOkay && textLongEnough && runtimeOkay;

    if (!entry.pass) {
      const reasons = [];
      if (!statusOkay) reasons.push(`HTTP ${entry.responseStatus || "n/a"}`);
      if (!authOkay) reasons.push("redirected to auth");
      if (!textLongEnough) reasons.push(`text too short (${entry.textLength})`);
      if (!runtimeOkay) reasons.push("page runtime error");
      entry.error = reasons.join("; ");
    }
  } catch (error) {
    entry.error = error instanceof Error ? error.message : "Unknown capture error";
    try {
      await page.screenshot({
        path: screenshotPath.replace(/\.png$/, "--error.png"),
        fullPage: false,
      });
    } catch {
      // Ignore follow-up capture failures.
    }
  } finally {
    await page.close().catch(() => {});
  }

  return entry;
}

function toMarkdownSummary({ startedAt, finishedAt, baseUrl, authBootstrapPath, results }) {
  const passed = results.filter((entry) => entry.pass).length;
  const failed = results.length - passed;

  let md = "# Web Surface Smoke Report\n\n";
  md += `- Generated (UTC): ${startedAt.toISOString()} to ${finishedAt.toISOString()}\n`;
  md += `- Base URL: ${baseUrl}\n`;
  md += `- Auth bootstrap: ${authBootstrapPath || "disabled"}\n`;
  md += `- Surfaces checked: ${results.length}\n`;
  md += `- Pass: ${passed}\n`;
  md += `- Fail: ${failed}\n\n`;

  md += "| Viewport | Surface | Route | Status | Pass |\n";
  md += "|---|---|---|---|---|\n";
  for (const entry of results) {
    const observed = entry.error
      ? entry.error
      : `${entry.responseStatus || "n/a"}${entry.authRedirected ? " -> /auth" : ""}`;
    md += `| ${entry.viewportLabel} | ${entry.title} | \`${entry.route}\` | ${observed} | ${entry.pass ? "yes" : "no"} |\n`;
  }
  md += "\n";

  for (const entry of results) {
    md += `## ${entry.viewportLabel} — ${entry.title}\n\n`;
    md += `- Route: \`${entry.route}\`\n`;
    md += `- Final URL: ${entry.finalUrl || "not reached"}\n`;
    md += `- HTTP status: ${entry.responseStatus || "n/a"}\n`;
    md += `- Auth bootstrap: ${entry.authBootstrap.message}\n`;
    md += `- Text length: ${entry.textLength}\n`;
    md += `- Screenshot: \`${entry.screenshotPath}\`\n`;
    if (entry.error) md += `- Error: ${entry.error}\n`;
    if (entry.consoleErrors.length) md += `- Console errors: ${entry.consoleErrors.join(" | ")}\n`;
    if (entry.pageErrors.length) md += `- Page errors: ${entry.pageErrors.join(" | ")}\n`;
    if (entry.resourceIssues.length) {
      md += `- Resource issues: ${entry.resourceIssues
        .map((issue) => `${issue.status} ${issue.resourceType} ${issue.url}`)
        .join(" | ")}\n`;
    }
    md += `- Text preview: ${entry.textPreview || "(empty)"}\n\n`;
  }

  return md;
}

async function main() {
  const args = parseArgs(process.argv);
  const baseUrl = ensureAbsoluteUrl(args.baseUrl);
  const startedAt = new Date();
  const reportDir = args.reportDir
    ? path.resolve(process.cwd(), args.reportDir)
    : path.join(process.cwd(), "docs", "reports", `web-surface-smoke-${timestampSlug(startedAt)}`);

  fs.mkdirSync(reportDir, { recursive: true });

  let browser;
  try {
    browser = await chromium.launch({ headless: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown Playwright launch error";
    const hint = message.includes("Executable doesn't exist")
      ? `${message}\nRun: npx playwright install chromium`
      : message;
    throw new Error(hint);
  }

  const results = [];

  try {
    for (const viewportDefinition of WEB_VIEWPORTS) {
      const context = await browser.newContext(createViewportConfig(viewportDefinition));
      let authState = {
        attempted: false,
        success: false,
        finalUrl: "",
        message: args.skipAuthBootstrap
          ? "Auth bootstrap disabled."
          : "Auth bootstrap not needed yet.",
        viewportId: viewportDefinition.id,
        viewportLabel: viewportDefinition.label,
      };

      if (!args.skipAuthBootstrap && WEB_SURFACES.some((surface) => surface.requiresAuth)) {
        const authPage = await context.newPage();
        authState = {
          ...(await attemptAuthBootstrap({
            context,
            page: authPage,
            baseUrl,
            authBootstrapPath: args.authBootstrapPath,
            timeoutMs: args.timeoutMs,
          })),
          viewportId: viewportDefinition.id,
          viewportLabel: viewportDefinition.label,
        };
        await authPage.close().catch(() => {});
      }

      for (const surface of WEB_SURFACES) {
        console.log(`Capturing ${surface.id} on ${viewportDefinition.label}`);
        const result = await captureSurface({
          context,
          baseUrl,
          authBootstrap: surface.requiresAuth
            ? authState
            : {
                attempted: false,
                success: false,
                finalUrl: "",
                message: "No auth bootstrap required.",
                viewportId: viewportDefinition.id,
                viewportLabel: viewportDefinition.label,
              },
          surface,
          reportDir,
          timeoutMs: args.timeoutMs,
        });
        results.push(result);
      }

      await context.close().catch(() => {});
    }
  } finally {
    await browser.close().catch(() => {});
  }

  const finishedAt = new Date();
  const manifest = {
    app: "web",
    generatedAt: finishedAt.toISOString(),
    baseUrl,
    authBootstrapPath: args.skipAuthBootstrap ? "" : args.authBootstrapPath,
    results,
  };

  const manifestPath = path.join(reportDir, "manifest.json");
  const summaryPath = path.join(reportDir, "SUMMARY.md");

  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  fs.writeFileSync(
    summaryPath,
    toMarkdownSummary({
      startedAt,
      finishedAt,
      baseUrl,
      authBootstrapPath: args.skipAuthBootstrap ? "" : args.authBootstrapPath,
      results,
    })
  );

  const failed = results.filter((entry) => !entry.pass).length;
  console.log(`Web surface smoke report written to ${summaryPath}`);
  if (failed > 0) {
    console.error(`Web surface smoke found ${failed} failing captures.`);
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
