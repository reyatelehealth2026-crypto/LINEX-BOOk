"use client";
import { useEffect, useState } from "react";
import { useLiff } from "@/components/LiffProvider";
import { useI18n } from "@/lib/i18n";
import { useSearchParams } from "next/navigation";
import { baht } from "@/lib/utils";
import { CheckCircle2, XCircle } from "lucide-react";

type Booking = {
  id: number;
  starts_at: string;
  ends_at: string;
  status: string;
  price: number;
  note: string | null;
  service: { name: string; name_en: string | null } | null;
  staff: { nickname: string | null; name: string } | null;
};

export default function MyBookings() {
  const { profile } = useLiff();
  const { t, lang } = useI18n();
  const [list, setList] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const sp = useSearchParams();
  const just = sp.get("just");

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
    if (!confirm("ต้องการยกเลิกคิวนี้หรือไม่?")) return;
    await fetch(`/api/bookings/${id}`, {
      method: "DELETE",
      headers: { "x-line-user-id": profile!.userId }
    });
    reload();
  }

  return (
    <div className="space-y-4">
      {just && (
        <div className="card p-4 bg-brand-50 border-brand-500 text-brand-700 flex items-center gap-2">
          <CheckCircle2 size={18} /> {t("booking.success")} #{just}
        </div>
      )}
      <h1 className="text-xl font-bold">{t("my.title")}</h1>
      {loading ? (
        <div className="text-center text-neutral-500 py-8">{t("common.loading")}</div>
      ) : list.length === 0 ? (
        <div className="card p-8 text-center text-neutral-500">{t("my.empty")}</div>
      ) : (
        <div className="space-y-2">
          {list.map((b) => (
            <div key={b.id} className="card p-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-semibold">{lang === "en" && b.service?.name_en ? b.service.name_en : b.service?.name}</div>
                  <div className="text-xs text-neutral-500">{new Date(b.starts_at).toLocaleString("th-TH")}</div>
                  <div className="text-xs text-neutral-500">ช่าง: {b.staff?.nickname ?? b.staff?.name ?? "—"}</div>
                </div>
                <StatusChip status={b.status} />
              </div>
              <div className="mt-2 flex items-center justify-between">
                <div className="text-sm font-medium">{baht(b.price)}</div>
                {(b.status === "pending" || b.status === "confirmed") && (
                  <button onClick={() => cancel(b.id)} className="text-red-600 text-sm inline-flex items-center gap-1">
                    <XCircle size={14} /> {t("common.cancel")}
                  </button>
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
    confirmed: "bg-brand-100 text-brand-700",
    completed: "bg-neutral-200 text-neutral-700",
    cancelled: "bg-neutral-100 text-neutral-500",
    no_show: "bg-red-100 text-red-700"
  };
  const label: Record<string, string> = {
    pending: "รอยืนยัน", confirmed: "ยืนยันแล้ว", completed: "เสร็จสิ้น", cancelled: "ยกเลิก", no_show: "ไม่มา"
  };
  return <span className={`chip ${map[status] ?? ""}`}>{label[status] ?? status}</span>;
}
