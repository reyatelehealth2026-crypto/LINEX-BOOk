import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getBotInfo } from "@/lib/line";
import { installPreset, type PresetKey } from "@/lib/presets";
import { hashPassword } from "@/lib/admin-auth";
import { attachTenantDomain } from "@/lib/vercel-domains";
import { issueAdminBootstrap } from "@/lib/admin-session-token";

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

  // LINE credentials are now optional — owners configure them after signup
  // from /admin/shop-info or /admin/setup. If partially supplied, we still
  // require all three so we don't half-configure the shop row.
  const hasLine = Boolean(line?.accessToken || line?.channelSecret || line?.liffId);
  if (hasLine && (!line?.accessToken || !line?.channelSecret || !line?.liffId)) {
    return NextResponse.json({ error: "incomplete LINE credentials — provide all three or none" }, { status: 400 });
  }

  // Admin can be created via either:
  //   * Google OAuth — admin.googleAuthUserId (uuid) + admin.email, no password
  //   * Email + password — admin.email + admin.password (≥ 8 chars)
  const isGoogleSignup = Boolean(admin?.googleAuthUserId);
  if (!admin?.email) return NextResponse.json({ error: "missing admin.email" }, { status: 400 });
  if (!isGoogleSignup && (!admin?.password || admin.password.length < 8)) {
    return NextResponse.json({ error: "invalid admin credentials (password ≥ 8 chars)" }, { status: 400 });
  }
  if (isGoogleSignup && typeof admin.googleAuthUserId !== "string") {
    return NextResponse.json({ error: "invalid admin.googleAuthUserId" }, { status: 400 });
  }

  const db = supabaseAdmin();

  // Re-check slug availability atomically on insert.
  const { data: existing } = await db.from("shops").select("id").eq("slug", shop.slug).maybeSingle();
  if (existing) return NextResponse.json({ error: "slug already taken" }, { status: 409 });

  // Verify LINE credentials (only when provided — they're optional now).
  let botInfo: { userId: string; displayName: string; basicId?: string } | null = null;
  if (hasLine) {
    botInfo = await getBotInfo(line.accessToken);
    if (!botInfo) return NextResponse.json({ error: "LINE credentials invalid" }, { status: 400 });
    const { data: oaConflict } = await db
      .from("shops")
      .select("id, slug")
      .eq("line_oa_id", botInfo.userId)
      .maybeSingle();
    if (oaConflict) {
      return NextResponse.json({ error: `this LINE OA is already attached to shop '${oaConflict.slug}'` }, { status: 409 });
    }
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
      line_oa_id: botInfo?.userId ?? null,
      line_channel_access_token: hasLine ? line.accessToken : null,
      line_channel_secret: hasLine ? line.channelSecret : null,
      liff_id: hasLine ? line.liffId : null,
      onboarding_status: hasLine ? "setup_in_progress" : "pending",
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
  const { data: adminRow, error: adminErr } = await db
    .from("admin_users")
    .insert({
      shop_id: created.id,
      email: admin.email.toLowerCase(),
      password_hash: isGoogleSignup ? null : hashPassword(admin.password),
      auth_user_id: isGoogleSignup ? admin.googleAuthUserId : null,
      role: "owner",
      active: true,
    })
    .select("id")
    .single();
  if (adminErr || !adminRow) {
    await db.from("shops").delete().eq("id", created.id);
    return NextResponse.json({ error: `create admin failed: ${adminErr?.message}` }, { status: 500 });
  }

  const rootDomain = process.env.ROOT_DOMAIN || "จองคิว.net";
  const proto = req.nextUrl.protocol.replace(":", "") || "https";

  // Attach the tenant's subdomain to the Vercel project so HTTP-01 auto-issues
  // a cert for {slug}.{root}. Runs in the background — signup doesn't wait or
  // fail on it (operators can re-attach via scripts/vercel-setup-domains.mjs
  // if this call fails, e.g. Vercel API outage).
  const attach = await attachTenantDomain(created.slug, rootDomain);
  if (attach.attempted && !attach.ok) {
    console.warn(`[signup] vercel attach failed for ${attach.domain}: ${attach.error}`);
  }

  // Prefer the per-subdomain URL when the attach succeeded. Otherwise fall
  // back to the path-based entry (proxy sets a cookie + strips the prefix),
  // which works on the apex cert alone.
  const baseUrl = attach.attempted && attach.ok
    ? `${proto}://${created.slug}.${rootDomain}`
    : `${proto}://${rootDomain}/${created.slug}`;

  // For Google signups, mint a one-time bootstrap token so the new owner
  // lands inside the tenant subdomain already authenticated (no re-login).
  // For password signups, drop them at /admin/setup as before — the layout
  // shows the password screen.
  const redirectUrl = isGoogleSignup
    ? `${baseUrl}/admin/auth/google/redeem?token=${encodeURIComponent(issueAdminBootstrap(adminRow.id, created.id))}`
    : `${baseUrl}/admin/setup`;

  return NextResponse.json({
    ok: true,
    shop: { id: created.id, slug: created.slug },
    redirectUrl,
    domainAttached: attach.attempted && attach.ok ? true : false,
    bot: botInfo ? { displayName: botInfo.displayName, basicId: botInfo.basicId } : null,
  });
}
