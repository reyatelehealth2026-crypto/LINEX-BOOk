import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifySuperAdmin, issueImpersonationToken } from "@/lib/super-admin-auth";

// POST /api/super/shops/[id]/impersonate
// Returns a short-lived signed token + the target URL the super admin should
// follow. On the subdomain, /admin/impersonate redeems the token into a
// regular admin session (cookie set on that subdomain).
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const me = await verifySuperAdmin(req);
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const shopId = Number(id);
  if (!Number.isFinite(shopId)) return NextResponse.json({ error: "bad_id" }, { status: 400 });

  const db = supabaseAdmin();
  const { data: shop } = await db.from("shops").select("id, slug").eq("id", shopId).maybeSingle();
  if (!shop) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const token = issueImpersonationToken(me.id, shopId, 120);

  const rootDomain = (process.env.ROOT_DOMAIN ?? "จองคิว.net").toLowerCase();
  const proto = rootDomain === "localhost" ? "http" : "https";
  const port = rootDomain === "localhost" ? ":3000" : "";
  const url = `${proto}://${shop.slug}.${rootDomain}${port}/admin/impersonate?token=${encodeURIComponent(token)}`;

  return NextResponse.json({ token, url });
}
