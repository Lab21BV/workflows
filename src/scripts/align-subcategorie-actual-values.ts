/**
 * Trekt actual_value gelijk aan display_value voor 5 legacy waardes in de
 * Categorie_1 (Subcategorie) global picklist.
 *
 * Display → huidige actual → nieuwe actual
 *   PVC              ← PVC vloeren          → PVC
 *   Hout             ← Houten vloeren       → Hout
 *   Randafwerking    ← Plinten en profielen → Randafwerking
 *   Hulpmaterialen   ← Legmaterialen        → Hulpmaterialen
 *   Montage          ← Legdienst vloeren    → Montage
 *
 * Door `id` van elke picklist-entry te behouden, behandelt Zoho dit als een
 * rename: bestaande Products met die actual_value blijven gekoppeld via de id
 * en gaan automatisch de nieuwe actual_value gebruiken.
 *
 * Usage:
 *   npx tsx --env-file=.env.local src/scripts/align-subcategorie-actual-values.ts
 *   npx tsx --env-file=.env.local src/scripts/align-subcategorie-actual-values.ts apply
 *   npx tsx --env-file=.env.local src/scripts/align-subcategorie-actual-values.ts apply --only=Hout
 */

import { ZohoClient } from "../zoho/client";

const GLOBAL_PICKLIST_ID = "728921000000827282";

interface PicklistValue {
  display_value: string;
  actual_value: string;
  sequence_number?: number;
  id?: string;
}

interface GlobalPicklist {
  id: string;
  display_label: string;
  pick_list_values: PicklistValue[];
}

const ALIGN_DISPLAYS = ["PVC", "Hout", "Randafwerking", "Hulpmaterialen", "Montage"];

async function main() {
  const apply = process.argv.includes("apply");
  const onlyArg = process.argv.find((a) => a.startsWith("--only="));
  const only = onlyArg ? onlyArg.slice("--only=".length).split(",") : null;
  const wanted = only ? ALIGN_DISPLAYS.filter((d) => only.includes(d)) : ALIGN_DISPLAYS;

  const zoho = new ZohoClient();
  const res = await zoho.request<{ global_picklists: GlobalPicklist[] }>(
    `/settings/global_picklists/${GLOBAL_PICKLIST_ID}`,
  );
  const gpl = res.global_picklists[0];
  if (!gpl) throw new Error(`Global picklist ${GLOBAL_PICKLIST_ID} not found`);

  console.log(`Global picklist: ${gpl.display_label} (${gpl.pick_list_values.length} waardes)`);
  console.log(`Targets: ${wanted.join(", ")}\n`);

  const changes: { id: string; display: string; from: string; to: string }[] = [];
  for (const display of wanted) {
    const entry = gpl.pick_list_values.find((v) => v.display_value === display);
    if (!entry) {
      console.log(`  ! ${display}: niet gevonden in picklist, skip`);
      continue;
    }
    if (entry.actual_value === display) {
      console.log(`  = ${display}: actual_value al gelijk (${entry.actual_value}), skip`);
      continue;
    }
    changes.push({ id: entry.id!, display, from: entry.actual_value, to: display });
    console.log(`  • ${display.padEnd(15)} actual: "${entry.actual_value}" → "${display}"`);
  }
  if (changes.length === 0) {
    console.log("Niets te doen.");
    return;
  }

  if (!apply) {
    console.log("\n(dry run — geen wijziging; gebruik `apply` om te committen)");
    return;
  }

  // Build merged payload — keep every existing value, change actual_value
  // on the targeted ids only. Picklist id stays intact → record references
  // travel with the rename.
  const changeMap = new Map(changes.map((c) => [c.id, c.to]));
  const merged: PicklistValue[] = gpl.pick_list_values.map((v) => ({
    display_value: v.display_value,
    actual_value: changeMap.has(v.id!) ? changeMap.get(v.id!)! : v.actual_value,
    sequence_number: v.sequence_number,
    id: v.id,
  }));

  const patchRes = await zoho.request<unknown>(`/settings/global_picklists/${GLOBAL_PICKLIST_ID}`, {
    method: "PATCH",
    body: JSON.stringify({ global_picklists: [{ pick_list_values: merged }] }),
  });
  console.log("\nZoho response:", JSON.stringify(patchRes));

  // Verify
  const after = await zoho.request<{ global_picklists: GlobalPicklist[] }>(
    `/settings/global_picklists/${GLOBAL_PICKLIST_ID}`,
  );
  console.log("\nVerificatie:");
  for (const c of changes) {
    const entry = after.global_picklists[0]?.pick_list_values.find((v) => v.id === c.id);
    const ok = entry?.actual_value === c.to;
    console.log(`  ${ok ? "✓" : "✗"} ${c.display}: actual_value = "${entry?.actual_value}"`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
