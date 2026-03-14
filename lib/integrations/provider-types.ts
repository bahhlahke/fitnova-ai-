export type ConnectedProvider = "whoop" | "oura" | "apple_health" | "healthkit" | "garmin" | "fitbit";

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

export type CanonicalWearableSignal = {
  provider: ConnectedProvider | string;
  signal_date: string;
  recovery_score?: number | null;
  strain_score?: number | null;
  sleep_hours?: number | null;
  resting_hr?: number | null;
  hrv?: number | null;
  respiratory_rate_avg?: number | null;
  spo2_avg?: number | null;
  blood_glucose_avg?: number | null;
  steps?: number | null;
  provider_confidence?: number | null;
  raw_payload?: Record<string, unknown>;
};

export type OuraOAuthTokens = {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  token_type?: string;
  scope?: string;
};
