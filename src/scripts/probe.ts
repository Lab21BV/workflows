/**
 * Probe script — inspects a Zoho module's fields/layout so we can write
 * accurate types and workflow code. Usage:
 *
 *   pnpm zoho:probe Voorinspecties
 *   pnpm zoho:probe Planningen
 */

import { ZohoClient } from "../zoho/client";

async function main() {
  const module = process.argv[2];
  if (!module) {
    console.error("usage: tsx src/scripts/probe.ts <ModuleApiName>");
    process.exit(2);
  }
  const zoho = new ZohoClient();
  const fields = await zoho.request<{ fields: unknown[] }>(`/settings/fields`, {
    query: { module },
  });
  console.log(JSON.stringify(fields, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
