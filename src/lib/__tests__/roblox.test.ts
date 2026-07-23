import { describe, expect, it } from "vitest";
import { matchScripts, tokenize, TEMPLATES, EXAMPLE_PROMPTS } from "../roblox";

describe("tokenize", () => {
  it("lowercases and drops noise words", () => {
    expect(tokenize("Make me a Kill Brick")).toEqual(["kill", "brick"]);
  });
  it("returns nothing for pure noise", () => {
    expect(tokenize("how do I make it")).toEqual([]);
  });
});

describe("matchScripts", () => {
  it("returns nothing for an empty query", () => {
    expect(matchScripts("")).toEqual([]);
    expect(matchScripts("   ")).toEqual([]);
  });

  it("returns nothing for gibberish", () => {
    expect(matchScripts("asdfqwer zxcvbnm")).toEqual([]);
  });

  const cases: Array<[string, string]> = [
    ["kill brick", "kill-brick"],
    ["I want a coin leaderboard", "leaderstats"],
    ["double jump", "double-jump"],
    ["sprint when I hold shift", "sprint"],
    ["day night cycle", "day-night"],
    ["a door that opens", "door-prompt"],
    ["teleport pad", "teleport-pad"],
    ["spinning part", "spinner"],
    ["make lava that hurts you", "lava-damage"],
    ["background music", "background-music"],
    ["give the player a sword", "give-tool"],
  ];

  it.each(cases)("matches %j to the %s script", (query, expectedId) => {
    const results = matchScripts(query);
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].template.id).toBe(expectedId);
  });

  it("ranks by score, best first", () => {
    const results = matchScripts("coin leaderboard");
    for (let i = 1; i < results.length; i++) {
      expect(results[i - 1].score).toBeGreaterThanOrEqual(results[i].score);
    }
  });
});

describe("template library", () => {
  it("has unique ids", () => {
    const ids = TEMPLATES.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("every template has code and at least one keyword", () => {
    for (const t of TEMPLATES) {
      expect(t.code.trim().length).toBeGreaterThan(0);
      expect(t.keywords.length).toBeGreaterThan(0);
    }
  });

  it("no Luau code contains a JS template-literal trap", () => {
    for (const t of TEMPLATES) {
      expect(t.code.includes("`")).toBe(false);
      expect(t.code.includes("${")).toBe(false);
    }
  });

  it("every example prompt matches something", () => {
    for (const prompt of EXAMPLE_PROMPTS) {
      expect(matchScripts(prompt).length).toBeGreaterThan(0);
    }
  });
});
