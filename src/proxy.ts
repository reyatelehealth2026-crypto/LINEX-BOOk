import { NextRequest, NextResponse } from "next/server";

// Proxy (formerly "middleware") resolves the current tenant (shop) from the
// request host:
//   linebook.app              → marketing + signup (root, no tenant)
//   <slug>.linebook.app       → tenant app; inject x-shop-slug for downstream
//
// We purposely do NOT hit the database here — this runs on every request
// (incl. static assets) and keeping it DB-free avoids cold-start latency.
// The slug is forwarded as x-shop-slug on the REQUEST headers so server
// components / route handlers can read it via `next/headers`; each handler
// then calls getShopBySlug() which performs the DB lookup with short-lived
// in-memory caching.

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
    if (!slug || slug === "www") return null;
    return slug;
  }
  // Unknown host (e.g., Vercel preview URL): treat as root
  return null;
}

export function proxy(req: NextRequest) {
  const host = req.headers.get("host") ?? "";
  const slug = extractSlug(host);
  const { pathname } = req.nextUrl;

  // Root-only paths accessed on a tenant subdomain → redirect to root.
  if (slug && ROOT_ONLY_PATHS.some((p) => pathname.startsWith(p))) {
    const url = req.nextUrl.clone();
    url.host = ROOT_DOMAIN;
    return NextResponse.redirect(url);
  }

  // Tenant-only paths require a slug — unless it's a multi-tenant-aware
  // endpoint that resolves the shop from the request body or iterates all
  // shops (webhook, cron, signup).
  if (!slug && TENANT_WHITELIST_PATHS.some((p) => pathname.startsWith(p))) {
    if (pathname.startsWith("/api/signup")) return NextResponse.next();
    if (pathname.startsWith("/api/line/webhook")) return NextResponse.next();
    if (pathname.startsWith("/api/cron")) return NextResponse.next();
    const url = req.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  if (slug) {
    // Forward the slug on REQUEST headers so server handlers can read it
    // via next/headers. NextResponse.next({ request: { headers } }) is the
    // documented way to mutate request headers.
    const requestHeaders = new Headers(req.headers);
    requestHeaders.set("x-shop-slug", slug);
    return NextResponse.next({ request: { headers: requestHeaders } });
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|assets|images|robots.txt|sitemap.xml).*)",
  ],
};
