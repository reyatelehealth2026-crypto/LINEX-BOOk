"use client";
// Browser-side Supabase client used ONLY for OAuth (Google sign-in) flows.
//
// The server-side clients in supabase.ts use persistSession=false because
// we never want their session to compete with our own admin-session cookie.
// This file is the browser counterpart for OAuth code exchange.
//
// Usage:
//   const sb = supabaseBrowser();
//   await sb.auth.signInWithOAuth({ provider: "google", options: { redirectTo } });

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let _client: SupabaseClient | null = null;

export function supabaseBrowser(): SupabaseClient {
  if (_client) return _client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) throw new Error("NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY are not set");
  _client = createClient(url, anon, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: "pkce",
      storageKey: "linebook-oauth",
    },
  });
  return _client;
}
