// Simple in-memory rate limiter for login endpoints.
//
// PRODUCTION NOTE: This works for single-instance deployments only.
// For multi-instance / serverless environments use a centralised store
// (e.g. Redis via @upstash/ratelimit) so counters are shared across instances.

interface Attempt {
  count: number;
  resetAt: number; // epoch ms
}

const store = new Map<string, Attempt>();

/** Default: 5 attempts per 15 minutes per key. */
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes

/**
 * Check whether `key` (e.g. "ip:identifier") is within the allowed rate.
 * Returns `{ allowed: true }` or `{ allowed: false, retryAfterMs: number }`.
 */
export function checkRateLimit(key: string): { allowed: true } | { allowed: false; retryAfterMs: number } {
  const now = Date.now();
  let entry = store.get(key);

  if (!entry || now >= entry.resetAt) {
    // New window
    entry = { count: 1, resetAt: now + WINDOW_MS };
    store.set(key, entry);
    return { allowed: true };
  }

  entry.count += 1;
  if (entry.count > MAX_ATTEMPTS) {
    return { allowed: false, retryAfterMs: entry.resetAt - now };
  }

  return { allowed: true };
}

// Periodically clean up expired entries to prevent unbounded memory growth.
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    if (now >= entry.resetAt) store.delete(key);
  }
}, WINDOW_MS);
