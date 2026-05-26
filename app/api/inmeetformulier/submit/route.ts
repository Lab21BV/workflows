import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { inmeetFormSchema } from "@/src/data/inmeet-form-schema";
import { persistAndPush } from "@/src/repo/inmeet";

export const runtime = "nodejs";

/**
 * Externe submit-endpoint voor klantenportal: klant vult formulier daar in,
 * portal POST't naar dit endpoint. Bearer-auth via INMEET_API_SECRET zodat
 * derden niet zomaar kunnen submitten.
 */

const requestSchema = z
  .object({ zohoOrderId: z.string().min(1) })
  .and(inmeetFormSchema);

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.INMEET_API_SECRET;
  if (!secret) return true; // dev / lokaal — geen secret = open
  const auth = req.headers.get("authorization") ?? "";
  return auth === `Bearer ${secret}`;
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "validation_failed",
        issues: parsed.error.issues.map((i) => ({
          path: i.path.join("."),
          message: i.message,
        })),
      },
      { status: 422 },
    );
  }
  const { zohoOrderId, ...form } = parsed.data;
  try {
    const result = await persistAndPush(zohoOrderId, form);
    return NextResponse.json({
      ok: true,
      submissionId: result.submissionId,
      zohoDatumsId: result.datumsId,
    });
  } catch (err) {
    console.error("inmeetformulier submit failed", err);
    return NextResponse.json(
      { error: "internal_error", message: (err as Error).message },
      { status: 500 },
    );
  }
}
