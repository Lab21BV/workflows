import { ZohoClient } from "../zoho/client";

async function main() {
  const z = new ZohoClient();
  const r = await z.request<{ workflow_rules?: any[] }>(
    "/settings/automation/workflow_rules",
  );
  const rules = r.workflow_rules ?? [];

  const byModule = new Map<string, any[]>();
  for (const w of rules) {
    const mod = w.module?.api_name ?? String(w.module ?? "?");
    if (!byModule.has(mod)) byModule.set(mod, []);
    byModule.get(mod)!.push(w);
  }

  const modules = [...byModule.keys()].sort();
  console.log(`# ${rules.length} workflow rules across ${modules.length} modules\n`);

  for (const mod of modules) {
    const items = byModule.get(mod)!;
    console.log(`\n## ${mod}  (${items.length})`);
    for (const w of items) {
      console.log(`- ${w.name}${w.active === false ? "  [INACTIVE]" : ""}`);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
