/**
 * One-off end-to-end test: populate fictitious data on Voorinspectie Victor,
 * trigger the workflow, verify the orchestrator wrote the expected outcomes,
 * then reset everything.
 *
 * Usage: tsx src/scripts/e2e-vi-test.ts
 */

import { ZohoClient } from "../zoho/client";

const VI_ID = "728921000040176171"; // Voorinspectie Victor (test record)

async function main() {
  const z = new ZohoClient();

  console.log("[1] Find a Sales_Order with Leverdatum + Products with Levertijd_in_dagen…");
  const so = await findGoodSalesOrder(z);
  if (!so) {
    console.error("No suitable Sales_Order found. Aborting.");
    return;
  }
  console.log(`    ✓ ${so.id} | Leverdatum=${so.Leverdatum} | langste Levertijd=${so.maxLT} | buffer=${7 + so.maxLT}`);

  // Pick a VI date that puts gap COMFORTABLY larger than buffer → expect "buffer ok"
  const gap = 7 + so.maxLT + 14;  // 14 days of slack
  const viDate = isoDate(addDays(parseDate(so.Leverdatum), -gap));
  console.log(`    → test VI_Voorgestelde_Datum=${viDate} (gap=${gap} days, buffer=${7 + so.maxLT})`);

  // Snapshot current state for reset
  console.log("\n[2] Snapshot current VI state…");
  const before = await getVI(z);
  console.log("    " + JSON.stringify(stateView(before)));

  console.log("\n[3] Populate test data + trigger…");
  await z.request("/Voorinspecties", {
    method: "PUT",
    body: JSON.stringify({
      data: [{
        id: VI_ID,
        Verkooporders: so.id,
        VI_Voorgestelde_Datum: viDate,
        VI_Voorgesteld_Door: "aannemer",
        VI_Voorstel_Status: "awaiting_evaluation",
      }],
      trigger: ["workflow"],
    }),
  });
  console.log("    ✓ PUT done");

  console.log("\n[4] Wait 8s for webhook → orchestrator → Zoho write…");
  await new Promise((r) => setTimeout(r, 8000));

  console.log("\n[5] Read back VI state:");
  const after = await getVI(z);
  console.log("    " + JSON.stringify(stateView(after), null, 2));

  console.log("\n[6] Expected: VI_Voorstel_Status='awaiting_tegenpartij', VI_Buffer_Snapshot_Dagen=" + (7 + so.maxLT));
  const ok =
    after.VI_Voorstel_Status === "awaiting_tegenpartij" &&
    after.VI_Buffer_Snapshot_Dagen === 7 + so.maxLT;
  console.log("    " + (ok ? "✓ MATCH — orchestrator deed het juiste" : "✗ MISMATCH — zie Vercel logs"));

  console.log("\n[7] Reset alles…");
  await z.request("/Voorinspecties", {
    method: "PUT",
    body: JSON.stringify({
      data: [{
        id: VI_ID,
        Verkooporders: before.Verkooporders?.id ?? null,
        VI_Voorgestelde_Datum: before.VI_Voorgestelde_Datum ?? null,
        VI_Voorgesteld_Door: before.VI_Voorgesteld_Door ?? null,
        VI_Voorstel_Status: before.VI_Voorstel_Status ?? null,
        VI_Buffer_Snapshot_Dagen: null,
      }],
      trigger: [],
    }),
  });
  console.log("    ✓ Reset done");
}

type SO = { id: string; Leverdatum: string; maxLT: number };

// Known test record: "Victor test vloerorder" — created 2026-05-23
// Has Ordered_Items + Verwachte_leverdatum populated.
const TEST_SO_ID = "728921000040157161";

async function findGoodSalesOrder(z: ZohoClient): Promise<SO | null> {
  const r = await z.request<{ data: any[] }>(`/Sales_Orders/${TEST_SO_ID}`, {
    query: { fields: "id,Due_Date,Verwachte_leverdatum,Ordered_Items" },
  });
  const so = r.data?.[0];
  if (!so) return null;
  const leverdatum = so.Due_Date ?? so.Verwachte_leverdatum;
  if (!leverdatum) {
    console.error(`Test SO ${TEST_SO_ID} has no leverdatum. Aborting.`);
    return null;
  }
  const items = Array.isArray(so.Ordered_Items) ? so.Ordered_Items : [];
  const productIds = items
    .map((d: any) => d.Product_Name?.id ?? d.product?.id)
    .filter(Boolean) as string[];
  const products = await Promise.all(
    productIds.slice(0, 5).map((id) =>
      z
        .request<{ data: any[] }>(`/Products/${id}`, { query: { fields: "id,Levertijd_in_dagen" } })
        .then((r) => r.data?.[0])
        .catch(() => null),
    ),
  );
  const lts = products.map((p) => p?.Levertijd_in_dagen ?? 0);
  return { id: so.id, Leverdatum: leverdatum, maxLT: Math.max(...lts, 0) };
}

async function getVI(z: ZohoClient) {
  const r = await z.request<{ data: any[] }>(
    `/Voorinspecties/${VI_ID}`,
    { query: { fields: "Verkooporders,VI_Voorgestelde_Datum,VI_Voorgesteld_Door,VI_Voorstel_Status,VI_Buffer_Snapshot_Dagen" } },
  );
  return r.data?.[0] ?? {};
}

function stateView(v: any) {
  return {
    Verkooporders: v.Verkooporders?.id ?? null,
    VI_Voorstel_Status: v.VI_Voorstel_Status ?? null,
    VI_Voorgestelde_Datum: v.VI_Voorgestelde_Datum ?? null,
    VI_Voorgesteld_Door: v.VI_Voorgesteld_Door ?? null,
    VI_Buffer_Snapshot_Dagen: v.VI_Buffer_Snapshot_Dagen ?? null,
  };
}

function parseDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map((s) => parseInt(s, 10));
  return new Date(Date.UTC(y!, m! - 1, d!));
}
function addDays(d: Date, n: number): Date {
  return new Date(d.getTime() + n * 86_400_000);
}
function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

main().catch((e) => {
  console.error("ERROR:", e instanceof Error ? e.message : e);
  process.exit(1);
});
