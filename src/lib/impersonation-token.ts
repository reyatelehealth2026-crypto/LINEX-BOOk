// Signed impersonation tokens — used by super-admin-auth to let a platform
// operator land inside any tenant's /admin console. Kept in its own file so
// admin-auth.ts can verify tokens without pulling in super-admin DB code
// (which would create a circular import).

import crypto from "node:crypto";

const SUPER_COOKIE = "super_admin_impersonation";

function secret(): string {
  const s =
    process.env.SUPER_ADMIN_SESSION_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    "";
  if (!s) throw new Error("SUPER_ADMIN_SESSION_SECRET (or SUPABASE_SERVICE_ROLE_KEY) is not set");
  return s;
}

function sign(payload: string): string {
  return crypto.createHmac("sha256", secret()).update(payload).digest("base64url");
}

export function encodeToken(obj: Record<string, unknown>): string {
  const body = Buffer.from(JSON.stringify(obj), "utf8").toString("base64url");
  const mac = sign(body);
  return `${body}.${mac}`;
}

export function decodeToken<T = Record<string, unknown>>(token: string): T | null {
  const [body, mac] = token.split(".");
  if (!body || !mac) return null;
  const expected = sign(body);
  const a = Buffer.from(mac, "base64url");
  const b = Buffer.from(expected, "base64url");
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    return JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as T;
  } catch {
    return null;
  }
}

export function issueImpersonationToken(superAdminId: number, shopId: number, ttlSec = 120): string {
  return encodeToken({
    sub: superAdminId,
    typ: "impersonate",
    shop: shopId,
    exp: Math.floor(Date.now() / 1000) + ttlSec,
  });
}

/** Longer-lived cookie session minted after a one-time `impersonate` token is redeemed. */
export function issueImpersonationSession(superAdminId: number, shopId: number, ttlSec = 60 * 30): string {
  return encodeToken({
    sub: superAdminId,
    typ: "impersonate_session",
    shop: shopId,
    exp: Math.floor(Date.now() / 1000) + ttlSec,
  });
}

export function verifyImpersonationToken(
  token: string,
): { superAdminId: number; shopId: number } | null {
  const obj = decodeToken<{ sub: number; typ: string; shop: number; exp: number }>(token);
  if (!obj || (obj.typ !== "impersonate" && obj.typ !== "impersonate_session")) return null;
  if (!obj.exp || obj.exp < Math.floor(Date.now() / 1000)) return null;
  return { superAdminId: obj.sub, shopId: obj.shop };
}

/**
 * Cookie used on a tenant subdomain once a super-admin has redeemed an
 * impersonation token at /admin/impersonate. Presented to verifyAdmin() via
 * the `x-impersonation-token` header OR as a same-origin cookie.
 */
export const IMPERSONATION_COOKIE = SUPER_COOKIE;
