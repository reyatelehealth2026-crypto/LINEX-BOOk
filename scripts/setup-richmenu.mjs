// One-off script: creates a LINE rich menu with 6 buttons + uploads image + sets default.
//
// Usage:
//   1. Put a 2500x1686 (or 2500x843) PNG/JPG image at scripts/richmenu.png
//      Simple placeholder works for dev; design the real one with grids matching
//      the `areas` below.
//   2. Ensure .env.local has LINE_CHANNEL_ACCESS_TOKEN and NEXT_PUBLIC_LIFF_ID
//   3. `npm run richmenu`
//
// It will log the rich menu ID and set it as the default for all users.

import fs from "node:fs";
import path from "node:path";

// Load .env.local manually (no dotenv dep)
const envPath = path.resolve(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) process.env[m[1]] ??= m[2];
  }
}

const TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;
const LIFF_ID = process.env.NEXT_PUBLIC_LIFF_ID;
if (!TOKEN) throw new Error("LINE_CHANNEL_ACCESS_TOKEN not set");
if (!LIFF_ID) throw new Error("NEXT_PUBLIC_LIFF_ID not set");

const LIFF = (p = "") => `https://liff.line.me/${LIFF_ID}${p}`;

const menu = {
  size: { width: 2500, height: 1686 }, // 2 rows x 3 cols
  selected: true,
  name: "LineBook Main Menu",
  chatBarText: "เมนู",
  areas: [
    // Row 1
    { bounds: { x: 0,    y: 0,   width: 833, height: 843 },
      action: { type: "uri", uri: LIFF("/liff/booking"), label: "จองคิว" } },
    { bounds: { x: 833,  y: 0,   width: 834, height: 843 },
      action: { type: "postback", data: "action=my_bookings", displayText: "คิวของฉัน", label: "คิวของฉัน" } },
    { bounds: { x: 1667, y: 0,   width: 833, height: 843 },
      action: { type: "postback", data: "action=profile", displayText: "โปรไฟล์", label: "โปรไฟล์" } },
    // Row 2
    { bounds: { x: 0,    y: 843, width: 833, height: 843 },
      action: { type: "uri", uri: LIFF("/liff/services"), label: "บริการ/ราคา" } },
    { bounds: { x: 833,  y: 843, width: 834, height: 843 },
      action: { type: "message", text: "โปรโมชัน", label: "โปรโมชัน" } },
    { bounds: { x: 1667, y: 843, width: 833, height: 843 },
      action: { type: "message", text: "ติดต่อร้าน", label: "ติดต่อร้าน" } }
  ]
};

async function api(path, init = {}) {
  const res = await fetch(`https://api.line.me/v2/bot${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      ...(init.headers ?? {})
    }
  });
  if (!res.ok) throw new Error(`${path} ${res.status}: ${await res.text()}`);
  return res;
}

// 1. Create rich menu
const createRes = await api("/richmenu", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(menu)
});
const { richMenuId } = await createRes.json();
console.log("Created rich menu:", richMenuId);

// 2. Upload image
const imgPath = path.resolve("scripts/richmenu.png");
if (!fs.existsSync(imgPath)) {
  console.warn("⚠️  scripts/richmenu.png not found — skipping image upload.");
  console.warn("   Design a 2500x1686 PNG and re-run to complete setup.");
} else {
  const img = fs.readFileSync(imgPath);
  const uploadRes = await fetch(
    `https://api-data.line.me/v2/bot/richmenu/${richMenuId}/content`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "image/png" },
      body: img
    }
  );
  if (!uploadRes.ok) throw new Error(`upload: ${uploadRes.status} ${await uploadRes.text()}`);
  console.log("Uploaded image.");
}

// 3. Set default
await api(`/user/all/richmenu/${richMenuId}`, { method: "POST" });
console.log("Set as default rich menu. ✅");
