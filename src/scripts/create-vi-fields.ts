/**
 * One-off script: create the 13 custom fields on the Voorinspecties module
 * required by the VI-reschedule chain (spec section 5).
 *
 * Idempotent: re-checks existing fields before creating; skips ones that exist.
 *
 * Usage:
 *   npm run zoho:create-vi-fields           # dry run (default)
 *   npm run zoho:create-vi-fields -- apply  # actually create
 */

import { ZohoClient } from "../zoho/client";

type ApiField = {
  api_name: string;
  field_label: string;
  data_type: string;
};

type FieldDef = {
  field_label: string;
  api_name: string;
  data_type: "picklist" | "date" | "datetime" | "textarea" | "integer";
  pick_list_values?: { display_value: string; actual_value: string; sequence_number: number }[];
  length?: number;
  textarea?: { type: "small" | "large" | "huge" };
};

const DEFS: FieldDef[] = [
  {
    field_label: "VI Voorstel Status",
    api_name: "VI_Voorstel_Status",
    data_type: "picklist",
    pick_list_values: [
      "none",
      "awaiting_evaluation",
      "awaiting_tegenpartij",
      "aanvrager_moet_kiezen",
      "awaiting_klant_leverdatum",
      "klant_kiest_leverdatum",
      "done",
      "rejected",
    ].map((v, i) => ({ display_value: v, actual_value: v, sequence_number: i + 1 })),
  },
  { field_label: "VI Voorgestelde Datum", api_name: "VI_Voorgestelde_Datum", data_type: "date" },
  {
    field_label: "VI Voorgestelde Tijdblokken",
    api_name: "VI_Voorgestelde_Tijdblokken",
    data_type: "textarea",
    length: 2000,
    textarea: { type: "small" },
  },
  {
    field_label: "VI Voorgesteld Door",
    api_name: "VI_Voorgesteld_Door",
    data_type: "picklist",
    pick_list_values: ["aannemer", "klant"].map((v, i) => ({
      display_value: v,
      actual_value: v,
      sequence_number: i + 1,
    })),
  },
  { field_label: "VI Voorstel Aangemaakt", api_name: "VI_Voorstel_Aangemaakt", data_type: "datetime" },
  { field_label: "VI Buffer Snapshot Dagen", api_name: "VI_Buffer_Snapshot_Dagen", data_type: "integer" },
  {
    field_label: "VI Branch Gekozen",
    api_name: "VI_Branch_Gekozen",
    data_type: "picklist",
    pick_list_values: ["A_nieuwe_vi_datum", "B_klant_kiest_leverdatum"].map((v, i) => ({
      display_value: v,
      actual_value: v,
      sequence_number: i + 1,
    })),
  },
  { field_label: "VI Nieuwe Leverdatum Voorstel", api_name: "VI_Nieuwe_Leverdatum_Voorstel", data_type: "date" },
  { field_label: "VI Toelichting Klant", api_name: "VI_Toelichting_Klant", data_type: "textarea", length: 2000, textarea: { type: "small" } },
  {
    field_label: "VI Tegenpartij Reactie",
    api_name: "VI_Tegenpartij_Reactie",
    data_type: "picklist",
    pick_list_values: ["pending", "accepted", "rejected"].map((v, i) => ({
      display_value: v,
      actual_value: v,
      sequence_number: i + 1,
    })),
  },
  { field_label: "VI Reschedule Cyclus", api_name: "VI_Reschedule_Cyclus", data_type: "integer" },
  { field_label: "VI Geaccepteerd Tijdslot Van", api_name: "VI_Geaccepteerd_Tijdslot_Van", data_type: "datetime" },
  { field_label: "VI Geaccepteerd Tijdslot Tot", api_name: "VI_Geaccepteerd_Tijdslot_Tot", data_type: "datetime" },
];

async function main() {
  const apply = process.argv.includes("apply");
  const zoho = new ZohoClient();

  const existing = await zoho.request<{ fields: ApiField[] }>("/settings/fields", {
    query: { module: "Voorinspecties" },
  });
  const existingApiNames = new Set(existing.fields.map((f) => f.api_name));

  console.log(`Voorinspecties has ${existing.fields.length} existing fields.\n`);

  const toCreate = DEFS.filter((d) => !existingApiNames.has(d.api_name));
  const skipped = DEFS.filter((d) => existingApiNames.has(d.api_name));

  if (skipped.length > 0) {
    console.log(`Skipping (already exist):`);
    for (const f of skipped) console.log(`  - ${f.api_name}`);
    console.log();
  }

  if (toCreate.length === 0) {
    console.log("Nothing to do — all 13 fields already exist.");
    return;
  }

  console.log(`${apply ? "CREATING" : "WOULD CREATE"} ${toCreate.length} fields:\n`);
  for (const f of toCreate) console.log(`  - ${f.api_name}  (${f.data_type})`);

  if (!apply) {
    console.log(`\nDry run. Re-run with: npm run zoho:create-vi-fields -- apply`);
    return;
  }

  console.log("\nApplying…\n");
  for (const f of toCreate) {
    try {
      const body = JSON.stringify({ fields: [f] });
      const res = await zoho.request<{
        fields: { code: string; status: string; message?: string; details?: { id: string } }[];
      }>("/settings/fields", {
        method: "POST",
        query: { module: "Voorinspecties" },
        body,
      });
      const r = res.fields?.[0];
      if (r?.status === "success") {
        console.log(`  ✓ ${f.api_name}  (id=${r.details?.id})`);
      } else {
        console.log(`  ? ${f.api_name}  ${JSON.stringify(res)}`);
      }
    } catch (err) {
      console.error(`  ✗ ${f.api_name}  ${(err as Error).message}`);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
