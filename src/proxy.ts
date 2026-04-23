import { NextRequest, NextResponse } from "next/server";

// Proxy (formerly "middleware") resolves the current tenant (shop) from the
// request. Three resolution strategies, tried in order:
//
//   1. Subdomain:  <slug>.จองคิว.net  → x-shop-slug header
//   2. Path entry: จองคิว.net/<slug>/... → 302 to strip prefix + set cookie
//   3. Cookie:     tenant_slug=<slug>    → x-shop-slug header
//
// Strategy 1 is the long-term design (isolated origins, proper cookies).
// Strategies 2+3 are the "simple mode" entry path — a tenant shares a link
// like จองคิว.net/hairx/admin/setup; the first hit sets a cookie so all
// subsequent /admin/* links (hardcoded throughout the app) keep working on
// the apex without needing a slug prefix.
//
// The HTTP Host header always arrives in A-label (Punycode) form for IDN
// domains — e.g. "xn--12c1bp2bs4i.net" for "จองคิว.net". We normalize the
// configured roots through the URL parser so operators can set ROOT_DOMAIN
// in either form and subdomain matching still works.
function toAsciiDomain(domain: string): string {
  const lower = domain.trim().toLowerCase();
  if (!lower) return lower;
  try {
    return new URL(`http://${lower}`).hostname;
  } catch {
    return lower;
  }
}

const ROOT_DOMAIN = toAsciiDomain(process.env.ROOT_DOMAIN ?? "จองคิว.net");
// Additional alias root domains (comma-separated). Same multi-tenant app
// serves each one; canonical links are still generated under ROOT_DOMAIN.
const ADDITIONAL_ROOT_DOMAINS = (process.env.ADDITIONAL_ROOT_DOMAINS ?? "")
  .split(",")
  .map(toAsciiDomain)
  .filter(Boolean);
const ROOT_DOMAINS: readonly string[] = [ROOT_DOMAIN, ...ADDITIONAL_ROOT_DOMAINS];
const TENANT_COOKIE = "tenant_slug";

// First path segments that must NOT be interpreted as a tenant slug.
const RESERVED_FIRST_SEG = new Set([
  "",
  "signup", "login", "signin", "auth",
  "api", "_next",
  "admin", "liff", "booking", "profile", "services", "my-bookings",
  "super",
  "favicon.ico", "robots.txt", "sitemap.xml", "assets", "images",
  "www",
]);

const SLUG_RE = /^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$/;

const TENANT_WHITELIST_PATHS = [
  "/liff",
  "/admin",
  "/api",
  "/booking",
  "/profile",
  "/services",
  "/my-bookings",
];
const ROOT_ONLY_PATHS = [
  "/signup", "/api/signup",
  "/login", "/api/lookup-shop-by-email",
  "/super", "/api/super",
];
const SUPER_SESSION_COOKIE = "super_admin_session";

function extractSubdomainSlug(host: string): string | null {
  const bare = host.split(":")[0].toLowerCase();
  if (bare.endsWith(".localhost")) {
    const slug = bare.slice(0, -".localhost".length);
    return slug || null;
  }
  for (const root of ROOT_DOMAINS) {
    if (bare === root) return null;
    if (bare.endsWith("." + root)) {
      const slug = bare.slice(0, -("." + root).length);
      if (!slug || slug === "www") return null;
      return slug;
    }
  }
  return null;
}

function attachSlug(req: NextRequest, slug: string, res?: NextResponse) {
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-shop-slug", slug);
  const next = NextResponse.next({ request: { headers: requestHeaders } });
  // Preserve any cookies set on the caller's response.
  if (res) {
    res.cookies.getAll().forEach((c) => next.cookies.set(c));
  }
  return next;
}

export function proxy(req: NextRequest) {
  const host = req.headers.get("host") ?? "";
  const { pathname } = req.nextUrl;

  // ---- Strategy 1: subdomain ----
  const subSlug = extractSubdomainSlug(host);
  if (subSlug) {
    if (ROOT_ONLY_PATHS.some((p) => pathname.startsWith(p))) {
      const url = req.nextUrl.clone();
      url.host = ROOT_DOMAIN;
      return NextResponse.redirect(url);
    }
    return attachSlug(req, subSlug);
  }

  // On the root domain from here down.

  // ---- /super/* paths: root-only, super-admin session required for non-login ----
  if (pathname === "/super" || pathname.startsWith("/super/") || pathname.startsWith("/api/super/")) {
    const hasSession = !!req.cookies.get(SUPER_SESSION_COOKIE)?.value;
    const isPublic =
      pathname === "/super/login" ||
      pathname === "/api/super/login" ||
      pathname === "/api/super/logout";
    if (!hasSession && !isPublic) {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json({ error: "unauthorized" }, { status: 401 });
      }
      const url = req.nextUrl.clone();
      url.pathname = "/super/login";
      return NextResponse.redirect(url);
    }
    // Forward a marker so getCurrentShop() may trust x-shop-id.
    if (hasSession) {
      const h = new Headers(req.headers);
      h.set("x-super-admin", "1");
      return NextResponse.next({ request: { headers: h } });
    }
    return NextResponse.next();
  }

  // ---- Strategy 2: path prefix /<slug>/... (one-shot entry) ----
  const segs = pathname.split("/").filter(Boolean);
  const first = (segs[0] || "").toLowerCase();
  if (first && !RESERVED_FIRST_SEG.has(first) && SLUG_RE.test(first)) {
    // Rewrite URL to strip the slug prefix, set tenant cookie, then redirect
    // so subsequent in-app links (hardcoded to /admin/*, /liff/*) keep
    // working without further middleware gymnastics.
    const url = req.nextUrl.clone();
    url.pathname = "/" + segs.slice(1).join("/");
    const res = NextResponse.redirect(url);
    res.cookies.set(TENANT_COOKIE, first, {
      path: "/",
      sameSite: "lax",
      httpOnly: false, // needs to be readable by client for /api fetches in some flows
      maxAge: 60 * 60 * 24 * 30,
    });
    return res;
  }

  // ---- Strategy 3: cookie ----
  const cookieSlug = req.cookies.get(TENANT_COOKIE)?.value;
  if (cookieSlug && SLUG_RE.test(cookieSlug)) {
    // Don't let cookie-tenant hit root-only signup pages.
    if (ROOT_ONLY_PATHS.some((p) => pathname.startsWith(p))) {
      return NextResponse.next();
    }
    return attachSlug(req, cookieSlug);
  }

  // ---- No tenant. Enforce tenant-only paths. ----
  if (TENANT_WHITELIST_PATHS.some((p) => pathname.startsWith(p))) {
    // Multi-tenant-aware endpoints resolve shop from payload/iteration.
    if (pathname.startsWith("/api/signup")) return NextResponse.next();
    if (pathname.startsWith("/api/line/webhook")) return NextResponse.next();
    if (pathname.startsWith("/api/cron")) return NextResponse.next();
    const url = req.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|assets|images|robots.txt|sitemap.xml).*)",
  ],
};
