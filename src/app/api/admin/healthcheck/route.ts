import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyAdmin } from "@/lib/admin-auth";
import { getCurrentShop } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type CheckResult = {
  id: string;
  label: string;
  status: "ok" | "warn" | "fail";
  detail: string;
};

export async function GET(req: NextRequest) {
  const identity = await verifyAdmin(req);
  if (!identity) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  // Resolve current tenant — every check below is scoped to THIS shop only,
  // not platform-wide env vars. Without this, every subdomain reported the
  // same status because env is shared across tenants.
  let shop;
  try {
    shop = await getCurrentShop();
  } catch {
    return NextResponse.json({ error: "shop_not_resolved" }, { status: 400 });
  }

  const checks: CheckResult[] = [];

  // ── 1. LINE Channel Access Token (per-shop) ──
  checks.push({
    id: "line_token",
    label: "LINE Channel Access Token",
    status: shop.line_channel_access_token ? "ok" : "fail",
    detail: shop.line_channel_access_token
      ? "ตั้งค่าแล้ว ✅"
      : "ยังไม่ได้ตั้งค่า — ไปที่หน้า ตั้งค่าร้าน → ข้อมูลร้าน/LINE",
  });

  // ── 2. LINE Channel Secret (per-shop) ──
  checks.push({
    id: "line_secret",
    label: "LINE Channel Secret",
    status: shop.line_channel_secret ? "ok" : "fail",
    detail: shop.line_channel_secret
      ? "ตั้งค่าแล้ว ✅"
      : "ยังไม่ได้ตั้งค่า — ไปที่หน้า ตั้งค่าร้าน → ข้อมูลร้าน/LINE",
  });

  // ── 3. LIFF ID (per-shop) ──
  checks.push({
    id: "liff_id",
    label: "LIFF ID",
    status: shop.liff_id ? "ok" : "fail",
    detail: shop.liff_id
      ? "ตั้งค่าแล้ว ✅"
      : "ยังไม่ได้ตั้งค่า — สร้าง LIFF App แล้ววาง LIFF ID ในหน้าตั้งค่าร้าน",
  });

  // ── 4. Supabase connectivity (platform-wide) ──
  const sbUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const sbKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const sb = sbUrl && sbKey
    ? createClient(sbUrl, sbKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      })
    : null;

  if (sb) {
    try {
      const { error } = await sb.from("shops").select("id").limit(1);
      checks.push({
        id: "sb_connect",
        label: "เชื่อมต่อ Supabase ได้",
        status: error ? "fail" : "ok",
        detail: error ? `เชื่อมต่อไม่ได้: ${error.message}` : "เชื่อมต่อสำเร็จ ✅",
      });
    } catch (e: any) {
      checks.push({
        id: "sb_connect",
        label: "เชื่อมต่อ Supabase ได้",
        status: "fail",
        detail: `เกิดข้อผิดพลาด: ${e.message}`,
      });
    }
  }

  // ── 5. Shop data (services + staff) — scoped to THIS shop ──
  if (sb) {
    try {
      const { count: svcCount } = await sb
        .from("services")
        .select("*", { count: "exact", head: true })
        .eq("shop_id", shop.id)
        .eq("active", true);
      const { count: staffCount } = await sb
        .from("staff")
        .select("*", { count: "exact", head: true })
        .eq("shop_id", shop.id)
        .eq("active", true);
      const hasServices = (svcCount ?? 0) > 0;
      checks.push({
        id: "shop_data",
        label: "ข้อมูลร้าน",
        status: hasServices ? "ok" : "warn",
        detail: hasServices
          ? `ร้าน "${shop.name}" — บริการ ${svcCount ?? 0} รายการ, ช่าง ${staffCount ?? 0} คน`
          : `ร้าน "${shop.name}" — ยังไม่มีบริการ ให้ไปเพิ่มที่หน้า /admin/services`,
      });
    } catch {
      checks.push({
        id: "shop_data",
        label: "ข้อมูลร้าน",
        status: "warn",
        detail: "ตรวจไม่ได้ — ลองใหม่อีกครั้ง",
      });
    }
  }

  // ── 6. Schema migrations (platform-wide) ──
  if (sb) {
    try {
      const missing: string[] = [];
      for (const t of ["message_templates", "reviews"] as const) {
        const { error } = await sb.from(t).select("id", { head: true, count: "exact" }).limit(1);
        if (error && /does not exist|schema cache/i.test(error.message ?? "")) {
          missing.push(t);
        }
      }
      checks.push({
        id: "schema_migrations",
        label: "Schema migrations",
        status: missing.length === 0 ? "ok" : "warn",
        detail:
          missing.length === 0
            ? "ตารางเสริมครบ ✅"
            : `ตารางยังไม่ครบ: ${missing.join(", ")}`,
      });
    } catch {
      // non-fatal
    }
  }

  // ── 7. Cron Reminders — last run for THIS shop ──
  if (sb) {
    try {
      const { data: shopRow } = await sb
        .from("shops")
        .select("cron_last_run")
        .eq("id", shop.id)
        .maybeSingle();
      const lastRun = (shopRow as any)?.cron_last_run as string | null;
      if (!lastRun) {
        checks.push({
          id: "cron_last_run",
          label: "Cron Reminders — ทำงานล่าสุด",
          status: "warn",
          detail: "ยังไม่เคยรัน — รอรอบ cron ถัดไป (ทุก 10 นาที)",
        });
      } else {
        const ageMin = Math.round((Date.now() - new Date(lastRun).getTime()) / 60_000);
        const fmt = new Date(lastRun).toLocaleString("th-TH", { timeZone: "Asia/Bangkok" });
        checks.push({
          id: "cron_last_run",
          label: "Cron Reminders — ทำงานล่าสุด",
          status: ageMin <= 30 ? "ok" : "warn",
          detail:
            ageMin <= 30
              ? `ทำงานล่าสุด ${ageMin} นาทีที่แล้ว (${fmt}) ✅`
              : `ทำงานล่าสุดเมื่อ ${ageMin} นาทีที่แล้ว`,
        });
      }
    } catch {
      // non-fatal — column may not exist yet
    }
  }

  // ── 8. LINE API reachability — using THIS shop's token ──
  const lineToken = shop.line_channel_access_token;
  if (lineToken) {
    try {
      const res = await fetch("https://api.line.me/v2/bot/info", {
        headers: { Authorization: `Bearer ${lineToken}` },
        signal: AbortSignal.timeout(5000),
      });
      if (res.ok) {
        const info = await res.json();
        checks.push({
          id: "line_api",
          label: "LINE API เชื่อมต่อได้",
          status: "ok",
          detail: `Bot: ${info.displayName ?? "ไม่ทราบชื่อ"} ✅`,
        });
      } else {
        checks.push({
          id: "line_api",
          label: "LINE API เชื่อมต่อได้",
          status: "fail",
          detail: `ตอบกลับ HTTP ${res.status} — Token อาจไม่ถูกต้อง`,
        });
      }
    } catch (e: any) {
      checks.push({
        id: "line_api",
        label: "LINE API เชื่อมต่อได้",
        status: "warn",
        detail: `ไม่สามารถตรวจสอบได้: ${e.message}`,
      });
    }
  } else {
    checks.push({
      id: "line_api",
      label: "LINE API เชื่อมต่อได้",
      status: "warn",
      detail: "ข้าม — ยังไม่ได้ตั้ง Channel Access Token",
    });
  }

  // ── Computed setup values (per-shop URLs for copy-to-clipboard) ──
  const rootDomain = process.env.ROOT_DOMAIN || "จองคิว.net";
  const proto = req.nextUrl.protocol.replace(":", "") || "https";
  const appUrl = `${proto}://${shop.slug}.${rootDomain}`;
  const liffId = shop.liff_id ?? "";
  const webhookUrl = `${appUrl}/api/line/webhook`;
  const liffUrl = liffId ? `https://liff.line.me/${liffId}` : "";

  const okCount = checks.filter((c) => c.status === "ok").length;
  const allOk = checks.every((c) => c.status === "ok");

  return NextResponse.json({
    allOk,
    okCount,
    total: checks.length,
    checks,
    timestamp: new Date().toISOString(),
    setupValues: {
      appUrl,
      liffId,
      webhookUrl,
      liffUrl,
    },
  });
}
