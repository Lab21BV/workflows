import { NextRequest, NextResponse } from "next/server";
import { listApproved } from "@/src/repo/inmeet";

export const runtime = "nodejs";

/**
 * GET /api/inmeetformulier?aannemerId=<uuid>
 *
 * Read-API voor aannemerportal: levert AM-goedgekeurde inmeetformulieren,
 * optioneel gefilterd op aannemer. Bearer-auth via INMEET_API_SECRET.
 */

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.INMEET_API_SECRET;
  if (!secret) return true;
  const auth = req.headers.get("authorization") ?? "";
  return auth === `Bearer ${secret}`;
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const aannemerId = req.nextUrl.searchParams.get("aannemerId") ?? undefined;
  try {
    const items = await listApproved({ aannemerId });
    return NextResponse.json({
      items: items.map((s) => ({
        id: s.id,
        zohoOrderId: s.zohoOrderId,
        payload: s.payload,
        amNotitie: s.amNotitie,
        amCheckedAt: s.amCheckedAt,
        aannemerId: s.aannemerId,
        submittedAt: s.submittedAt,
      })),
    });
  } catch (err) {
    return NextResponse.json(
      { error: "internal_error", message: (err as Error).message },
      { status: 500 },
    );
  }
}
