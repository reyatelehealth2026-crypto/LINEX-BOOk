import { supabaseAdmin, SHOP_ID } from "@/lib/supabase";
import { DEFAULT_THEME_ID, isValidThemeId, type ThemeId } from "@/lib/themes";

/**
 * Cached shop theme lookup for server-side usage (webhook, layout server seed).
 * Cache TTL is short so admin changes propagate within ~30s without restart.
 */
const TTL_MS = 30_000;
let cache: { id: ThemeId; expiresAt: number } | null = null;

/** Server-only: read the shop's active theme id from the DB (cached).
 *  Never throws — falls back to DEFAULT_THEME_ID on any error. */
export async function getShopThemeId(): Promise<ThemeId> {
  const now = Date.now();
  if (cache && cache.expiresAt > now) return cache.id;

  try {
    const { data, error } = await supabaseAdmin()
      .from("shops")
      .select("theme_id")
      .eq("id", SHOP_ID)
      .maybeSingle();

    if (error || !data) {
      cache = { id: DEFAULT_THEME_ID, expiresAt: now + TTL_MS };
      return DEFAULT_THEME_ID;
    }
    const id = isValidThemeId(data.theme_id) ? data.theme_id : DEFAULT_THEME_ID;
    cache = { id, expiresAt: now + TTL_MS };
    return id;
  } catch {
    cache = { id: DEFAULT_THEME_ID, expiresAt: now + TTL_MS };
    return DEFAULT_THEME_ID;
  }
}

/** Invalidate the cache so the next `getShopThemeId()` hits the DB. Call from
 *  the admin theme POST handler after a successful save. */
export function invalidateShopThemeCache(): void {
  cache = null;
}
