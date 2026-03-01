import type { WhoopDailySignal, WhoopOAuthTokens } from "@/lib/integrations/provider-types";

const WHOOP_AUTHORIZE_URL = "https://api.prod.whoop.com/oauth/oauth2/auth";
const WHOOP_TOKEN_URL = "https://api.prod.whoop.com/oauth/oauth2/token";
const WHOOP_RECOVERY_URL = "https://api.prod.whoop.com/developer/v1/recovery";

export function buildWhoopAuthorizeUrl(state: string): string {
  const clientId = process.env.WHOOP_CLIENT_ID ?? "";
  const redirectUri = process.env.WHOOP_REDIRECT_URI ?? "";
  const url = new URL(WHOOP_AUTHORIZE_URL);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "read:recovery read:sleep read:cycles read:workout");
  url.searchParams.set("state", state);
  return url.toString();
}

export async function exchangeWhoopCode(code: string): Promise<WhoopOAuthTokens> {
  const clientId = process.env.WHOOP_CLIENT_ID;
  const clientSecret = process.env.WHOOP_CLIENT_SECRET;
  const redirectUri = process.env.WHOOP_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error("WHOOP OAuth is not configured.");
  }

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
    client_id: clientId,
    client_secret: clientSecret,
  });

  const res = await fetch(WHOOP_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!res.ok) {
    throw new Error(`WHOOP token exchange failed (${res.status})`);
  }

  const data = (await res.json()) as WhoopOAuthTokens;
  if (!data.access_token) {
    throw new Error("WHOOP token response missing access_token.");
  }
  return data;
}

export async function fetchWhoopSignals(accessToken: string): Promise<WhoopDailySignal[]> {
  if (!accessToken) return [];

  const res = await fetch(WHOOP_RECOVERY_URL, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    throw new Error(`WHOOP recovery fetch failed (${res.status})`);
  }

  const payload = (await res.json()) as {
    records?: Array<{
      score?: { recovery_score?: number };
      created_at?: string;
      user_calibrating?: boolean;
      hrv_rmssd_milli?: number;
      resting_heart_rate?: number;
    }>;
  };

  const records = payload.records ?? [];
  return records.slice(0, 14).map((entry) => {
    const date = typeof entry.created_at === "string" ? entry.created_at.slice(0, 10) : new Date().toISOString().slice(0, 10);
    return {
      signal_date: date,
      recovery_score: entry.score?.recovery_score,
      resting_hr: entry.resting_heart_rate,
      hrv: entry.hrv_rmssd_milli,
      raw_payload: entry as unknown as Record<string, unknown>,
    };
  });
}
