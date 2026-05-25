"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db, schema } from "@/src/db";

export async function setManager(employeeId: string, managerId: string | null) {
  await db
    .update(schema.employees)
    .set({ managerId: managerId || null, updatedAt: new Date() })
    .where(eq(schema.employees.id, employeeId));
  revalidatePath("/medewerkers");
}

export async function toggleActive(employeeId: string, active: boolean) {
  await db
    .update(schema.employees)
    .set({ active, updatedAt: new Date() })
    .where(eq(schema.employees.id, employeeId));
  revalidatePath("/medewerkers");
}

export async function addDelegation(formData: FormData) {
  const fromAmId = String(formData.get("from_am_id"));
  const toAmId = String(formData.get("to_am_id"));
  const validFrom = String(formData.get("valid_from"));
  const validUntil = String(formData.get("valid_until"));
  const reason = String(formData.get("reason") || "");
  if (!fromAmId || !toAmId || !validFrom || !validUntil) return;
  if (fromAmId === toAmId) return;
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
  await db.delete(schema.delegations).where(eq(schema.delegations.id, id));
  revalidatePath("/medewerkers");
}
