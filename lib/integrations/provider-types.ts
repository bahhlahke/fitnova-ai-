export type ConnectedProvider = "whoop";

export type WhoopDailySignal = {
  signal_date: string;
  recovery_score?: number;
  strain_score?: number;
  sleep_hours?: number;
  resting_hr?: number;
  hrv?: number;
  raw_payload?: Record<string, unknown>;
};

export type WhoopOAuthTokens = {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
};
