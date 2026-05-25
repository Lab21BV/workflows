"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db, schema } from "@/src/db";

export async function setManager(employeeId: string, managerId: string | null) {
  if (!employeeId) throw new Error("employeeId is required");
  await db
    .update(schema.employees)
    .set({ managerId: managerId || null, updatedAt: new Date() })
    .where(eq(schema.employees.id, employeeId));
  revalidatePath("/medewerkers");
}

export async function toggleActive(employeeId: string, active: boolean) {
  if (!employeeId) throw new Error("employeeId is required");
  await db
    .update(schema.employees)
    .set({ active, updatedAt: new Date() })
    .where(eq(schema.employees.id, employeeId));
  revalidatePath("/medewerkers");
}

export async function addDelegation(formData: FormData) {
  const fromAmId = String(formData.get("from_am_id") ?? "");
  const toAmId = String(formData.get("to_am_id") ?? "");
  const validFrom = String(formData.get("valid_from") ?? "");
  const validUntil = String(formData.get("valid_until") ?? "");
  const reason = String(formData.get("reason") ?? "");
  if (!fromAmId || !toAmId) throw new Error("Beide AMs zijn verplicht");
  if (!validFrom || !validUntil) throw new Error("Begin- en einddatum zijn verplicht");
  if (fromAmId === toAmId) throw new Error("Van-AM en naar-AM moeten verschillen");
  if (validFrom > validUntil) throw new Error("Einddatum mag niet vóór startdatum liggen");
  await db.insert(schema.delegations).values({
    fromAmId,
    toAmId,
    validFrom,
    validUntil,
    reason: reason || null,
  });
  revalidatePath("/medewerkers");
}

export async function deleteDelegation(id: string) {
  if (!id) throw new Error("Delegation id is required");
  await db.delete(schema.delegations).where(eq(schema.delegations.id, id));
  revalidatePath("/medewerkers");
}
