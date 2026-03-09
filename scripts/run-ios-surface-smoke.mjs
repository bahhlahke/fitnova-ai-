#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const cwd = process.cwd();
const project = path.join(cwd, "ios/AskKodaAI/AskKodaAI.xcodeproj");
const scheme = "AskKodaAI";
const simulatorName = process.env.IOS_SIMULATOR_NAME || "iPhone 17";
const layoutSanitySimulatorName = process.env.IOS_LAYOUT_SANITY_SIMULATOR_NAME || "iPhone 16e";
const bundleId = "Main.AskKodaAI";
const surfaceMatrix = [
  { surface: "home", scenarios: ["primary", "empty", "error"] },
  { surface: "plan", scenarios: ["primary", "empty", "loading", "error"] },
  { surface: "coach", scenarios: ["primary", "empty", "loading"] },
  { surface: "log", scenarios: ["primary"] },
  { surface: "log-workout", scenarios: ["primary", "empty"] },
  { surface: "log-nutrition", scenarios: ["primary", "empty"] },
  { surface: "guided-workout", scenarios: ["primary"] },
  { surface: "motion-lab", scenarios: ["primary"] },
  { surface: "progress", scenarios: ["primary", "empty"] },
  { surface: "body-scan", scenarios: ["primary"] },
  { surface: "history", scenarios: ["primary", "empty"] },
  { surface: "check-in", scenarios: ["primary"] },
  { surface: "community", scenarios: ["primary", "empty"] },
  { surface: "settings", scenarios: ["primary"] },
  { surface: "integrations", scenarios: ["primary"] },
  { surface: "vitals", scenarios: ["primary", "empty"] },
  { surface: "pricing", scenarios: ["primary"] },
  { surface: "badges", scenarios: ["primary"] },
  { surface: "coach-support", scenarios: ["primary", "empty"] },
  { surface: "meal-plan", scenarios: ["primary"] },
  { surface: "fridge-scanner", scenarios: ["primary"] },
  { surface: "onboarding", scenarios: ["primary"] },
];

const waitByScenario = {
  primary: 2600,
  empty: 2200,
  loading: 1200,
  error: 2200,
};

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

function safeName(value) {
  return value.replace(/\s+/g, "-").toLowerCase();
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

  const simulators = [
    { name: simulatorName, mode: "full" },
    { name: layoutSanitySimulatorName, mode: "sanity" },
  ];

  const results = [];
  for (const simulator of simulators) {
    const simulatorDir = path.join(reportDir, safeName(simulator.name));
    fs.mkdirSync(simulatorDir, { recursive: true });

    if (simulator.name !== simulatorName) {
      console.log(`Booting ${simulator.name}...`);
      try {
        run("xcrun", ["simctl", "boot", simulator.name]);
      } catch {
        // Already booted.
      }
      run("xcrun", ["simctl", "bootstatus", simulator.name, "-b"], { stdio: "inherit" });
      run("xcrun", ["simctl", "install", simulator.name, appPath], { stdio: "inherit" });
    }

    for (const entry of surfaceMatrix) {
      const scenarios = simulator.mode === "sanity" ? ["primary"] : entry.scenarios;
      for (const scenario of scenarios) {
        console.log(`Launching ${entry.surface} [${scenario}] on ${simulator.name}`);
        try {
          run("xcrun", ["simctl", "terminate", simulator.name, bundleId]);
        } catch {
          // App may not be running.
        }

        const launchOutput = run(
          "xcrun",
          ["simctl", "launch", simulator.name, bundleId],
          {
            env: {
              ...process.env,
              SIMCTL_CHILD_E2E_AUTO_LOGIN: "true",
              SIMCTL_CHILD_E2E_DEMO_MODE: "true",
              SIMCTL_CHILD_E2E_SURFACE: entry.surface,
              SIMCTL_CHILD_E2E_SCENARIO: scenario,
              SIMCTL_CHILD_E2E_VARIANT: scenario,
            },
          }
        );

        await sleep(waitByScenario[scenario] ?? 2400);
        const screenshotPath = path.join(simulatorDir, `${entry.surface}--${scenario}.png`);
        run("xcrun", ["simctl", "io", simulator.name, "screenshot", screenshotPath], { stdio: "pipe" });
        results.push({
          simulator: simulator.name,
          mode: simulator.mode,
          surface: entry.surface,
          scenario,
          launchOutput,
          screenshotPath,
        });
      }
    }
  }

  const reportPath = path.join(reportDir, "SUMMARY.md");
  const summary = [
    "# iOS Surface Smoke Report",
    "",
    `Primary simulator: ${simulatorName}`,
    `Layout sanity simulator: ${layoutSanitySimulatorName}`,
    `Bundle ID: ${bundleId}`,
    "",
    "## Coverage",
    `- Full state matrix captured on \`${simulatorName}\``,
    `- Primary-state layout sanity captured on \`${layoutSanitySimulatorName}\``,
    "",
    "## Results",
    ...results.map(result => `- PASS \`${result.simulator}\` ${result.surface} [${result.scenario}] -> \`${path.relative(cwd, result.screenshotPath)}\``),
    "",
  ].join("\n");
  fs.writeFileSync(reportPath, summary);

  console.log(`Surface smoke report written to ${reportPath}`);
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
