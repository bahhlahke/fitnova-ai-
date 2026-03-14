const baseUrl = process.env.APP_BASE_URL ?? process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
const cron = process.env.CRON_SECRET ?? "";

const res = await fetch(new URL('/api/v1/jobs/integrations/reconcile', baseUrl), {
  method: 'POST',
  headers: cron ? { 'x-cron-key': cron } : {},
});

const body = await res.json().catch(() => ({}));
if (!res.ok) {
  console.error('integrations_reconcile_failed', { status: res.status, body });
  process.exit(1);
}

console.log(JSON.stringify(body, null, 2));
