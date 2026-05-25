/**
 * One-off script: add ontbrekende waardes aan de Products.Subcategorie picklist
 * (api_name `Categorie_1`).
 *
 * Idempotent: bestaande waardes worden niet aangetast; alleen ontbrekende
 * worden toegevoegd. Picklist-update via metadata API is een volledige
 * replace, dus we sturen current + new in één PATCH.
 *
 * Usage:
 *   npx tsx src/scripts/add-subcategorie-picklist-values.ts          # dry run
 *   npx tsx src/scripts/add-subcategorie-picklist-values.ts apply    # commit
 */

import { ZohoClient } from "../zoho/client";

const MODULE = "Products";
const FIELD_API_NAME = "Categorie_1";
// Subcategorie is a global picklist; values live at the global-picklist
// endpoint, not at the field level. Updating the field metadata silently
// no-ops for these — we must PATCH /settings/global_picklists/{id}.
const GLOBAL_PICKLIST_ID = "728921000000827282";

const TO_ADD = [
  "Egaline & Lijmen",
  "Gereedschappen",
  "Electro raamdecoratie",
  "Gordijnen rail",
  "Shutter",
  "Horren",
  "Geweven hout",
];

interface PicklistValue {
  display_value: string;
  actual_value: string;
  sequence_number?: number;
  colour_code?: string | null;
  reference_value?: string;
  id?: string;
  type?: string;
}

interface FieldMeta {
  id: string;
  api_name: string;
  field_label: string;
  pick_list_values: PicklistValue[];
}

async function main() {
  const apply = process.argv.includes("apply");
  const zoho = new ZohoClient();

  const globalRes = await zoho.request<{
    global_picklists: {
      id: string;
      api_name: string;
      display_label: string;
      pick_list_values: PicklistValue[];
    }[];
  }>(`/settings/global_picklists/${GLOBAL_PICKLIST_ID}`);
  const gpl = globalRes.global_picklists[0];
  if (!gpl) throw new Error(`Global picklist ${GLOBAL_PICKLIST_ID} not found`);

  const existingActual = new Set(gpl.pick_list_values.map((v) => v.actual_value));
  const existingDisplay = new Set(gpl.pick_list_values.map((v) => v.display_value));
  const missing = TO_ADD.filter((v) => !existingActual.has(v) && !existingDisplay.has(v));

  console.log(
    `Global picklist: ${gpl.display_label} (${gpl.api_name}) id=${gpl.id} (used by field ${MODULE}.${FIELD_API_NAME})`,
  );
  console.log(`Existing values: ${gpl.pick_list_values.length}`);
  console.log(`Requested to add: ${TO_ADD.length}`);
  console.log(`Will add (after dedup): ${missing.length}`);
  for (const v of missing) console.log(`  + ${v}`);
  const alreadyThere = TO_ADD.filter((v) => existingActual.has(v) || existingDisplay.has(v));
  for (const v of alreadyThere) console.log(`  = ${v} (already exists, skip)`);

  if (missing.length === 0) {
    console.log("Nothing to do.");
    return;
  }

  if (!apply) {
    console.log("\nDry run. Re-run with `apply` to commit.");
    return;
  }

  const startSeq = gpl.pick_list_values.reduce(
    (max, v) => Math.max(max, v.sequence_number ?? 0),
    0,
  );
  const newValues: PicklistValue[] = missing.map((v, i) => ({
    display_value: v,
    actual_value: v,
    sequence_number: startSeq + i + 1,
  }));

  // Send full merged list (existing + new) — Zoho replaces wholesale.
  const merged: PicklistValue[] = [
    ...gpl.pick_list_values.map((v) => ({
      display_value: v.display_value,
      actual_value: v.actual_value,
      sequence_number: v.sequence_number,
      id: v.id,
    })),
    ...newValues,
  ];

  const payload = { global_picklists: [{ pick_list_values: merged }] };
  const res = await zoho.request<unknown>(`/settings/global_picklists/${GLOBAL_PICKLIST_ID}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
  console.log("Zoho response:", JSON.stringify(res, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
