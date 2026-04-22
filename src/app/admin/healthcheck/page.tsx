"use client";
import { useEffect, useState } from "react";
import { useAdmin } from "../_ctx";
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Wifi,
  WifiOff,
  ChevronLeft,
  Copy,
  Check,
  ArrowRight,
} from "lucide-react";

type CheckItem = {
  id: string;
  label: string;
  status: "ok" | "warn" | "fail";
  detail: string;
};

type HealthData = {
  allOk: boolean;
  okCount: number;
  total: number;
  checks: CheckItem[];
  timestamp: string;
  setupValues: {
    appUrl: string;
    liffId: string;
    webhookUrl: string;
    liffUrl: string;
  };
};

// ─── Actionable hint map ───
const actionHints: Record<string, string> = {
  line_token: "ไปที่ LINE Developers Console → Channel → Messaging API → คัดลอก Channel Access Token",
  line_secret: "ไปที่ LINE Developers Console → Channel → Basic settings → คัดลอก Channel Secret",
  liff_id: "ไปที่ LINE Developers Console → Channel → LIFF → คัดลอก LIFF ID",
  line_api: "ตรวจสอบว่า Channel Access Token ถูกต้องและยังไม่หมดอายุ",
  sb_url: "ไปที่ Supabase → Settings → API → คัดลอก Project URL",
  sb_anon: "ไปที่ Supabase → Settings → API → คัดลอก anon public key",
  sb_service: "ไปที่ Supabase → Settings → API → คัดลอก service_role key",
  sb_connect: "ตรวจสอบว่า Supabase URL และ Key ถูกต้อง และโปรเจกต์ยังไม่ถูกหยุด",
  shop_data: "เพิ่มข้อมูลร้านผ่านหน้า บริการ และ พนักงาน",
  admin_pw: "ใส่ ADMIN_PASSWORD ในไฟล์ .env แล้ว Deploy ใหม่",
};

// ─── Copy button ───
function CopyBtn({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);
  if (!text) return null;
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(text).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        });
      }}
      className="inline-flex items-center gap-1 text-xs text-ink-600 hover:text-ink-900 transition"
    >
      {copied ? <Check size={12} /> : <Copy size={12} />}
      {copied ? "คัดลอกแล้ว!" : label}
    </button>
  );
}

export default function HealthcheckPage() {
  const { pw } = useAdmin();
  const [health, setHealth] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function reload() {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch("/api/admin/healthcheck", {
        headers: { "x-admin-password": pw },
      });
      if (r.ok) {
        setHealth(await r.json());
      } else if (r.status === 401) {
        setError("รหัสผ่านไม่ถูกต้อง — ลองล็อกอินใหม่");
      } else {
        setError(`เกิดข้อผิดพลาด (HTTP ${r.status})`);
      }
    } catch (e: any) {
      setError(`ไม่สามารถติดต่อเซิร์ฟเวอร์: ${e.message}`);
    }
    setLoading(false);
  }

  useEffect(() => {
    reload();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const sv = health?.setupValues ?? { appUrl: "", liffId: "", webhookUrl: "", liffUrl: "" };

  // Group checks by category
  const categories = [
    {
      title: "LINE",
      ids: ["line_token", "line_secret", "liff_id", "line_api"],
    },
    {
      title: "ฐานข้อมูล (Supabase)",
      ids: ["sb_url", "sb_anon", "sb_service", "sb_connect", "shop_data"],
    },
    {
      title: "ระบบแอดมิน",
      ids: ["admin_pw"],
    },
  ];

  // Count issues
  const failCount = health?.checks.filter((c) => c.status === "fail").length ?? 0;
  const warnCount = health?.checks.filter((c) => c.status === "warn").length ?? 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <a href="/admin/setup" className="text-ink-400 hover:text-ink-600 transition">
            <ChevronLeft size={20} />
          </a>
          <div>
            <div className="eyebrow">Health Check</div>
            <h1 className="h-display text-2xl sm:text-3xl">ตรวจสอบระบบ</h1>
            <p className="text-sm text-ink-500 mt-0.5">
              สถานะการเชื่อมต่อและการตั้งค่าทั้งหมด
            </p>
          </div>
        </div>
        <button onClick={reload} className="btn-secondary" disabled={loading}>
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} /> ตรวจใหม่
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="card p-4 border-red-200 bg-red-50 text-red-700">
          <div className="flex items-center gap-2">
            <WifiOff size={18} />
            <span className="font-medium">ตรวจสอบไม่สำเร็จ</span>
          </div>
          <p className="text-sm mt-1">{error}</p>
        </div>
      )}

      {/* Summary card */}
      {health && (
        <div
          className={`card p-5 ${
            health.allOk
              ? "border-emerald-200 bg-emerald-50"
              : "border-amber-200 bg-amber-50"
          }`}
        >
          <div className="flex items-center gap-3">
            {health.allOk ? (
              <div className="w-14 h-14 rounded-md bg-emerald-600 text-white flex items-center justify-center">
                <CheckCircle2 size={28} />
              </div>
            ) : (
              <div className="w-14 h-14 rounded-md bg-amber-500 text-white flex items-center justify-center">
                <AlertTriangle size={28} />
              </div>
            )}
            <div>
              <div className="font-bold text-lg">
                {health.allOk ? "ระบบพร้อมใช้งาน" : "มีบางอย่างยังไม่เสร็จ"}
              </div>
              <div className="text-sm text-ink-600">
                {health.okCount}/{health.total} รายการผ่าน
                {failCount > 0 && <span className="text-red-600 ml-1">• {failCount} ไม่ผ่าน</span>}
                {warnCount > 0 && <span className="text-amber-600 ml-1">• {warnCount} รอตรวจ</span>}
                {health.timestamp && (
                  <span className="text-ink-400 ml-2">
                    — ตรวจล่าสุด{" "}
                    {new Date(health.timestamp).toLocaleTimeString("th-TH", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                    น.
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick copy values when all OK */}
      {health?.allOk && sv && (
        <div className="card p-4 border-ink-200">
          <h3 className="font-semibold text-sm mb-3">URL สำคัญของร้าน</h3>
          <div className="space-y-2">
            {sv.webhookUrl && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-ink-500 w-28 shrink-0">Webhook URL:</span>
                <code className="bg-ink-100 px-2 py-1 rounded text-xs break-all flex-1">{sv.webhookUrl}</code>
                <CopyBtn text={sv.webhookUrl} label="คัดลอก" />
              </div>
            )}
            {sv.liffUrl && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-ink-500 w-28 shrink-0">LIFF URL:</span>
                <code className="bg-ink-100 px-2 py-1 rounded text-xs break-all flex-1">{sv.liffUrl}</code>
                <CopyBtn text={sv.liffUrl} label="คัดลอก" />
              </div>
            )}
            {sv.appUrl && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-ink-500 w-28 shrink-0">App URL:</span>
                <code className="bg-ink-100 px-2 py-1 rounded text-xs break-all flex-1">{sv.appUrl}</code>
                <CopyBtn text={sv.appUrl} label="คัดลอก" />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && !health && (
        <div className="card p-8 text-center text-ink-500">
          <RefreshCw size={24} className="animate-spin mx-auto mb-2" />
          กำลังตรวจสอบ...
        </div>
      )}

      {/* Grouped checks */}
      {health && !loading && (
        <div className="space-y-6">
          {categories.map((cat) => {
            const items = cat.ids
              .map((id) => health.checks.find((c) => c.id === id))
              .filter(Boolean) as CheckItem[];
            if (items.length === 0) return null;

            const catOk = items.every((c) => c.status === "ok");
            const catFail = items.filter((c) => c.status !== "ok").length;

            return (
              <div key={cat.title} className="space-y-2">
                <div className="flex items-center gap-2">
                  <h2 className="font-semibold text-lg">{cat.title}</h2>
                  {catOk ? (
                    <CheckCircle2 size={16} className="text-emerald-600" />
                  ) : (
                    <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                      {catFail} รายการ
                    </span>
                  )}
                </div>
                <div className="space-y-2">
                  {items.map((item) => (
                    <CheckCard key={item.id} item={item} />
                  ))}
                </div>
              </div>
            );
          })}

          {/* Uncategorised checks */}
          {(() => {
            const catIds = new Set(categories.flatMap((c) => c.ids));
            const rest = health.checks.filter((c) => !catIds.has(c.id));
            if (rest.length === 0) return null;
            return (
              <div className="space-y-2">
                <h2 className="font-semibold text-lg">อื่นๆ</h2>
                {rest.map((item) => (
                  <CheckCard key={item.id} item={item} />
                ))}
              </div>
            );
          })()}
        </div>
      )}

      {/* Footer tip */}
      <div className="card p-4 text-sm text-ink-500">
        <div className="flex items-start gap-2">
          <div>
            <strong>เคล็ดลับ:</strong> หากมีรายการที่ขึ้น "ยังไม่ได้ตั้งค่า"
            ให้กลับไปที่หน้า{" "}
            <a href="/admin/setup" className="text-ink-700 underline">
              ตั้งค่าร้าน
            </a>{" "}
            แล้วทำตามขั้นตอนทีละข้อ — กดปุ่ม <ArrowRight size={12} className="inline" /> เพื่อดูวิธีทำ
          </div>
        </div>
      </div>
    </div>
  );
}

function CheckCard({ item }: { item: CheckItem }) {
  const isIssue = item.status !== "ok";
  const hint = actionHints[item.id];
  const config = {
    ok: {
      border: "border-ink-200",
      bg: "",
      icon: <CheckCircle2 size={18} className="text-emerald-600" />,
    },
    warn: {
      border: "border-amber-200",
      bg: "bg-amber-50",
      icon: <AlertTriangle size={18} className="text-amber-500" />,
    },
    fail: {
      border: "border-red-200",
      bg: "bg-red-50",
      icon: <XCircle size={18} className="text-red-500" />,
    },
  };
  const c = config[item.status];
  return (
    <div className={`card p-4 flex items-start gap-3 ${c.border} ${c.bg}`}>
      <div className="mt-0.5 shrink-0">{c.icon}</div>
      <div className="min-w-0 flex-1">
        <div className="font-medium text-sm">{item.label}</div>
        <div className="text-xs text-ink-500 mt-0.5">{item.detail}</div>
        {isIssue && hint && (
          <div className="mt-2 pt-2 border-t border-ink-100 text-xs text-ink-600 flex items-center gap-1">
            <ArrowRight size={12} />
            {hint}
          </div>
        )}
      </div>
    </div>
  );
}
