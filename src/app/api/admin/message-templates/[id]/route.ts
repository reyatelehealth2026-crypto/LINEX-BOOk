import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin, SHOP_ID } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function checkAuth(req: NextRequest) {
  const pw = req.headers.get("x-admin-password");
  return pw && pw === process.env.ADMIN_PASSWORD;
}

const VALID_CATEGORIES = ["reminder", "promo", "follow_up", "custom"] as const;

// GET — single template
export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  if (!checkAuth(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id: idStr } = await ctx.params;
  const id = Number(idStr);

  const db = supabaseAdmin();
  const { data, error } = await db
    .from("message_templates")
    .select("*")
    .eq("id", id)
    .eq("shop_id", SHOP_ID)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ template: data });
}

// PATCH — update a message template
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  if (!checkAuth(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id: idStr } = await ctx.params;
  const id = Number(idStr);
  const body = await req.json();

  const allowed = ["name", "category", "subject", "body", "active", "sort_order"];
  const updates: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) updates[key] = body[key];
  }

  if ("category" in updates && !VALID_CATEGORIES.includes(updates.category as typeof VALID_CATEGORIES[number])) {
    return NextResponse.json({ error: `category must be one of: ${VALID_CATEGORIES.join(", ")}` }, { status: 400 });
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "no fields to update" }, { status: 400 });
  }

  const db = supabaseAdmin();
  const { data, error } = await db
    .from("message_templates")
    .update(updates)
    .eq("id", id)
    .eq("shop_id", SHOP_ID)
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ template: data });
}

// DELETE — delete a message template
export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  if (!checkAuth(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id: idStr } = await ctx.params;
  const id = Number(idStr);

  const db = supabaseAdmin();
  const { error } = await db
    .from("message_templates")
    .delete()
    .eq("id", id)
    .eq("shop_id", SHOP_ID);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
