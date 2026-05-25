import type { NextRequest } from "next/server";

/**
 * Cron endpoint auth check, shared across alle /api/cron/* routes.
 *
 * Verwacht header `Authorization: Bearer ${CRON_SECRET}`. Als CRON_SECRET
 * niet gezet is (dev) returnt true — handig voor lokaal draaien zonder
 * een geheim te genereren.
 */
export function isCronAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  return req.headers.get("authorization") === `Bearer ${secret}`;
}
