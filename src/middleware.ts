import { NextRequest, NextResponse } from "next/server";

// Middleware resolves the current tenant (shop) from the request host:
//   linebook.app              → marketing + signup (root, no tenant)
//   <slug>.linebook.app       → tenant app; inject x-shop-slug for downstream
//
// We purposely do NOT hit the database here — middleware runs on every
// request (incl. static assets) and keeping it DB-free avoids cold-start
// latency. The slug is passed as x-shop-slug to request headers; each
// server handler calls getShopFromHeaders() which performs the DB lookup
// with short-lived in-memory caching.

const ROOT_DOMAIN = (process.env.ROOT_DOMAIN ?? "linebook.app").toLowerCase();
const TENANT_WHITELIST_PATHS = [
  "/liff",
  "/admin",
  "/api",
  "/booking",
  "/profile",
  "/services",
  "/my-bookings",
];
const ROOT_ONLY_PATHS = ["/signup", "/api/signup"];

function extractSlug(host: string): string | null {
  const bare = host.split(":")[0].toLowerCase();
  // localhost subdomains for dev: "<slug>.localhost"
  if (bare.endsWith(".localhost")) {
    const slug = bare.slice(0, -".localhost".length);
    return slug || null;
  }
  if (bare === ROOT_DOMAIN) return null;
  if (bare.endsWith("." + ROOT_DOMAIN)) {
    const slug = bare.slice(0, -("." + ROOT_DOMAIN).length);
    // ignore `www` and empty
    if (!slug || slug === "www") return null;
    return slug;
  }
  // Unknown host (e.g., Vercel preview URL): treat as root
  return null;
}

export function middleware(req: NextRequest) {
  const host = req.headers.get("host") ?? "";
  const slug = extractSlug(host);
  const { pathname } = req.nextUrl;

  // Root-only paths redirect to root domain if accessed on a tenant subdomain.
  if (slug && ROOT_ONLY_PATHS.some((p) => pathname.startsWith(p))) {
    const url = req.nextUrl.clone();
    url.host = ROOT_DOMAIN;
    return NextResponse.redirect(url);
  }

  // Tenant-only paths require a slug.
  if (!slug && TENANT_WHITELIST_PATHS.some((p) => pathname.startsWith(p))) {
    // Allow /api/signup even without slug
    if (pathname.startsWith("/api/signup")) return NextResponse.next();
    // Allow webhook (no tenant needed — resolved from LINE destination)
    if (pathname.startsWith("/api/line/webhook")) return NextResponse.next();
    // Allow cron (runs for all shops)
    if (pathname.startsWith("/api/cron")) return NextResponse.next();
    // Root visitor hitting a tenant path → send to marketing home
    const url = req.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  const res = NextResponse.next();
  if (slug) {
    res.headers.set("x-shop-slug", slug);
    // Also set on the forwarded request headers so server components / route
    // handlers can read via next/headers.
    res.headers.set("x-linebook-tenant", "1");
  }
  return res;
}

export const config = {
  matcher: [
    // Exclude Next internals + static files
    "/((?!_next/static|_next/image|favicon.ico|assets|images|robots.txt|sitemap.xml).*)",
  ],
};
