"use client";
import { useEffect, useState } from "react";
import { useAdmin } from "../_ctx";
import { baht } from "@/lib/utils";
import {
  RefreshCw,
  TrendingUp,
  Users,
  UserX,
  Activity,
  BarChart3,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";

/* ─── Types ─────────────────────────────────────────────────── */
type KPI = {
  window_days: number;
  total_customers: number;
  total_bookings: number;
  completed: number;
  no_show: number;
  cancelled: number;
  revenue: number;
  no_show_rate: number;
  cancel_rate: number;
  retention_rate: number;
  avg_ltv: number;
  by_service: { service_id: number; count: number; revenue: number }[];
  by_staff: { staff_id: number | null; count: number; revenue: number }[];
  by_day_of_week: Record<number, number>;
};

type Segment = {
  id: number;
  full_name: string | null;
  display_name: string | null;
  phone: string | null;
  lifetime_points: number;
  visit_count: number;
  last_visit: string | null;
  total_spent: number;
  segment: "new" | "returning" | "at_risk" | "vip";
};

type Forecast = {
  avg_by_dow: Record<number, number>;
  next_7_days: { date: string; dow: number; expected: number }[];
  lookback_days: number;
};

const DOW_TH = ["อา.", "จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส."];
const SEGMENT_CONFIG = {
  new:       { label: "ใหม่",      cls: "bg-blue-50 text-blue-700" },
  returning: { label: "ประจำ",     cls: "bg-green-50 text-green-700" },
  at_risk:   { label: "เสี่ยงหาย", cls: "bg-amber-50 text-amber-700" },
  vip:       { label: "VIP",       cls: "bg-purple-50 text-purple-700" },
};

/* ─── Page ───────────────────────────────────────────────────── */
export default function AnalyticsPage() {
  const { pw } = useAdmin();
  const [kpi, setKpi] = useState<KPI | null>(null);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [forecast, setForecast] = useState<Forecast | null>(null);
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"overview" | "segments" | "forecast">("overview");

  const headers = { "x-admin-password": pw };

  async function reload() {
    setLoading(true);
    const [kRes, sRes, fRes] = await Promise.all([
      fetch(`/api/admin/analytics?mode=kpi&days=${days}`, { headers }),
      fetch("/api/admin/analytics?mode=segments&limit=200", { headers }),
      fetch("/api/admin/analytics?mode=forecast&lookback=90", { headers }),
    ]);
    if (kRes.ok) setKpi(await kRes.json());
    if (sRes.ok) setSegments((await sRes.json()).segments ?? []);
    if (fRes.ok) setForecast(await fRes.json());
    setLoading(false);
  }

  useEffect(() => { reload(); }, [days, pw]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 animate-fade-up">
        <div>
          <div className="eyebrow">Business Intelligence</div>
          <h1 className="h-display text-2xl sm:text-3xl">Analytics</h1>
        </div>
        <div className="flex items-center gap-2">
          <select
            className="input text-sm py-1.5 pr-8 w-32"
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
          >
            <option value={7}>7 วัน</option>
            <option value={30}>30 วัน</option>
            <option value={60}>60 วัน</option>
            <option value={90}>90 วัน</option>
          </select>
          <button onClick={reload} className="btn-secondary" disabled={loading}>
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
            รีเฟรช
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-ink-100 p-1 rounded-2xl w-fit">
        {(["overview", "segments", "forecast"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-xl text-sm font-semibold transition ${tab === t ? "bg-white shadow text-linex-700" : "text-ink-500 hover:text-ink-700"}`}
          >
            {{ overview: "ภาพรวม", segments: "ลูกค้า", forecast: "พยากรณ์" }[t]}
          </button>
        ))}
      </div>

      {/* ── TAB: Overview ─────────────────────────────────── */}
      {tab === "overview" && kpi && (
        <div className="space-y-5 animate-fade-up">
          {/* KPI cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            <KpiCard label="รายได้รวม" value={baht(kpi.revenue)} sub={`${days} วัน`} icon={<TrendingUp size={18} />} color="bg-green-50 text-green-700" />
            <KpiCard label="Avg LTV" value={baht(kpi.avg_ltv)} sub="ต่อลูกค้า" icon={<Users size={18} />} color="bg-blue-50 text-blue-700" />
            <KpiCard label="Retention" value={`${(kpi.retention_rate * 100).toFixed(0)}%`} sub="ลูกค้ากลับมา" icon={<CheckCircle2 size={18} />} color="bg-purple-50 text-purple-700" />
            <KpiCard label="No-show" value={`${(kpi.no_show_rate * 100).toFixed(1)}%`} sub={`${kpi.no_show} ครั้ง`} icon={<UserX size={18} />} color="bg-red-50 text-red-600" />
            <KpiCard label="คิวทั้งหมด" value={kpi.total_bookings} sub={`${kpi.completed} เสร็จสิ้น`} icon={<Activity size={18} />} color="bg-amber-50 text-amber-700" />
            <KpiCard label="ลูกค้าทั้งหมด" value={kpi.total_customers} sub="สะสม" icon={<Users size={18} />} color="bg-ink-100 text-ink-700" />
            <KpiCard label="ยกเลิก" value={`${(kpi.cancel_rate * 100).toFixed(1)}%`} sub={`${kpi.cancelled} ครั้ง`} icon={<AlertTriangle size={18} />} color="bg-orange-50 text-orange-600" />
          </div>

          {/* Revenue by service + staff */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* By service */}
            <div className="card p-4 space-y-3">
              <h3 className="font-semibold flex items-center gap-2"><BarChart3 size={16} /> รายได้ตามบริการ</h3>
              {kpi.by_service.length === 0 ? (
                <p className="text-sm text-ink-400">ยังไม่มีข้อมูล</p>
              ) : (
                <div className="space-y-2.5">
                  {[...kpi.by_service].sort((a, b) => b.revenue - a.revenue).map((s) => {
                    const pct = kpi.revenue > 0 ? (s.revenue / kpi.revenue) * 100 : 0;
                    return (
                      <div key={s.service_id}>
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="text-ink-600">Service #{s.service_id}</span>
                          <div className="flex gap-3 text-right">
                            <span className="text-ink-400">{s.count} คิว</span>
                            <span className="font-semibold text-green-700">{baht(s.revenue)}</span>
                          </div>
                        </div>
                        <div className="h-1.5 bg-ink-100 rounded-full overflow-hidden">
                          <div className="h-full bg-green-400 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* By staff */}
            <div className="card p-4 space-y-3">
              <h3 className="font-semibold flex items-center gap-2"><BarChart3 size={16} /> รายได้ตามช่าง</h3>
              {kpi.by_staff.length === 0 ? (
                <p className="text-sm text-ink-400">ยังไม่มีข้อมูล</p>
              ) : (
                <div className="space-y-2.5">
                  {[...kpi.by_staff].sort((a, b) => b.revenue - a.revenue).map((s) => {
                    const pct = kpi.revenue > 0 ? (s.revenue / kpi.revenue) * 100 : 0;
                    return (
                      <div key={s.staff_id ?? "none"}>
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="text-ink-600">{s.staff_id ? `Staff #${s.staff_id}` : "ไม่ระบุช่าง"}</span>
                          <div className="flex gap-3 text-right">
                            <span className="text-ink-400">{s.count} คิว</span>
                            <span className="font-semibold text-blue-700">{baht(s.revenue)}</span>
                          </div>
                        </div>
                        <div className="h-1.5 bg-ink-100 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-400 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* By day-of-week bar */}
          <div className="card p-4 space-y-3">
            <h3 className="font-semibold">📅 คิวตามวันในสัปดาห์</h3>
            <div className="flex items-end gap-2 h-20">
              {Array.from({ length: 7 }, (_, i) => {
                const count = kpi.by_day_of_week[i] ?? 0;
                const max = Math.max(...Object.values(kpi.by_day_of_week), 1);
                const pct = (count / max) * 100;
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div className="text-[10px] font-semibold text-ink-500">{count}</div>
                    <div className="w-full bg-ink-100 rounded-t-lg relative overflow-hidden" style={{ height: "48px" }}>
                      <div
                        className="absolute bottom-0 w-full bg-linex-400 rounded-t-lg transition-all"
                        style={{ height: `${pct}%` }}
                      />
                    </div>
                    <div className="text-[10px] text-ink-500">{DOW_TH[i]}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── TAB: Segments ─────────────────────────────────── */}
      {tab === "segments" && (
        <div className="space-y-4 animate-fade-up">
          {/* Summary chips */}
          {(["new", "returning", "at_risk", "vip"] as const).map((seg) => {
            const count = segments.filter((s) => s.segment === seg).length;
            const cfg = SEGMENT_CONFIG[seg];
            return (
              <span key={seg} className={`chip font-semibold ${cfg.cls}`}>
                {cfg.label}: {count} คน
              </span>
            );
          })}

          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-ink-50 border-b border-ink-100">
                <tr>
                  <th className="text-left px-4 py-2.5 font-semibold text-ink-600">ลูกค้า</th>
                  <th className="text-center px-3 py-2.5 font-semibold text-ink-600">Segment</th>
                  <th className="text-center px-3 py-2.5 font-semibold text-ink-600">ครั้ง</th>
                  <th className="text-right px-4 py-2.5 font-semibold text-ink-600">ยอดรวม</th>
                  <th className="text-right px-4 py-2.5 font-semibold text-ink-600 hidden sm:table-cell">แต้ม</th>
                  <th className="text-right px-4 py-2.5 font-semibold text-ink-600 hidden md:table-cell">เยี่ยมล่าสุด</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-50">
                {segments.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-ink-400">ยังไม่มีข้อมูลลูกค้า</td>
                  </tr>
                ) : (
                  segments.map((c) => {
                    const cfg = SEGMENT_CONFIG[c.segment];
                    return (
                      <tr key={c.id} className="hover:bg-ink-50 transition">
                        <td className="px-4 py-2.5">
                          <div className="font-medium text-ink-800">{c.full_name ?? c.display_name ?? `#${c.id}`}</div>
                          {c.phone && <div className="text-[11px] text-ink-400">{c.phone}</div>}
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          <span className={`chip text-xs ${cfg.cls}`}>{cfg.label}</span>
                        </td>
                        <td className="px-3 py-2.5 text-center text-ink-600">{c.visit_count}</td>
                        <td className="px-4 py-2.5 text-right font-semibold text-green-700">{baht(c.total_spent)}</td>
                        <td className="px-4 py-2.5 text-right text-ink-500 hidden sm:table-cell">{c.lifetime_points.toLocaleString()}</td>
                        <td className="px-4 py-2.5 text-right text-ink-400 text-[11px] hidden md:table-cell">
                          {c.last_visit ? new Date(c.last_visit).toLocaleDateString("th-TH") : "—"}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── TAB: Forecast ─────────────────────────────────── */}
      {tab === "forecast" && forecast && (
        <div className="space-y-4 animate-fade-up">
          <div className="card p-4 space-y-3">
            <h3 className="font-semibold">🔮 พยากรณ์ 7 วันถัดไป</h3>
            <p className="text-xs text-ink-400">อ้างอิงจากค่าเฉลี่ย {forecast.lookback_days} วันย้อนหลัง</p>
            <div className="space-y-2">
              {forecast.next_7_days.map((d) => {
                const maxExpected = Math.max(...forecast.next_7_days.map((x) => x.expected), 1);
                const pct = (d.expected / maxExpected) * 100;
                const isBusy = d.expected >= maxExpected * 0.8;
                const dateLabel = new Date(d.date + "T00:00:00+07:00").toLocaleDateString("th-TH", {
                  weekday: "short", day: "numeric", month: "short",
                });
                return (
                  <div key={d.date} className="flex items-center gap-3">
                    <div className="w-28 text-xs text-ink-600 shrink-0">{dateLabel}</div>
                    <div className="flex-1 h-5 bg-ink-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${isBusy ? "bg-accent-rose" : "bg-linex-400"}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <div className="w-16 text-right text-xs font-semibold text-ink-600 shrink-0">
                      ~{d.expected} คิว
                      {isBusy && <span className="ml-1 text-accent-rose">🔥</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="card p-4 space-y-3">
            <h3 className="font-semibold">📊 ค่าเฉลี่ยตามวัน</h3>
            <div className="flex items-end gap-2 h-20">
              {Array.from({ length: 7 }, (_, i) => {
                const avg = forecast.avg_by_dow[i] ?? 0;
                const max = Math.max(...Object.values(forecast.avg_by_dow), 1);
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div className="text-[10px] font-semibold text-ink-500">{avg}</div>
                    <div className="w-full bg-ink-100 rounded-t-lg relative overflow-hidden" style={{ height: "48px" }}>
                      <div
                        className="absolute bottom-0 w-full bg-linex-400 rounded-t-lg"
                        style={{ height: `${(avg / max) * 100}%` }}
                      />
                    </div>
                    <div className="text-[10px] text-ink-500">{DOW_TH[i]}</div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="linex-panel p-4 flex items-start gap-3">
            <ArrowRight size={16} className="text-linex-500 mt-0.5 shrink-0" />
            <p className="text-sm text-ink-600">
              วันที่ขีด <span className="text-accent-rose font-semibold">🔥</span> คาดว่าคิวจะเยอะ — พิจารณาเพิ่มพนักงาน หรือจำกัด slot ล่วงหน้า
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Sub-components ─────────────────────────────────────────── */
function KpiCard({ label, value, sub, icon, color }: { label: string; value: string | number; sub: string; icon: React.ReactNode; color: string }) {
  return (
    <div className={`${color} rounded-2xl p-4 space-y-1`}>
      <div className="flex items-center gap-1.5 text-xs opacity-70">
        {icon} {label}
      </div>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-[11px] opacity-60">{sub}</div>
    </div>
  );
}
