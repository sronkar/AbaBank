import { describe, expect, it } from "vitest";
import {
  enqueueJob,
  claimJobs,
  isConnected,
  isValidCode,
  makePairingCode,
  normalizeCode,
} from "../roblox-bridge";

const sampleJob = {
  id: "kill-brick",
  title: "Kill brick",
  scriptType: "Script" as const,
  target: "WorkspacePart" as const,
  code: "print('hi')",
};

describe("pairing codes", () => {
  it("makes 6-char codes from the safe alphabet", () => {
    for (let i = 0; i < 20; i++) {
      const c = makePairingCode();
      expect(c).toMatch(/^[A-HJ-NP-Z2-9]{6}$/);
    }
  });
  it("validates and normalises", () => {
    expect(isValidCode("abc123")).toBe(true);
    expect(normalizeCode("  abc123 ")).toBe("ABC123");
    expect(isValidCode("no")).toBe(false);
    expect(isValidCode("way-too-long-code")).toBe(false);
  });
});

describe("job queue", () => {
  it("enqueues and drains jobs for a code", () => {
    const code = "QUEUE1";
    enqueueJob(code, sampleJob);
    enqueueJob(code, { ...sampleJob, id: "spinner", title: "Spinner" });

    const claimed = claimJobs(code);
    expect(claimed.map((j) => j.id)).toEqual(["kill-brick", "spinner"]);

    // Draining empties the queue.
    expect(claimJobs(code)).toEqual([]);
  });

  it("keeps codes isolated", () => {
    enqueueJob("AAAAAA", sampleJob);
    expect(claimJobs("BBBBBB")).toEqual([]);
    expect(claimJobs("AAAAAA")).toHaveLength(1);
  });

  it("expires jobs after the TTL", () => {
    const t0 = 1_000_000;
    enqueueJob("EXPIRE", sampleJob, t0);
    // 6 minutes later (TTL is 5) the job is gone.
    expect(claimJobs("EXPIRE", t0 + 6 * 60 * 1000)).toEqual([]);
  });

  it("reports connection after a recent poll", () => {
    const t0 = 2_000_000;
    claimJobs("LIVE01", t0); // plugin polls
    expect(isConnected("LIVE01", t0 + 5_000)).toBe(true);
    expect(isConnected("LIVE01", t0 + 60_000)).toBe(false);
  });
});
