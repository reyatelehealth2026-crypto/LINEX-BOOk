// Long-lived per-shop admin session cookie (Google-OAuth login flow).
//
// Mirrors the impersonation-token pattern but with its own typ/cookie name.
// Used by:
//   * /api/signup/create  → mints a one-time `admin_bootstrap` token that
//     the redirect URL embeds; the subdomain redeems it on first arrival.
//   * /api/admin/auth/google/login → mints an `admin_session` token once a
//     Supabase Google access_token is validated against admin_users.
//
// The cookie is httpOnly, host-only on the tenant subdomain — same scope
// rules as super_admin_impersonation. verifyAdmin() reads it.

import crypto from "node:crypto";

export const ADMIN_SESSION_COOKIE = "admin_session";

const SESSION_TTL_SEC = 60 * 60 * 24 * 30;     // 30 days
const BOOTSTRAP_TTL_SEC = 120;                 // 2 min — one-time hand-off

function secret(): string {
  const s =
    process.env.ADMIN_SESSION_SECRET ||
    process.env.SUPER_ADMIN_SESSION_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    "";
  if (!s) throw new Error("ADMIN_SESSION_SECRET / SUPER_ADMIN_SESSION_SECRET / SUPABASE_SERVICE_ROLE_KEY is not set");
  return s;
}

function sign(payload: string): string {
  return crypto.createHmac("sha256", secret()).update(payload).digest("base64url");
}

function encode(obj: Record<string, unknown>): string {
  const body = Buffer.from(JSON.stringify(obj), "utf8").toString("base64url");
  return `${body}.${sign(body)}`;
}

function decode<T = Record<string, unknown>>(token: string): T | null {
  const [body, mac] = token.split(".");
  if (!body || !mac) return null;
  const expected = sign(body);
  const a = Buffer.from(mac, "base64url");
  const b = Buffer.from(expected, "base64url");
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try { return JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as T; }
  catch { return null; }
}

export function issueAdminSession(adminUserId: number, shopId: number, ttlSec = SESSION_TTL_SEC): string {
  return encode({
    sub: adminUserId,
    typ: "admin_session",
    shop: shopId,
    exp: Math.floor(Date.now() / 1000) + ttlSec,
  });
}

export function issueAdminBootstrap(adminUserId: number, shopId: number): string {
  return encode({
    sub: adminUserId,
    typ: "admin_bootstrap",
    shop: shopId,
    exp: Math.floor(Date.now() / 1000) + BOOTSTRAP_TTL_SEC,
  });
}

export function verifyAdminSession(token: string): { adminUserId: number; shopId: number } | null {
  const obj = decode<{ sub: number; typ: string; shop: number; exp: number }>(token);
  if (!obj) return null;
  if (obj.typ !== "admin_session" && obj.typ !== "admin_bootstrap") return null;
  if (!obj.exp || obj.exp < Math.floor(Date.now() / 1000)) return null;
  return { adminUserId: obj.sub, shopId: obj.shop };
}

export const ADMIN_SESSION_TTL_SEC = SESSION_TTL_SEC;
