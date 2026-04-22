import { NextRequest, NextResponse } from "next/server";
import {
  loginWithPassword,
  loginWithLineIdToken,
  setSessionCookie,
} from "@/lib/super-admin-auth";

export async function POST(req: NextRequest) {
  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "invalid_json" }, { status: 400 }); }

  let result: { id: number } | { error: string };
  if (body?.email && body?.password) {
    result = await loginWithPassword(req, String(body.email), String(body.password));
  } else if (body?.idToken && body?.clientId) {
    result = await loginWithLineIdToken(String(body.idToken), String(body.clientId));
  } else {
    return NextResponse.json({ error: "missing_credentials" }, { status: 400 });
  }

  if ("error" in result) {
    const status = result.error === "rate_limited" ? 429 : 401;
    return NextResponse.json({ error: result.error }, { status });
  }

  const res = NextResponse.json({ ok: true });
  setSessionCookie(res, result.id);
  return res;
}
