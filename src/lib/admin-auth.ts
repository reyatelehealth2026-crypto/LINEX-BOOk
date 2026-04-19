// Dual-mode admin authentication:
//   1) `x-admin-password` header matches ADMIN_PASSWORD (desktop / legacy /admin).
//   2) `x-line-id-token` header is a valid LINE idToken whose `sub` is listed
//      in `ADMIN_LINE_IDS` env (comma-separated).
//
// LINE idToken is obtained on the client via LIFF's `liff.getIDToken()` and
// verified server-side against https://api.line.me/oauth2/v2.1/verify.
//
// The LIFF channel client_id is the numeric prefix of NEXT_PUBLIC_LIFF_ID,
// e.g. "1234567890-abcdefgh" → client_id = "1234567890".

import { NextRequest, NextResponse } from "next/server";

export type AdminIdentity = {
  mode: "password" | "line";
  lineUserId?: string;
  displayName?: string;
};

export async function verifyAdmin(req: NextRequest): Promise<AdminIdentity | null> {
  // ── 1) Password ──
  const pw = req.headers.get("x-admin-password");
  if (pw && process.env.ADMIN_PASSWORD && pw === process.env.ADMIN_PASSWORD) {
    return { mode: "password" };
  }

  // ── 2) LINE idToken ──
  const idToken = req.headers.get("x-line-id-token");
  if (idToken) {
    const identity = await verifyLineIdToken(idToken);
    if (!identity) return null;
    const adminIds = (process.env.ADMIN_LINE_IDS ?? process.env.ADMIN_LINE_USER_IDS ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (adminIds.length > 0 && adminIds.includes(identity.sub)) {
      return { mode: "line", lineUserId: identity.sub, displayName: identity.name };
    }
  }

  return null;
}

export function unauthorized(extra?: Record<string, unknown>) {
  return NextResponse.json({ error: "unauthorized", ...(extra ?? {}) }, { status: 401 });
}

/** Verify LINE ID token via LINE OAuth2 endpoint. Returns payload on success. */
async function verifyLineIdToken(idToken: string): Promise<{ sub: string; name?: string } | null> {
  try {
    const liffId = process.env.NEXT_PUBLIC_LIFF_ID || "";
    const clientId = liffId.split("-")[0];
    if (!clientId) return null;

    const res = await fetch("https://api.line.me/oauth2/v2.1/verify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ id_token: idToken, client_id: clientId }),
      // Never cache
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
