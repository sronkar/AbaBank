// The "connect to Roblox Studio" bridge.
//
// Roblox Studio can't be pushed to directly from a web page — but a Studio
// *plugin* can poll an HTTP endpoint and insert whatever it finds. So the flow
// is: the web app POSTs a generated script into a small in-memory queue keyed
// by a short pairing code; the plugin (running inside Studio) polls that same
// code and drops the script into the right place.
//
// State lives in a module-level Map, which persists for the life of the server
// process. That's the right scope for a single-instance hobby app; jobs also
// expire so the map can't grow without bound.

import type { PlacementTarget } from "./roblox";

export interface StudioJob {
  id: string;
  title: string;
  scriptType: "Script" | "LocalScript" | "ModuleScript";
  target: PlacementTarget;
  code: string;
  createdAt: number;
}

const JOB_TTL_MS = 5 * 60 * 1000; // a pushed script is claimable for 5 minutes
const MAX_QUEUE = 25; // per pairing code, oldest dropped first

interface Bucket {
  jobs: StudioJob[];
  lastSeen: number; // last time the plugin polled — used for the "connected?" hint
}

// Survive Next's dev hot-reloads by hanging state off globalThis.
const globalForBridge = globalThis as unknown as {
  __robloxBridge?: Map<string, Bucket>;
};
const buckets: Map<string, Bucket> = globalForBridge.__robloxBridge ?? new Map();
globalForBridge.__robloxBridge = buckets;

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no O/0/1/I ambiguity

/** A short, human-friendly pairing code the user types into the plugin once. */
export function makePairingCode(): string {
  let code = "";
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  for (const b of bytes) code += CODE_ALPHABET[b % CODE_ALPHABET.length];
  return code;
}

/** Pairing codes are always compared/stored upper-cased and trimmed. */
export function normalizeCode(code: string): string {
  return code.trim().toUpperCase();
}

export function isValidCode(code: string): boolean {
  return /^[A-Z0-9]{4,12}$/.test(normalizeCode(code));
}

function sweep(now: number): void {
  for (const [code, bucket] of buckets) {
    bucket.jobs = bucket.jobs.filter((j) => now - j.createdAt < JOB_TTL_MS);
    // Forget a code entirely once it's idle and empty.
    if (bucket.jobs.length === 0 && now - bucket.lastSeen > JOB_TTL_MS) {
      buckets.delete(code);
    }
  }
}

/** Queue a script for the plugin paired to `code`. Returns the job id. */
export function enqueueJob(
  code: string,
  job: Omit<StudioJob, "createdAt">,
  now: number = Date.now(),
): StudioJob {
  sweep(now);
  const key = normalizeCode(code);
  const bucket = buckets.get(key) ?? { jobs: [], lastSeen: 0 };
  const full: StudioJob = { ...job, createdAt: now };
  bucket.jobs.push(full);
  if (bucket.jobs.length > MAX_QUEUE) bucket.jobs.splice(0, bucket.jobs.length - MAX_QUEUE);
  buckets.set(key, bucket);
  return full;
}

/**
 * Claim all pending jobs for `code` (drains the queue) and record the poll.
 * Called by the Studio plugin.
 */
export function claimJobs(code: string, now: number = Date.now()): StudioJob[] {
  sweep(now);
  const key = normalizeCode(code);
  const bucket = buckets.get(key);
  if (!bucket) {
    // Remember that this code polled, so the sender can see "Studio connected".
    buckets.set(key, { jobs: [], lastSeen: now });
    return [];
  }
  bucket.lastSeen = now;
  const fresh = bucket.jobs.filter((j) => now - j.createdAt < JOB_TTL_MS);
  bucket.jobs = [];
  return fresh;
}

/** True if a plugin has polled this code recently (best-effort "connected"). */
export function isConnected(code: string, now: number = Date.now()): boolean {
  const bucket = buckets.get(normalizeCode(code));
  return !!bucket && now - bucket.lastSeen < 15 * 1000;
}
