/**
 * Sync Zoho module metadata (fields, picklists, lookups, formulas) into
 * `data/zoho/<module>.json`. Run this whenever Zoho-side modules change so
 * the typed code stays in sync.
 *
 *   npx tsx src/scripts/sync-metadata.ts
 *   npx tsx src/scripts/sync-metadata.ts Voorinspecties Planningen
 */

import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { ZohoClient } from "../zoho/client.js";
import { MODULES } from "../zoho/modules.js";

const OUT_DIR = resolve(process.cwd(), "data/zoho");

interface FieldMeta {
  api_name: string;
  field_label: string;
  data_type: string;
  read_only: boolean;
  system_mandatory: boolean;
  pick_list_values?: { display_value: string; actual_value: string }[];
  lookup?: { module?: { api_name?: string } };
  formula?: { return_type?: string; expression?: string };
  auto_number?: { prefix?: string; suffix?: string };
}

interface FieldsResponse {
  fields: FieldMeta[];
}

interface ModuleInfoResponse {
  modules: {
    api_name: string;
    plural_label: string;
    singular_label: string;
    isBlueprintSupported: boolean;
    generated_type: string;
    sequence_number: number;
  }[];
}

async function syncModule(zoho: ZohoClient, apiName: string) {
  const [info, fields] = await Promise.all([
    zoho.request<ModuleInfoResponse>(`/settings/modules/${apiName}`),
    zoho.request<FieldsResponse>(`/settings/fields`, { query: { module: apiName } }),
  ]);

  const mod = info.modules[0];
  const slim = {
    api_name: apiName,
    plural_label: mod?.plural_label,
    singular_label: mod?.singular_label,
    isBlueprintSupported: mod?.isBlueprintSupported,
    generated_type: mod?.generated_type,
    fields: fields.fields.map((f) => ({
      api_name: f.api_name,
      label: f.field_label,
      type: f.data_type,
      read_only: f.read_only,
      required: f.system_mandatory,
      picklist: f.pick_list_values?.map((p) => p.actual_value) ?? undefined,
      lookup_module: f.lookup?.module?.api_name,
      formula: f.formula?.expression ? true : undefined,
      autonumber_prefix: f.auto_number?.prefix,
    })),
  };

  const path = resolve(OUT_DIR, `${apiName}.json`);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, JSON.stringify(slim, null, 2) + "\n", "utf8");
  return { apiName, fieldCount: slim.fields.length };
}

async function main() {
  const filter = process.argv.slice(2);
  const all = Object.keys(MODULES);
  const targets = filter.length > 0 ? filter : all;

  const zoho = new ZohoClient();
  for (const m of targets) {
    try {
      const r = await syncModule(zoho, m);
      console.log(`✓ ${r.apiName} (${r.fieldCount} fields)`);
    } catch (err) {
      console.error(`✗ ${m}: ${(err as Error).message}`);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
