import { NextRequest, NextResponse } from "next/server";
import { verifySuperAdmin } from "@/lib/super-admin-auth";

export async function GET(req: NextRequest) {
  const me = await verifySuperAdmin(req);
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return NextResponse.json({ id: me.id, email: me.email, displayName: me.displayName, lineUserId: me.lineUserId });
}
