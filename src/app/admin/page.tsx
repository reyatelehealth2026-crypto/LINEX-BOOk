"use client";
import { useEffect, useState, useCallback, useMemo } from "react";
import { useAdmin } from "./_ctx";
import { createClient } from "@supabase/supabase-js";
import { baht } from "@/lib/utils";
import {
  CheckCircle2,
  XCircle,
  UserX,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  TrendingUp,
} from "lucide-react";

type Booking = {
  id: number;
  starts_at: string;
  ends_at: string;
  status: string;
  price: number;
  note: string | null;
  service: { name: string; duration_min: number } | null;
  staff: { nickname: string | null; name: string } | null;
  customer: {
    id: number;
    display_name: string | null;
    full_name: string | null;
    phone: string | null;
    picture_url: string | null;
    line_user_id: string;
    points: number;
    visit_count: number;
  } | null;
};

export default function AdminHome() {
  const { pw } = useAdmin();
  const [list, setList] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState<string>(() => new Date().toISOString().slice(0, 10));

  const reload = useCallback(async () => {
    setLoading(true);
    const r = await fetch(`/api/bookings?date=${date}`, { headers: { "x-admin-password": pw } });
    const d = await r.json();
    setList(d.bookings ?? []);
    setLoading(false);
  }, [date, pw]);

  useEffect(() => { reload(); }, [reload]);

  // Realtime: listen for insert/update on bookings
  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) return;
    const sb = createClient(url, key);
    const ch = sb
      .channel("bookings-admin")
      .on("postgres_changes", { event: "*", schema: "public", table: "bookings" }, () => reload())
      .subscribe();
    return () => { sb.removeChannel(ch); };
  }, [reload]);

  async function setStatus(id: number, status: string) {
    await fetch(`/api/admin/bookings/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "x-admin-password": pw },
      body: JSON.stringify({ status })
    });
    reload();
  }

  const counts = useMemo(() => {
    const c = { all: list.length, pending: 0, confirmed: 0, done: 0, lost: 0 };
    for (const b of list) {
      if (b.status === "pending") c.pending++;
      else if (b.status === "confirmed") c.confirmed++;
      else if (b.status === "completed") c.done++;
      else if (b.status === "cancelled" || b.status === "no_show") c.lost++;
    }
    return c;
  }, [list]);

  const [filter, setFilter] = useState<"all" | "pending" | "confirmed" | "done">("all");
  const [staffFilter, setStaffFilter] = useState<string>("all");

  const staffNames = useMemo(() => {
    const names = new Set<string>();
    for (const b of list) {
      const n = b.staff?.nickname ?? b.staff?.name;
      if (n) names.add(n);
    }
    return Array.from(names).sort();
  }, [list]);

  const visible = useMemo(() => {
    let result = list;
    if (filter === "done") result = result.filter((b) => b.status === "completed");
    else if (filter !== "all") result = result.filter((b) => b.status === filter);
    if (staffFilter !== "all") {
      result = result.filter((b) => (b.staff?.nickname ?? b.staff?.name) === staffFilter);
    }
    return result;
  }, [list, filter, staffFilter]);

  const revenue = useMemo(() => {
    let actual = 0;
    let estimated = 0;
    for (const b of list) {
      const p = Number(b.price ?? 0);
      if (b.status === "completed") { actual += p; estimated += p; }
      else if (b.status === "confirmed" || b.status === "pending") { estimated += p; }
    }
    return { actual, estimated };
  }, [list]);

  const dateObj = new Date(date);
  const today = new Date().toISOString().slice(0, 10);
  const isToday = date === today;
  const shiftDate = (days: number) => {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    setDate(d.toISOString().slice(0, 10));
  };

  return (
    <div className="space-y-4 sm:space-y-5 animate-fade-up">
      {/* Page title + date nav (mobile-first) */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="eyebrow">Admin · Daily Queue</div>
          <h1 className="h-display text-2xl sm:text-3xl">คิวประจำวัน</h1>
        </div>

        <div className="card p-1.5 flex items-center gap-1 shadow-soft">
          <button
            onClick={() => shiftDate(-1)}
            className="w-9 h-9 rounded-xl hover:bg-ink-100 text-ink-600 flex items-center justify-center"
            aria-label="ก่อนหน้า"
          >
            <ChevronLeft size={16} />
          </button>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="bg-transparent text-sm font-semibold text-ink-800 text-center outline-none w-36 sm:w-40"
          />
          <button
            onClick={() => shiftDate(1)}
            className="w-9 h-9 rounded-xl hover:bg-ink-100 text-ink-600 flex items-center justify-center"
            aria-label="ถัดไป"
          >
            <ChevronRight size={16} />
          </button>
          {!isToday && (
            <button
              onClick={() => setDate(today)}
              className="hidden sm:inline-flex px-2.5 h-9 rounded-xl text-xs font-semibold text-brand-600 hover:bg-brand-50 items-center"
            >
              วันนี้
            </button>
          )}
          <button
            onClick={reload}
            className="w-9 h-9 rounded-xl hover:bg-ink-100 text-ink-600 flex items-center justify-center"
            aria-label="รีเฟรช"
            title="รีเฟรช"
          >
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* Revenue summary card */}
      {isToday && (revenue.actual > 0 || revenue.estimated > 0) && (
        <div className="card p-4 bg-gradient-to-r from-brand-600 to-brand-700 text-white flex items-center gap-4">
          <div className="w-10 h-10 rounded-2xl bg-white/15 flex items-center justify-center shrink-0">
            <TrendingUp size={20} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[11px] uppercase tracking-wider opacity-75 font-semibold">รายได้วันนี้</div>
            <div className="text-2xl font-extrabold leading-none mt-0.5">{baht(revenue.actual)}</div>
          </div>
          {revenue.estimated > revenue.actual && (
            <div className="text-right shrink-0">
              <div className="text-[11px] opacity-70">คาดการณ์</div>
              <div className="text-lg font-bold opacity-90">{baht(revenue.estimated)}</div>
            </div>
          )}
        </div>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-3">
        <Stat label="ทั้งหมด" value={counts.all} tone="neutral" />
        <Stat label="รอยืนยัน" value={counts.pending} tone="amber" />
        <Stat label="ยืนยันแล้ว" value={counts.confirmed} tone="brand" />
        <Stat label="เสร็จสิ้น" value={counts.done} tone="ink" />
        <Stat label="ยกเลิก" value={counts.lost} tone="rose" />
      </div>

      {/* Filter pills + staff dropdown */}
      <div className="flex flex-wrap items-center gap-1.5">
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
          <FilterPill active={filter === "all"} onClick={() => setFilter("all")} label="ทั้งหมด" count={counts.all} />
          <FilterPill
            active={filter === "pending"}
            onClick={() => setFilter("pending")}
            label="รอยืนยัน"
            count={counts.pending}
            tone="amber"
          />
          <FilterPill
            active={filter === "confirmed"}
            onClick={() => setFilter("confirmed")}
            label="ยืนยันแล้ว"
            count={counts.confirmed}
            tone="brand"
          />
          <FilterPill active={filter === "done"} onClick={() => setFilter("done")} label="เสร็จสิ้น" count={counts.done} />
        </div>
        {staffNames.length > 1 && (
          <select
            value={staffFilter}
            onChange={(e) => setStaffFilter(e.target.value)}
            className="ml-auto shrink-0 text-xs font-semibold bg-white border border-ink-200 text-ink-700 rounded-full px-3 py-2 outline-none hover:border-ink-300 cursor-pointer"
          >
            <option value="all">ช่างทั้งหมด</option>
            {staffNames.map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        )}
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="skeleton h-28" />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <div className="card p-10 text-center space-y-3 text-ink-500">
          <div className="mx-auto w-12 h-12 rounded-2xl bg-ink-100 flex items-center justify-center">
            <CalendarDays size={22} />
          </div>
          <div className="text-sm">
            {list.length === 0
              ? `ยังไม่มีคิวในวัน ${dateObj.toLocaleDateString("th-TH", { day: "numeric", month: "short" })}`
              : "ไม่มีรายการในช่วงที่เลือก"}
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {visible.map((b) => <BookingCard key={b.id} b={b} onSet={setStatus} />)}
        </div>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "neutral" | "amber" | "brand" | "ink" | "rose";
}) {
  const toneMap = {
    neutral: "bg-white border border-ink-200 text-ink-700",
    amber: "bg-amber-50 border border-amber-200 text-amber-800",
    brand: "bg-brand-50 border border-brand-200 text-brand-800",
    ink: "bg-ink-100 border border-ink-200 text-ink-700",
    rose: "bg-accent-rose/10 border border-accent-rose/20 text-accent-rose",
  };
  return (
    <div className={`rounded-2xl px-3 py-2.5 ${toneMap[tone]}`}>
      <div className="text-[10px] uppercase tracking-wider font-semibold opacity-80">{label}</div>
      <div className="text-2xl sm:text-3xl font-extrabold leading-none mt-1">{value}</div>
    </div>
  );
}

function FilterPill({
  active,
  onClick,
  label,
  count,
  tone,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
  tone?: "amber" | "brand";
}) {
  const activeBg =
    tone === "amber" ? "bg-amber-500 text-white" : tone === "brand" ? "bg-brand-500 text-white" : "bg-ink-900 text-white";
  return (
    <button
      onClick={onClick}
      className={`shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold transition ${
        active ? activeBg : "bg-white border border-ink-200 text-ink-700 hover:border-ink-300"
      }`}
    >
      {label}
      <span className={`px-1.5 rounded-full text-[10px] ${active ? "bg-white/25" : "bg-ink-100 text-ink-700"}`}>
        {count}
      </span>
    </button>
  );
}

function BookingCard({ b, onSet }: { b: Booking; onSet: (id: number, status: string) => void }) {
  const start = new Date(b.starts_at);
  const time = start.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" });
  const statusMeta = STATUS_MAP[b.status] ?? STATUS_MAP.pending;

  return (
    <div className="card p-4 animate-fade-up">
      <div className="flex items-start gap-3">
        <div className="shrink-0 text-center w-16">
          <div className="text-2xl font-extrabold text-ink-900 leading-none">{time}</div>
          <div className="text-[10px] text-ink-400 uppercase tracking-wider mt-1">
            {b.service?.duration_min ?? 0} นาที
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {b.customer?.picture_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={b.customer.picture_url} alt="" className="w-7 h-7 rounded-full" />
            )}
            <div className="min-w-0 flex-1">
              <div className="font-semibold text-ink-900 truncate">
                {b.customer?.full_name ?? b.customer?.display_name ?? "ลูกค้า"}
                {b.customer?.phone && <span className="text-xs font-normal text-ink-500 ml-2">{b.customer.phone}</span>}
              </div>
              <div className="text-xs text-ink-500 truncate">
                {b.service?.name} · {b.staff?.nickname ?? b.staff?.name ?? "—"} · {baht(b.price)}
              </div>
            </div>
          </div>
          {b.customer && (b.customer.visit_count || b.customer.points) ? (
            <div className="text-[11px] text-ink-400 mt-1">
              {b.customer.visit_count} ครั้ง · {b.customer.points} แต้ม
            </div>
          ) : null}
          {b.note && (
            <div className="text-[11px] italic text-ink-500 mt-1.5 bg-ink-50 p-2 rounded-xl">📝 {b.note}</div>
          )}
        </div>
        <span className={`chip ${statusMeta.cls} shrink-0`}>{statusMeta.label}</span>
      </div>

      {(b.status === "pending" || b.status === "confirmed") && (
        <div className="mt-3 pt-3 border-t border-ink-100 grid grid-cols-2 sm:grid-cols-4 gap-2">
          {b.status === "pending" && (
            <ActionButton
              onClick={() => onSet(b.id, "confirmed")}
              icon={<CheckCircle2 size={14} />}
              label="ยืนยัน"
              tone="brand"
            />
          )}
          {b.status === "confirmed" && (
            <ActionButton
              onClick={() => onSet(b.id, "completed")}
              icon={<CheckCircle2 size={14} />}
              label="เสร็จสิ้น"
              tone="brand"
            />
          )}
          {b.status === "pending" && (
            <ActionButton
              onClick={() => onSet(b.id, "completed")}
              icon={<CheckCircle2 size={14} />}
              label="เสร็จสิ้น"
              tone="ghost"
            />
          )}
          <ActionButton
            onClick={() => onSet(b.id, "no_show")}
            icon={<UserX size={14} />}
            label="ไม่มา"
            tone="rose"
          />
          <ActionButton
            onClick={() => onSet(b.id, "cancelled")}
            icon={<XCircle size={14} />}
            label="ยกเลิก"
            tone="ghost"
          />
        </div>
      )}
    </div>
  );
}

function ActionButton({
  onClick,
  icon,
  label,
  tone,
}: {
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  tone: "brand" | "rose" | "ghost";
}) {
  const cls =
    tone === "brand"
      ? "bg-brand-500 text-white hover:bg-brand-600 shadow-soft"
      : tone === "rose"
        ? "bg-accent-rose/10 text-accent-rose hover:bg-accent-rose/15"
        : "bg-ink-100 text-ink-700 hover:bg-ink-200";
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition active:scale-95 ${cls}`}
    >
      {icon} {label}
    </button>
  );
}

const STATUS_MAP: Record<string, { cls: string; label: string }> = {
  pending: { cls: "bg-amber-100 text-amber-700", label: "รอยืนยัน" },
  confirmed: { cls: "bg-brand-100 text-brand-700", label: "ยืนยันแล้ว" },
  completed: { cls: "bg-ink-200 text-ink-700", label: "เสร็จสิ้น" },
  cancelled: { cls: "bg-ink-100 text-ink-500", label: "ยกเลิก" },
  no_show: { cls: "bg-accent-rose/15 text-accent-rose", label: "ไม่มา" },
};
