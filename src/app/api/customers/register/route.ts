import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin, SHOP_ID } from "@/lib/supabase";
import { getProfile } from "@/lib/line";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const { lineUserId, fullName, phone, birthday } = await req.json();
  if (!lineUserId || !fullName || !phone) {
    return NextResponse.json({ error: "lineUserId, fullName, phone required" }, { status: 400 });
  }

  const db = supabaseAdmin();

  // ensure row
  const { data: existing } = await db
    .from("customers")
    .select("id")
    .eq("shop_id", SHOP_ID)
    .eq("line_user_id", lineUserId)
    .maybeSingle();

  if (!existing) {
    const p = await getProfile(lineUserId);
    await db.from("customers").insert({
      shop_id: SHOP_ID,
      line_user_id: lineUserId,
      display_name: p?.displayName ?? null,
      picture_url: p?.pictureUrl ?? null
    });
  }

  const { data, error } = await db
    .from("customers")
    .update({
      full_name: fullName,
      phone,
      birthday: birthday || null,
      registered_at: new Date().toISOString(),
      points: existing ? undefined : 50 // welcome bonus on first registration
    })
    .eq("shop_id", SHOP_ID)
    .eq("line_user_id", lineUserId)
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ customer: data });
}

export async function GET(req: NextRequest) {
  const lineUserId = req.nextUrl.searchParams.get("line_user_id");
  if (!lineUserId) return NextResponse.json({ customer: null });
  const db = supabaseAdmin();
  const { data } = await db
    .from("customers")
    .select("*")
    .eq("shop_id", SHOP_ID)
    .eq("line_user_id", lineUserId)
    .maybeSingle();
  return NextResponse.json({ customer: data ?? null });
}
