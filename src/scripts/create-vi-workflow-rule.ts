/**
 * One-off script: create the Zoho workflow rule + webhook that triggers
 * LAB21 Operations when relevant Voorinspectie fields change.
 *
 * Usage:
 *   npm run zoho:create-vi-workflow-rule           # dry run
 *   npm run zoho:create-vi-workflow-rule -- apply  # actually create
 */

import { ZohoClient } from "../zoho/client";

const ENDPOINT_URL = "https://lab21-operations.vercel.app/api/webhooks/zoho";

async function main() {
  const apply = process.argv.includes("apply");
  const z = new ZohoClient();
  const secret = process.env.ZOHO_WEBHOOK_SECRET;
  if (!secret) throw new Error("ZOHO_WEBHOOK_SECRET missing from env");

  // 1. Look up the current user (needed as webhook owner).
  const me = await z.request<{ users: { id: string; full_name: string }[] }>("/users", {
    query: { type: "CurrentUser" },
  });
  const userId = me.users[0]!.id;
  console.log(`Current user: ${me.users[0]!.full_name} (${userId})\n`);

  // 2. Look up the Voorinspecties module + the 4 trigger fields.
  const f = await z.request<{ fields: { id: string; api_name: string }[] }>("/settings/fields", {
    query: { module: "Voorinspecties" },
  });
  const triggers = [
    "VI_Voorstel_Status",
    "VI_Branch_Gekozen",
    "VI_Tegenpartij_Reactie",
    "VI_Nieuwe_Leverdatum_Voorstel",
  ];
  const triggerFields = triggers.map((n) => {
    const found = f.fields.find((x) => x.api_name === n);
    if (!found) throw new Error(`Trigger field not found: ${n}`);
    return { api_name: n, id: found.id };
  });

  console.log("Trigger fields:");
  for (const t of triggerFields) console.log(`  - ${t.api_name} (id=${t.id})`);
  console.log();

  if (!apply) {
    console.log("Dry run. Re-run with: npm run zoho:create-vi-workflow-rule -- apply");
    return;
  }

  // 3. Create the webhook.
  const webhookBody = {
    webhooks: [
      {
        name: "LAB21 VI Reschedule",
        description: "Triggers LAB21 Operations orchestrator on Voorinspectie field updates",
        url: ENDPOINT_URL,
        method: "POST",
        type: "json",
        user: { id: userId },
        module: { api_name: "Voorinspecties" },
        body_parameters: [{ key: "voorinspectieId", value: "${Voorinspecties.id}" }],
        custom_headers: [
          { key: "Authorization", value: `Bearer ${secret}` },
          { key: "x-workflow", value: "vi-reschedule" },
        ],
      },
    ],
  };

  console.log("Creating webhook…");
  const wRes = await z.request<{
    webhooks: { code: string; status: string; details?: { id: string } }[];
  }>("/settings/webhooks", {
    method: "POST",
    body: JSON.stringify(webhookBody),
  });
  console.log("Webhook response:", JSON.stringify(wRes, null, 2));

  const webhookId = wRes.webhooks?.[0]?.details?.id;
  if (!webhookId) {
    console.error("Webhook creation did not return an id. Aborting before workflow-rule creation.");
    return;
  }
  console.log(`✓ Webhook created (id=${webhookId})\n`);

  // 4. Create the workflow rule.
  const ruleBody = {
    workflow_rules: [
      {
        name: "LAB21 — VI Reschedule webhook",
        description: "Fires LAB21 Operations on VI Voorstel/Branch/Tegenpartij/Leverdatum changes",
        module: { api_name: "Voorinspecties" },
        execute_when: {
          type: "field_update",
          details: { fields: triggerFields.map((t) => ({ api_name: t.api_name, id: t.id })) },
        },
        conditions: [
          {
            sequence_number: 1,
            criteria_details: null,
            instant_actions: {
              actions: [{ type: "webhook", id: webhookId }],
            },
            scheduled_actions: null,
          },
        ],
        active: true,
      },
    ],
  };

  console.log("Creating workflow rule…");
  const rRes = await z.request<{
    workflow_rules: { code: string; status: string; details?: { id: string } }[];
  }>("/settings/automation/workflow_rules", {
    method: "POST",
    body: JSON.stringify(ruleBody),
  });
  console.log("Workflow rule response:", JSON.stringify(rRes, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
