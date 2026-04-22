import { NextRequest, NextResponse } from "next/server";
import { getCurrentShop } from "@/lib/supabase";
import {
  verifyImpersonationToken,
  issueImpersonationSession,
  IMPERSONATION_COOKIE,
} from "@/lib/impersonation-token";

// POST /api/admin/impersonate/redeem  { token }
// Called on the tenant subdomain after a super-admin follows the impersonate
// URL. Verifies the short-lived token, then sets a subdomain-scoped cookie
// that verifyAdmin() accepts. The cookie is httpOnly; the AdminContext
// sessionStorage value is set client-side as a UI marker only.
export async function POST(req: NextRequest) {
  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "invalid_json" }, { status: 400 }); }
  const token = String(body?.token ?? "");
  if (!token) return NextResponse.json({ error: "missing_token" }, { status: 400 });

  const imp = verifyImpersonationToken(token);
  if (!imp) return NextResponse.json({ error: "invalid_token" }, { status: 401 });

  const shop = await getCurrentShop();
  if (imp.shopId !== shop.id) return NextResponse.json({ error: "shop_mismatch" }, { status: 403 });

  const res = NextResponse.json({ ok: true });
  const sessionToken = issueImpersonationSession(imp.superAdminId, shop.id, 60 * 30);
  res.cookies.set(IMPERSONATION_COOKIE, sessionToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 30,
  });
  return res;
}
