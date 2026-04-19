import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Used by the /liff/admin layout to check if the currently-logged-in LINE
 * user is an admin. Client passes `x-line-id-token` header. Returns the
 * admin identity if ok, or 401.
 */
export async function GET(req: NextRequest) {
  const id = await verifyAdmin(req);
  if (!id) return NextResponse.json({ ok: false }, { status: 401 });
  return NextResponse.json({ ok: true, identity: id });
}
