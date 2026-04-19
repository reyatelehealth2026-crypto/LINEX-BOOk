"use client";
import { useEffect, useState, useCallback } from "react";
import { useAdmin } from "./_ctx";
import { createClient } from "@supabase/supabase-js";
import { baht } from "@/lib/utils";
import { CheckCircle2, XCircle, Clock, UserX, RefreshCw } from "lucide-react";

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

  const counts = list.reduce((a, b) => { a[b.status] = (a[b.status] ?? 0) + 1; return a; }, {} as Record<string, number>);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">คิวประจำวัน</h1>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="input !py-2 !px-3 w-auto" />
        </div>
        <button onClick={reload} className="btn-secondary"><RefreshCw size={16} /> รีโหลด</button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        <Stat label="ทั้งหมด" value={list.length} color="bg-neutral-100" />
        <Stat label="รอยืนยัน" value={counts.pending ?? 0} color="bg-amber-100 text-amber-700" />
        <Stat label="ยืนยันแล้ว" value={counts.confirmed ?? 0} color="bg-brand-100 text-brand-700" />
        <Stat label="เสร็จสิ้น" value={counts.completed ?? 0} color="bg-neutral-200" />
        <Stat label="ยกเลิก" value={(counts.cancelled ?? 0) + (counts.no_show ?? 0)} color="bg-red-100 text-red-700" />
      </div>

      {loading ? (
        <div className="card p-8 text-center text-neutral-500">กำลังโหลด...</div>
      ) : list.length === 0 ? (
        <div className="card p-8 text-center text-neutral-500">ยังไม่มีคิวในวันนี้</div>
      ) : (
        <div className="space-y-2">
          {list.map((b) => <BookingCard key={b.id} b={b} onSet={setStatus} />)}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className={`${color} rounded-2xl px-4 py-3`}>
      <div className="text-xs opacity-70">{label}</div>
      <div className="text-2xl font-bold">{value}</div>
    </div>
  );
}

function BookingCard({ b, onSet }: { b: Booking; onSet: (id: number, status: string) => void }) {
  const start = new Date(b.starts_at);
  const time = start.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" });
  return (
    <div className="card p-4 flex flex-col sm:flex-row sm:items-center gap-3">
      <div className="text-center sm:w-20">
        <div className="text-2xl font-bold">{time}</div>
        <div className="text-xs text-neutral-500">{b.service?.duration_min} นาที</div>
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          {b.customer?.picture_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={b.customer.picture_url} alt="" className="w-8 h-8 rounded-full" />
          )}
          <div>
            <div className="font-semibold">
              {b.customer?.full_name ?? b.customer?.display_name ?? "ลูกค้า"}
              {b.customer?.phone && <span className="text-xs text-neutral-500 ml-2">{b.customer.phone}</span>}
            </div>
            <div className="text-sm text-neutral-600">
              {b.service?.name} · ช่าง {b.staff?.nickname ?? b.staff?.name ?? "—"} · {baht(b.price)}
            </div>
            {b.customer && (
              <div className="text-xs text-neutral-500 mt-0.5">
                {b.customer.visit_count} ครั้ง · {b.customer.points} แต้ม
              </div>
            )}
            {b.note && <div className="text-xs italic text-neutral-500 mt-1">📝 {b.note}</div>}
          </div>
        </div>
      </div>
      <div className="flex flex-wrap gap-1 sm:flex-col sm:w-36">
        <StatusPill status={b.status} />
        <div className="flex gap-1 flex-wrap">
          {b.status === "pending" && (
            <button onClick={() => onSet(b.id, "confirmed")} className="btn-ghost !py-1 !px-2 text-xs text-brand-600"><CheckCircle2 size={14} /> ยืนยัน</button>
          )}
          {(b.status === "pending" || b.status === "confirmed") && (
            <>
              <button onClick={() => onSet(b.id, "completed")} className="btn-ghost !py-1 !px-2 text-xs text-neutral-700"><CheckCircle2 size={14} /> เสร็จ</button>
              <button onClick={() => onSet(b.id, "no_show")} className="btn-ghost !py-1 !px-2 text-xs text-red-600"><UserX size={14} /> ไม่มา</button>
              <button onClick={() => onSet(b.id, "cancelled")} className="btn-ghost !py-1 !px-2 text-xs text-neutral-500"><XCircle size={14} /> ยกเลิก</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, { cls: string; label: string; icon: any }> = {
    pending: { cls: "bg-amber-100 text-amber-700", label: "รอยืนยัน", icon: Clock },
    confirmed: { cls: "bg-brand-100 text-brand-700", label: "ยืนยันแล้ว", icon: CheckCircle2 },
    completed: { cls: "bg-neutral-200 text-neutral-700", label: "เสร็จสิ้น", icon: CheckCircle2 },
    cancelled: { cls: "bg-neutral-100 text-neutral-500", label: "ยกเลิก", icon: XCircle },
    no_show: { cls: "bg-red-100 text-red-700", label: "ไม่มา", icon: UserX }
  };
  const m = map[status] ?? { cls: "", label: status, icon: Clock };
  const Icon = m.icon;
  return <span className={`chip ${m.cls} inline-flex gap-1 items-center`}><Icon size={12} /> {m.label}</span>;
}
