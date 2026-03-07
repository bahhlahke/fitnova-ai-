#!/usr/bin/env node
/**
 * Run iOS tests via xcodebuild when an .xcodeproj exists under ios/.
 * Exit 0 if no project (nothing to run); exit with xcodebuild code otherwise.
 *
 * Uses a single destination (iPhone 17) so only one simulator runs — suitable for
 * machines where only one iOS sim can run tests at a time. Close other sims or
 * avoid running parallel test jobs if you hit resource limits.
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const iosDir = path.resolve(__dirname, "..", "ios");

function findXcodeProject(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    if (e.isDirectory() && e.name.endsWith(".xcodeproj")) return path.join(dir, e.name);
    if (e.isDirectory() && !e.name.startsWith(".") && e.name !== "build" && e.name !== "KodaAITests") {
      const found = findXcodeProject(path.join(dir, e.name));
      if (found) return found;
    }
  }
  return null;
}

const projectPath = findXcodeProject(iosDir);
if (!projectPath) {
  console.log("No .xcodeproj found under ios/. Add an Xcode project and test target (see ios/README.md).");
  process.exit(0);
}

const schemeName = path.basename(projectPath, ".xcodeproj");
const projectDir = path.dirname(projectPath);

const result = spawnSync(
  "xcodebuild",
  [
    "test",
    "-project", projectPath,
    "-scheme", schemeName,
    "-destination", "platform=iOS Simulator,name=iPhone 17",
  ],
  { stdio: "inherit", cwd: projectDir }
);

process.exit(result.status ?? 0);
