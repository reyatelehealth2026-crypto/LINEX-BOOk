"use client";
import { useEffect, useState } from "react";
import { useLiff } from "@/components/LiffProvider";
import { useI18n } from "@/lib/i18n";
import { useRouter, useSearchParams } from "next/navigation";
import { baht } from "@/lib/utils";
import { CheckCircle2, XCircle, Clock, RotateCcw, Star, BellRing, Inbox } from "lucide-react";

type Booking = {
  id: number;
  starts_at: string;
  ends_at: string;
  status: string;
  price: number;
  note: string | null;
  service: { id: number; name: string; name_en: string | null } | null;
  staff: { id: number; nickname: string | null; name: string } | null;
};

export default function MyBookings() {
  const { profile } = useLiff();
  const { t, lang } = useI18n();
  const router = useRouter();
  const [list, setList] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const sp = useSearchParams();
  const just = sp.get("just");
  const rescheduled = sp.get("rescheduled");
  const waitlisted = sp.get("waitlisted");

  async function reload() {
    if (!profile) return;
    setLoading(true);
    const r = await fetch(`/api/my-bookings?line_user_id=${profile.userId}`);
    const d = await r.json();
    setList(d.bookings ?? []);
    setLoading(false);
  }

  useEffect(() => { reload(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [profile]);

  async function cancel(id: number) {
    const msg = lang === "en" ? "Cancel this booking?" : "ต้องการยกเลิกคิวนี้หรือไม่?";
    if (!confirm(msg)) return;
    await fetch(`/api/bookings/${id}`, {
      method: "DELETE",
      headers: { "x-line-user-id": profile!.userId }
    });
    reload();
  }

  function reschedule(b: Booking) {
    const params = new URLSearchParams({
      id: String(b.id),
      service_id: String(b.service?.id ?? ""),
      service_name: lang === "en" && b.service?.name_en ? b.service.name_en : (b.service?.name ?? ""),
      staff_id: String(b.staff?.id ?? ""),
      staff_name: b.staff?.nickname ?? b.staff?.name ?? "",
      current_start: b.starts_at,
    });
    router.push(`/liff/reschedule?${params}`);
  }

  function rebook(b: Booking) {
    if (!b.service) return;
    const params = new URLSearchParams({
      service_id: String(b.service.id),
      ...(b.staff?.id ? { staff_id: String(b.staff.id) } : {}),
    });
    router.push(`/liff/booking?${params}`);
  }

  function review(b: Booking) {
    router.push(`/liff/review?booking_id=${b.id}`);
  }

  return (
    <div className="space-y-4 animate-fade-up">
      {just && (
        <div className="card p-4 border-emerald-200 bg-emerald-50 text-emerald-800 flex items-center gap-2">
          <CheckCircle2 size={18} /> {t("booking.success")} #{just}
        </div>
      )}
      {rescheduled && (
        <div className="card p-4 border-ink-300 bg-ink-50 text-ink-800 flex items-center gap-2">
          <Clock size={18} /> {lang === "en" ? "Rescheduled!" : "เปลี่ยนเวลาสำเร็จ!"} #{rescheduled}
        </div>
      )}
      {waitlisted && (
        <div className="card p-4 border-ink-200 bg-ink-50 text-ink-700 flex items-center gap-2">
          <BellRing size={18} /> {lang === "en" ? "You're on the waitlist! We'll notify you when a slot opens." : "ลงทะเบียนรอคิวสำเร็จ! เราจะแจ้งเตือนเมื่อมีคิวว่าง"}
        </div>
      )}
      <h1 className="h-display text-2xl">{t("my.title")}</h1>
      {loading ? (
        <div className="text-center text-ink-400 py-10">
          <div className="skeleton h-16 rounded-2xl mb-2" />
          <div className="skeleton h-16 rounded-2xl mb-2" />
          <div className="skeleton h-16 rounded-2xl" />
        </div>
      ) : list.length === 0 ? (
        <div className="card p-10 text-center flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-md border border-ink-200 bg-ink-50 text-ink-400 flex items-center justify-center">
            <Inbox size={22} />
          </div>
          <div className="text-ink-500 text-sm">{t("my.empty")}</div>
        </div>
      ) : (
        <div className="space-y-2">
          {list.map((b) => (
            <div key={b.id} className="card card-hover p-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-semibold text-ink-900">{lang === "en" && b.service?.name_en ? b.service.name_en : b.service?.name}</div>
                  <div className="text-xs text-ink-500 mt-0.5">{new Date(b.starts_at).toLocaleString("th-TH")}</div>
                  <div className="text-xs text-ink-400">
                    {lang === "en" ? "Staff" : "ช่าง"}: {b.staff?.nickname ?? b.staff?.name ?? "—"}
                  </div>
                </div>
                <StatusChip status={b.status} />
              </div>
              <div className="mt-2 flex items-center justify-between">
                <div className="text-sm font-medium">{baht(b.price)}</div>
                {(b.status === "pending" || b.status === "confirmed") && (
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => reschedule(b)}
                      className="text-ink-600 text-sm font-semibold inline-flex items-center gap-1 hover:underline"
                    >
                      <Clock size={14} /> {lang === "en" ? "Reschedule" : "เปลี่ยนเวลา"}
                    </button>
                    <button onClick={() => cancel(b.id)} className="text-red-600 text-sm font-semibold inline-flex items-center gap-1 hover:underline">
                      <XCircle size={14} /> {t("common.cancel")}
                    </button>
                  </div>
                )}
                {b.status === "completed" && (
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => rebook(b)}
                      className="text-ink-600 text-sm font-semibold inline-flex items-center gap-1 hover:underline"
                    >
                      <RotateCcw size={14} /> {lang === "en" ? "Book again" : "จองอีกครั้ง"}
                    </button>
                    <button
                      onClick={() => review(b)}
                      className="text-amber-600 text-sm font-semibold inline-flex items-center gap-1 hover:underline"
                    >
                      <Star size={14} /> {lang === "en" ? "Review" : "รีวิว"}
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StatusChip({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: "bg-amber-100 text-amber-700",
    confirmed: "bg-emerald-100 text-emerald-700",
    completed: "bg-ink-200 text-ink-600",
    cancelled: "bg-ink-100 text-ink-500",
    no_show: "bg-red-100 text-red-700"
  };
  const label: Record<string, string> = {
    pending: "รอยืนยัน", confirmed: "ยืนยันแล้ว", completed: "เสร็จสิ้น", cancelled: "ยกเลิก", no_show: "ไม่มา"
  };
  return <span className={`chip ${map[status] ?? ""}`}>{label[status] ?? status}</span>;
}
