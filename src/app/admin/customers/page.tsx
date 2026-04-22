"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useAdmin } from "../_ctx";
import { baht } from "@/lib/utils";
import { AlertTriangle, Lock, RefreshCw, Search, Users } from "lucide-react";

type CustomerRow = {
  id: number;
  display_name: string | null;
  picture_url: string | null;
  full_name: string | null;
  phone: string | null;
  birthday: string | null;
  points: number;
  lifetime_points: number;
  visit_count: number;
  no_show_count: number;
  blocked_until: string | null;
  registered_at: string | null;
  created_at: string;
  latest_booking_at: string | null;
};

export default function CustomersPage() {
  const { pw } = useAdmin();
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const reload = useCallback(async () => {
    setLoading(true);
    const q = search ? `&q=${encodeURIComponent(search)}` : "";
    const r = await fetch(`/api/admin/customers?${q}`, {
      headers: { "x-admin-password": pw },
    });
    const d = await r.json();
    setCustomers(d.customers ?? []);
    setLoading(false);
  }, [pw, search]);

  useEffect(() => { reload(); }, [reload]);

  // Summary stats
  const totalCustomers = customers.length;
  const registered = customers.filter((c) => c.registered_at).length;
  const totalPoints = customers.reduce((a, c) => a + c.points, 0);
  const blockedCount = customers.filter((c) => c.blocked_until && new Date(c.blocked_until) > new Date()).length;

  return (
    <div className="space-y-4 sm:space-y-5 animate-fade-up">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="eyebrow">Customers</div>
          <h1 className="h-display text-2xl sm:text-3xl">ลูกค้า</h1>
        </div>
        <button onClick={reload} className="btn-secondary shrink-0">
          <RefreshCw size={16} /> รีโหลด
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <div className="bg-ink-50 rounded-xl border border-ink-200 px-4 py-3">
          <div className="text-xs opacity-70">ลูกค้าทั้งหมด</div>
          <div className="text-2xl font-bold">{totalCustomers}</div>
        </div>
        <div className="bg-emerald-50 rounded-xl border border-emerald-200 px-4 py-3">
          <div className="text-xs opacity-70">ลงทะเบียนแล้ว</div>
          <div className="text-2xl font-bold text-emerald-700">{registered}</div>
        </div>
        <div className="bg-amber-50 rounded-xl border border-amber-200 px-4 py-3">
          <div className="text-xs opacity-70">แต้มรวม</div>
          <div className="text-2xl font-bold text-amber-700">{totalPoints}</div>
        </div>
        {blockedCount > 0 && (
          <div className="bg-red-50 rounded-xl border border-red-200 px-4 py-3">
            <div className="text-xs opacity-70">ถูกบล็อก</div>
            <div className="text-2xl font-bold text-red-600">{blockedCount}</div>
          </div>
        )}
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
        <input
          type="text"
          className="input !pl-10"
          placeholder="ค้นหาชื่อ, เบอร์โทร..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* List */}
      {loading ? (
        <div className="card p-8 text-center text-ink-500">กำลังโหลด...</div>
      ) : customers.length === 0 ? (
        <div className="card p-8 text-center text-ink-500">
          <Users size={40} className="mx-auto mb-2 opacity-40" />
          {search ? `ไม่พบลูกค้า "${search}"` : "ยังไม่มีลูกค้าในระบบ"}
        </div>
      ) : (
        <div className="space-y-2">
          {customers.map((c) => (
            <CustomerCard key={c.id} c={c} />
          ))}
        </div>
      )}
    </div>
  );
}

function CustomerCard({ c }: { c: CustomerRow }) {
  const name = c.full_name ?? c.display_name ?? "ลูกค้า";
  const lastBooking = c.latest_booking_at
    ? new Date(c.latest_booking_at).toLocaleDateString("th-TH", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "—";

  return (
    <Link href={`/admin/customers/${c.id}`} className="card p-4 flex items-center gap-3 hover:border-ink-300 transition-colors">
      {c.picture_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={c.picture_url} alt="" className="w-10 h-10 rounded-full shrink-0" />
      ) : (
        <div className="w-10 h-10 rounded-full bg-ink-200 flex items-center justify-center text-ink-700 text-sm font-bold shrink-0">
          {name.charAt(0)}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="font-semibold truncate">
          {name}
          {c.registered_at && (
            <span className="chip bg-emerald-100 text-emerald-700 ml-2">ลงทะเบียน</span>
          )}
        </div>
        <div className="text-sm text-ink-500">
          {c.phone ?? "ไม่มีเบอร์โทร"}
          {c.phone && c.birthday && (
            <span className="ml-2">· เกิด {new Date(c.birthday).toLocaleDateString("th-TH")}</span>
          )}
        </div>
      </div>
      <div className="text-right text-sm shrink-0 space-y-0.5">
        <div className="text-ink-500">{c.visit_count} ครั้ง · {c.points} แต้ม</div>
        {c.no_show_count > 0 && (
          <div className="text-xs text-red-500 flex items-center gap-0.5"><AlertTriangle size={10} /> no-show {c.no_show_count} ครั้ง</div>
        )}
        {c.blocked_until && new Date(c.blocked_until) > new Date() && (
          <div className="chip bg-red-100 text-red-700 text-[10px] flex items-center gap-0.5"><Lock size={9} /> ถูกบล็อก</div>
        )}
        <div className="text-xs text-ink-400">คิวล่าสุด {lastBooking}</div>
      </div>
    </Link>
  );
}
