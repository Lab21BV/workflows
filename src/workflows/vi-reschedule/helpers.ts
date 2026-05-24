import type { Aanvrager } from "./types";

/**
 * Whole-day difference between two ISO date/datetime strings.
 * Truncates to UTC date so DST cannot shift the count.
 */
export function daysBetween(startIso: string, endIso: string): number {
  const a = Date.UTC(
    parseInt(startIso.slice(0, 4), 10),
    parseInt(startIso.slice(5, 7), 10) - 1,
    parseInt(startIso.slice(8, 10), 10),
  );
  const b = Date.UTC(
    parseInt(endIso.slice(0, 4), 10),
    parseInt(endIso.slice(5, 7), 10) - 1,
    parseInt(endIso.slice(8, 10), 10),
  );
  return Math.round((b - a) / 86_400_000);
}

export function isLater(a: string, b: string): boolean {
  return a.slice(0, 10) > b.slice(0, 10);
}

export function tegenpartij(a: Aanvrager): Aanvrager {
  return a === "aannemer" ? "klant" : "aannemer";
}
