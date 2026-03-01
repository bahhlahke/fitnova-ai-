#!/usr/bin/env node

const baseUrl = process.env.WORKFLOW_BASE_URL ?? "http://localhost:3000";
const url = new URL("/api/v1/jobs/reminders", baseUrl).toString();

const headers = {
  "Content-Type": "application/json",
};

if (process.env.CRON_SECRET) {
  headers["x-cron-secret"] = process.env.CRON_SECRET;
}

async function main() {
  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({}),
  });

  const body = await res.json();
  if (!res.ok) {
    console.error("Reminder dispatch failed", { status: res.status, body });
    process.exitCode = 1;
    return;
  }

  console.log(JSON.stringify(body, null, 2));
}

main().catch((error) => {
  console.error("Reminder dispatch script crashed", error);
  process.exitCode = 1;
});
