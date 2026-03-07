#!/usr/bin/env node
/**
 * Generate iOS Config/Generated.xcconfig from the repo's .env.local (same source as web app).
 * Run as an Xcode Run Script build phase so the iOS app uses the same Supabase and API config.
 * Exits 0 always so the Xcode build never fails (e.g. when node is not in PATH).
 *
 * Usage: from repo root, node scripts/generate-ios-env.mjs
 * Or from Xcode: cd "$PROJECT_DIR/../.." && node scripts/generate-ios-env.mjs
 *
 * Reads: .env.local (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, NEXT_PUBLIC_SITE_URL)
 * Writes: ios/AskKodaAI/Config/Generated.xcconfig (INFOPLIST_KEY_* for the app target)
 */

import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

function main() {
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const repoRoot = join(__dirname, "..");
  const envPath = join(repoRoot, ".env.local");

  function parseEnvLocal(content) {
    const out = {};
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'")))
        value = value.slice(1, -1);
      out[key] = value;
    }
    return out;
  }

  function escapeXcconfigValue(v) {
    if (v == null || v === "") return '""';
    return `"${String(v).replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
  }

  let env = {};
  try {
    env = parseEnvLocal(readFileSync(envPath, "utf8"));
  } catch (e) {
    if (e.code !== "ENOENT") throw e;
  }

  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
  const supabaseAnonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-replace-with-.env.local";
  const apiBaseUrl = env.NEXT_PUBLIC_SITE_URL || env.API_BASE_URL || "https://localhost:3000";

  const xcconfig = `// Generated from .env.local by scripts/generate-ios-env.mjs — do not edit by hand.
// Same keys as the web app; iOS reads these via Info.plist.

INFOPLIST_KEY_SUPABASE_URL = ${escapeXcconfigValue(supabaseUrl)}
INFOPLIST_KEY_SUPABASE_ANON_KEY = ${escapeXcconfigValue(supabaseAnonKey)}
INFOPLIST_KEY_API_BASE_URL = ${escapeXcconfigValue(apiBaseUrl)}
`;

  const outDir = join(repoRoot, "ios", "AskKodaAI", "Config");
  const outPath = join(outDir, "Generated.xcconfig");
  try {
    mkdirSync(outDir, { recursive: true });
    writeFileSync(outPath, xcconfig, "utf8");
    console.log("Wrote", outPath, env.NEXT_PUBLIC_SUPABASE_URL ? "(from .env.local)" : "(placeholders; no .env.local)");
  } catch (err) {
    if (err.code === "EPERM" || err.code === "EACCES") {
      console.warn("Could not write", outPath, "(file may be read-only or locked). Using existing file.");
    } else {
      throw err;
    }
  }
}

try {
  main();
} catch (err) {
  console.warn("generate-ios-env.mjs:", err.message || err);
}
process.exit(0);
