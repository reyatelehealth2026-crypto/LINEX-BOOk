"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAdminLiff } from "../_ctx";
import { createClient } from "@supabase/supabase-js";
import { baht } from "@/lib/utils";
import {
  CheckCircle2,
  XCircle,
  Clock,
  UserX,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
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
    points: number;
    visit_count: number;
  } | null;
};

function ymd(d: Date) {
  return d.toISOString().slice(0, 10);
}

export default function LiffAdminQueue() {
  const { authHeaders } = useAdminLiff();
  const [date, setDate] = useState<string>(() => ymd(new Date()));
  const [list, setList] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "confirmed" | "done">("all");

  const reload = useCallback(async () => {
    setLoading(true);
    const r = await fetch(`/api/bookings?date=${date}`, {
      headers: authHeaders(),
      cache: "no-store",
    });
    const d = await r.json();
    setList(d.bookings ?? []);
    setLoading(false);
  }, [date, authHeaders]);

  useEffect(() => {
    reload();
  }, [reload]);

  // Realtime listener (if Supabase is set)
  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) return;
    const sb = createClient(url, key);
    const ch = sb
      .channel("bookings-liff-admin")
      .on("postgres_changes", { event: "*", schema: "public", table: "bookings" }, () => reload())
      .subscribe();
    return () => {
      sb.removeChannel(ch);
    };
  }, [reload]);

  const setStatus = async (id: number, status: string) => {
    await fetch(`/api/admin/bookings/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify({ status }),
    });
    reload();
  };

  const counts = useMemo(() => {
    const c = { all: list.length, pending: 0, confirmed: 0, done: 0 };
    for (const b of list) {
      if (b.status === "pending") c.pending++;
      else if (b.status === "confirmed") c.confirmed++;
      else if (b.status === "completed") c.done++;
    }
    return c;
  }, [list]);

  const visible = useMemo(() => {
    if (filter === "all") return list;
    if (filter === "done") return list.filter((b) => b.status === "completed");
    return list.filter((b) => b.status === filter);
  }, [list, filter]);

  const dateObj = new Date(date);
  const shiftDate = (days: number) => {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    setDate(ymd(d));
  };
  const isToday = date === ymd(new Date());

  return (
    <div className="space-y-4">
      {/* Date nav */}
      <div className="card p-3 flex items-center gap-2">
        <button
          onClick={() => shiftDate(-1)}
          className="w-10 h-10 rounded-xl hover:bg-ink-100 text-ink-600 flex items-center justify-center"
          aria-label="ก่อนหน้า"
        >
          <ChevronLeft size={18} />
        </button>
        <div className="flex-1 text-center">
          <div className="eyebrow">
            {isToday ? "วันนี้" : dateObj.toLocaleDateString("th-TH", { weekday: "long" })}
          </div>
          <div className="font-bold text-ink-900">
            {dateObj.toLocaleDateString("th-TH", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </div>
        </div>
        <button
          onClick={() => shiftDate(1)}
          className="w-10 h-10 rounded-xl hover:bg-ink-100 text-ink-600 flex items-center justify-center"
          aria-label="ถัดไป"
        >
          <ChevronRight size={18} />
        </button>
        <button
          onClick={reload}
          className="w-10 h-10 rounded-xl hover:bg-ink-100 text-ink-600 flex items-center justify-center"
          aria-label="รีเฟรช"
        >
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1.5 overflow-x-auto no-scrollbar -mx-1 px-1">
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
          tone="emerald"
        />
        <FilterPill active={filter === "done"} onClick={() => setFilter("done")} label="เสร็จสิ้น" count={counts.done} />
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="skeleton h-28" />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <div className="card p-10 text-center space-y-3 text-ink-500">
          <div className="mx-auto w-12 h-12 rounded-md border border-ink-200 bg-ink-50 text-ink-400 flex items-center justify-center">
            <CalendarDays size={22} />
          </div>
          <div className="text-sm">ไม่มีรายการในช่วงที่เลือก</div>
        </div>
      ) : (
        <div className="space-y-2">
          {visible.map((b) => <BookingCard key={b.id} b={b} onSet={setStatus} />)}
        </div>
      )}
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
  tone?: "amber" | "emerald";
}) {
  const activeBg =
    tone === "amber" ? "bg-amber-500 text-white" : tone === "emerald" ? "bg-emerald-600 text-white" : "bg-ink-900 text-white";
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
        <div className="shrink-0 text-center w-14">
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
              </div>
              <div className="text-xs text-ink-500 truncate">
                {b.service?.name} · {b.staff?.nickname ?? b.staff?.name ?? "—"} · {baht(b.price)}
              </div>
            </div>
          </div>
          {b.customer && (b.customer.visit_count || b.customer.points) ? (
            <div className="text-[11px] text-ink-400 mt-1">
              {b.customer.visit_count} ครั้ง · {b.customer.points} แต้ม
              {b.customer.phone ? ` · ${b.customer.phone}` : ""}
            </div>
          ) : null}
          {b.note && (
            <div className="text-[11px] italic text-ink-500 mt-1.5 bg-ink-50 p-2 rounded-lg border border-ink-100">{b.note}</div>
          )}
        </div>
        <span className={`chip ${statusMeta.cls} shrink-0`}>{statusMeta.label}</span>
      </div>

      {(b.status === "pending" || b.status === "confirmed") && (
        <div className="mt-3 pt-3 border-t border-ink-100 grid grid-cols-2 gap-2">
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
          <div className="grid grid-cols-2 gap-2 col-span-1 sm:col-auto">
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
      ? "bg-ink-900 text-white hover:bg-ink-800"
      : tone === "rose"
        ? "bg-red-50 text-red-600 border border-red-200 hover:bg-red-100"
        : "bg-ink-100 text-ink-700 hover:bg-ink-200";
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition active:scale-95 ${cls}`}
    >
      {icon} {label}
    </button>
  );
}

const STATUS_MAP: Record<string, { cls: string; label: string }> = {
  pending: { cls: "bg-amber-100 text-amber-700", label: "รอยืนยัน" },
  confirmed: { cls: "bg-emerald-100 text-emerald-700", label: "ยืนยันแล้ว" },
  completed: { cls: "bg-ink-200 text-ink-700", label: "เสร็จสิ้น" },
  cancelled: { cls: "bg-ink-100 text-ink-500", label: "ยกเลิก" },
  no_show: { cls: "bg-red-100 text-red-700", label: "ไม่มา" },
};
