import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdmin } from "@/lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID_CATEGORIES = ["reminder", "promo", "follow_up", "custom"] as const;

// GET — list all message templates for this shop
export async function GET(req: NextRequest) {
  const identity = await verifyAdmin(req);
  if (!identity) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const db = supabaseAdmin();
  const { data, error } = await db
    .from("message_templates")
    .select("*")
    .eq("shop_id", identity.shopId)
    .order("sort_order");
  if (error) {
    if (/does not exist|schema cache/i.test(error.message)) {
      return NextResponse.json(
        {
          error: "table_missing",
          table: "message_templates",
          detail: error.message,
          migration: "supabase/migrations/001_add_message_templates_and_reviews.sql",
        },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ templates: data });
}

// POST — create a new message template
export async function POST(req: NextRequest) {
  const identity = await verifyAdmin(req);
  if (!identity) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await req.json();
  const { name, category, subject, body: tplBody, active, sort_order } = body;

  if (!name || !tplBody) {
    return NextResponse.json({ error: "name and body are required" }, { status: 400 });
  }

  const cat = category ?? "custom";
  if (!VALID_CATEGORIES.includes(cat)) {
    return NextResponse.json({ error: `category must be one of: ${VALID_CATEGORIES.join(", ")}` }, { status: 400 });
  }

  const db = supabaseAdmin();
  const { data, error } = await db
    .from("message_templates")
    .insert({
      shop_id: identity.shopId,
      name,
      category: cat,
      subject: subject ?? null,
      body: tplBody,
      active: active !== false,
      sort_order: Number(sort_order ?? 0),
    })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ template: data }, { status: 201 });
}
