// app/api/todo/[id]/resolve/route.ts
import { NextResponse } from "next/server";
import * as tasksRepo from "@/src/repo/tasks";

export const runtime = "nodejs";

export async function POST(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await ctx.params;
  try {
    await tasksRepo.markResolved(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ ok: false, error: (err as Error).message }, { status: 500 });
  }
}
