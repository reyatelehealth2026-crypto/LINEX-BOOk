"use client";
import { useEffect, useState } from "react";
import { useAdmin } from "../_ctx";
import { baht } from "@/lib/utils";
import {
  CalendarCheck,
  Users,
  Scissors,
  Clock,
  CheckCircle2,
  XCircle,
  UserX,
  TrendingUp,
  Wallet,
  RefreshCw,
} from "lucide-react";

/* ---------- types ---------- */
type Upcoming = {
  id: number;
  starts_at: string;
  status: string;
  price: number;
  service: { name: string } | null;
  staff: { name: string; nickname: string | null } | null;
  customer: {
    display_name: string | null;
    full_name: string | null;
    phone: string | null;
    picture_url: string | null;
  } | null;
};

type DashboardData = {
  today: {
    date: string;
    total: number;
    statusCounts: Record<string, number>;
    revenue: number;
    estimatedRevenue: number;
    serviceBreakdown: { name: string; count: number; revenue: number }[];
    staffBreakdown: { name: string; count: number }[];
    upcoming: Upcoming[];
  };
  week: {
    total: number;
    statusCounts: Record<string, number>;
    revenue: number;
  };
  shop: {
    totalCustomers: number;
    activeServices: number;
    activeStaff: number;
  };
};

/* ---------- component ---------- */
export default function DashboardPage() {
  const { pw } = useAdmin();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch("/api/admin/dashboard", {
        headers: { "x-admin-password": pw },
      });
      if (!r.ok) {
        const d = await r.json();
        throw new Error(d.error ?? "เกิดข้อผิดพลาด");
      }
      setData(await r.json());
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pw]);

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center py-20">
        <RefreshCw className="animate-spin text-brand-500" size={32} />
        <span className="ml-3 text-neutral-500">กำลังโหลดแดชบอร์ด...</span>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="card p-8 text-center text-red-600">
        <p>❌ {error}</p>
        <button onClick={reload} className="btn-secondary mt-4">
          ลองอีกครั้ง
        </button>
      </div>
    );
  }

  const t = data!.today;
  const w = data!.week;
  const s = data!.shop;

  const thaiDate = new Date(t.date + "T00:00:00+07:00").toLocaleDateString("th-TH", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">📊 แดชบอร์ด</h1>
          <p className="text-sm text-neutral-500 mt-1">{thaiDate}</p>
        </div>
        <button onClick={reload} className="btn-secondary">
          <RefreshCw size={16} /> รีเฟรช
        </button>
      </div>

      {/* Shop overview chips */}
      <div className="flex flex-wrap gap-3">
        <OverviewChip icon={<Users size={16} />} label="ลูกค้าทั้งหมด" value={s.totalCustomers} />
        <OverviewChip icon={<Scissors size={16} />} label="บริการที่เปิดอยู่" value={s.activeServices} />
        <OverviewChip icon={<CalendarCheck size={16} />} label="พนักงาน" value={s.activeStaff} />
      </div>

      {/* Today summary cards */}
      <div>
        <h2 className="text-lg font-semibold mb-3">📅 สรุปวันนี้</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <StatCard label="คิวทั้งหมด" value={t.total} icon={<CalendarCheck size={20} />} bg="bg-blue-50 text-blue-700" />
          <StatCard label="รอยืนยัน" value={t.statusCounts.pending ?? 0} icon={<Clock size={20} />} bg="bg-amber-50 text-amber-700" />
          <StatCard label="ยืนยันแล้ว" value={t.statusCounts.confirmed ?? 0} icon={<CheckCircle2 size={20} />} bg="bg-green-50 text-green-700" />
          <StatCard label="เสร็จสิ้น" value={t.statusCounts.completed ?? 0} icon={<CheckCircle2 size={20} />} bg="bg-neutral-100 text-neutral-700" />
          <StatCard label="ยกเลิก" value={t.statusCounts.cancelled ?? 0} icon={<XCircle size={20} />} bg="bg-neutral-50 text-neutral-500" />
          <StatCard label="ไม่มา" value={t.statusCounts.no_show ?? 0} icon={<UserX size={20} />} bg="bg-red-50 text-red-600" />
        </div>
      </div>

      {/* Revenue row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <RevenueCard
          label="💰 รายได้วันนี้ (เสร็จสิ้น)"
          value={t.revenue}
          sub={`จาก ${t.statusCounts.completed ?? 0} คิว`}
        />
        <RevenueCard
          label="📈 รายได้โดยประมาณ"
          value={t.estimatedRevenue}
          sub="รวม pending + confirmed"
        />
        <RevenueCard
          label="📅 รายได้สัปดาห์นี้"
          value={w.revenue}
          sub={`${w.total} คิว · ${w.statusCounts.completed ?? 0} เสร็จสิ้น`}
        />
        <div className="card p-4 flex flex-col justify-between">
          <div className="text-xs text-neutral-500">📊 สัปดาห์นี้</div>
          <div className="flex flex-wrap gap-2 mt-2">
            <MiniBadge label="ทั้งหมด" value={w.total} />
            <MiniBadge label="เสร็จ" value={w.statusCounts.completed ?? 0} />
            <MiniBadge label="ยกเลิก" value={(w.statusCounts.cancelled ?? 0) + (w.statusCounts.no_show ?? 0)} />
          </div>
        </div>
      </div>

      {/* Breakdowns + upcoming */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Service breakdown */}
        <div className="card p-4">
          <h3 className="font-semibold mb-3">💇 ตามบริการ (วันนี้)</h3>
          {t.serviceBreakdown.length === 0 ? (
            <p className="text-sm text-neutral-400">ยังไม่มีคิว</p>
          ) : (
            <div className="space-y-2">
              {t.serviceBreakdown.map((s) => (
                <div key={s.name} className="flex items-center justify-between text-sm">
                  <span>{s.name}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-neutral-500">{s.count} คิว</span>
                    {s.revenue > 0 && <span className="font-medium text-green-700">{baht(s.revenue)}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Staff breakdown */}
        <div className="card p-4">
          <h3 className="font-semibold mb-3">👩‍💼 ตามช่าง (วันนี้)</h3>
          {t.staffBreakdown.length === 0 ? (
            <p className="text-sm text-neutral-400">ยังไม่มีคิว</p>
          ) : (
            <div className="space-y-2">
              {t.staffBreakdown.map((s) => (
                <div key={s.name} className="flex items-center justify-between text-sm">
                  <span>{s.name}</span>
                  <span className="text-neutral-500">{s.count} คิว</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Upcoming bookings */}
        <div className="card p-4">
          <h3 className="font-semibold mb-3">⏰ คิวที่กำลังจะมาถึง</h3>
          {t.upcoming.length === 0 ? (
            <p className="text-sm text-neutral-400">ไม่มีคิวที่กำลังจะมาถึง</p>
          ) : (
            <div className="space-y-3">
              {t.upcoming.map((b) => {
                const time = new Date(b.starts_at).toLocaleTimeString("th-TH", {
                  hour: "2-digit",
                  minute: "2-digit",
                });
                const customerName =
                  b.customer?.full_name ?? b.customer?.display_name ?? "ลูกค้า";
                return (
                  <div key={b.id} className="flex items-start gap-3">
                    <div className="text-center min-w-[3rem]">
                      <div className="text-lg font-bold">{time}</div>
                    </div>
                    <div className="flex-1 text-sm">
                      <div className="font-medium">{customerName}</div>
                      <div className="text-neutral-500">
                        {(b.service as any)?.name ?? "—"} · ช่าง{" "}
                        {(b.staff as any)?.nickname ?? (b.staff as any)?.name ?? "—"}
                      </div>
                    </div>
                    <StatusBadge status={b.status} />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------- sub-components ---------- */

function StatCard({
  label,
  value,
  icon,
  bg,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  bg: string;
}) {
  return (
    <div className={`${bg} rounded-2xl p-4 flex flex-col items-start gap-1`}>
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-xs opacity-70">{label}</span>
      </div>
      <div className="text-3xl font-bold">{value}</div>
    </div>
  );
}

function RevenueCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: number;
  sub: string;
}) {
  return (
    <div className="card p-4">
      <div className="text-xs text-neutral-500">{label}</div>
      <div className="text-2xl font-bold text-green-700 mt-1">{baht(value)}</div>
      <div className="text-xs text-neutral-400 mt-1">{sub}</div>
    </div>
  );
}

function OverviewChip({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="chip bg-white border border-neutral-200 gap-1">
      {icon}
      <span className="text-neutral-500">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}

function MiniBadge({ label, value }: { label: string; value: number }) {
  return (
    <span className="chip bg-neutral-100 text-neutral-700">
      {label} <strong>{value}</strong>
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { cls: string; label: string }> = {
    pending: { cls: "bg-amber-100 text-amber-700", label: "รอยืนยัน" },
    confirmed: { cls: "bg-green-100 text-green-700", label: "ยืนยันแล้ว" },
    completed: { cls: "bg-neutral-200 text-neutral-700", label: "เสร็จสิ้น" },
    cancelled: { cls: "bg-neutral-100 text-neutral-500", label: "ยกเลิก" },
    no_show: { cls: "bg-red-100 text-red-700", label: "ไม่มา" },
  };
  const m = map[status] ?? { cls: "bg-neutral-100", label: status };
  return (
    <span className={`chip ${m.cls} text-[11px]`}>{m.label}</span>
  );
}
