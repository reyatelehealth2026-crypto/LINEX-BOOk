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
  Wallet,
  RefreshCw,
  Plus,
  Bell,
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

const STAFF_TONES = ["ochre", "forest", "sage", "clay"] as const;
type Tone = (typeof STAFF_TONES)[number];

function toneClasses(tone: Tone): string {
  switch (tone) {
    case "ochre":
      return "bg-ochre-200 text-ochre-700";
    case "forest":
      return "bg-forest-200 text-forest-700";
    case "sage":
      return "bg-sage-200 text-sage-700";
    case "clay":
      return "bg-clay-200 text-clay-700";
  }
}

function initialsOf(name: string): string {
  const t = name.trim();
  if (!t) return "—";
  const parts = t.split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return t.slice(0, 2).toUpperCase();
}

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
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "เกิดข้อผิดพลาด");
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
        <RefreshCw className="animate-spin text-forest-500" size={28} />
        <span className="ml-3 text-ink-500 text-sm">กำลังโหลดแดชบอร์ด…</span>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="card p-8 text-center">
        <p className="text-clay-700 font-medium">{error}</p>
        <button onClick={reload} className="btn-secondary mt-4 mx-auto">
          ลองอีกครั้ง
        </button>
      </div>
    );
  }

  const t = data!.today;
  const w = data!.week;
  const s = data!.shop;

  const d = new Date(t.date + "T00:00:00+07:00");
  const thaiDate = d.toLocaleDateString("th-TH", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const done = t.statusCounts.completed ?? 0;
  const cancelled = (t.statusCounts.cancelled ?? 0) + (t.statusCounts.no_show ?? 0);
  const attendance = t.total > 0 ? Math.round(((t.total - cancelled) / t.total) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* ── Editorial topbar ─────────────────────────────── */}
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 pb-6 border-b border-paper-3">
        <div>
          <div className="eyebrow-muted mb-2">{thaiDate}</div>
          <h1 className="h-display text-3xl sm:text-[40px] leading-none">
            แดชบอร์ด
          </h1>
          <p className="mt-2 text-sm text-ink-500">
            ภาพรวมวันนี้ · {t.total} นัด · รายได้ {baht(t.revenue)}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={reload} className="btn-secondary" title="รีเฟรช">
            <RefreshCw size={14} />
            <span className="hidden sm:inline">รีเฟรช</span>
          </button>
          <button className="btn-secondary w-10 h-10 p-0 justify-center" title="การแจ้งเตือน">
            <Bell size={15} />
          </button>
          <button className="btn-primary">
            <Plus size={14} /> จองใหม่
          </button>
        </div>
      </div>

      {/* ── KPI row ──────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          tone="forest"
          label="นัดหมายวันนี้"
          value={t.total.toString()}
          sub={
            t.total === 0
              ? "ยังไม่มีนัด"
              : `ยืนยัน ${t.statusCounts.confirmed ?? 0} · รอ ${t.statusCounts.pending ?? 0}`
          }
          icon={<CalendarCheck size={16} />}
        />
        <KpiCard
          tone="dark"
          label="รายได้วันนี้"
          value={baht(t.revenue)}
          sub={`ประมาณการ ${baht(t.estimatedRevenue)}`}
          icon={<Wallet size={16} />}
        />
        <KpiCard
          tone="cream"
          label="ลูกค้าทั้งหมด"
          value={s.totalCustomers.toString()}
          sub={`บริการ ${s.activeServices} · พนักงาน ${s.activeStaff}`}
          icon={<Users size={16} />}
        />
        <KpiCard
          tone="cream"
          label="อัตราการมา"
          value={`${attendance}%`}
          sub={cancelled ? `${cancelled} รายไม่มา/ยกเลิก` : "ไม่มีรายไม่มา"}
          icon={<CheckCircle2 size={16} />}
        />
      </div>

      {/* ── Main grid: schedule + side rail ──────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-4">
        {/* Today's schedule */}
        <div className="card p-0 overflow-hidden">
          <div className="flex items-end justify-between p-5 pb-0">
            <div>
              <div className="font-display text-[18px] text-ink-900">
                ตารางนัดหมายวันนี้
              </div>
              <div className="text-xs text-ink-500 mt-0.5">
                {thaiDate} · {t.total} นัด
              </div>
            </div>
            <div className="flex gap-2">
              <StatusChip tone="forest" label={`ยืนยัน ${t.statusCounts.confirmed ?? 0}`} />
              <StatusChip tone="ochre" label={`รอ ${t.statusCounts.pending ?? 0}`} />
              <StatusChip tone="cream" label={`เสร็จ ${done}`} />
            </div>
          </div>
          <div className="p-5">
            {t.upcoming.length === 0 ? (
              <div className="text-center py-14 text-ink-500 text-sm">
                ไม่มีคิวที่กำลังจะมาถึง
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {t.upcoming.map((b, i) => (
                  <ScheduleRow key={b.id} booking={b} tone={STAFF_TONES[i % STAFF_TONES.length]} />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Side rail */}
        <div className="flex flex-col gap-4">
          {/* Revenue + week */}
          <div className="card p-5">
            <div className="font-display text-[17px] text-ink-900">รายได้สัปดาห์นี้</div>
            <div className="text-xs text-ink-500 mt-0.5">
              รวม {baht(w.revenue)} · {w.total} คิว
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <div className="font-display text-[36px] leading-none text-ink-900">
                {baht(w.revenue)}
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-paper-3 grid grid-cols-2 gap-3">
              <MiniStat label="เสร็จสิ้น" value={w.statusCounts.completed ?? 0} />
              <MiniStat
                label="ยกเลิก/ไม่มา"
                value={(w.statusCounts.cancelled ?? 0) + (w.statusCounts.no_show ?? 0)}
              />
            </div>
          </div>

          {/* Today status breakdown */}
          <div className="card p-5">
            <div className="font-display text-[17px] text-ink-900 mb-3">สถานะวันนี้</div>
            <div className="space-y-2">
              <StatusRow
                icon={<Clock size={14} />}
                label="รอยืนยัน"
                value={t.statusCounts.pending ?? 0}
                tone="ochre"
              />
              <StatusRow
                icon={<CheckCircle2 size={14} />}
                label="ยืนยันแล้ว"
                value={t.statusCounts.confirmed ?? 0}
                tone="forest"
              />
              <StatusRow
                icon={<CheckCircle2 size={14} />}
                label="เสร็จสิ้น"
                value={done}
                tone="sage"
              />
              <StatusRow
                icon={<XCircle size={14} />}
                label="ยกเลิก"
                value={t.statusCounts.cancelled ?? 0}
                tone="cream"
              />
              <StatusRow
                icon={<UserX size={14} />}
                label="ไม่มา"
                value={t.statusCounts.no_show ?? 0}
                tone="clay"
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── Breakdowns row ───────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="font-display text-[17px] text-ink-900">ตามบริการ (วันนี้)</div>
            <Scissors size={14} className="text-ink-400" />
          </div>
          {t.serviceBreakdown.length === 0 ? (
            <p className="text-sm text-ink-400 py-6 text-center">ยังไม่มีคิว</p>
          ) : (
            <div className="divide-y divide-paper-3">
              {t.serviceBreakdown.map((sv) => (
                <div key={sv.name} className="flex items-center justify-between py-2.5 text-sm">
                  <span className="text-ink-900 truncate">{sv.name}</span>
                  <div className="flex items-center gap-4 shrink-0">
                    <span className="text-ink-500 font-mono text-[12px]">{sv.count} คิว</span>
                    {sv.revenue > 0 && (
                      <span className="font-display text-[15px] text-forest-700">
                        {baht(sv.revenue)}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="font-display text-[17px] text-ink-900">ตามพนักงาน (วันนี้)</div>
            <Users size={14} className="text-ink-400" />
          </div>
          {t.staffBreakdown.length === 0 ? (
            <p className="text-sm text-ink-400 py-6 text-center">ยังไม่มีคิว</p>
          ) : (
            <div className="flex flex-col gap-3">
              {t.staffBreakdown.map((st, i) => {
                const tone = STAFF_TONES[i % STAFF_TONES.length];
                const max = Math.max(...t.staffBreakdown.map((x) => x.count), 1);
                const pct = Math.round((st.count / max) * 100);
                return (
                  <div key={st.name} className="flex items-center gap-3">
                    <div
                      className={`w-8 h-8 rounded-full grid place-items-center text-[10px] font-semibold ${toneClasses(tone)}`}
                    >
                      {initialsOf(st.name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline justify-between">
                        <span className="text-[13px] font-medium text-ink-900 truncate">
                          {st.name}
                        </span>
                        <span className="text-[11px] text-ink-500 font-mono shrink-0">
                          {st.count} คิว
                        </span>
                      </div>
                      <div className="h-[3px] bg-paper-2 rounded-sm mt-1.5 overflow-hidden">
                        <div
                          className="h-full bg-forest-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
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

type KpiTone = "forest" | "dark" | "cream";

function KpiCard({
  tone,
  label,
  value,
  sub,
  icon,
}: {
  tone: KpiTone;
  label: string;
  value: string;
  sub: string;
  icon: React.ReactNode;
}) {
  const toneCls =
    tone === "dark"
      ? "bg-ink-900 text-paper-1 border-transparent"
      : tone === "forest"
        ? "bg-forest-500 text-white border-transparent"
        : "bg-paper-0 text-ink-900 border-paper-3";

  const subCls = tone === "cream" ? "text-ink-500" : "text-white/65";

  return (
    <div className={`rounded-[14px] border ${toneCls} p-5 min-h-[140px] flex flex-col gap-3 shadow-soft`}>
      <div className="flex items-center justify-between">
        <span className={`text-[10px] font-semibold uppercase tracking-[0.14em] ${tone === "cream" ? "text-ink-500" : "opacity-80"}`}>
          {label}
        </span>
        <span className={tone === "cream" ? "text-ink-400" : "opacity-80"}>{icon}</span>
      </div>
      <div className="font-display text-[36px] font-medium leading-none tracking-tight">
        {value}
      </div>
      <div className={`text-[11px] ${subCls}`}>{sub}</div>
    </div>
  );
}

function ScheduleRow({ booking: b, tone }: { booking: Upcoming; tone: Tone }) {
  const time = new Date(b.starts_at).toLocaleTimeString("th-TH", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const customerName =
    b.customer?.full_name ?? b.customer?.display_name ?? "ลูกค้า";
  const svcName = b.service?.name ?? "—";
  const staffName = b.staff?.nickname ?? b.staff?.name ?? "—";

  const statusStyles = statusVisual(b.status);

  const rowHighlight =
    b.status === "confirmed" || b.status === "pending"
      ? "bg-transparent border-paper-3"
      : b.status === "completed"
        ? "bg-paper-1 border-paper-3"
        : "bg-transparent border-paper-3";

  const isDone = b.status === "completed" || b.status === "cancelled" || b.status === "no_show";

  return (
    <div
      className={`grid grid-cols-[70px_36px_1fr_auto_auto] gap-3 items-center px-3.5 py-3 rounded-[10px] border ${rowHighlight}`}
    >
      <div>
        <div className={`font-display text-[16px] font-medium leading-tight ${isDone ? "text-ink-400" : "text-ink-900"}`}>
          {time}
        </div>
        <div className="text-[10px] text-ink-500 font-mono">นาที</div>
      </div>
      <div
        className={`w-9 h-9 rounded-full grid place-items-center text-[11px] font-semibold ${toneClasses(tone)}`}
      >
        {initialsOf(customerName)}
      </div>
      <div className="min-w-0">
        <div className={`text-[13px] font-medium truncate ${isDone ? "text-ink-400 line-through" : "text-ink-900"}`}>
          {svcName}
        </div>
        <div className="text-[11px] text-ink-500 mt-0.5 truncate">
          {customerName} · {staffName}
        </div>
      </div>
      <div className={`font-display text-[15px] font-medium ${isDone ? "text-ink-400" : "text-ink-900"}`}>
        {baht(b.price)}
      </div>
      <div>
        <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-medium whitespace-nowrap ${statusStyles.cls}`}>
          {statusStyles.label}
        </span>
      </div>
    </div>
  );
}

function statusVisual(status: string): { cls: string; label: string } {
  switch (status) {
    case "pending":
      return { cls: "bg-ochre-200 text-ochre-700", label: "รอยืนยัน" };
    case "confirmed":
      return { cls: "bg-forest-100 text-forest-700", label: "ยืนยันแล้ว" };
    case "completed":
      return { cls: "bg-paper-2 text-ink-500", label: "เสร็จสิ้น" };
    case "cancelled":
      return { cls: "bg-paper-2 text-ink-400", label: "ยกเลิก" };
    case "no_show":
      return { cls: "bg-clay-200 text-clay-700", label: "ไม่มา" };
    default:
      return { cls: "bg-paper-2 text-ink-500", label: status };
  }
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-[0.12em] text-ink-500">{label}</div>
      <div className="font-display text-[22px] font-medium text-ink-900 mt-0.5">{value}</div>
    </div>
  );
}

function StatusRow({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  tone: "forest" | "ochre" | "sage" | "clay" | "cream";
}) {
  const dotCls =
    tone === "forest"
      ? "bg-forest-500"
      : tone === "ochre"
        ? "bg-ochre-500"
        : tone === "sage"
          ? "bg-sage-500"
          : tone === "clay"
            ? "bg-clay-500"
            : "bg-ink-300";
  return (
    <div className="flex items-center gap-3 text-[13px]">
      <span className={`w-1.5 h-1.5 rounded-full ${dotCls}`} />
      <span className="text-ink-400">{icon}</span>
      <span className="text-ink-700 flex-1">{label}</span>
      <span className="font-mono text-ink-900">{value}</span>
    </div>
  );
}

function StatusChip({
  tone,
  label,
}: {
  tone: "forest" | "ochre" | "cream";
  label: string;
}) {
  const cls =
    tone === "forest"
      ? "bg-forest-100 text-forest-700"
      : tone === "ochre"
        ? "bg-ochre-200 text-ochre-700"
        : "bg-paper-2 text-ink-600";
  return (
    <span className={`text-[10px] font-medium rounded-full px-2.5 py-1 ${cls}`}>
      {label}
    </span>
  );
}
