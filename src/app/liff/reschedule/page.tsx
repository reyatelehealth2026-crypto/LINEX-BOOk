"use client";
import { useEffect, useMemo, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { useLiff } from "@/components/LiffProvider";
import { useRouter, useSearchParams } from "next/navigation";
import type { Service, Staff } from "@/types/db";
import { baht } from "@/lib/utils";
import { Check, ChevronLeft } from "lucide-react";

type Slot = { startIso: string; endIso: string; label: string };

export default function ReschedulePage() {
  const { t, lang } = useI18n();
  const { profile } = useLiff();
  const router = useRouter();
  const sp = useSearchParams();

  // Booking to reschedule (from query params)
  const bookingId = Number(sp.get("id"));
  const serviceId = Number(sp.get("service_id"));
  const staffIdParam = sp.get("staff_id");
  const staffId = staffIdParam && staffIdParam !== "null" ? Number(staffIdParam) : null;
  const currentStartIso = sp.get("current_start") ?? "";
  const serviceName = sp.get("service_name") ?? "";
  const staffName = sp.get("staff_name") ?? "";

  const [services, setServices] = useState<Service[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [selService, setSelService] = useState<Service | null>(null);
  const [selStaff, setSelStaff] = useState<Staff | null | undefined>(undefined);
  const [selDate, setSelDate] = useState<string>("");
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selSlot, setSelSlot] = useState<Slot | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [step, setStep] = useState<1 | 2>(1); // 1=pick date/time, 2=confirm

  useEffect(() => {
    fetch("/api/catalog").then((r) => r.json()).then((d) => {
      setServices(d.services ?? []);
      setStaff(d.staff ?? []);
      // Pre-select the service and staff from the booking
      const svc = (d.services ?? []).find((s: Service) => s.id === serviceId);
      if (svc) setSelService(svc);
      if (staffId) {
        const stf = (d.staff ?? []).find((s: Staff) => s.id === staffId);
        if (stf) setSelStaff(stf);
      }
    });
  }, [serviceId, staffId]);

  const days = useMemo(() => {
    const arr: { ymd: string; label: string; dayLabel: string }[] = [];
    const now = new Date();
    for (let i = 0; i < 7; i++) {
      const d = new Date(now);
      d.setDate(now.getDate() + i);
      const ymd = d.toISOString().slice(0, 10);
      const dayName = lang === "th"
        ? ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"][d.getDay()]
        : ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d.getDay()];
      arr.push({
        ymd,
        label: `${d.getDate()}`,
        dayLabel: i === 0 ? (lang === "th" ? "วันนี้" : "Today") : dayName,
      });
    }
    return arr;
  }, [lang]);

  async function loadSlots(date: string) {
    if (!selService) return;
    setLoadingSlots(true);
    setSelSlot(null);
    const params = new URLSearchParams({
      date,
      service_id: String(selService.id),
      ...(selStaff?.id ? { staff_id: String(selStaff.id) } : {}),
    });
    const r = await fetch(`/api/bookings/slots?${params}`);
    const d = await r.json();
    setSlots(d.slots ?? []);
    setLoadingSlots(false);
  }

  async function submit() {
    if (!profile || !selSlot) return;
    setSubmitting(true);
    setErr(null);

    const r = await fetch(`/api/bookings/${bookingId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "x-line-user-id": profile.userId,
      },
      body: JSON.stringify({ startIso: selSlot.startIso }),
    });
    const d = await r.json();
    setSubmitting(false);

    if (!r.ok) {
      if (d.code === "23P01") {
        setErr("ขออภัย เวลานี้มีผู้จองแล้ว");
      } else {
        setErr(d.error ?? "เกิดข้อผิดพลาด");
      }
      return;
    }

    router.replace(`/liff/my-bookings?rescheduled=${bookingId}`);
  }

  if (!bookingId) {
    return (
      <div className="card p-8 text-center text-neutral-500">
        ไม่พบข้อมูลการจอง
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <button
          className="btn-ghost !px-2"
          onClick={() => router.push("/liff/my-bookings")}
        >
          <ChevronLeft size={18} />
        </button>
        <h1 className="h-display text-xl">{lang === "en" ? "Reschedule" : "เปลี่ยนเวลา"}</h1>
      </div>

      {/* Current booking info */}
      <div className="card p-3 bg-amber-50 border-amber-200 text-sm">
        <div className="font-semibold text-amber-800">
          {lang === "en" ? "Current booking" : "คิวปัจจุบัน"}
        </div>
        <div>
          {serviceName} · {staffName || (lang === "en" ? "Any staff" : "ช่างคนไหนก็ได้")}
        </div>
        {currentStartIso && (
          <div className="text-neutral-500 text-xs">
            {new Date(currentStartIso).toLocaleString("th-TH", {
              timeZone: process.env.NEXT_PUBLIC_SHOP_TIMEZONE || "Asia/Bangkok",
            })}
          </div>
        )}
      </div>

      {step === 1 && (
        <>
          <Section title={t("booking.pick_date")}>
            <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4">
              {days.map((d) => (
                <button
                  key={d.ymd}
                  onClick={() => {
                    setSelDate(d.ymd);
                    loadSlots(d.ymd);
                  }}
                  className={`flex-shrink-0 w-16 h-20 rounded-xl border flex flex-col items-center justify-center ${
                    selDate === d.ymd
                      ? "bg-ink-900 text-white border-ink-900"
                      : "bg-white border-ink-200"
                  }`}
                >
                  <div className="text-xs">{d.dayLabel}</div>
                  <div className="text-2xl font-bold">{d.label}</div>
                </button>
              ))}
            </div>

            <div className="mt-4">
              <div className="text-sm font-semibold mb-2">{t("booking.pick_time")}</div>
              {loadingSlots ? (
                <div className="text-center text-neutral-500 py-8">{t("common.loading")}</div>
              ) : !selDate ? (
                <div className="text-center text-neutral-400 py-8 text-sm">
                  {lang === "en" ? "Select a date first" : "เลือกวันที่ก่อน"}
                </div>
              ) : slots.length === 0 ? (
                <div className="text-center text-neutral-500 py-8">{t("booking.no_slots")}</div>
              ) : (
                <div className="grid grid-cols-4 gap-2">
                  {slots.map((s) => (
                    <button
                      key={s.startIso}
                      onClick={() => {
                        setSelSlot(s);
                        setStep(2);
                      }}
                      className={`py-2 rounded-xl text-sm border ${
                        selSlot?.startIso === s.startIso
                          ? "bg-ink-900 text-white border-ink-900"
                          : "bg-white border-ink-200 hover:border-ink-400"
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </Section>
        </>
      )}

      {step === 2 && selSlot && (
        <Section title={lang === "en" ? "Confirm reschedule" : "ยืนยันเปลี่ยนเวลา"}>
          <div className="card p-4 space-y-2">
            <Row k={lang === "en" ? "Service" : "บริการ"} v={serviceName} />
            <Row k={lang === "en" ? "Staff" : "ช่าง"} v={staffName || t("booking.any_staff")} />
            <Row
              k={lang === "en" ? "New time" : "เวลาใหม่"}
              v={`${selDate} ${selSlot.label}`}
            />
          </div>
          {err && <div className="card p-3 border-red-200 bg-red-50 text-red-700 text-sm mt-2">{err}</div>}
          <div className="flex gap-2 mt-4">
            <button
              className="btn-ghost flex-1"
              onClick={() => {
                setStep(1);
                setErr(null);
              }}
            >
              {t("common.back")}
            </button>
            <button
              disabled={submitting}
              onClick={submit}
              className="btn-primary flex-1"
            >
              <Check size={18} />{" "}
              {submitting ? t("common.loading") : t("common.confirm")}
            </button>
          </div>
        </Section>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="h-display text-xl mb-3">{title}</h2>
      {children}
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-neutral-500">{k}</span>
      <span className="font-medium">{v}</span>
    </div>
  );
}
