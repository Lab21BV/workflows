import { ZohoClient } from "../zoho/client";
import { RecordsApi } from "../zoho/records";

const records = new RecordsApi(new ZohoClient());

export type SalesOrderRow = {
  id: string;
  Leverdatum: string | null;
  productIds: string[];
};

export async function get(id: string): Promise<SalesOrderRow | null> {
  const r = await records.get<{
    id: string;
    Leverdatum?: string;
    Product_Details?: { product?: { id: string } }[];
  }>("Sales_Orders", id);
  if (!r) return null;
  return {
    id: r.id,
    Leverdatum: r.Leverdatum ?? null,
    productIds: (r.Product_Details ?? [])
      .map((d) => d.product?.id)
      .filter((x): x is string => typeof x === "string"),
  };
}

export async function updateLeverdatum(id: string, nieuweDatum: string): Promise<void> {
  await records.update("Sales_Orders", [{ id, Leverdatum: nieuweDatum }]);
}
