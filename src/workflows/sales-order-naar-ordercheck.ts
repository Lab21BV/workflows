import { z } from "zod";
import type { Workflow, WorkflowContext, WorkflowResult } from "./types";
import { ORDERCHECK_STATE, isBeforeOrdercheck } from "../zoho/blueprints/sales-orders";

/**
 * Webhook-getriggerde workflow: Sales_Order.Description ingevuld → order
 * naar accountmanager voor salescontrole (Status → "Ordercheck").
 *
 * Trigger (Zoho-zijde): Zoho-werkflowsregel op `Sales_Orders` edit,
 * voorwaarde "Description is wijzigt en niet leeg". POST naar
 * /api/webhooks/zoho met X-Workflow: sales-order-naar-ordercheck en
 * header salesOrderId = ${Sales_Orders.id}.
 *
 * Idempotent: als de order al op Ordercheck zit of er voorbij, doet de
 * workflow niets (geen fase-regressie).
 */

const payloadSchema = z.object({
  salesOrderId: z.string().min(1),
});

type Payload = z.infer<typeof payloadSchema>;

type SalesOrderRecord = {
  [k: string]: unknown;
  id: string;
  Status?: string | null;
  Description?: string | null;
};

export const salesOrderNaarOrdercheck: Workflow<Payload> = {
  id: "sales-order-naar-ordercheck",
  description:
    "Sales_Order.Description ingevuld → order aanbieden aan accountmanager (Status=Ordercheck)",

  trigger: {
    name: "zoho.sales_orders.edit",
    description: "Zoho webhook on Sales_Orders edit (Description changed)",
    parse: (input) => payloadSchema.parse(input),
  },

  async run(payload: Payload, ctx: WorkflowContext): Promise<WorkflowResult> {
    const order = await ctx.records.get<SalesOrderRecord>(
      "Sales_Orders",
      payload.salesOrderId,
    );
    if (!order) return { status: "error", message: "Sales order not found" };

    const description = (order.Description ?? "").trim();
    if (!description) {
      return { status: "skipped", message: "description empty" };
    }

    if (!isBeforeOrdercheck(order.Status ?? null)) {
      return {
        status: "skipped",
        message: `status=${order.Status ?? "unknown"} is at or past ${ORDERCHECK_STATE}`,
      };
    }

    await ctx.records.update("Sales_Orders", [
      { id: order.id, Status: ORDERCHECK_STATE },
    ]);

    return {
      status: "ok",
      message: `Order ${order.id} naar ${ORDERCHECK_STATE} gezet`,
      data: { salesOrderId: order.id, previousStatus: order.Status ?? null },
    };
  },
};
