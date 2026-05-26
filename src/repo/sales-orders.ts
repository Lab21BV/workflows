import { getRecordsApi as records } from "../zoho";


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

export type SalesControleRow = {
  id: string;
  Subject: string | null;
  SO_Number: string | null;
  Owner: { id: string; name: string } | null;
  Account_Name: { id: string; name: string } | null;
  Description: string | null;
  Modified_Time: string | null;
};

type RawSalesControleRecord = {
  id: string;
  Subject?: string | null;
  SO_Number?: string | null;
  Owner?: { id: string; name: string } | null;
  Account_Name?: { id: string; name: string } | null;
  Description?: string | null;
  Modified_Time?: string | null;
};

/**
 * Orders die op salescontrole door de accountmanager wachten — globale lijst
 * met AM-kolom. Triggered door `sales-order-naar-ordercheck` workflow die de
 * fase op "Ordercheck" zet.
 */
export async function listAwaitingSalesControl(): Promise<SalesControleRow[]> {
  const res = await records().search<RawSalesControleRecord>("Sales_Orders", {
    criteria: "(Status:equals:Ordercheck)",
    perPage: 200,
  });
  const rows = (res?.data ?? []).map<SalesControleRow>((r) => ({
    id: r.id,
    Subject: r.Subject ?? null,
    SO_Number: r.SO_Number ?? null,
    Owner: r.Owner ?? null,
    Account_Name: r.Account_Name ?? null,
    Description: r.Description ?? null,
    Modified_Time: r.Modified_Time ?? null,
  }));
  rows.sort((a, b) => (b.Modified_Time ?? "").localeCompare(a.Modified_Time ?? ""));
  return rows;
}
