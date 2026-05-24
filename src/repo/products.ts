import { ZohoClient } from "../zoho/client";
import { RecordsApi } from "../zoho/records";

const records = new RecordsApi(new ZohoClient());

export type ProductRow = { id: string; Levertijd: number };

export async function getMany(ids: string[]): Promise<ProductRow[]> {
  if (ids.length === 0) return [];
  const out: ProductRow[] = [];
  for (const id of ids) {
    const p = await records.get<{ id: string; Levertijd?: number }>("Products", id);
    if (p) out.push({ id: p.id, Levertijd: p.Levertijd ?? 0 });
  }
  return out;
}
