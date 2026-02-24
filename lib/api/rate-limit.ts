type Bucket = {
  tokens: number;
  lastRefillMs: number;
};

const buckets = new Map<string, Bucket>();

export function consumeToken(
  key: string,
  capacity: number,
  refillTokensPerSecond: number
): { allowed: boolean; retryAfterSeconds: number } {
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing) {
    buckets.set(key, { tokens: capacity - 1, lastRefillMs: now });
    return { allowed: true, retryAfterSeconds: 0 };
  }

  const elapsedSeconds = Math.max(0, (now - existing.lastRefillMs) / 1000);
  const refilled = Math.min(capacity, existing.tokens + elapsedSeconds * refillTokensPerSecond);

  if (refilled < 1) {
    const missing = 1 - refilled;
    const retryAfterSeconds = Math.ceil(missing / refillTokensPerSecond);
    buckets.set(key, { tokens: refilled, lastRefillMs: now });
    return { allowed: false, retryAfterSeconds };
  }

  buckets.set(key, { tokens: refilled - 1, lastRefillMs: now });
  return { allowed: true, retryAfterSeconds: 0 };
}
