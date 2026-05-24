import { describe, expect, test } from "vitest";
import { evaluateReschedule } from "./evaluate";
import type { VoorinspectieRecord } from "./types";
import bufferOk from "./fixtures/vi-buffer-ok.json";
import bufferTight from "./fixtures/vi-buffer-too-tight.json";
import branchA from "./fixtures/vi-branch-A.json";
import branchB from "./fixtures/vi-branch-B.json";

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

describe("Stage 2: aanvrager chose branch", () => {
  test("branch A → reset to none (new round)", () => {
    const out = evaluateReschedule(branchA as VoorinspectieRecord, 14);
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ kind: "set_status", status: "none" });
  });
  test("branch B → awaiting_klant_leverdatum + notify klant", () => {
    const out = evaluateReschedule(branchB as VoorinspectieRecord, 14);
    expect(out).toEqual([
      { kind: "set_status", status: "awaiting_klant_leverdatum" },
      { kind: "notify_portal_user", who: "klant", template: "vraag_nieuwe_leverdatum_met_toelichting" },
    ]);
  });
});

import tpAccepted from "./fixtures/vi-tegenpartij-accepted.json";
import tpRejected from "./fixtures/vi-tegenpartij-rejected.json";
import tpNoSlot from "./fixtures/vi-tegenpartij-no-tijdslot.json";

describe("Stage 3: tegenpartij reacted", () => {
  test("accepted → commit datetime + done + log + todo for inkoop", () => {
    const out = evaluateReschedule(tpAccepted as VoorinspectieRecord, 14);
    expect(out).toEqual([
      { kind: "commit_vi_datetime", datetime: "2026-06-20T09:00:00+02:00" },
      { kind: "set_status", status: "done" },
      { kind: "log_tijdlijn", event: expect.stringContaining("bevestigd") },
      expect.objectContaining({ kind: "create_todo", department: "inkoop_planning" }),
    ]);
  });

  test("accepted without tijdslot → rejected (portal bug)", () => {
    const out = evaluateReschedule(tpNoSlot as VoorinspectieRecord, 14);
    expect(out).toEqual([
      { kind: "set_status", status: "rejected", reason: expect.stringContaining("portal-bug") },
    ]);
  });

  test("rejected → reset to none + notify aanvrager", () => {
    const out = evaluateReschedule(tpRejected as VoorinspectieRecord, 14);
    expect(out).toEqual([
      { kind: "set_status", status: "none", reason: expect.stringContaining("weigerde") },
      { kind: "notify_portal_user", who: "aannemer", template: "vi_tegenpartij_weigert" },
    ]);
  });
});
