import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyAdmin } from "@/lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type CheckResult = {
  id: string;
  label: string;
  status: "ok" | "warn" | "fail";
  detail: string;
};

export async function GET(req: NextRequest) {
  const adminPw = process.env.ADMIN_PASSWORD;
  const identity = await verifyAdmin(req);
  if (!identity) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const checks: CheckResult[] = [];

  // ── 1. LINE Channel Access Token ──
  checks.push(envCheck("line_token", "LINE Channel Access Token", "LINE_CHANNEL_ACCESS_TOKEN"));

  // ── 2. LINE Channel Secret ──
  checks.push(envCheck("line_secret", "LINE Channel Secret", "LINE_CHANNEL_SECRET"));

  // ── 3. LIFF ID ──
  checks.push(envCheck("liff_id", "LIFF ID", "NEXT_PUBLIC_LIFF_ID"));

  // ── 4. Supabase URL ──
  checks.push(envCheck("sb_url", "Supabase URL", "NEXT_PUBLIC_SUPABASE_URL"));

  // ── 5. Supabase Anon Key ──
  checks.push(envCheck("sb_anon", "Supabase Anon Key", "NEXT_PUBLIC_SUPABASE_ANON_KEY"));

  // ── 6. Supabase Service Role Key ──
  checks.push(envCheck("sb_service", "Supabase Service Role Key", "SUPABASE_SERVICE_ROLE_KEY"));

  // ── 7. Admin Password ──
  checks.push({
    id: "admin_pw",
    label: "รหัสผ่านแอดมิน (ADMIN_PASSWORD)",
    status: adminPw ? "ok" : "fail",
    detail: adminPw ? "ตั้งค่าแล้ว ✅" : "ยังไม่ได้ตั้งค่า — เข้าหน้าแอดมินไม่ได้",
  });

  // ── 8. Supabase connectivity ──
  const sbUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const sbKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (sbUrl && sbKey) {
    try {
      const sb = createClient(sbUrl, sbKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
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
  } else {
    checks.push({
      id: "sb_connect",
      label: "เชื่อมต่อ Supabase ได้",
      status: "warn",
      detail: "ข้าม — ยังไม่ได้ตั้งค่า Supabase URL/Key",
    });
  }

  // ── 9. Shop data ──
  if (sbUrl && sbKey) {
    try {
      const sb = createClient(sbUrl, sbKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const shopId = Number(process.env.DEFAULT_SHOP_ID ?? 1);
      const { data: shop } = await sb.from("shops").select("id, name").eq("id", shopId).maybeSingle();
      const { count: svcCount } = await sb.from("services").select("*", { count: "exact", head: true }).eq("shop_id", shopId).eq("active", true);
      const { count: staffCount } = await sb.from("staff").select("*", { count: "exact", head: true }).eq("shop_id", shopId).eq("active", true);
      checks.push({
        id: "shop_data",
        label: "ข้อมูลร้าน",
        status: shop ? (svcCount && svcCount > 0 ? "ok" : "warn") : "warn",
        detail: shop
          ? `ร้าน "${shop.name}" — บริการ ${svcCount ?? 0} รายการ, ช่าง ${staffCount ?? 0} คน`
          : `ยังไม่มีข้อมูลร้าน (shop_id=${shopId})`,
      });
    } catch {
      checks.push({
        id: "shop_data",
        label: "ข้อมูลร้าน",
        status: "warn",
        detail: "ตรวจไม่ได้ — ต้องเชื่อม Supabase ก่อน",
      });
    }
  } else {
    checks.push({
      id: "shop_data",
      label: "ข้อมูลร้าน",
      status: "warn",
      detail: "ตรวจไม่ได้ — ต้องเชื่อม Supabase ก่อน",
    });
  }

  // ── 9b. Schema migrations (detect optional tables) ──
  if (sbUrl && sbKey) {
    try {
      const sb = createClient(sbUrl, sbKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const missing: string[] = [];
      for (const t of ["message_templates", "reviews"] as const) {
        const { error } = await sb.from(t).select("id", { head: true, count: "exact" }).limit(1);
        // Postgres "relation does not exist" → code 42P01. Supabase returns
        // either a schema-cache error or a generic error here.
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
            ? "ตารางเสริมครบ (message_templates, reviews) ✅"
            : `ตารางยังไม่ครบ: ${missing.join(", ")} — รัน supabase/migrations/001_add_message_templates_and_reviews.sql ใน Supabase SQL Editor`,
      });
    } catch {
      // non-fatal
    }
  }

  // ── 9c. Cron last-run ──
  if (sbUrl && sbKey) {
    try {
      const sb = createClient(sbUrl, sbKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const shopId = Number(process.env.DEFAULT_SHOP_ID ?? 1);
      const { data: shopRow } = await sb
        .from("shops")
        .select("cron_last_run")
        .eq("id", shopId)
        .maybeSingle();
      const lastRun = (shopRow as any)?.cron_last_run as string | null;
      if (!lastRun) {
        checks.push({
          id: "cron_last_run",
          label: "Cron Reminders — ทำงานล่าสุด",
          status: "warn",
          detail: "ยังไม่เคยรัน — ตรวจสอบ vercel.json และ CRON_SECRET",
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
              : `ทำงานล่าสุดเมื่อ ${ageMin} นาทีที่แล้ว — อาจมีปัญหากับ Vercel Cron`,
        });
      }
    } catch {
      // non-fatal — column may not exist yet
    }
  }

  // ── 10. LINE API reachability (lightweight check) ──
  const lineToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;
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
          detail: `ตอบกลับ HTTP ${res.status} — อาจจะ Token ไม่ถูกต้อง`,
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

  // ── Computed setup values (for copy-to-clipboard) ──
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "";
  const liffId = process.env.NEXT_PUBLIC_LIFF_ID || "";
  const webhookUrl = appUrl ? `${appUrl.replace(/\/+$/, "")}/api/line/webhook` : "";
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

function envCheck(id: string, label: string, envVar: string): CheckResult {
  const val = process.env[envVar];
  return {
    id,
    label: `${label} (${envVar})`,
    status: val ? "ok" : "fail",
    detail: val ? "ตั้งค่าแล้ว ✅" : "ยังไม่ได้ตั้งค่า",
  };
}
