import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin, SHOP_ID } from "@/lib/supabase";
import { verifyAdmin, unauthorized } from "@/lib/admin-auth";
import { DEFAULT_THEME_ID, getTheme, isValidThemeId, THEME_PRESETS } from "@/lib/themes";
import { invalidateShopThemeCache } from "@/lib/shop-theme";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function migrationHint() {
  return {
    migration: "run `supabase/migrations/010_shop_theme.sql` on your database",
    sql: "alter table shops add column if not exists theme_id text not null default 'linex';",
  };
}

/**
 * GET /api/admin/theme
 * Returns current theme_id + full preset + the complete list of presets
 * (for rendering the admin picker grid).
 */
export async function GET(req: NextRequest) {
  const auth = await verifyAdmin(req);
  if (!auth) return unauthorized();

  const { data, error } = await supabaseAdmin()
    .from("shops")
    .select("theme_id")
    .eq("id", SHOP_ID)
    .maybeSingle();

  if (error && !/column .* does not exist|schema cache/i.test(error.message)) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const themeId = isValidThemeId(data?.theme_id) ? data!.theme_id : DEFAULT_THEME_ID;
  return NextResponse.json({
    themeId,
    theme: getTheme(themeId),
    presets: THEME_PRESETS,
    migrated: !error,
    ...(error ? migrationHint() : {}),
  });
}

/**
 * POST /api/admin/theme  { themeId: "beauty" }
 * Persist the shop's active theme. Validates against `THEME_PRESETS`.
 */
export async function POST(req: NextRequest) {
  const auth = await verifyAdmin(req);
  if (!auth) return unauthorized();

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const themeId = (body as { themeId?: unknown })?.themeId;
  if (!isValidThemeId(themeId)) {
    return NextResponse.json(
      { error: "invalid theme_id", valid: THEME_PRESETS.map((t) => t.id) },
      { status: 400 }
    );
  }

  const { error } = await supabaseAdmin()
    .from("shops")
    .update({ theme_id: themeId })
    .eq("id", SHOP_ID);

  if (error) {
    if (/column .* does not exist|schema cache/i.test(error.message)) {
      return NextResponse.json({ error: "table_missing", ...migrationHint() }, { status: 503 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  invalidateShopThemeCache();

  return NextResponse.json({
    ok: true,
    themeId,
    theme: getTheme(themeId),
  });
}
