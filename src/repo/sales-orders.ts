import { ZohoClient } from "../zoho/client";
import { RecordsApi } from "../zoho/records";

let _records: RecordsApi | null = null;
function records(): RecordsApi {
  if (!_records) _records = new RecordsApi(new ZohoClient());
  return _records;
}

export type SalesOrderRow = {
  id: string;
  Leverdatum: string | null;
  productIds: string[];
};

type LineItem = {
  Product_Name?: { id?: string };
  product?: { id?: string };
};

type RawSO = {
  id: string;
  Due_Date?: string;
  Verwachte_leverdatum?: string;
  Ordered_Items?: LineItem[];
};

/**
 * Leverdatum source: prefer `Due_Date` (Gewenste leverdatum — what the klant
 * committed to). Fall back to `Verwachte_leverdatum` if not set.
 *
 * Line items live in the `Ordered_Items` subform; each item's product
 * reference is at `Product_Name.id`.
 */
export async function get(id: string): Promise<SalesOrderRow | null> {
  const r = await records().get<RawSO>("Sales_Orders", id);
  if (!r) return null;
  const items = r.Ordered_Items ?? [];
  const productIds = items
    .map((d) => d.Product_Name?.id ?? d.product?.id)
    .filter((x): x is string => typeof x === "string");
  return {
    id: r.id,
    Leverdatum: r.Due_Date ?? r.Verwachte_leverdatum ?? null,
    productIds,
  };
}

export async function updateLeverdatum(id: string, nieuweDatum: string): Promise<void> {
  await records().update("Sales_Orders", [{ id, Due_Date: nieuweDatum }]);
}
