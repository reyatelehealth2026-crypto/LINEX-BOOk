import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifySuperAdmin } from "@/lib/super-admin-auth";

// GET /api/super/shops — list every shop with a few useful columns.
export async function GET(req: NextRequest) {
  const me = await verifySuperAdmin(req);
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const db = supabaseAdmin();
  const { data, error } = await db
    .from("shops")
    .select(
      "id, slug, name, timezone, phone, address, logo_url, business_type, " +
      "onboarding_status, line_oa_id, liff_id, " +
      "line_channel_access_token, line_channel_secret, created_by_line_id",
    )
    .order("id", { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = (data ?? []).map((s: any) => ({
    id: s.id,
    slug: s.slug,
    name: s.name,
    timezone: s.timezone,
    phone: s.phone,
    address: s.address,
    logo_url: s.logo_url,
    business_type: s.business_type,
    onboarding_status: s.onboarding_status,
    line_oa_id: s.line_oa_id,
    liff_id: s.liff_id,
    has_access_token: !!s.line_channel_access_token,
    has_channel_secret: !!s.line_channel_secret,
    created_by_line_id: s.created_by_line_id,
  }));
  return NextResponse.json({ shops: rows });
}
