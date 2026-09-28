const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 8;
const attempts = new Map<string, { count: number; resetAt: number }>();

function cleanup(now: number) {
  for (const [key, entry] of attempts) {
    if (entry.resetAt <= now) attempts.delete(key);
  }
}

export function isLoginRateLimited(key: string, maxAttempts = MAX_ATTEMPTS): boolean {
  const now = Date.now();
  cleanup(now);
  if (!attempts.has(key) && attempts.size >= 10_000) return true;
  return (attempts.get(key)?.count || 0) >= maxAttempts;
}

export function recordLoginFailure(key: string): void {
  const now = Date.now();
  const entry = attempts.get(key);
  if (!entry || entry.resetAt <= now) {
    attempts.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return;
  }
  entry.count += 1;
}

export function clearLoginFailures(key: string): void {
  attempts.delete(key);
}
