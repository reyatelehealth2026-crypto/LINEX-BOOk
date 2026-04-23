import { NextResponse } from "next/server";
import { supabaseAdmin, getCurrentShopId } from "@/lib/supabase";
import { DEFAULT_THEME_ID, getTheme, isValidThemeId } from "@/lib/themes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/shop/theme
 * Public read-only endpoint returning the shop's active theme.
 * Used by LIFF bootstrap and server-side layouts to seed `<ThemeProvider>`.
 */
export async function GET() {
  try {
    const shopId = await getCurrentShopId();
    const { data, error } = await supabaseAdmin()
      .from("shops")
      .select("theme_id")
      .eq("id", shopId)
      .maybeSingle();

    // Schema not migrated yet → fall back to default theme.
    if (error) {
      if (/column .* does not exist|schema cache/i.test(error.message)) {
        return NextResponse.json({
          themeId: DEFAULT_THEME_ID,
          theme: getTheme(DEFAULT_THEME_ID),
          migration: "pending: supabase/migrations/010_shop_theme.sql",
        });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const themeId = isValidThemeId(data?.theme_id) ? data!.theme_id : DEFAULT_THEME_ID;
    return NextResponse.json({ themeId, theme: getTheme(themeId) });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "internal error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
