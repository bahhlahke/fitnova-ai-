import { NextResponse } from "next/server";

export type ApiErrorCode =
  | "AUTH_REQUIRED"
  | "INVALID_JSON"
  | "VALIDATION_ERROR"
  | "RATE_LIMITED"
  | "SERVICE_UNAVAILABLE"
  | "UPSTREAM_ERROR"
  | "INTERNAL_ERROR";

export function jsonError(status: number, code: ApiErrorCode, error: string) {
  return NextResponse.json({ error, code }, { status });
}

export function makeRequestId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
