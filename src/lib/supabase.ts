import { createClient, SupabaseClient } from "@supabase/supabase-js";

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
      auth: { persistSession: false, autoRefreshToken: false }
    });
  }
  return _admin;
}

/** Anonymous client for public (catalog) reads. Safe in browser. */
export function supabasePublic(): SupabaseClient {
  if (!_anon) {
    _anon = createClient(url, anon, {
      auth: { persistSession: false, autoRefreshToken: false }
    });
  }
  return _anon;
}

export const SHOP_ID = Number(process.env.DEFAULT_SHOP_ID ?? 1);
