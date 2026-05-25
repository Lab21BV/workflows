/**
 * Idempotent seed van `employees` met de bekende LAB21-medewerkers.
 *
 * Bron: de 14 users uit de Zoho /users-call van 2026-05-25.
 * - Skipt Zoho Support / Developer test accounts
 * - manager_id blijft null — wire die later in /medewerkers UI
 *
 * Usage:
 *   npx tsx --env-file=.env.local src/scripts/seed-employees.ts        # dry-run
 *   npx tsx --env-file=.env.local src/scripts/seed-employees.ts apply  # commit
 */

import { db, schema } from "../db";
import { eq } from "drizzle-orm";

interface SeedRow {
  email: string;
  naam: string;
  functie: string;
  vestiging: string | null;
  active: boolean;
}

const SEED: SeedRow[] = [
  { email: "victor.weng@lab21.nl",       naam: "Victor Weng",       functie: "Accountmanager",      vestiging: "Amersfoort",  active: true },
  { email: "paul@lab21.nl",              naam: "Paul Kerkum",       functie: "Verkoper",            vestiging: "Amersfoort",  active: true },
  { email: "quyen@lab21.nl",             naam: "Quyen Le",          functie: "Onbekend",            vestiging: null,          active: false },
  { email: "giang@lab21.nl",             naam: "Giang Quach",       functie: "Verkoper",            vestiging: "Amersfoort",  active: false },
  { email: "monique@lab21.nl",           naam: "Monique Willemsen", functie: "Verkoper",            vestiging: "Amersfoort",  active: false },
  { email: "martin@lab21.nl",            naam: "Martin Thiewes",    functie: "Verkoper",            vestiging: null,          active: false },
  { email: "wim@lab21.nl",               naam: "Wim Pijper",        functie: "Accountmanager",      vestiging: "Amersfoort",  active: false },
  { email: "michelle.he@xcxinternational.com", naam: "Michelle He", functie: "Onbekend",            vestiging: null,          active: false },
  { email: "jermy@lab21.nl",             naam: "Jermy Hagebeuk",    functie: "Accountmanager",      vestiging: "Amersfoort",  active: false },
  { email: "john.nobel@lab21.nl",        naam: "John Nobel",        functie: "Accountmanager",      vestiging: "Amersfoort",  active: false },
  { email: "vincent.wilken@lab21.nl",    naam: "Vincent Wilken",    functie: "Inkoop en Planning",  vestiging: null,          active: false },
];

async function main() {
  const apply = process.argv.includes("apply");

  type Plan = { action: "insert" | "update" | "skip"; reason: string; row: SeedRow };
  const plans: Plan[] = [];

  for (const row of SEED) {
    const existing = await db
      .select()
      .from(schema.employees)
      .where(eq(schema.employees.email, row.email))
      .limit(1);
    if (existing.length === 0) {
      plans.push({ action: "insert", reason: "new", row });
    } else {
      const e = existing[0]!;
      const diff: string[] = [];
      if (e.naam !== row.naam) diff.push("naam");
      if (e.functie !== row.functie) diff.push("functie");
      if (e.vestiging !== row.vestiging) diff.push("vestiging");
      if (e.active !== row.active) diff.push("active");
      if (diff.length > 0) plans.push({ action: "update", reason: `diff:${diff.join(",")}`, row });
      else plans.push({ action: "skip", reason: "unchanged", row });
    }
  }

  console.log(`Plan voor ${plans.length} medewerkers:`);
  for (const p of plans) {
    console.log(
      `  ${p.action.padEnd(7)} ${p.row.naam.padEnd(22)} ${p.row.functie.padEnd(22)} ${p.row.active ? "active" : "disabled"} (${p.reason})`,
    );
  }

  if (!apply) {
    console.log("\n(dry run — gebruik `apply` om te committen)");
    return;
  }

  let inserted = 0;
  let updated = 0;
  for (const p of plans) {
    if (p.action === "insert") {
      await db.insert(schema.employees).values(p.row);
      inserted++;
    } else if (p.action === "update") {
      await db
        .update(schema.employees)
        .set({ ...p.row, updatedAt: new Date() })
        .where(eq(schema.employees.email, p.row.email));
      updated++;
    }
  }
  console.log(`\nKlaar: ${inserted} inserted, ${updated} updated, ${plans.length - inserted - updated} unchanged.`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
