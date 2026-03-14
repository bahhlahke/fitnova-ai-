#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import { IOS_SURFACE_MATRIX } from "./ui-surface-config.mjs";

const cwd = process.cwd();
const project = path.join(cwd, "ios/AskKodaAI/AskKodaAI.xcodeproj");
const scheme = "AskKodaAI";
const simulatorName = process.env.IOS_SIMULATOR_NAME || "iPhone 17";
const layoutSanitySimulatorName = process.env.IOS_LAYOUT_SANITY_SIMULATOR_NAME || "iPhone 16e";
const bundleId = "Main.AskKodaAI";

const waitByScenario = {
  primary: 2600,
  empty: 2200,
  loading: 1200,
  error: 2200,
};

function parseArgs(argv) {
  const args = {
    reportDir: "",
  };

  for (let i = 2; i < argv.length; i += 1) {
    if (argv[i] === "--report-dir" && argv[i + 1]) {
      args.reportDir = argv[i + 1];
      i += 1;
    }
  }

  return args;
}

function timestampSlug(date) {
  return date.toISOString().replace(/[:.]/g, "-");
}

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
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function safeName(value) {
  return value.replace(/\s+/g, "-").toLowerCase();
}

function ensureBuildSettings() {
  const raw = run("xcodebuild", [
    "-project",
    project,
    "-scheme",
    scheme,
    "-destination",
    `platform=iOS Simulator,name=${simulatorName}`,
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

function toMarkdownSummary({
  startedAt,
  finishedAt,
  reportDir,
  results,
}) {
  const passed = results.filter((result) => result.pass).length;
  const failed = results.length - passed;

  const lines = [
    "# iOS Surface Smoke Report",
    "",
    `Generated (UTC): ${startedAt.toISOString()} to ${finishedAt.toISOString()}`,
    `Primary simulator: ${simulatorName}`,
    `Layout sanity simulator: ${layoutSanitySimulatorName}`,
    `Bundle ID: ${bundleId}`,
    `Report dir: ${path.relative(cwd, reportDir)}`,
    "",
    "## Coverage",
    `- Full state matrix captured on \`${simulatorName}\``,
    `- Primary-state layout sanity captured on \`${layoutSanitySimulatorName}\``,
    `- Pass: ${passed}`,
    `- Fail: ${failed}`,
    "",
    "## Results",
  ];

  for (const result of results) {
    const status = result.pass ? "PASS" : "FAIL";
    const destination = path.relative(cwd, result.absoluteScreenshotPath ?? reportDir);
    const detail = result.pass ? destination : `${result.error || "unknown error"} (${destination})`;
    lines.push(`- ${status} \`${result.simulator}\` ${result.surface} [${result.scenario}] -> \`${detail}\``);
  }

  return `${lines.join("\n")}\n`;
}

async function main() {
  const args = parseArgs(process.argv);
  const startedAt = new Date();
  const reportDir = args.reportDir
    ? path.resolve(cwd, args.reportDir)
    : path.join(cwd, "docs/reports", `ios-surface-smoke-${timestampSlug(startedAt)}`);

  fs.mkdirSync(reportDir, { recursive: true });

  console.log(`Building ${scheme} for ${simulatorName}...`);
  run(
    "xcodebuild",
    ["-project", project, "-scheme", scheme, "-destination", `platform=iOS Simulator,name=${simulatorName}`, "build"],
    { stdio: "inherit" }
  );

  const settings = ensureBuildSettings();
  const appPath = path.join(settings.TARGET_BUILD_DIR, settings.FULL_PRODUCT_NAME);

  console.log(`Booting ${simulatorName}...`);
  try {
    run("xcrun", ["simctl", "boot", simulatorName]);
  } catch {
    // Simulator may already be booted.
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
        // Simulator may already be booted.
      }
      run("xcrun", ["simctl", "bootstatus", simulator.name, "-b"], { stdio: "inherit" });
      run("xcrun", ["simctl", "install", simulator.name, appPath], { stdio: "inherit" });
    }

    for (const entry of IOS_SURFACE_MATRIX) {
      const scenarios = simulator.mode === "sanity" ? ["primary"] : entry.scenarios;

      for (const scenario of scenarios) {
        console.log(`Launching ${entry.surface} [${scenario}] on ${simulator.name}`);

        const screenshotPath = path.join(simulatorDir, `${entry.surface}--${scenario}.png`);
        const result = {
          app: "ios",
          workflowId: entry.workflowId,
          title: entry.title,
          simulator: simulator.name,
          mode: simulator.mode,
          surface: entry.surface,
          scenario,
          launchOutput: "",
          screenshotPath: path.relative(cwd, screenshotPath),
          absoluteScreenshotPath: screenshotPath,
          pass: false,
          error: "",
        };

        try {
          try {
            run("xcrun", ["simctl", "terminate", simulator.name, bundleId]);
          } catch {
            // App may not be running yet.
          }

          result.launchOutput = run("xcrun", ["simctl", "launch", simulator.name, bundleId], {
            env: {
              ...process.env,
              SIMCTL_CHILD_E2E_AUTO_LOGIN: "true",
              SIMCTL_CHILD_E2E_DEMO_MODE: "true",
              SIMCTL_CHILD_E2E_SURFACE: entry.surface,
              SIMCTL_CHILD_E2E_SCENARIO: scenario,
              SIMCTL_CHILD_E2E_VARIANT: scenario,
            },
          });

          await sleep(waitByScenario[scenario] ?? 2400);
          run("xcrun", ["simctl", "io", simulator.name, "screenshot", screenshotPath], { stdio: "pipe" });
          result.pass = true;
        } catch (error) {
          result.error = error instanceof Error ? error.message : String(error);
          const fallbackPath = screenshotPath.replace(/\.png$/, "--error.png");
          try {
            run("xcrun", ["simctl", "io", simulator.name, "screenshot", fallbackPath], { stdio: "pipe" });
            result.absoluteScreenshotPath = fallbackPath;
            result.screenshotPath = path.relative(cwd, fallbackPath);
          } catch {
            // Ignore follow-up screenshot failures.
          }
        }

        results.push(result);
      }
    }
  }

  const finishedAt = new Date();
  const manifest = {
    app: "ios",
    generatedAt: finishedAt.toISOString(),
    primarySimulator: simulatorName,
    layoutSanitySimulator: layoutSanitySimulatorName,
    bundleId,
    results,
  };

  const reportPath = path.join(reportDir, "SUMMARY.md");
  const manifestPath = path.join(reportDir, "manifest.json");

  fs.writeFileSync(
    reportPath,
    toMarkdownSummary({
      startedAt,
      finishedAt,
      reportDir,
      results,
    })
  );
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

  console.log(`Surface smoke report written to ${reportPath}`);

  if (results.some((result) => !result.pass)) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
