// src/workflows/vi-reschedule/run.test.ts
import { describe, expect, test, vi } from "vitest";
import { runReschedule } from "./run";
import type { VoorinspectieRecord } from "./types";

const baseVi: VoorinspectieRecord = {
  id: "VI-501",
  Leverdatum_Origineel: "2026-07-15",
  Datum_tijd: "2026-06-10T09:00:00+01:00",
  VI_Voorstel_Status: "awaiting_evaluation",
  VI_Voorgestelde_Datum: "2026-06-20",
  VI_Voorgesteld_Door: "aannemer",
  VI_Buffer_Snapshot_Dagen: null,
  VI_Branch_Gekozen: null,
  VI_Nieuwe_Leverdatum_Voorstel: null,
  VI_Toelichting_Klant: null,
  VI_Tegenpartij_Reactie: null,
  VI_Geaccepteerd_Tijdslot_Van: null,
};

describe("runReschedule", () => {
  test("happy path: buffer ok → writes status + log + notify", async () => {
    const updates: { id: string; patch: unknown }[] = [];
    const logs: string[] = [];
    const todos: { dep: string; title: string }[] = [];
    const result = await runReschedule(
      { voorinspectieId: "VI-501" },
      {
        getVi: vi.fn().mockResolvedValue(baseVi),
        getSalesOrderId: vi.fn().mockResolvedValue("SO-302"),
        getSalesOrder: vi.fn().mockResolvedValue({
          id: "SO-302",
          Leverdatum: "2026-07-15",
          productIds: ["P1", "P2"],
        }),
        getProducts: vi.fn().mockResolvedValue([
          { id: "P1", Levertijd: 10 },
          { id: "P2", Levertijd: 14 },
        ]),
        updateVi: vi.fn(async (id, patch) => {
          updates.push({ id, patch });
        }),
        updateLeverdatum: vi.fn(),
        logEvent: vi.fn(async (_id, e): Promise<string | null> => {
          logs.push(e);
          return null;
        }),
        createTodo: vi.fn(async (i): Promise<string | null> => {
          todos.push({ dep: i.department, title: i.title });
          return null;
        }),
        notifyPortalUser: vi.fn(),
      },
    );
    expect(result.outcomes.length).toBeGreaterThan(0);
    expect(updates.some((u) => (u.patch as Record<string, unknown>).VI_Buffer_Snapshot_Dagen === 21)).toBe(true);
    expect(logs.length).toBeGreaterThan(0);
  });

  test("no-op when state matches no branch", async () => {
    const result = await runReschedule(
      { voorinspectieId: "VI-501" },
      {
        getVi: vi.fn().mockResolvedValue({ ...baseVi, VI_Voorstel_Status: "done" }),
        getSalesOrderId: vi.fn().mockResolvedValue("SO-302"),
        getSalesOrder: vi.fn().mockResolvedValue({ id: "SO-302", Leverdatum: "2026-07-15", productIds: [] }),
        getProducts: vi.fn().mockResolvedValue([]),
        updateVi: vi.fn(),
        updateLeverdatum: vi.fn(),
        logEvent: vi.fn(),
        createTodo: vi.fn(),
        notifyPortalUser: vi.fn(),
      },
    );
    expect(result.outcomes).toEqual([]);
  });
});
