import { NextRequest, NextResponse } from "next/server";
import { getBotInfo } from "@/lib/line";

// POST /api/signup/verify-line
// body: { accessToken, channelSecret, liffId }
// Calls LINE /v2/bot/info with the provided token to verify the credentials
// belong to a real OA. Does NOT persist anything — that happens on /create.

export async function POST(req: NextRequest) {
  try {
    const { accessToken, channelSecret, liffId } = await req.json();
    if (!accessToken || typeof accessToken !== "string") {
      return NextResponse.json({ ok: false, error: "missing accessToken" }, { status: 400 });
    }
    if (!channelSecret || typeof channelSecret !== "string") {
      return NextResponse.json({ ok: false, error: "missing channelSecret" }, { status: 400 });
    }
    if (!liffId || !/^\d+-[A-Za-z0-9]+$/.test(liffId)) {
      return NextResponse.json({ ok: false, error: "invalid liffId format (expected 1234567890-abcdefgh)" }, { status: 400 });
    }
    const info = await getBotInfo(accessToken);
    if (!info) {
      return NextResponse.json({ ok: false, error: "LINE rejected the access token" }, { status: 400 });
    }
    return NextResponse.json({
      ok: true,
      bot: {
        userId: info.userId,
        displayName: info.displayName,
        pictureUrl: info.pictureUrl,
        basicId: info.basicId,
      },
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? "verify failed" }, { status: 500 });
  }
}
