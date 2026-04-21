import crypto from "node:crypto";
import { getShopById, type Shop } from "@/lib/supabase";
import { currentAccessToken, currentChannelSecret } from "@/lib/request-context";

const API = "https://api.line.me/v2/bot";

export type LineCredentials = {
  accessToken: string;
  channelSecret: string;
  liffId?: string | null;
};

function resolveToken(explicit?: string) {
  return explicit || currentAccessToken() || process.env.LINE_CHANNEL_ACCESS_TOKEN || "";
}
function resolveSecret(explicit?: string) {
  return explicit || currentChannelSecret() || process.env.LINE_CHANNEL_SECRET || "";
}
function envToken() {
  return resolveToken();
}
function envSecret() {
  return resolveSecret();
}

/** Load credentials for a shop. Falls back to env vars so cron/scripts still
 *  work in single-tenant mode. */
export async function getShopLineCredentials(shopId: number): Promise<LineCredentials> {
  const shop = await getShopById(shopId);
  const token = shop?.line_channel_access_token || envToken();
  const secret = shop?.line_channel_secret || envSecret();
  if (!token || !secret) {
    throw new Error(`LINE credentials not configured for shop ${shopId}`);
  }
  return { accessToken: token, channelSecret: secret, liffId: shop?.liff_id ?? null };
}

export function credsFromShop(
  shop: Pick<Shop, "line_channel_access_token" | "line_channel_secret" | "liff_id">,
): LineCredentials {
  const token = shop.line_channel_access_token || envToken();
  const secret = shop.line_channel_secret || envSecret();
  return { accessToken: token, channelSecret: secret, liffId: shop.liff_id };
}

/**
 * Verify LINE webhook signature (x-line-signature header).
 * `channelSecret` optional — falls back to env LINE_CHANNEL_SECRET.
 */
export function verifySignature(rawBody: string, signature: string | null, channelSecret?: string): boolean {
  const secret = channelSecret || envSecret();
  if (!signature || !secret) return false;
  const hmac = crypto.createHmac("sha256", secret).update(rawBody).digest("base64");
  try {
    return crypto.timingSafeEqual(Buffer.from(hmac), Buffer.from(signature));
  } catch {
    return false;
  }
}

async function lineFetch(accessToken: string, path: string, body: unknown) {
  const token = accessToken || envToken();
  const res = await fetch(`${API}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    console.error(`[line] ${path} ${res.status} error:`, text);
    throw new Error(`LINE ${path} ${res.status}: ${text}`);
  }
  return res;
}

// All public helpers accept an optional `accessToken` as the LAST argument
// so existing single-tenant callers keep working (env fallback) while
// multi-tenant callers pass the shop's token explicitly.

export function replyMessage(replyToken: string, messages: any[], accessToken?: string) {
  return lineFetch(accessToken || envToken(), "/message/reply", { replyToken, messages });
}

export function pushMessage(to: string, messages: any[], accessToken?: string) {
  return lineFetch(accessToken || envToken(), "/message/push", { to, messages });
}

export function startLoading(chatId: string, loadingSeconds = 5, accessToken?: string) {
  return lineFetch(accessToken || envToken(), "/chat/loading/start", { chatId, loadingSeconds });
}

export async function getProfile(userId: string, accessToken?: string) {
  const token = accessToken || envToken();
  const res = await fetch(`${API}/profile/${userId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  return (await res.json()) as {
    userId: string;
    displayName: string;
    pictureUrl?: string;
    statusMessage?: string;
  };
}

/** Fetch the OA's own info — used to validate a shop's credentials on signup. */
export async function getBotInfo(accessToken: string): Promise<{
  userId: string;
  basicId: string;
  displayName: string;
  pictureUrl?: string;
  chatMode?: string;
  markAsReadMode?: string;
} | null> {
  const res = await fetch(`${API}/info`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  if (!res.ok) return null;
  return await res.json();
}
