import { describe, expect, test } from "vitest";
import { daysBetween, isLater, tegenpartij } from "./helpers";

describe("daysBetween", () => {
  test("returns positive when end is after start", () => {
    expect(daysBetween("2026-06-25", "2026-07-15")).toBe(20);
  });
  test("returns 0 for same day", () => {
    expect(daysBetween("2026-06-25", "2026-06-25")).toBe(0);
  });
  test("handles datetime inputs (truncates to date)", () => {
    expect(daysBetween("2026-06-25T14:00:00Z", "2026-07-15T09:00:00Z")).toBe(20);
  });
});

describe("isLater", () => {
  test("true when a > b", () => {
    expect(isLater("2026-07-20", "2026-07-15")).toBe(true);
  });
  test("false when a < b", () => {
    expect(isLater("2026-07-10", "2026-07-15")).toBe(false);
  });
  test("false when a == b", () => {
    expect(isLater("2026-07-15", "2026-07-15")).toBe(false);
  });
});

describe("tegenpartij", () => {
  test("aannemer → klant", () => {
    expect(tegenpartij("aannemer")).toBe("klant");
  });
  test("klant → aannemer", () => {
    expect(tegenpartij("klant")).toBe("aannemer");
  });
});
