import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getBotInfo } from "@/lib/line";
import { installPreset, type PresetKey } from "@/lib/presets";
import { hashPassword } from "@/lib/admin-auth";

// POST /api/signup/create
// body: {
//   shop: { name, slug, phone?, address?, timezone? },
//   preset: "salon" | "nail" | "spa",
//   line:  { accessToken, channelSecret, liffId },
//   admin: { email, password }
// }
//
// Transactionally (as best Supabase allows):
//   1. create shops row
//   2. fetch bot info from LINE → save shop.line_oa_id
//   3. install preset (services, hours, templates, placeholder staff)
//   4. create admin_users row with hashed password
//
// Returns { ok: true, shop: { id, slug }, redirectUrl }

const VALID_PRESETS: PresetKey[] = ["salon", "nail", "spa"];

function isValidSlug(s: string) {
  return /^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$/.test(s);
}

export async function POST(req: NextRequest) {
  let payload: any;
  try { payload = await req.json(); } catch { return NextResponse.json({ error: "invalid json" }, { status: 400 }); }

  const shop = payload?.shop;
  const preset = payload?.preset as PresetKey;
  const line = payload?.line;
  const admin = payload?.admin;

  if (!shop?.name || !shop?.slug) return NextResponse.json({ error: "missing shop.name/slug" }, { status: 400 });
  if (!isValidSlug(shop.slug)) return NextResponse.json({ error: "invalid slug format" }, { status: 400 });
  if (!VALID_PRESETS.includes(preset)) return NextResponse.json({ error: "invalid preset" }, { status: 400 });
  if (!line?.accessToken || !line?.channelSecret || !line?.liffId) return NextResponse.json({ error: "missing LINE credentials" }, { status: 400 });
  if (!admin?.email || !admin?.password || admin.password.length < 8) return NextResponse.json({ error: "invalid admin credentials (password ≥ 8 chars)" }, { status: 400 });

  const db = supabaseAdmin();

  // Re-check slug availability atomically on insert.
  const { data: existing } = await db.from("shops").select("id").eq("slug", shop.slug).maybeSingle();
  if (existing) return NextResponse.json({ error: "slug already taken" }, { status: 409 });

  // Verify LINE credentials one more time and pull the OA user id.
  const botInfo = await getBotInfo(line.accessToken);
  if (!botInfo) return NextResponse.json({ error: "LINE credentials invalid" }, { status: 400 });

  // Ensure this OA isn't already attached to another shop.
  const { data: oaConflict } = await db
    .from("shops")
    .select("id, slug")
    .eq("line_oa_id", botInfo.userId)
    .maybeSingle();
  if (oaConflict) {
    return NextResponse.json({ error: `this LINE OA is already attached to shop '${oaConflict.slug}'` }, { status: 409 });
  }

  // 1) Create shop
  const { data: created, error: createErr } = await db
    .from("shops")
    .insert({
      name: shop.name,
      slug: shop.slug,
      phone: shop.phone ?? null,
      address: shop.address ?? null,
      timezone: shop.timezone || "Asia/Bangkok",
      line_oa_id: botInfo.userId,
      line_channel_access_token: line.accessToken,
      line_channel_secret: line.channelSecret,
      liff_id: line.liffId,
      onboarding_status: "setup_in_progress",
    })
    .select("id, slug")
    .single();
  if (createErr || !created) {
    return NextResponse.json({ error: `create shop failed: ${createErr?.message}` }, { status: 500 });
  }

  // 2) Install preset
  try {
    await installPreset(created.id, preset);
  } catch (e: any) {
    // Roll back the shop row if preset install fails — otherwise user is stuck.
    await db.from("shops").delete().eq("id", created.id);
    return NextResponse.json({ error: `install preset failed: ${e?.message ?? e}` }, { status: 500 });
  }

  // 3) Create admin_users row
  const { error: adminErr } = await db.from("admin_users").insert({
    shop_id: created.id,
    email: admin.email.toLowerCase(),
    password_hash: hashPassword(admin.password),
    role: "owner",
    active: true,
  });
  if (adminErr) {
    await db.from("shops").delete().eq("id", created.id);
    return NextResponse.json({ error: `create admin failed: ${adminErr.message}` }, { status: 500 });
  }

  const rootDomain = process.env.ROOT_DOMAIN || "likesms.net";
  const proto = req.nextUrl.protocol.replace(":", "") || "https";
  const redirectUrl = `${proto}://${created.slug}.${rootDomain}/admin/setup`;

  return NextResponse.json({
    ok: true,
    shop: { id: created.id, slug: created.slug },
    redirectUrl,
    bot: { displayName: botInfo.displayName, basicId: botInfo.basicId },
  });
}
