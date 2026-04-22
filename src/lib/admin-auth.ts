// Per-shop admin authentication (SaaS multi-tenant).
//
// Two modes, both scoped to the current shop (resolved from subdomain via
// middleware → x-shop-slug header, or from the x-shop-id header):
//
//   1) `x-admin-password` header matches admin_users.password_hash for the
//      current shop (bcrypt). Per-shop owners/managers create this on signup.
//   2) `x-line-id-token` header is a valid LINE idToken whose `sub` matches
//      admin_users.line_user_id for the current shop.
//
// For backwards compatibility with the single-tenant MVP, if the shop has
// no admin_users rows yet and the ADMIN_PASSWORD / ADMIN_LINE_IDS env vars
// are set, those are used as fallback.

import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { createRateLimiter, getClientIp } from "@/lib/rate-limit";
import { supabaseAdmin, getCurrentShop } from "@/lib/supabase";
import { verifyImpersonationToken } from "@/lib/impersonation-token";

const _pwLimiter = createRateLimiter(5, 15 * 60 * 1000);

export type AdminIdentity = {
  mode: "password" | "line";
  shopId: number;
  adminUserId?: number;
  lineUserId?: string;
  email?: string;
  displayName?: string;
  role?: "owner" | "manager" | "staff";
};

/**
 * Hash a password for storage in admin_users.password_hash.
 * Uses scrypt (available in node's crypto) — avoids adding bcrypt dependency.
 * Format: `scrypt$<salt-hex>$<hash-hex>`
 */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(password, salt, 64);
  return `scrypt$${salt.toString("hex")}$${hash.toString("hex")}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  try {
    const [algo, saltHex, hashHex] = stored.split("$");
    if (algo !== "scrypt" || !saltHex || !hashHex) return false;
    const salt = Buffer.from(saltHex, "hex");
    const expected = Buffer.from(hashHex, "hex");
    const computed = crypto.scryptSync(password, salt, expected.length);
    return crypto.timingSafeEqual(expected, computed);
  } catch {
    return false;
  }
}

export async function verifyAdmin(req: NextRequest): Promise<AdminIdentity | null> {
  let shopId: number;
  try {
    const shop = await getCurrentShop();
    shopId = shop.id;
  } catch {
    return null;
  }

  const db = supabaseAdmin();

  // ── 0) Super-admin impersonation mode ──
  // Header set by the admin console when redeeming a /admin/impersonate token,
  // or the subdomain cookie planted by that redeem handler.
  const impToken =
    req.headers.get("x-impersonation-token") ||
    req.cookies.get("super_admin_impersonation")?.value ||
    null;
  if (impToken) {
    const imp = verifyImpersonationToken(impToken);
    if (imp && imp.shopId === shopId) {
      return { mode: "password", shopId, role: "owner" };
    }
  }

  // ── 1) Password mode ──
  const pw = req.headers.get("x-admin-password");
  if (pw) {
    const ip = getClientIp(req);
    const { allowed } = _pwLimiter.check(ip);
    if (!allowed) return null;

    // Try DB-scoped admin_users first (per-shop owner/manager password).
    const { data: users } = await db
      .from("admin_users")
      .select("id, email, password_hash, role, line_user_id")
      .eq("shop_id", shopId)
      .eq("active", true)
      .not("password_hash", "is", null);
    if (users && users.length > 0) {
      for (const u of users) {
        if (u.password_hash && verifyPassword(pw, u.password_hash)) {
          _pwLimiter.reset(ip);
          await db
            .from("admin_users")
            .update({ last_login_at: new Date().toISOString() })
            .eq("id", u.id);
          return {
            mode: "password",
            shopId,
            adminUserId: u.id,
            email: u.email ?? undefined,
            role: u.role as any,
          };
        }
      }
    } else if (process.env.ADMIN_PASSWORD && pw === process.env.ADMIN_PASSWORD) {
      // Legacy single-tenant fallback.
      _pwLimiter.reset(ip);
      return { mode: "password", shopId };
    }
  }

  // ── 2) LINE idToken mode ──
  const idToken = req.headers.get("x-line-id-token");
  if (idToken) {
    const shop = await getCurrentShop();
    const identity = await verifyLineIdToken(idToken, shop.liff_id ?? process.env.NEXT_PUBLIC_LIFF_ID ?? "");
    if (!identity) return null;

    const { data: admin } = await db
      .from("admin_users")
      .select("id, line_user_id, display_name, role")
      .eq("shop_id", shopId)
      .eq("line_user_id", identity.sub)
      .eq("active", true)
      .maybeSingle();
    if (admin) {
      await db.from("admin_users").update({ last_login_at: new Date().toISOString() }).eq("id", admin.id);
      return {
        mode: "line",
        shopId,
        adminUserId: admin.id,
        lineUserId: identity.sub,
        displayName: admin.display_name ?? identity.name,
        role: admin.role as any,
      };
    }

    // Legacy fallback
    const legacy = (process.env.ADMIN_LINE_IDS ?? process.env.ADMIN_LINE_USER_IDS ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (legacy.includes(identity.sub)) {
      return { mode: "line", shopId, lineUserId: identity.sub, displayName: identity.name };
    }
  }

  return null;
}

export function unauthorized(extra?: Record<string, unknown>) {
  return NextResponse.json({ error: "unauthorized", ...(extra ?? {}) }, { status: 401 });
}

async function verifyLineIdToken(idToken: string, liffId: string): Promise<{ sub: string; name?: string } | null> {
  try {
    const clientId = liffId.split("-")[0];
    if (!clientId) return null;
    const res = await fetch("https://api.line.me/oauth2/v2.1/verify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ id_token: idToken, client_id: clientId }),
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const body = await res.json();
    if (!body?.sub) return null;
    return { sub: String(body.sub), name: body.name };
  } catch {
    return null;
  }
}
