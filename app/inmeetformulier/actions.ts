"use server";

import { z } from "zod";
import { inmeetFormSchema } from "@/src/data/inmeet-form-schema";
import { persistAndPush } from "@/src/repo/inmeet";

const submitInputSchema = z
  .object({ zohoOrderId: z.string().min(1, "Order-id ontbreekt in URL") })
  .and(inmeetFormSchema);

export type SubmitResult =
  | { ok: true; submissionId: string; datumsId: string | null }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

export async function submitInmeet(
  zohoOrderId: string,
  data: unknown,
): Promise<SubmitResult> {
  const parsed = submitInputSchema.safeParse({ zohoOrderId, ...(data as object) });
  if (!parsed.success) {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path.join(".") || "_root";
      (fieldErrors[key] ||= []).push(issue.message);
    }
    return { ok: false, error: "Validatie mislukt", fieldErrors };
  }
  try {
    const { zohoOrderId: orderId, ...form } = parsed.data;
    const result = await persistAndPush(orderId, form);
    return { ok: true, submissionId: result.submissionId, datumsId: result.datumsId };
  } catch (err) {
    return { ok: false, error: (err as Error).message || "Opslaan mislukt" };
  }
}
