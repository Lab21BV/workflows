import { describe, it, expect } from "vitest";

/**
 * Lichte sanity-tests die de datum-vergelijking testen zonder DB.
 * Volledige integratietests via een lokale Postgres komen later.
 */

describe("delegation date overlap", () => {
  function isWithinPeriod(datum: Date, validFrom: string, validUntil: string): boolean {
    const iso = datum.toISOString().slice(0, 10);
    return iso >= validFrom && iso <= validUntil;
  }

  it("date IS in inclusive range", () => {
    expect(isWithinPeriod(new Date("2026-07-05T12:00:00Z"), "2026-07-01", "2026-07-15")).toBe(true);
  });
  it("first day of range is included", () => {
    expect(isWithinPeriod(new Date("2026-07-01T00:00:00Z"), "2026-07-01", "2026-07-15")).toBe(true);
  });
  it("last day of range is included", () => {
    expect(isWithinPeriod(new Date("2026-07-15T23:59:59Z"), "2026-07-01", "2026-07-15")).toBe(true);
  });
  it("date before range is excluded", () => {
    expect(isWithinPeriod(new Date("2026-06-30T12:00:00Z"), "2026-07-01", "2026-07-15")).toBe(false);
  });
  it("date after range is excluded", () => {
    expect(isWithinPeriod(new Date("2026-07-16T00:00:00Z"), "2026-07-01", "2026-07-15")).toBe(false);
  });
});
