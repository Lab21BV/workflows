/**
 * Order → Accountmanager assignment helpers.
 *
 * Twee primaires functies:
 *   1. getEffectiveManagerFor(verkoperId, datum)
 *      → wie is de AM voor deze verkoper op deze datum (rekening houdend met delegaties)
 *   2. snapshotOrderAssignment(zohoOrderId, verkoperId)
 *      → schrijf de AM-keuze als snapshot bij order-creatie (idempotent op zohoOrderId)
 *
 * Na de snapshot beweegt de assignment niet meer, ook al wisselt de verkoper later van AM.
 */

import { and, eq, gte, lte } from "drizzle-orm";
import { db, schema } from "@/src/db";

/**
 * Bepaal welke AM voor verkoper `verkoperId` actief is op `datum`.
 * Houdt rekening met:
 *   - employees.manager_id (de default AM voor deze verkoper)
 *   - actieve delegaties (vakantie etc.) waarin de default AM tijdelijk vervangen is
 * @returns De effectieve AM `Employee` row, of null als de verkoper geen default AM heeft.
 */
export async function getEffectiveManagerFor(
  verkoperId: string,
  datum: Date = new Date(),
): Promise<typeof schema.employees.$inferSelect | null> {
  const [verkoper] = await db
    .select()
    .from(schema.employees)
    .where(eq(schema.employees.id, verkoperId))
    .limit(1);
  if (!verkoper) throw new Error(`Verkoper ${verkoperId} niet gevonden`);
  if (!verkoper.managerId) return null;

  const isoDatum = datum.toISOString().slice(0, 10); // YYYY-MM-DD

  const [delegation] = await db
    .select()
    .from(schema.delegations)
    .where(
      and(
        eq(schema.delegations.fromAmId, verkoper.managerId),
        lte(schema.delegations.validFrom, isoDatum),
        gte(schema.delegations.validUntil, isoDatum),
      ),
    )
    .limit(1);

  const effectiveAmId = delegation ? delegation.toAmId : verkoper.managerId;
  const [am] = await db
    .select()
    .from(schema.employees)
    .where(eq(schema.employees.id, effectiveAmId))
    .limit(1);
  return am ?? null;
}

/**
 * Schrijf een onveranderlijke order→AM koppeling weg. Idempotent: als de
 * `zohoOrderId` al bestaat, returnt de bestaande row zonder iets te wijzigen.
 *
 * Roep dit aan op het moment dat een verkoper een nieuwe Sales_Order aanmaakt
 * in Zoho — geef de Zoho-order-id terug en deze functie bevriest de toewijzing.
 *
 * Concurrency-noot: tussen de SELECT op `existing` en de INSERT zit een venster
 * waarin twee parallelle calls beiden de SELECT als leeg zien en beiden willen
 * inserten. De UNIQUE-constraint op `zoho_order_id` (zie schema.ts) blokkeert
 * de tweede insert met een error — die kan de caller retryen, wat dan de
 * "existing" branch raakt. Voor LAB21-scale prima; bij hogere volumes
 * wrap deze functie in een `db.transaction()` met `serializable` isolation.
 */
export async function snapshotOrderAssignment(input: {
  zohoOrderId: string;
  verkoperId: string;
  datum?: Date;
}): Promise<typeof schema.orderAssignments.$inferSelect> {
  const datum = input.datum ?? new Date();

  // Idempotency check
  const [existing] = await db
    .select()
    .from(schema.orderAssignments)
    .where(eq(schema.orderAssignments.zohoOrderId, input.zohoOrderId))
    .limit(1);
  if (existing) return existing;

  const am = await getEffectiveManagerFor(input.verkoperId, datum);
  if (!am) {
    throw new Error(
      `Geen effectieve AM voor verkoper ${input.verkoperId} — eerst manager_id zetten`,
    );
  }

  const [inserted] = await db
    .insert(schema.orderAssignments)
    .values({
      zohoOrderId: input.zohoOrderId,
      verkoperId: input.verkoperId,
      accountmanagerId: am.id,
      snapshottedAt: datum,
    })
    .returning();
  return inserted!;
}

/**
 * Lookup welke AM op een specifieke Sales_Order zit.
 * @returns null als de order nooit gesnaphost is.
 */
export async function getAssignmentForOrder(
  zohoOrderId: string,
): Promise<typeof schema.orderAssignments.$inferSelect | null> {
  const [row] = await db
    .select()
    .from(schema.orderAssignments)
    .where(eq(schema.orderAssignments.zohoOrderId, zohoOrderId))
    .limit(1);
  return row ?? null;
}
