// Super-admin (platform operator) authentication.
//
// Super admins are NOT scoped to a shop. They authenticate on the root domain
// via /super/login (email + password) or LIFF-style LINE idToken, receive a
// signed, httpOnly session cookie (`super_admin_session`), and can then act
// on any shop by sending `x-shop-id: <id>` with their requests.
//
// They can also mint a short-lived, signed "impersonation" token that lets
// them land inside any tenant's per-shop /admin console as if they had that
// shop's admin password.

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase";
import { createRateLimiter, getClientIp } from "@/lib/rate-limit";
import { hashPassword, verifyPassword } from "@/lib/admin-auth";
import { encodeToken, decodeToken, issueImpersonationToken } from "@/lib/impersonation-token";

const _pwLimiter = createRateLimiter(5, 15 * 60 * 1000);

export const SUPER_SESSION_COOKIE = "super_admin_session";
const SESSION_TTL_SEC = 60 * 60 * 8; // 8 hours

export type SuperAdminIdentity = {
  id: number;
  email?: string;
  lineUserId?: string;
  displayName?: string;
};

export { issueImpersonationToken };

export function issueSessionToken(id: number): string {
  return encodeToken({ sub: id, typ: "super", exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SEC });
}

export function setSessionCookie(res: NextResponse, id: number) {
  const token = issueSessionToken(id);
  res.cookies.set(SUPER_SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_SEC,
  });
}

export function clearSessionCookie(res: NextResponse) {
  res.cookies.set(SUPER_SESSION_COOKIE, "", { path: "/", maxAge: 0 });
}

/**
 * Resolve the super-admin identity from the `super_admin_session` cookie on
 * the request. Returns null if no valid session.
 */
export async function verifySuperAdmin(req: NextRequest): Promise<SuperAdminIdentity | null> {
  const token = req.cookies.get(SUPER_SESSION_COOKIE)?.value;
  if (!token) return null;
  const obj = decodeToken<{ sub: number; typ: string; exp: number }>(token);
  if (!obj || obj.typ !== "super") return null;
  if (!obj.exp || obj.exp < Math.floor(Date.now() / 1000)) return null;

  const db = supabaseAdmin();
  const { data: row } = await db
    .from("super_admins")
    .select("id, email, line_user_id, display_name, active")
    .eq("id", obj.sub)
    .maybeSingle();
  if (!row || !row.active) return null;
  return {
    id: row.id,
    email: row.email ?? undefined,
    lineUserId: row.line_user_id ?? undefined,
    displayName: row.display_name ?? undefined,
  };
}

/** Server-component variant that reads the cookie via next/headers. */
export async function verifySuperAdminFromCookies(): Promise<SuperAdminIdentity | null> {
  const jar = await cookies();
  const token = jar.get(SUPER_SESSION_COOKIE)?.value;
  if (!token) return null;
  const obj = decodeToken<{ sub: number; typ: string; exp: number }>(token);
  if (!obj || obj.typ !== "super") return null;
  if (!obj.exp || obj.exp < Math.floor(Date.now() / 1000)) return null;
  const db = supabaseAdmin();
  const { data: row } = await db
    .from("super_admins")
    .select("id, email, line_user_id, display_name, active")
    .eq("id", obj.sub)
    .maybeSingle();
  if (!row || !row.active) return null;
  return {
    id: row.id,
    email: row.email ?? undefined,
    lineUserId: row.line_user_id ?? undefined,
    displayName: row.display_name ?? undefined,
  };
}

/**
 * Check an email + password login against the super_admins table.
 * Rate-limited by client IP. Returns the row id on success.
 */
export async function loginWithPassword(
  req: NextRequest,
  email: string,
  password: string,
): Promise<{ id: number } | { error: string }> {
  const ip = getClientIp(req);
  const { allowed } = _pwLimiter.check(ip);
  if (!allowed) return { error: "rate_limited" };

  const db = supabaseAdmin();
  const { data: row } = await db
    .from("super_admins")
    .select("id, password_hash, active")
    .eq("email", email.toLowerCase().trim())
    .maybeSingle();
  if (!row || !row.active || !row.password_hash) return { error: "invalid_credentials" };
  if (!verifyPassword(password, row.password_hash)) return { error: "invalid_credentials" };
  _pwLimiter.reset(ip);
  await db.from("super_admins").update({ last_login_at: new Date().toISOString() }).eq("id", row.id);
  return { id: row.id };
}

/** Check a LINE idToken against super_admins.line_user_id. */
export async function loginWithLineIdToken(
  idToken: string,
  clientId: string,
): Promise<{ id: number } | { error: string }> {
  try {
    const res = await fetch("https://api.line.me/oauth2/v2.1/verify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ id_token: idToken, client_id: clientId }),
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return { error: "invalid_token" };
    const body = await res.json();
    if (!body?.sub) return { error: "invalid_token" };

    const db = supabaseAdmin();
    const { data: row } = await db
      .from("super_admins")
      .select("id, active")
      .eq("line_user_id", String(body.sub))
      .maybeSingle();
    if (!row || !row.active) return { error: "not_allowed" };
    await db.from("super_admins").update({ last_login_at: new Date().toISOString() }).eq("id", row.id);
    return { id: row.id };
  } catch {
    return { error: "verify_failed" };
  }
}

export { hashPassword };
