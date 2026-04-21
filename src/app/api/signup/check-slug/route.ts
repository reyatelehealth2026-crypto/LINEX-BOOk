import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

// GET /api/signup/check-slug?slug=mysalon
// Returns { available: boolean, reason?: string }

const RESERVED = new Set([
  "www", "admin", "api", "app", "mail", "support", "help", "about",
  "pricing", "terms", "privacy", "contact", "blog", "docs", "status",
  "signup", "login", "signin", "auth", "dashboard", "static", "assets",
  "linebook", "line", "root", "public", "internal", "test", "staging",
]);

export async function GET(req: NextRequest) {
  const slug = (req.nextUrl.searchParams.get("slug") || "").trim().toLowerCase();
  if (!slug) return NextResponse.json({ available: false, reason: "missing" });
  if (slug.length < 3 || slug.length > 30) {
    return NextResponse.json({ available: false, reason: "length" });
  }
  if (!/^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$/.test(slug)) {
    return NextResponse.json({ available: false, reason: "format" });
  }
  if (RESERVED.has(slug)) {
    return NextResponse.json({ available: false, reason: "reserved" });
  }
  const { data } = await supabaseAdmin()
    .from("shops")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  if (data) return NextResponse.json({ available: false, reason: "taken" });
  return NextResponse.json({ available: true });
}
