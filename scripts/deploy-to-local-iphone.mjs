import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const iosDir = path.join(rootDir, "ios", "AskKodaAI");
const projectPath = path.join(iosDir, "AskKodaAI.xcodeproj");
const scheme = "AskKodaAI";
const deviceId = "00008140-000468923AE8801C";
const bundleId = "Main.AskKodaAI";

function runCommand(command, args, cwd = rootDir) {
  console.log(`\n> Running: ${command} ${args.join(" ")}`);
  const result = spawnSync(command, args, { stdio: "inherit", cwd });
  if (result.status !== 0) {
    console.error(`\n! Command failed with exit code ${result.status}`);
    process.exit(result.status ?? 1);
  }
  return result;
}

// 1. Generate Environment
console.log("--- Generating iOS Environment ---");
runCommand("node", ["scripts/generate-ios-env.mjs"]);

// 2. Build for Device
console.log("\n--- Building for iPhone 16 ---");
const buildArgs = [
  "build",
  "-project", projectPath,
  "-scheme", scheme,
  "-destination", `generic/platform=iOS`,
  "-configuration", "Debug",
  "-derivedDataPath", path.join(rootDir, "build/ios")
];
runCommand("xcodebuild", buildArgs, iosDir);

// 3. Find the built .app
const appPath = path.join(rootDir, "build/ios/Build/Products/Debug-iphoneos/AskKodaAI.app");
if (!fs.existsSync(appPath)) {
  console.error(`\n! Could not find built app at: ${appPath}`);
  process.exit(1);
}

// 4. Install on Device
console.log("\n--- Installing on iPhone 16 ---");
runCommand("xcrun", ["devicectl", "device", "install", "app", "--device", deviceId, appPath]);

// 5. Launch on Device
console.log("\n--- Launching on iPhone 16 ---");
runCommand("xcrun", ["devicectl", "device", "process", "launch", "--device", deviceId, bundleId]);

console.log("\n--- Deployment Complete! ---");
