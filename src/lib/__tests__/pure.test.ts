import { describe, expect, it } from "vitest";
import { formatCents, parseAmount } from "../money";
import { dueDates, monthsBetween } from "../dates";

describe("parseAmount", () => {
  it("parses plain and decimal amounts to cents", () => {
    expect(parseAmount("10")).toBe(1000);
    expect(parseAmount("10.5")).toBe(1050);
    expect(parseAmount("10.55")).toBe(1055);
    expect(parseAmount("1,234.99")).toBe(123499);
  });
  it("rejects garbage, negatives, and zero", () => {
    expect(parseAmount("")).toBeNull();
    expect(parseAmount("abc")).toBeNull();
    expect(parseAmount("-5")).toBeNull();
    expect(parseAmount("0")).toBeNull();
    expect(parseAmount("1.234")).toBeNull();
  });
});

describe("formatCents", () => {
  it("formats with symbol and sign", () => {
    expect(formatCents(123456, "USD")).toBe("$1,234.56");
    expect(formatCents(-50, "ILS")).toBe("-₪0.50");
    expect(formatCents(5, "EUR")).toBe("€0.05");
  });
});

describe("monthsBetween", () => {
  it("returns months after from, up to and including to", () => {
    expect(monthsBetween("2026-05", "2026-07")).toEqual(["2026-06", "2026-07"]);
    expect(monthsBetween("2026-07", "2026-07")).toEqual([]);
    expect(monthsBetween("2025-11", "2026-01")).toEqual(["2025-12", "2026-01"]);
  });
});

describe("dueDates", () => {
  it("finds weekly due dates after the last paid date", () => {
    // 2026-07-17 is a Friday (day 5)
    const due = dueDates("weekly", 5, "2026-07-03", "2026-07-17");
    expect(due).toEqual(["2026-07-10", "2026-07-17"]);
  });
  it("finds monthly due dates", () => {
    const due = dueDates("monthly", 1, "2026-05-20", "2026-07-17");
    expect(due).toEqual(["2026-06-01", "2026-07-01"]);
  });
  it("returns nothing when already paid up", () => {
    expect(dueDates("weekly", 5, "2026-07-17", "2026-07-17")).toEqual([]);
  });
});
