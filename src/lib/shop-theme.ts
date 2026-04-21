import { getCurrentShop } from "@/lib/supabase";
import { DEFAULT_THEME_ID, isValidThemeId, type ThemeId } from "@/lib/themes";

/**
 * Server-only: read the current shop's active theme id.
 * Uses `getCurrentShop()` which resolves via subdomain → shops row cache
 * (30s TTL). Never throws — falls back to DEFAULT_THEME_ID on any error.
 */
export async function getShopThemeId(): Promise<ThemeId> {
  try {
    const shop = await getCurrentShop();
    return isValidThemeId(shop.theme_id) ? (shop.theme_id as ThemeId) : DEFAULT_THEME_ID;
  } catch {
    return DEFAULT_THEME_ID;
  }
}

/** Back-compat no-op: invalidateShopCache() in supabase.ts handles cache now. */
export function invalidateShopThemeCache(): void {
  /* noop — cache is owned by supabase.ts now */
}
