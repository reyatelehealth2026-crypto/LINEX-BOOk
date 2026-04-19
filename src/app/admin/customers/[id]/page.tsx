"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useAdmin } from "../../_ctx";
import { baht } from "@/lib/utils";
import {
  ArrowLeft,
  RefreshCw,
  Phone,
  CalendarDays,
  Gift,
  UserCheck,
  Clock,
  CheckCircle2,
  XCircle,
  UserX,
  StickyNote,
} from "lucide-react";

type CustomerDetail = {
  id: number;
  line_user_id: string;
  display_name: string | null;
  picture_url: string | null;
  full_name: string | null;
  phone: string | null;
  birthday: string | null;
  points: number;
  visit_count: number;
  registered_at: string | null;
  created_at: string;
};

type BookingEntry = {
  id: number;
  starts_at: string;
  ends_at: string;
  status: string;
  price: number;
  points_earned: number;
  note: string | null;
  created_at: string;
  updated_at: string;
  service: { id: number; name: string; name_en: string | null; duration_min: number; price: number } | null;
  staff: { id: number; name: string; nickname: string | null } | null;
};

export default function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { pw } = useAdmin();
  const [customerId, setCustomerId] = useState<string>("");
  const [customer, setCustomer] = useState<CustomerDetail | null>(null);
  const [bookings, setBookings] = useState<BookingEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    params.then((p) => setCustomerId(p.id));
  }, [params]);

  const reload = useCallback(async () => {
    if (!customerId) return;
    setLoading(true);
    const r = await fetch(`/api/admin/customers/${customerId}`, {
      headers: { "x-admin-password": pw },
    });
    const d = await r.json();
    setCustomer(d.customer ?? null);
    setBookings(d.bookings ?? []);
    setLoading(false);
  }, [customerId, pw]);

  useEffect(() => {
    reload();
  }, [reload]);

  if (loading) {
    return <div className="card p-8 text-center text-neutral-500">กำลังโหลด...</div>;
  }

  if (!customer) {
    return (
      <div className="space-y-4">
        <Link href="/admin/customers" className="btn-ghost text-sm">
          <ArrowLeft size={16} /> กลับ
        </Link>
        <div className="card p-8 text-center text-neutral-500">ไม่พบลูกค้า</div>
      </div>
    );
  }

  const name = customer.full_name ?? customer.display_name ?? "ลูกค้า";

  // Quick stats
  const completedCount = bookings.filter((b) => b.status === "completed").length;
  const cancelledCount = bookings.filter((b) => b.status === "cancelled" || b.status === "no_show").length;
  const totalSpent = bookings
    .filter((b) => b.status === "completed")
    .reduce((a, b) => a + Number(b.price), 0);

  return (
    <div className="space-y-4">
      {/* Back link */}
      <Link href="/admin/customers" className="btn-ghost text-sm inline-flex">
        <ArrowLeft size={16} /> กลับรายการลูกค้า
      </Link>

      {/* Customer profile card */}
      <div className="card p-5">
        <div className="flex items-center gap-4">
          {customer.picture_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={customer.picture_url} alt="" className="w-14 h-14 rounded-full" />
          ) : (
            <div className="w-14 h-14 rounded-full bg-brand-100 flex items-center justify-center text-brand-600 text-xl font-bold">
              {name.charAt(0)}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold truncate">{name}</h2>
            {customer.display_name && customer.full_name && (
              <div className="text-sm text-neutral-500">LINE: {customer.display_name}</div>
            )}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
          <InfoItem
            icon={<Phone size={16} />}
            label="เบอร์โทร"
            value={customer.phone ?? "—"}
          />
          <InfoItem
            icon={<CalendarDays size={16} />}
            label="เกิด"
            value={
              customer.birthday
                ? new Date(customer.birthday).toLocaleDateString("th-TH")
                : "—"
            }
          />
          <InfoItem
            icon={<Gift size={16} />}
            label="แต้มสะสม"
            value={`${customer.points} แต้ม`}
          />
          <InfoItem
            icon={<UserCheck size={16} />}
            label="ลงทะเบียน"
            value={
              customer.registered_at
                ? new Date(customer.registered_at).toLocaleDateString("th-TH")
                : "ยังไม่ลงทะเบียน"
            }
          />
        </div>
      </div>

      {/* Quick booking stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <MiniStat label="จองทั้งหมด" value={bookings.length} />
        <MiniStat label="เสร็จสิ้น" value={completedCount} />
        <MiniStat label="ยกเลิก/ไม่มา" value={cancelledCount} />
        <MiniStat label="ยอดรวม" value={baht(totalSpent)} />
      </div>

      {/* Booking timeline */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold">ประวัติการจอง</h3>
        <button onClick={reload} className="btn-secondary text-sm !py-2 !px-3">
          <RefreshCw size={14} /> รีโหลด
        </button>
      </div>

      {bookings.length === 0 ? (
        <div className="card p-8 text-center text-neutral-500">ยังไม่มีประวัติการจอง</div>
      ) : (
        <div className="space-y-3">
          {bookings.map((b) => (
            <BookingTimelineEntry key={b.id} b={b} />
          ))}
        </div>
      )}
    </div>
  );
}

function InfoItem({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-2">
      <div className="text-neutral-400 mt-0.5">{icon}</div>
      <div>
        <div className="text-xs text-neutral-500">{label}</div>
        <div className="font-medium">{value}</div>
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="bg-white rounded-2xl border border-neutral-100 px-4 py-3 shadow-sm">
      <div className="text-xs text-neutral-500">{label}</div>
      <div className="text-lg font-bold">{value}</div>
    </div>
  );
}

function BookingTimelineEntry({ b }: { b: BookingEntry }) {
  const start = new Date(b.starts_at);
  const dateStr = start.toLocaleDateString("th-TH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
  const timeStr = start.toLocaleTimeString("th-TH", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="card p-4 flex gap-3">
      {/* Timeline dot + line feel */}
      <div className="flex flex-col items-center">
        <StatusIcon status={b.status} />
        <div className="w-0.5 flex-1 bg-neutral-100 mt-1" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold">{b.service?.name ?? "บริการ"}</span>
          <StatusPill status={b.status} />
        </div>
        <div className="text-sm text-neutral-600 mt-0.5">
          {dateStr} เวลา {timeStr} · {b.service?.duration_min ?? "—"} นาที
          {b.staff && (
            <span> · ช่าง {b.staff.nickname ?? b.staff.name}</span>
          )}
        </div>
        <div className="text-sm text-neutral-500 mt-0.5">
          {baht(Number(b.price))}
          {b.points_earned > 0 && (
            <span className="text-amber-600 ml-2">+{b.points_earned} แต้ม</span>
          )}
        </div>
        {b.note && (
          <div className="text-xs text-neutral-500 mt-1 flex items-start gap-1">
            <StickyNote size={12} className="mt-0.5 shrink-0" /> {b.note}
          </div>
        )}
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, { cls: string; label: string }> = {
    pending: { cls: "bg-amber-100 text-amber-700", label: "รอยืนยัน" },
    confirmed: { cls: "bg-brand-100 text-brand-700", label: "ยืนยันแล้ว" },
    completed: { cls: "bg-neutral-200 text-neutral-700", label: "เสร็จสิ้น" },
    cancelled: { cls: "bg-neutral-100 text-neutral-500", label: "ยกเลิก" },
    no_show: { cls: "bg-red-100 text-red-700", label: "ไม่มา" },
  };
  const m = map[status] ?? { cls: "", label: status };
  return <span className={`chip ${m.cls}`}>{m.label}</span>;
}

function StatusIcon({ status }: { status: string }) {
  const cls = "w-6 h-6 rounded-full flex items-center justify-center shrink-0";
  switch (status) {
    case "completed":
      return (
        <div className={`${cls} bg-emerald-100`}>
          <CheckCircle2 size={14} className="text-emerald-600" />
        </div>
      );
    case "confirmed":
      return (
        <div className={`${cls} bg-brand-100`}>
          <CheckCircle2 size={14} className="text-brand-600" />
        </div>
      );
    case "pending":
      return (
        <div className={`${cls} bg-amber-100`}>
          <Clock size={14} className="text-amber-600" />
        </div>
      );
    case "cancelled":
      return (
        <div className={`${cls} bg-neutral-200`}>
          <XCircle size={14} className="text-neutral-500" />
        </div>
      );
    case "no_show":
      return (
        <div className={`${cls} bg-red-100`}>
          <UserX size={14} className="text-red-600" />
        </div>
      );
    default:
      return (
        <div className={`${cls} bg-neutral-200`}>
          <Clock size={14} className="text-neutral-500" />
        </div>
      );
  }
}
