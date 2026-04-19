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

  // Group checks by category
  const categories = [
    {
      title: "💬 LINE",
      icon: "💬",
      ids: ["line_token", "line_secret", "liff_id", "line_api"],
    },
    {
      title: "🗄️ ฐานข้อมูล (Supabase)",
      icon: "🗄️",
      ids: ["sb_url", "sb_anon", "sb_service", "sb_connect", "shop_data"],
    },
    {
      title: "🔐 ระบบแอดมิน",
      icon: "🔐",
      ids: ["admin_pw"],
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <a href="/admin/setup" className="text-neutral-400 hover:text-neutral-600">
            <ChevronLeft size={20} />
          </a>
          <div>
            <h1 className="text-2xl font-bold">🩺 ตรวจสอบระบบ</h1>
            <p className="text-sm text-neutral-500 mt-0.5">
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
              ? "border-brand-200 bg-brand-50"
              : "border-amber-200 bg-amber-50"
          }`}
        >
          <div className="flex items-center gap-3">
            {health.allOk ? (
              <div className="w-12 h-12 rounded-full bg-brand-500 text-white flex items-center justify-center">
                <CheckCircle2 size={24} />
              </div>
            ) : (
              <div className="w-12 h-12 rounded-full bg-amber-500 text-white flex items-center justify-center">
                <AlertTriangle size={24} />
              </div>
            )}
            <div>
              <div className="font-bold text-lg">
                {health.allOk ? "ระบบพร้อมใช้งาน! 🎉" : "มีบางอย่างยังไม่เสร็จ"}
              </div>
              <div className="text-sm text-neutral-600">
                {health.okCount}/{health.total} รายการผ่าน
                {health.timestamp && (
                  <span className="text-neutral-400 ml-2">
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

      {/* Loading */}
      {loading && !health && (
        <div className="card p-8 text-center text-neutral-500">
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

            return (
              <div key={cat.title} className="space-y-2">
                <div className="flex items-center gap-2">
                  <h2 className="font-semibold text-lg">{cat.title}</h2>
                  {catOk ? (
                    <CheckCircle2 size={16} className="text-brand-500" />
                  ) : (
                    <AlertTriangle size={16} className="text-amber-500" />
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
                <h2 className="font-semibold text-lg">📋 อื่นๆ</h2>
                {rest.map((item) => (
                  <CheckCard key={item.id} item={item} />
                ))}
              </div>
            );
          })()}
        </div>
      )}

      {/* Footer tip */}
      <div className="card p-4 text-sm text-neutral-500">
        💡 <strong>เคล็ดลับ:</strong> หากมีรายการที่ขึ้น "ยังไม่ได้ตั้งค่า"
        ให้กลับไปที่หน้า{" "}
        <a href="/admin/setup" className="text-brand-500 underline">
          ตั้งค่าร้าน
        </a>{" "}
        แล้วทำตามขั้นตอนทีละข้อ
      </div>
    </div>
  );
}

function CheckCard({ item }: { item: CheckItem }) {
  const config = {
    ok: { border: "border-brand-200", bg: "", icon: <CheckCircle2 size={18} className="text-brand-500" /> },
    warn: { border: "border-amber-200", bg: "bg-amber-50", icon: <AlertTriangle size={18} className="text-amber-500" /> },
    fail: { border: "border-red-200", bg: "bg-red-50", icon: <XCircle size={18} className="text-red-500" /> },
  };
  const c = config[item.status];
  return (
    <div className={`card p-3 flex items-start gap-3 ${c.border} ${c.bg}`}>
      <div className="mt-0.5 shrink-0">{c.icon}</div>
      <div className="min-w-0">
        <div className="font-medium text-sm">{item.label}</div>
        <div className="text-xs text-neutral-500 mt-0.5">{item.detail}</div>
      </div>
    </div>
  );
}
