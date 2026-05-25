import { ZohoClient } from "../zoho/client";
import { RecordsApi } from "../zoho/records";

let _records: RecordsApi | null = null;
function records(): RecordsApi {
  if (!_records) _records = new RecordsApi(new ZohoClient());
  return _records;
}

export type ProductRow = { id: string; Levertijd: number };

export async function getMany(ids: string[]): Promise<ProductRow[]> {
  if (ids.length === 0) return [];
  const out: ProductRow[] = [];
  for (const id of ids) {
    const p = await records().get<{ id: string; Levertijd_in_dagen?: number }>("Products", id);
    if (p) out.push({ id: p.id, Levertijd: p.Levertijd_in_dagen ?? 0 });
  }
  return out;
}
