import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin, SHOP_ID } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function auth(req: NextRequest) {
  const pw = req.headers.get("x-admin-password") ?? new URL(req.url).searchParams.get("pw");
  return pw === process.env.ADMIN_PASSWORD;
}

export async function GET(req: NextRequest) {
  if (!auth(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const db = supabaseAdmin();
  const { data, error } = await db
    .from("ai_settings")
    .select("*")
    .eq("shop_id", SHOP_ID)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ settings: data });
}

export async function POST(req: NextRequest) {
  if (!auth(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json();

  const patch: Record<string, any> = {};
  if (typeof body.enabled === "boolean") patch.enabled = body.enabled;
  if (typeof body.model === "string" && body.model) patch.model = body.model;
  if (typeof body.temperature === "number") patch.temperature = Math.min(1, Math.max(0, body.temperature));
  if (typeof body.max_tokens === "number") patch.max_tokens = Math.min(1024, Math.max(50, body.max_tokens));
  if (typeof body.history_limit === "number") patch.history_limit = Math.min(20, Math.max(1, body.history_limit));
  if (typeof body.bot_name === "string") patch.bot_name = body.bot_name.trim();
  if (typeof body.business_desc === "string") patch.business_desc = body.business_desc.trim();
  if (typeof body.custom_rules === "string") patch.custom_rules = body.custom_rules.trim();
  if (typeof body.booking_redirect === "string") patch.booking_redirect = body.booking_redirect.trim();

  if (!Object.keys(patch).length) {
    return NextResponse.json({ error: "no valid fields" }, { status: 400 });
  }

  const db = supabaseAdmin();
  const { data, error } = await db
    .from("ai_settings")
    .upsert({ shop_id: SHOP_ID, ...patch }, { onConflict: "shop_id" })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ settings: data });
}
