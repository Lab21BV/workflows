/**
 * Specificeert de generieke "Montage" en "Verwijderen" subcategorie-waardes
 * naar discipline-specifieke variants en migreert bestaande Products.
 *
 * Stap 1: voegt 7 picklist-waardes toe aan de Categorie_1 global picklist:
 *   - Montage vloer, Montage reno trap, Montage lijm pvc trap,
 *   - Montage gordijn, Montage zonwering, Montage shutter,
 *   - Verwijderen vloer
 *
 * Stap 2: hercategoriseert alle Products met Categorie_1 = "Montage" naar
 *         "Montage vloer". Alle 127 huidige records zijn LEG-records voor
 *         vloer; geen enkele heeft signal voor trap/gordijn/etc. Producten
 *         met Categorie_1 = "Verwijderen" → "Verwijderen vloer" (0 records
 *         op het moment van schrijven, maar idempotent).
 *
 * Usage:
 *   npx tsx --env-file=.env.local src/scripts/specify-montage-subcategorie.ts
 *   npx tsx --env-file=.env.local src/scripts/specify-montage-subcategorie.ts apply
 */

import { ZohoClient } from "../zoho/client";

const GLOBAL_PICKLIST_ID = "728921000000827282";
const MODULE = "Products";

const TO_ADD = [
  "Montage vloer",
  "Montage reno trap",
  "Montage lijm pvc trap",
  "Montage gordijn",
  "Montage zonwering",
  "Montage shutter",
  "Verwijderen vloer",
];

const REMAP: { from: string; to: string }[] = [
  { from: "Montage", to: "Montage vloer" },
  { from: "Verwijderen", to: "Verwijderen vloer" },
];

interface PicklistValue {
  display_value: string;
  actual_value: string;
  sequence_number?: number;
  id?: string;
}

interface GlobalPicklist {
  id: string;
  api_name: string;
  display_label: string;
  pick_list_values: PicklistValue[];
}

interface ProductLite {
  id: string;
  Product_Name?: string;
  Categorie_1?: string;
}

async function step1AddPicklistValues(zoho: ZohoClient, apply: boolean) {
  const res = await zoho.request<{ global_picklists: GlobalPicklist[] }>(
    `/settings/global_picklists/${GLOBAL_PICKLIST_ID}`,
  );
  const gpl = res.global_picklists[0];
  if (!gpl) throw new Error(`Global picklist ${GLOBAL_PICKLIST_ID} not found`);
  const existing = new Set([
    ...gpl.pick_list_values.map((v) => v.actual_value),
    ...gpl.pick_list_values.map((v) => v.display_value),
  ]);
  const missing = TO_ADD.filter((v) => !existing.has(v));

  console.log(`\n[Stap 1] Picklist ${gpl.display_label}: ${gpl.pick_list_values.length} waardes`);
  console.log(`Toe te voegen: ${missing.length}`);
  for (const v of missing) console.log(`  + ${v}`);
  const skipped = TO_ADD.filter((v) => existing.has(v));
  for (const v of skipped) console.log(`  = ${v} (bestaat al, skip)`);

  if (missing.length === 0) return;
  if (!apply) {
    console.log("(dry run — geen wijziging)");
    return;
  }

  const startSeq = gpl.pick_list_values.reduce((m, v) => Math.max(m, v.sequence_number ?? 0), 0);
  const merged: PicklistValue[] = [
    ...gpl.pick_list_values.map((v) => ({
      display_value: v.display_value,
      actual_value: v.actual_value,
      sequence_number: v.sequence_number,
      id: v.id,
    })),
    ...missing.map((v, i) => ({
      display_value: v,
      actual_value: v,
      sequence_number: startSeq + i + 1,
    })),
  ];
  const patchRes = await zoho.request<unknown>(`/settings/global_picklists/${GLOBAL_PICKLIST_ID}`, {
    method: "PATCH",
    body: JSON.stringify({ global_picklists: [{ pick_list_values: merged }] }),
  });
  console.log("Zoho response:", JSON.stringify(patchRes));
}

async function step2RemapProducts(zoho: ZohoClient, apply: boolean) {
  for (const { from, to } of REMAP) {
    console.log(`\n[Stap 2] ${from} → ${to}`);
    const all: ProductLite[] = [];
    let page = 1;
    while (true) {
      const res = await zoho.request<
        { data?: ProductLite[]; info?: { more_records?: boolean } } | undefined
      >(`/${MODULE}/search`, {
        query: {
          criteria: `(Categorie_1:equals:${from})`,
          fields: "id,Product_Name,Categorie_1",
          per_page: 200,
          page,
        },
      });
      const batch = res?.data ?? [];
      all.push(...batch);
      if (!res?.info?.more_records) break;
      page++;
    }
    console.log(`Gevonden: ${all.length} records`);
    if (all.length === 0) continue;

    if (!apply) {
      console.log("Voorbeeld (eerste 5):");
      for (const p of all.slice(0, 5)) console.log(`  - ${p.id}: ${(p.Product_Name ?? "").slice(0, 80)}`);
      console.log("(dry run — geen wijziging)");
      continue;
    }

    const BATCH = 100;
    let updated = 0;
    for (let i = 0; i < all.length; i += BATCH) {
      const slice = all.slice(i, i + BATCH);
      const payload = {
        data: slice.map((p) => ({ id: p.id, Categorie_1: to })),
        trigger: [] as string[],
      };
      const upd = await zoho.request<{ data: { code: string; status: string; details?: { id?: string } }[] }>(
        `/${MODULE}`,
        {
          method: "PUT",
          body: JSON.stringify(payload),
        },
      );
      const ok = upd.data.filter((r) => r.status === "success").length;
      const fail = upd.data.length - ok;
      updated += ok;
      console.log(`  batch ${Math.floor(i / BATCH) + 1}: ${ok} ok, ${fail} fail`);
      if (fail > 0) {
        for (const r of upd.data) {
          if (r.status !== "success") console.log(`    failed:`, JSON.stringify(r));
        }
      }
    }
    console.log(`Totaal geüpdatet: ${updated}/${all.length}`);
  }
}

async function main() {
  const apply = process.argv.includes("apply");
  if (!apply) console.log("=== DRY RUN === (gebruik `apply` om te committen)");

  const zoho = new ZohoClient();
  await step1AddPicklistValues(zoho, apply);
  await step2RemapProducts(zoho, apply);
  console.log("\nKlaar.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
