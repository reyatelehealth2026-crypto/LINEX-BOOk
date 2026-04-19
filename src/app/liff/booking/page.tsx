"use client";
import { useEffect, useMemo, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { useLiff } from "@/components/LiffProvider";
import { useRouter } from "next/navigation";
import type { Service, Staff } from "@/types/db";
import { baht } from "@/lib/utils";
import { Check, ChevronLeft } from "lucide-react";

type Slot = { startIso: string; endIso: string; label: string };

export default function BookingPage() {
  const { t, lang } = useI18n();
  const { profile } = useLiff();
  const router = useRouter();

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [services, setServices] = useState<Service[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [selService, setSelService] = useState<Service | null>(null);
  const [selStaff, setSelStaff] = useState<Staff | null | undefined>(undefined);
  const [selDate, setSelDate] = useState<string>("");
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selSlot, setSelSlot] = useState<Slot | null>(null);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/catalog").then((r) => r.json()).then((d) => {
      setServices(d.services ?? []);
      setStaff(d.staff ?? []);
    });
  }, []);

  const days = useMemo(() => {
    const arr: { ymd: string; label: string; dayLabel: string }[] = [];
    const now = new Date();
    for (let i = 0; i < 7; i++) {
      const d = new Date(now);
      d.setDate(now.getDate() + i);
      const ymd = d.toISOString().slice(0, 10);
      const dayName = lang === "th"
        ? ["อา","จ","อ","พ","พฤ","ศ","ส"][d.getDay()]
        : ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][d.getDay()];
      arr.push({ ymd, label: `${d.getDate()}`, dayLabel: i === 0 ? (lang === "th" ? "วันนี้" : "Today") : dayName });
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
      ...(selStaff?.id ? { staff_id: String(selStaff.id) } : {})
    });
    const r = await fetch(`/api/bookings/slots?${params}`);
    const d = await r.json();
    setSlots(d.slots ?? []);
    setLoadingSlots(false);
  }

  async function submit() {
    if (!profile || !selService || !selSlot) return;
    setSubmitting(true);
    setErr(null);
    const r = await fetch("/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        lineUserId: profile.userId,
        serviceId: selService.id,
        staffId: selStaff?.id ?? null,
        startIso: selSlot.startIso,
        note
      })
    });
    const d = await r.json();
    setSubmitting(false);
    if (!r.ok) {
      setErr(d.code === "23P01" ? "ขออภัย เวลานี้มีผู้จองแล้ว" : d.error ?? "เกิดข้อผิดพลาด");
      return;
    }
    router.replace(`/liff/my-bookings?just=${d.booking.id}`);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        {step > 1 && (
          <button className="btn-ghost !px-2" onClick={() => setStep((s) => (s - 1) as any)}>
            <ChevronLeft size={18} /> {t("common.back")}
          </button>
        )}
        <Stepper step={step} />
      </div>

      {step === 1 && (
        <Section title={t("booking.pick_service")}>
          <div className="grid gap-2">
            {services.map((s) => (
              <button
                key={s.id}
                onClick={() => { setSelService(s); setStep(2); }}
                className={`card p-4 text-left flex items-center justify-between ${selService?.id === s.id ? "ring-2 ring-brand-500" : ""}`}
              >
                <div>
                  <div className="font-semibold">{lang === "en" && s.name_en ? s.name_en : s.name}</div>
                  <div className="text-xs text-neutral-500">{s.duration_min} {t("common.minutes")}</div>
                </div>
                <div className="font-semibold text-brand-600">{baht(s.price)}</div>
              </button>
            ))}
          </div>
        </Section>
      )}

      {step === 2 && (
        <Section title={t("booking.pick_staff")}>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => { setSelStaff(null); setStep(3); }}
              className={`card p-4 text-left ${selStaff === null ? "ring-2 ring-brand-500" : ""}`}
            >
              <div className="font-semibold">👥 {t("booking.any_staff")}</div>
              <div className="text-xs text-neutral-500">ระบบจะจัดให้</div>
            </button>
            {staff.map((m) => (
              <button
                key={m.id}
                onClick={() => { setSelStaff(m); setStep(3); }}
                className={`card p-4 text-left ${selStaff?.id === m.id ? "ring-2 ring-brand-500" : ""}`}
              >
                <div className="font-semibold">{m.nickname ? `${m.nickname}` : m.name}</div>
                <div className="text-xs text-neutral-500">{m.name}</div>
              </button>
            ))}
          </div>
        </Section>
      )}

      {step === 3 && (
        <Section title={t("booking.pick_date")}>
          <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4">
            {days.map((d) => (
              <button
                key={d.ymd}
                onClick={() => { setSelDate(d.ymd); loadSlots(d.ymd); }}
                className={`flex-shrink-0 w-16 h-20 rounded-2xl border flex flex-col items-center justify-center ${selDate === d.ymd ? "bg-brand-500 text-white border-brand-500" : "bg-white border-neutral-200"}`}
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
              <div className="text-center text-neutral-400 py-8 text-sm">เลือกวันที่ก่อน</div>
            ) : slots.length === 0 ? (
              <div className="text-center text-neutral-500 py-8">{t("booking.no_slots")}</div>
            ) : (
              <div className="grid grid-cols-4 gap-2">
                {slots.map((s) => (
                  <button
                    key={s.startIso}
                    onClick={() => { setSelSlot(s); setStep(4); }}
                    className={`py-2 rounded-xl text-sm border ${selSlot?.startIso === s.startIso ? "bg-brand-500 text-white border-brand-500" : "bg-white border-neutral-200 hover:border-brand-500"}`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </Section>
      )}

      {step === 4 && selService && selSlot && (
        <Section title={t("booking.summary")}>
          <div className="card p-4 space-y-2">
            <Row k="บริการ" v={lang === "en" && selService.name_en ? selService.name_en : selService.name} />
            <Row k="ระยะเวลา" v={`${selService.duration_min} ${t("common.minutes")}`} />
            <Row k="ราคา" v={baht(selService.price)} />
            <Row k="ช่าง" v={selStaff ? (selStaff.nickname ?? selStaff.name) : t("booking.any_staff")} />
            <Row k="วันเวลา" v={`${selDate} ${selSlot.label}`} />
          </div>
          <textarea
            className="input mt-3"
            placeholder={t("booking.note_placeholder")}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
          />
          {err && <div className="text-red-600 text-sm mt-2">{err}</div>}
          <button disabled={submitting} onClick={submit} className="btn-primary w-full mt-4">
            <Check size={18} /> {submitting ? t("common.loading") : t("common.confirm")}
          </button>
        </Section>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-lg font-bold mb-3">{title}</h2>
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

function Stepper({ step }: { step: number }) {
  return (
    <div className="flex gap-1 flex-1">
      {[1, 2, 3, 4].map((n) => (
        <div key={n} className={`h-1 flex-1 rounded-full ${n <= step ? "bg-brand-500" : "bg-neutral-200"}`} />
      ))}
    </div>
  );
}
