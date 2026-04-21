import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { headers } from "next/headers";
import { currentShopId as _ctxShopId } from "@/lib/request-context";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY;

let _admin: SupabaseClient | null = null;
let _anon: SupabaseClient | null = null;

/** Server-side client with service role (bypasses RLS). Never import in a client component. */
export function supabaseAdmin(): SupabaseClient {
  if (!service) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
  if (!_admin) {
    _admin = createClient(url, service, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return _admin;
}

/** Anonymous client for public (catalog) reads. Safe in browser. */
export function supabasePublic(): SupabaseClient {
  if (!_anon) {
    _anon = createClient(url, anon, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return _anon;
}

// ---------------------------------------------------------------------------
// Tenant (shop) resolution
// ---------------------------------------------------------------------------

export type Shop = {
  id: number;
  slug: string;
  name: string;
  timezone: string;
  phone: string | null;
  address: string | null;
  line_oa_id: string | null;
  line_channel_access_token: string | null;
  line_channel_secret: string | null;
  liff_id: string | null;
  business_type: "salon" | "nail" | "spa" | null;
  logo_url: string | null;
  onboarding_status: "pending" | "setup_in_progress" | "completed";
  theme_id: string | null;
  points_per_baht: number;
};

// Small in-memory cache to avoid hammering the shops table on every request.
// TTL is short because admins may edit shop info. In Vercel, each lambda
// instance has its own cache; that's fine for our low-QPS workload.
const CACHE_TTL_MS = 30_000;
type CacheEntry = { shop: Shop; at: number };
const slugCache = new Map<string, CacheEntry>();
const idCache = new Map<number, CacheEntry>();

function cachePut(shop: Shop) {
  const entry = { shop, at: Date.now() };
  slugCache.set(shop.slug, entry);
  idCache.set(shop.id, entry);
}
function cacheGetBySlug(slug: string): Shop | null {
  const e = slugCache.get(slug);
  if (!e) return null;
  if (Date.now() - e.at > CACHE_TTL_MS) return null;
  return e.shop;
}
function cacheGetById(id: number): Shop | null {
  const e = idCache.get(id);
  if (!e) return null;
  if (Date.now() - e.at > CACHE_TTL_MS) return null;
  return e.shop;
}

/** Invalidate shop cache — call after updating shop row. */
export function invalidateShopCache(key: number | string) {
  if (typeof key === "number") {
    const e = idCache.get(key);
    if (e) slugCache.delete(e.shop.slug);
    idCache.delete(key);
  } else {
    const e = slugCache.get(key);
    if (e) idCache.delete(e.shop.id);
    slugCache.delete(key);
  }
}

export async function getShopBySlug(slug: string): Promise<Shop | null> {
  const cached = cacheGetBySlug(slug);
  if (cached) return cached;
  const { data } = await supabaseAdmin()
    .from("shops")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  if (!data) return null;
  const shop = data as Shop;
  cachePut(shop);
  return shop;
}

export async function getShopById(id: number): Promise<Shop | null> {
  const cached = cacheGetById(id);
  if (cached) return cached;
  const { data } = await supabaseAdmin()
    .from("shops")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!data) return null;
  const shop = data as Shop;
  cachePut(shop);
  return shop;
}

export async function getShopByLineOaId(oaId: string): Promise<Shop | null> {
  const { data } = await supabaseAdmin()
    .from("shops")
    .select("*")
    .eq("line_oa_id", oaId)
    .maybeSingle();
  if (!data) return null;
  const shop = data as Shop;
  cachePut(shop);
  return shop;
}

/**
 * Resolve the current shop from the incoming request context.
 * Resolution order:
 *   1. AsyncLocalStorage (webhook / cron set this via runWithShopContext)
 *   2. Middleware-injected `x-shop-slug` header (subdomain request)
 *   3. DEFAULT_SHOP_ID env (legacy single-tenant fallback)
 * Throws if nothing can be resolved.
 */
export async function getCurrentShop(): Promise<Shop> {
  // 1) AsyncLocalStorage (webhook / cron)
  const ctxId = _ctxShopId();
  if (typeof ctxId === "number") {
    const s = await getShopById(ctxId);
    if (s) return s;
  }
  // 2) Subdomain slug
  try {
    const h = await headers();
    const slug = h.get("x-shop-slug");
    if (slug) {
      const shop = await getShopBySlug(slug);
      if (shop) return shop;
      throw new Error(`shop not found for slug '${slug}'`);
    }
  } catch {
    // headers() throws outside of a request scope.
  }
  // 3) Legacy fallback
  const fallbackId = Number(process.env.DEFAULT_SHOP_ID ?? 1);
  const shop = await getShopById(fallbackId);
  if (!shop) throw new Error("no shop context (no slug, no DEFAULT_SHOP_ID row)");
  return shop;
}

/** Convenience: get just the id. */
export async function getCurrentShopId(): Promise<number> {
  const s = await getCurrentShop();
  return s.id;
}

/**
 * Legacy `SHOP_ID` export — returns the current shop id from AsyncLocalStorage
 * (set by runWithShopContext in webhook / cron) or falls back to
 * DEFAULT_SHOP_ID env. Type is `number` but implemented as a property getter
 * (via toPrimitive / valueOf) so `.eq("shop_id", SHOP_ID)` and arithmetic
 * coerce to the live value.
 *
 * Prefer `await getCurrentShopId()` in new code.
 */
const _shopIdBox = {
  valueOf(): number {
    const id = _ctxShopId();
    if (typeof id === "number") return id;
    return Number(process.env.DEFAULT_SHOP_ID ?? 1);
  },
  [Symbol.toPrimitive](): number {
    return this.valueOf();
  },
  toString(): string {
    return String(this.valueOf());
  },
};
export const SHOP_ID = _shopIdBox as unknown as number;
