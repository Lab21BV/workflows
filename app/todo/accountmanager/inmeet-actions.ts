"use server";

import { revalidatePath } from "next/cache";
import { setAmDecision } from "@/src/repo/inmeet";

export async function approveInmeet(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const aannemerId = String(formData.get("aannemerId") ?? "") || undefined;
  const amNotitie = String(formData.get("amNotitie") ?? "") || undefined;
  if (!id) throw new Error("Submission-id ontbreekt");
  await setAmDecision(id, "am_approved", { aannemerId, amNotitie });
  revalidatePath("/todo/accountmanager");
}

export async function rejectInmeet(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const amNotitie = String(formData.get("amNotitie") ?? "") || undefined;
  if (!id) throw new Error("Submission-id ontbreekt");
  await setAmDecision(id, "am_rejected", { amNotitie });
  revalidatePath("/todo/accountmanager");
}
