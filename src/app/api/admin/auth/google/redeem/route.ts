import { NextRequest, NextResponse } from "next/server";
import { getCurrentShop } from "@/lib/supabase";
import {
  ADMIN_SESSION_COOKIE,
  ADMIN_SESSION_TTL_SEC,
  issueAdminSession,
  verifyAdminSession,
} from "@/lib/admin-session-token";

// POST /api/admin/auth/google/redeem
// body: { token: string }   // one-time `admin_bootstrap` token from /signup
//
// After /api/signup/create succeeds it returns a redirectUrl that points the
// shop owner at <slug>.<root>/admin/auth/google/redeem?token=... — the page
// posts here so the cookie is planted host-only on the tenant subdomain
// (the signup browser session lives on root domain and can't share it).
export async function POST(req: NextRequest) {
  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "invalid_json" }, { status: 400 }); }
  const token = String(body?.token ?? "");
  if (!token) return NextResponse.json({ error: "missing_token" }, { status: 400 });

  const decoded = verifyAdminSession(token);
  if (!decoded) return NextResponse.json({ error: "invalid_or_expired_token" }, { status: 401 });

  const shop = await getCurrentShop();
  if (decoded.shopId !== shop.id) return NextResponse.json({ error: "shop_mismatch" }, { status: 403 });

  const res = NextResponse.json({ ok: true });
  const sessionToken = issueAdminSession(decoded.adminUserId, shop.id);
  res.cookies.set(ADMIN_SESSION_COOKIE, sessionToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ADMIN_SESSION_TTL_SEC,
  });
  return res;
}
