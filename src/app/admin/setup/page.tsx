"use client";
import { useEffect, useState } from "react";
import { useAdmin } from "../_ctx";
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Settings,
  MessageSquare,
  Database,
  Shield,
  Store,
  ChevronRight,
  ExternalLink,
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
};

// ──────────────────────────────────────────────
// Persistent checklist stored in localStorage
// so the shop owner can mark manual items done.
// ──────────────────────────────────────────────
const STORAGE_KEY = "linebook_setup_done";

type ManualItems = {
  webhook: boolean;
  richmenu: boolean;
};

function loadManual(): ManualItems {
  if (typeof window === "undefined") return { webhook: false, richmenu: false };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { webhook: false, richmenu: false };
}

function saveManual(items: ManualItems) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {}
}

export default function SetupPage() {
  const { pw } = useAdmin();
  const [health, setHealth] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [manual, setManual] = useState<ManualItems>(loadManual);

  async function reload() {
    setLoading(true);
    try {
      const r = await fetch("/api/admin/healthcheck", {
        headers: { "x-admin-password": pw },
      });
      if (r.ok) {
        setHealth(await r.json());
      } else {
        setHealth(null);
      }
    } catch {
      setHealth(null);
    }
    setLoading(false);
  }

  useEffect(() => {
    reload();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function toggleManual(key: keyof ManualItems) {
    const next = { ...manual, [key]: !manual[key] };
    setManual(next);
    saveManual(next);
  }

  // Build full setup checklist (auto + manual items)
  const setupSteps = [
    {
      id: "step_sb",
      title: "1. ตั้งค่า Supabase (ฐานข้อมูล)",
      desc: "สร้างโปรเจกต์ Supabase แล้วใส่ URL + Key ใน .env",
      icon: Database,
      auto: findCheck(health, "sb_url") && findCheck(health, "sb_anon") && findCheck(health, "sb_service"),
      link: "https://supabase.com",
    },
    {
      id: "step_line",
      title: "2. ตั้งค่า LINE Official Account",
      desc: "สร้าง Provider + Channel ใน LINE Developers Console แล้วใส่ Token + Secret",
      icon: MessageSquare,
      auto: findCheck(health, "line_token") && findCheck(health, "line_secret"),
      link: "https://developers.line.biz/console/",
    },
    {
      id: "step_liff",
      title: "3. สร้าง LIFF App",
      desc: "สร้าง LIFF ใน Channel แล้วใส่ LIFF ID ใน .env",
      icon: Settings,
      auto: findCheck(health, "liff_id"),
      link: "https://developers.line.biz/console/",
    },
    {
      id: "step_webhook",
      title: "4. ตั้งค่า Webhook ใน LINE Console",
      desc: "ใส่ URL Webhook ของร้านลงใน LINE Console และเปิด Use Webhook",
      icon: MessageSquare,
      auto: null, // manual
      manualKey: "webhook" as keyof ManualItems,
    },
    {
      id: "step_admin",
      title: "5. ตั้งรหัสผ่านแอดมิน",
      desc: "ตั้ง ADMIN_PASSWORD ใน .env — ใช้ล็อกอินเข้าหน้านี้",
      icon: Shield,
      auto: findCheck(health, "admin_pw"),
    },
    {
      id: "step_shop",
      title: "6. เพิ่มข้อมูลร้าน + บริการ + ช่าง",
      desc: "เพิ่มชื่อร้าน บริการ ราคา และช่างใน Supabase หรือผ่านแชท LINE",
      icon: Store,
      auto: findCheck(health, "shop_data"),
    },
  ];

  const totalSteps = setupSteps.length;
  const doneSteps = setupSteps.filter((s) => {
    if (s.manualKey) return manual[s.manualKey];
    return s.auto?.status === "ok";
  }).length;
  const progressPct = Math.round((doneSteps / totalSteps) * 100);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">🛠️ ตั้งค่าร้าน</h1>
          <p className="text-sm text-neutral-500 mt-1">
            ทำตามขั้นตอนทีละข้อ — เสร็จแล้วร้านพร้อมใช้งาน!
          </p>
        </div>
        <button onClick={reload} className="btn-secondary" disabled={loading}>
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} /> ตรวจใหม่
        </button>
      </div>

      {/* Progress bar */}
      <div className="card p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">
            ความพร้อมของร้าน
          </span>
          <span className="text-sm text-neutral-500">
            {doneSteps}/{totalSteps} ขั้นตอน
          </span>
        </div>
        <div className="w-full h-3 bg-neutral-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-brand-500 rounded-full transition-all duration-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <div className="text-right text-xs text-neutral-400 mt-1">{progressPct}%</div>
      </div>

      {/* Setup Steps */}
      <div className="space-y-3">
        {setupSteps.map((step) => {
          const isDone = step.manualKey
            ? manual[step.manualKey]
            : step.auto?.status === "ok";
          const Icon = step.icon;
          return (
            <div
              key={step.id}
              className={`card p-4 flex items-start gap-4 transition ${
                isDone ? "opacity-70" : ""
              }`}
            >
              {/* Check/Status icon */}
              <button
                onClick={() => step.manualKey && toggleManual(step.manualKey)}
                className={`mt-0.5 shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white transition ${
                  isDone
                    ? "bg-brand-500"
                    : "bg-neutral-200 cursor-default"
                } ${step.manualKey ? "cursor-pointer hover:bg-brand-400" : ""}`}
                title={step.manualKey ? "กดเพื่อ标记ว่าทำแล้ว" : undefined}
              >
                {isDone ? <CheckCircle2 size={18} /> : <span className="text-xs text-neutral-500">{step.manualKey ? " Tap" : ""}</span>}
              </button>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Icon size={16} className="text-neutral-400 shrink-0" />
                  <h3 className={`font-semibold ${isDone ? "line-through text-neutral-400" : ""}`}>
                    {step.title}
                  </h3>
                </div>
                <p className="text-sm text-neutral-500 mt-0.5">{step.desc}</p>

                {/* Auto-check status badge */}
                {step.auto && !step.manualKey && (
                  <div className="mt-2">
                    <StatusBadge status={step.auto.status} detail={step.auto.detail} />
                  </div>
                )}
              </div>

              {/* External link */}
              {step.link && !isDone && (
                <a
                  href={step.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 text-brand-500 hover:text-brand-600"
                >
                  <ExternalLink size={16} />
                </a>
              )}
            </div>
          );
        })}
      </div>

      {/* Quick link to healthcheck */}
      <div className="card p-4">
        <a
          href="/admin/healthcheck"
          className="flex items-center justify-between hover:text-brand-600 transition"
        >
          <div>
            <div className="font-semibold">🩺 ตรวจสอบระบบละเอียด</div>
            <div className="text-sm text-neutral-500">เช็คการเชื่อมต่อทุกอย่างแบบละเอียด</div>
          </div>
          <ChevronRight size={20} className="text-neutral-400" />
        </a>
      </div>
    </div>
  );
}

function findCheck(health: HealthData | null, id: string): CheckItem | null {
  if (!health) return null;
  return health.checks.find((c) => c.id === id) ?? null;
}

function StatusBadge({ status, detail }: { status: "ok" | "warn" | "fail"; detail: string }) {
  const styles = {
    ok: "bg-brand-100 text-brand-700",
    warn: "bg-amber-100 text-amber-700",
    fail: "bg-red-100 text-red-700",
  };
  const icons = {
    ok: <CheckCircle2 size={14} />,
    warn: <AlertTriangle size={14} />,
    fail: <XCircle size={14} />,
  };
  return (
    <span className={`chip ${styles[status]} gap-1`}>
      {icons[status]} {detail}
    </span>
  );
}
