import { describe, expect, test } from "vitest";
import { evaluateReschedule } from "./evaluate";
import type { VoorinspectieRecord } from "./types";
import bufferOk from "./fixtures/vi-buffer-ok.json";
import bufferTight from "./fixtures/vi-buffer-too-tight.json";

describe("Stage 1: buffer evaluation", () => {
  test("buffer ok → ask tegenpartij + notify + log", () => {
    const out = evaluateReschedule(bufferOk as VoorinspectieRecord, 14);
    expect(out).toEqual([
      { kind: "set_status", status: "awaiting_tegenpartij" },
      { kind: "notify_portal_user", who: "klant", template: "vi_voorstel_review" },
      { kind: "log_tijdlijn", event: expect.stringContaining("buffer ok") },
    ]);
  });

  test("buffer broken → aanvrager moet kiezen + notify aanvrager", () => {
    const out = evaluateReschedule(bufferTight as VoorinspectieRecord, 14);
    expect(out).toHaveLength(2);
    expect(out[0]).toMatchObject({ kind: "set_status", status: "aanvrager_moet_kiezen" });
    expect(out[1]).toEqual({ kind: "notify_portal_user", who: "aannemer", template: "vi_buffer_te_krap" });
  });
});
