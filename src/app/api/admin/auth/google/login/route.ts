import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin, getCurrentShop } from "@/lib/supabase";
import {
  ADMIN_SESSION_COOKIE,
  ADMIN_SESSION_TTL_SEC,
  issueAdminSession,
} from "@/lib/admin-session-token";

// POST /api/admin/auth/google/login
// body: { access_token: string }   // Supabase session.access_token from Google OAuth
//
// Flow (called from /admin/auth/google/callback on the tenant subdomain):
//   1) Resolve current shop from subdomain.
//   2) Validate the Supabase JWT via supabaseAdmin().auth.getUser(jwt) → uuid.
//   3) Look up admin_users WHERE auth_user_id = uuid AND shop_id = currentShop.
//   4) If found, plant httpOnly `admin_session` cookie (30 days, host-only).
export async function POST(req: NextRequest) {
  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "invalid_json" }, { status: 400 }); }
  const accessToken = String(body?.access_token ?? "");
  if (!accessToken) return NextResponse.json({ error: "missing_access_token" }, { status: 400 });

  let shop;
  try { shop = await getCurrentShop(); }
  catch { return NextResponse.json({ error: "shop_not_resolved" }, { status: 400 }); }

  const db = supabaseAdmin();

  const { data: userRes, error: userErr } = await db.auth.getUser(accessToken);
  if (userErr || !userRes?.user) {
    return NextResponse.json({ error: "invalid_google_session" }, { status: 401 });
  }
  const authUid = userRes.user.id;

  const { data: admin } = await db
    .from("admin_users")
    .select("id, role")
    .eq("auth_user_id", authUid)
    .eq("shop_id", shop.id)
    .eq("active", true)
    .maybeSingle();

  if (!admin) {
    return NextResponse.json({ error: "no_admin_for_google_account" }, { status: 403 });
  }

  const res = NextResponse.json({ ok: true, role: admin.role });
  const sessionToken = issueAdminSession(admin.id, shop.id);
  res.cookies.set(ADMIN_SESSION_COOKIE, sessionToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ADMIN_SESSION_TTL_SEC,
  });
  return res;
}
