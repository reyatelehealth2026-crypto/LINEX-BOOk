import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { createRateLimiter, getClientIp } from "@/lib/rate-limit";

const _limiter = createRateLimiter(10, 60 * 1000);

// POST /api/lookup-shop-by-email  { email }  → { slug }
// Does NOT confirm whether the email exists (returns same 404 shape either
// way) but helps a real owner find their shop slug when they forgot it.
export async function POST(req: NextRequest) {
  const { allowed } = _limiter.check(getClientIp(req));
  if (!allowed) return NextResponse.json({ error: "rate_limited" }, { status: 429 });

  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "invalid_json" }, { status: 400 }); }
  const email = String(body?.email ?? "").toLowerCase().trim();
  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "invalid_email" }, { status: 400 });
  }

  const db = supabaseAdmin();
  const { data } = await db
    .from("admin_users")
    .select("shop_id, shops(slug)")
    .eq("email", email)
    .eq("active", true)
    .limit(1)
    .maybeSingle();

  const slug = (data as any)?.shops?.slug;
  if (!slug) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ slug });
}
