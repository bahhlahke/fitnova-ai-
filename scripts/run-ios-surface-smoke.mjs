#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const cwd = process.cwd();
const project = path.join(cwd, "ios/AskKodaAI/AskKodaAI.xcodeproj");
const scheme = "AskKodaAI";
const simulatorName = process.env.IOS_SIMULATOR_NAME || "iPhone 17";
const bundleId = "Main.AskKodaAI";
const surfaces = [
  "home",
  "plan",
  "coach",
  "log",
  "log-workout",
  "log-nutrition",
  "guided-workout",
  "motion-lab",
  "progress",
  "body-scan",
  "history",
  "check-in",
  "community",
  "settings",
  "integrations",
  "vitals",
  "pricing",
  "badges",
  "coach-support",
  "meal-plan",
  "fridge-scanner",
  "onboarding",
];

function run(cmd, args, options = {}) {
  const output = execFileSync(cmd, args, {
    cwd,
    stdio: "pipe",
    encoding: "utf8",
    ...options,
  });
  return typeof output === "string" ? output.trim() : "";
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function ensureBuildSettings() {
  const raw = run("xcodebuild", [
    "-project", project,
    "-scheme", scheme,
    "-destination", `platform=iOS Simulator,name=${simulatorName}`,
    "-showBuildSettings",
    "-json",
  ]);
  const parsed = JSON.parse(raw);
  const settings = parsed[0]?.buildSettings;
  if (!settings?.TARGET_BUILD_DIR || !settings?.FULL_PRODUCT_NAME) {
    throw new Error("Unable to resolve AskKodaAI build settings.");
  }
  return settings;
}

async function main() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const reportDir = path.join(cwd, "docs/reports", `ios-surface-smoke-${timestamp}`);
  fs.mkdirSync(reportDir, { recursive: true });

  console.log(`Building ${scheme} for ${simulatorName}...`);
  run("xcodebuild", [
    "-project", project,
    "-scheme", scheme,
    "-destination", `platform=iOS Simulator,name=${simulatorName}`,
    "build",
  ], { stdio: "inherit" });

  const settings = ensureBuildSettings();
  const appPath = path.join(settings.TARGET_BUILD_DIR, settings.FULL_PRODUCT_NAME);

  console.log(`Booting ${simulatorName}...`);
  try {
    run("xcrun", ["simctl", "boot", simulatorName]);
  } catch {
    // Already booted.
  }
  run("xcrun", ["simctl", "bootstatus", simulatorName, "-b"], { stdio: "inherit" });

  console.log(`Installing ${appPath}...`);
  run("xcrun", ["simctl", "install", simulatorName, appPath], { stdio: "inherit" });

  const results = [];
  for (const surface of surfaces) {
    console.log(`Launching surface: ${surface}`);
    try {
      run("xcrun", ["simctl", "terminate", simulatorName, bundleId]);
    } catch {
      // App may not be running.
    }

    const launchOutput = run(
      "xcrun",
      ["simctl", "launch", simulatorName, bundleId],
      {
        env: {
          ...process.env,
          SIMCTL_CHILD_E2E_AUTO_LOGIN: "true",
          SIMCTL_CHILD_E2E_SURFACE: surface,
        },
      }
    );

    await sleep(2500);
    const screenshotPath = path.join(reportDir, `${surface}.png`);
    run("xcrun", ["simctl", "io", simulatorName, "screenshot", screenshotPath], { stdio: "pipe" });
    results.push({ surface, launchOutput, screenshotPath });
  }

  const reportPath = path.join(reportDir, "SUMMARY.md");
  const summary = [
    "# iOS Surface Smoke Report",
    "",
    `Simulator: ${simulatorName}`,
    `Bundle ID: ${bundleId}`,
    "",
    "## Surfaces",
    ...results.map(result => `- ${result.surface}: launched successfully, screenshot at \`${path.relative(cwd, result.screenshotPath)}\``),
    "",
  ].join("\n");
  fs.writeFileSync(reportPath, summary);

  console.log(`Surface smoke report written to ${reportPath}`);
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
