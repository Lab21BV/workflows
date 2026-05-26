import { describe, expect, test, vi } from "vitest";
import { salesOrderNaarOrdercheck } from "./sales-order-naar-ordercheck";
import type { WorkflowContext } from "./types";

type StubRecords = {
  get: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
};

function makeCtx(records: StubRecords): WorkflowContext {
  return {
    zoho: {} as WorkflowContext["zoho"],
    records: records as unknown as WorkflowContext["records"],
    now: new Date("2026-05-26T10:00:00Z"),
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
  };
}

const ORDER_ID = "SO-100";

describe("salesOrderNaarOrdercheck", () => {
  test("description ingevuld + fase < Ordercheck → Status naar Ordercheck", async () => {
    const records: StubRecords = {
      get: vi.fn().mockResolvedValue({
        id: ORDER_ID,
        Status: "Approved",
        Description: "Extra meerprijs afgesproken met klant.",
      }),
      update: vi.fn().mockResolvedValue(undefined),
    };
    const ctx = makeCtx(records);
    const result = await salesOrderNaarOrdercheck.run(
      { salesOrderId: ORDER_ID },
      ctx,
    );
    expect(result.status).toBe("ok");
    expect(records.update).toHaveBeenCalledWith("Sales_Orders", [
      { id: ORDER_ID, Status: "Ordercheck" },
    ]);
  });

  test("description leeg → skip", async () => {
    const records: StubRecords = {
      get: vi.fn().mockResolvedValue({
        id: ORDER_ID,
        Status: "Approved",
        Description: "   ",
      }),
      update: vi.fn(),
    };
    const result = await salesOrderNaarOrdercheck.run(
      { salesOrderId: ORDER_ID },
      makeCtx(records),
    );
    expect(result.status).toBe("skipped");
    expect(records.update).not.toHaveBeenCalled();
  });

  test("al op Ordercheck → skip (idempotent)", async () => {
    const records: StubRecords = {
      get: vi.fn().mockResolvedValue({
        id: ORDER_ID,
        Status: "Ordercheck",
        Description: "Opmerking",
      }),
      update: vi.fn(),
    };
    const result = await salesOrderNaarOrdercheck.run(
      { salesOrderId: ORDER_ID },
      makeCtx(records),
    );
    expect(result.status).toBe("skipped");
    expect(records.update).not.toHaveBeenCalled();
  });

  test("voorbij Ordercheck (Delivered) → skip, geen fase-regressie", async () => {
    const records: StubRecords = {
      get: vi.fn().mockResolvedValue({
        id: ORDER_ID,
        Status: "Delivered",
        Description: "Late opmerking",
      }),
      update: vi.fn(),
    };
    const result = await salesOrderNaarOrdercheck.run(
      { salesOrderId: ORDER_ID },
      makeCtx(records),
    );
    expect(result.status).toBe("skipped");
    expect(records.update).not.toHaveBeenCalled();
  });

  test("record niet gevonden → error", async () => {
    const records: StubRecords = {
      get: vi.fn().mockResolvedValue(null),
      update: vi.fn(),
    };
    const result = await salesOrderNaarOrdercheck.run(
      { salesOrderId: ORDER_ID },
      makeCtx(records),
    );
    expect(result.status).toBe("error");
  });

  test("payload zonder salesOrderId → parse error", () => {
    expect(() => salesOrderNaarOrdercheck.trigger.parse({})).toThrow();
  });
});
