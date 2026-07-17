import { headers } from "next/headers";

// In-memory failed-attempt tracker. Per-process (resets on restart), which is
// fine for a single-container family app — it exists to blunt online brute-force,
// not to be a distributed rate limiter.

type Bucket = { fails: number; lockedUntil: number; first: number };

const buckets = new Map<string, Bucket>();

const MAX_FAILS = 8; // failures allowed within the window before lockout
const WINDOW_MS = 15 * 60 * 1000; // rolling window
const LOCK_MS = 15 * 60 * 1000; // lockout duration once tripped

function now() {
  // Date.now() is unavailable in some sandboxes but fine at runtime here.
  return Date.now();
}

/** Identify the caller by forwarded IP (Fly/Proxy set x-forwarded-for). */
export async function clientKey(scope: string): Promise<string> {
  const h = await headers();
  const fwd = h.get("x-forwarded-for");
  const ip = (fwd ? fwd.split(",")[0] : h.get("x-real-ip") || "local").trim();
  return `${scope}:${ip}`;
}

/** Returns remaining lock seconds if currently locked, else 0. */
export function checkLock(key: string): number {
  const b = buckets.get(key);
  if (!b) return 0;
  const t = now();
  if (b.lockedUntil > t) return Math.ceil((b.lockedUntil - t) / 1000);
  return 0;
}

/** Record a failed attempt; locks the key once MAX_FAILS is reached in-window. */
export function recordFailure(key: string): void {
  const t = now();
  const b = buckets.get(key);
  if (!b || t - b.first > WINDOW_MS) {
    buckets.set(key, { fails: 1, lockedUntil: 0, first: t });
    return;
  }
  b.fails += 1;
  if (b.fails >= MAX_FAILS) {
    b.lockedUntil = t + LOCK_MS;
    b.fails = 0;
    b.first = t;
  }
}

/** Clear a key after a successful auth. */
export function recordSuccess(key: string): void {
  buckets.delete(key);
}

export function lockMessage(seconds: number): string {
  const mins = Math.ceil(seconds / 60);
  return `Too many wrong tries. Wait about ${mins} minute${mins === 1 ? "" : "s"} and try again.`;
}
