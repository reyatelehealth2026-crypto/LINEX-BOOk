import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdmin } from "@/lib/admin-auth";
import { invalidateAiCache } from "@/lib/zai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Returns a masked representation of an API key so the UI can indicate that a
 * key is set without ever echoing the full value back to the browser.
 * Format: "****<last-4-chars>", e.g. "****abcd".
 * Returns null when no key is stored.
 */
function maskApiKey(key: string | null | undefined): string | null {
  if (!key) return null;
  const last4 = key.slice(-4);
  return `****${last4}`;
}

export async function GET(req: NextRequest) {
  const identity = await verifyAdmin(req);
  if (!identity) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const db = supabaseAdmin();
  const { data, error } = await db
    .from("ai_settings")
    .select("*")
    .eq("shop_id", identity.shopId)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Mask API keys before sending to client — never echo plaintext secrets
  const safeData = data
    ? {
        ...data,
        gemini_api_key: maskApiKey(data.gemini_api_key),
        zai_api_key: maskApiKey(data.zai_api_key),
      }
    : data;

  return NextResponse.json({ settings: safeData });
}

export async function POST(req: NextRequest) {
  const identity = await verifyAdmin(req);
  if (!identity) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json();

  const patch: Record<string, unknown> = {};
  if (typeof body.enabled === "boolean") patch.enabled = body.enabled;
  if (typeof body.model === "string" && body.model) patch.model = body.model;
  if (typeof body.temperature === "number") patch.temperature = Math.min(1, Math.max(0, body.temperature));
  if (typeof body.max_tokens === "number") patch.max_tokens = Math.min(1024, Math.max(50, body.max_tokens));
  if (typeof body.history_limit === "number") patch.history_limit = Math.min(20, Math.max(1, body.history_limit));
  if (typeof body.bot_name === "string") patch.bot_name = body.bot_name.trim();
  if (typeof body.business_desc === "string") patch.business_desc = body.business_desc.trim();
  if (typeof body.custom_rules === "string") patch.custom_rules = body.custom_rules.trim();
  if (typeof body.booking_redirect === "string") patch.booking_redirect = body.booking_redirect.trim();
  if (typeof body.vision_enabled === "boolean") patch.vision_enabled = body.vision_enabled;
  if (typeof body.image_gen_enabled === "boolean") patch.image_gen_enabled = body.image_gen_enabled;
  if (typeof body.image_gen_per_hour === "number") patch.image_gen_per_hour = Math.min(50, Math.max(1, Math.round(body.image_gen_per_hour)));

  // API key fields — three cases:
  //   empty string → clear (set null in DB)
  //   masked roundtrip ("****...") → skip (don't overwrite stored key)
  //   any other non-empty string → store as new key value
  for (const field of ["gemini_api_key", "zai_api_key"] as const) {
    const val = body[field];
    if (typeof val !== "string") continue;
    if (val === "") {
      patch[field] = null; // explicit clear
    } else if (!val.startsWith("****")) {
      patch[field] = val; // new key value — never log this
    }
    // masked roundtrip ("****abcd") → intentionally skipped
  }

  if (!Object.keys(patch).length) {
    return NextResponse.json({ error: "no valid fields" }, { status: 400 });
  }

  const db = supabaseAdmin();
  const { data, error } = await db
    .from("ai_settings")
    .upsert({ shop_id: identity.shopId, ...patch }, { onConflict: "shop_id" })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  invalidateAiCache(identity.shopId);

  // Mask keys in the response — same rule as GET
  const safeData = {
    ...data,
    gemini_api_key: maskApiKey(data.gemini_api_key),
    zai_api_key: maskApiKey(data.zai_api_key),
  };

  return NextResponse.json({ settings: safeData });
}
