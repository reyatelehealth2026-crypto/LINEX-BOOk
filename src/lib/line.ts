import crypto from "node:crypto";

const CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN!;
const CHANNEL_SECRET = process.env.LINE_CHANNEL_SECRET!;

const API = "https://api.line.me/v2/bot";

/** Verify LINE webhook signature (x-line-signature header). */
export function verifySignature(rawBody: string, signature: string | null): boolean {
  if (!signature || !CHANNEL_SECRET) return false;
  const hmac = crypto
    .createHmac("sha256", CHANNEL_SECRET)
    .update(rawBody)
    .digest("base64");
  try {
    return crypto.timingSafeEqual(Buffer.from(hmac), Buffer.from(signature));
  } catch {
    return false;
  }
}

async function lineFetch(path: string, body: unknown) {
  const res = await fetch(`${API}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${CHANNEL_ACCESS_TOKEN}`
    },
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`LINE ${path} ${res.status}: ${text}`);
  }
  return res;
}

export function replyMessage(replyToken: string, messages: any[]) {
  return lineFetch("/message/reply", { replyToken, messages });
}

export function pushMessage(to: string, messages: any[]) {
  return lineFetch("/message/push", { to, messages });
}

export async function getProfile(userId: string) {
  const res = await fetch(`${API}/profile/${userId}`, {
    headers: { Authorization: `Bearer ${CHANNEL_ACCESS_TOKEN}` }
  });
  if (!res.ok) return null;
  return (await res.json()) as {
    userId: string;
    displayName: string;
    pictureUrl?: string;
    statusMessage?: string;
  };
}
