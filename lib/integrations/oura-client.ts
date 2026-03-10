import type { OuraOAuthTokens } from "@/lib/integrations/provider-types";

const OURA_AUTHORIZE_URL = "https://cloud.ouraring.com/oauth/authorize";
const OURA_TOKEN_URL = "https://api.ouraring.com/oauth/token";

export function buildOuraAuthorizeUrl(state: string): string {
  const clientId = process.env.OURA_CLIENT_ID ?? "";
  const redirectUri = process.env.OURA_REDIRECT_URI ?? "";
  const url = new URL(OURA_AUTHORIZE_URL);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "daily");
  url.searchParams.set("state", state);
  return url.toString();
}

export async function exchangeOuraCode(code: string): Promise<OuraOAuthTokens> {
  const clientId = process.env.OURA_CLIENT_ID;
  const clientSecret = process.env.OURA_CLIENT_SECRET;
  const redirectUri = process.env.OURA_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error("OURA OAuth is not configured.");
  }

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
    client_id: clientId,
    client_secret: clientSecret,
  });

  const res = await fetch(OURA_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!res.ok) {
    throw new Error(`OURA token exchange failed (${res.status})`);
  }

  const data = (await res.json()) as OuraOAuthTokens;
  if (!data.access_token) {
    throw new Error("OURA token response missing access_token.");
  }
  return data;
}
