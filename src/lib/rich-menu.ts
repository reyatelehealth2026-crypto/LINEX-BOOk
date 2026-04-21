import fs from "node:fs";
import path from "node:path";
import { supabaseAdmin, getShopById } from "@/lib/supabase";

const API = "https://api.line.me/v2/bot";
const API_DATA = "https://api-data.line.me/v2/bot";

type RichMenuSpec = {
  liffId: string;
  shopName?: string;
};

export function buildDefaultRichMenu({ liffId }: RichMenuSpec) {
  const liff = (p = "") => `https://liff.line.me/${liffId}${p.startsWith("/liff/") ? p.slice(5) : p}`;
  return {
    size: { width: 2500, height: 1686 },
    selected: true,
    name: "LineBook Main Menu",
    chatBarText: "เมนู",
    areas: [
      { bounds: { x: 0,    y: 0,   width: 833, height: 843 }, action: { type: "postback", data: "action=book", displayText: "จองคิว", label: "จองคิว" } },
      { bounds: { x: 833,  y: 0,   width: 834, height: 843 }, action: { type: "postback", data: "action=my_bookings", displayText: "คิวของฉัน", label: "คิวของฉัน" } },
      { bounds: { x: 1667, y: 0,   width: 833, height: 843 }, action: { type: "postback", data: "action=profile", displayText: "โปรไฟล์", label: "โปรไฟล์" } },
      { bounds: { x: 0,    y: 843, width: 833, height: 843 }, action: { type: "uri", uri: liff("/liff/services"), label: "บริการ/ราคา" } },
      { bounds: { x: 833,  y: 843, width: 834, height: 843 }, action: { type: "message", text: "โปรโมชัน", label: "โปรโมชัน" } },
      { bounds: { x: 1667, y: 843, width: 833, height: 843 }, action: { type: "message", text: "ติดต่อร้าน", label: "ติดต่อร้าน" } },
    ],
  };
}

async function lineApi(accessToken: string, urlPath: string, init: RequestInit = {}) {
  const res = await fetch(`${API}${urlPath}`, {
    ...init,
    headers: { Authorization: `Bearer ${accessToken}`, ...(init.headers ?? {}) },
  });
  if (!res.ok) throw new Error(`LINE ${urlPath} ${res.status}: ${await res.text()}`);
  return res;
}

/**
 * Create + activate the default LineBook rich menu for a shop using its own
 * OA credentials. Idempotent-ish: always creates a new menu, deletes old ones
 * for this shop, and sets the new one as the default.
 *
 * Image upload is optional — if scripts/richmenu.png exists on disk we upload
 * it; otherwise the menu is created without an image (admin can upload later).
 */
export async function uploadRichMenuForShop(shopId: number, opts?: { imagePath?: string }): Promise<string> {
  const shop = await getShopById(shopId);
  if (!shop) throw new Error(`shop ${shopId} not found`);
  const token = shop.line_channel_access_token;
  const liffId = shop.liff_id;
  if (!token || !liffId) throw new Error(`shop ${shopId} missing LINE credentials (token or liffId)`);

  const menu = buildDefaultRichMenu({ liffId, shopName: shop.name });

  // 1) Create
  const createRes = await lineApi(token, "/richmenu", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(menu),
  });
  const { richMenuId } = (await createRes.json()) as { richMenuId: string };

  // 2) Upload image (optional)
  const imgPath = opts?.imagePath ?? path.resolve(process.cwd(), "scripts/richmenu.png");
  if (fs.existsSync(imgPath)) {
    const img = fs.readFileSync(imgPath);
    const upRes = await fetch(`${API_DATA}/richmenu/${richMenuId}/content`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "image/png" },
      body: img,
    });
    if (!upRes.ok) throw new Error(`image upload ${upRes.status}: ${await upRes.text()}`);
  }

  // 3) Set as default for all this shop's users.
  await lineApi(token, `/user/all/richmenu/${richMenuId}`, { method: "POST" });

  // 4) Persist; drop any older rich menus for this shop on LINE side + DB.
  const db = supabaseAdmin();
  const { data: old } = await db.from("rich_menus").select("line_rich_menu_id").eq("shop_id", shopId);
  for (const o of old ?? []) {
    if (o.line_rich_menu_id !== richMenuId) {
      try { await lineApi(token, `/richmenu/${o.line_rich_menu_id}`, { method: "DELETE" }); } catch {}
    }
  }
  await db.from("rich_menus").delete().eq("shop_id", shopId);
  await db.from("rich_menus").insert({ shop_id: shopId, line_rich_menu_id: richMenuId, is_default: true });

  return richMenuId;
}
