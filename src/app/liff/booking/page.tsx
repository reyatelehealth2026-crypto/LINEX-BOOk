"use client";
import { useEffect, useMemo, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { useLiff } from "@/components/LiffProvider";
import { useRouter, useSearchParams } from "next/navigation";
import type { Service, Staff } from "@/types/db";
import { baht } from "@/lib/utils";
import {
  Check,
  ChevronLeft,
  Sparkles,
  Users,
  User as UserIcon,
  Sun,
  Sunset,
  Moon,
  BellRing,
  Clock,
  CalendarDays
} from "lucide-react";

type Bucket = {
  hour: number;
  label: string;
  periodLabel: string;
  available: boolean;
  startIso: string | null;
  endIso: string | null;
};

export default function BookingPage() {
  const { t, lang } = useI18n();
  const { profile } = useLiff();
  const router = useRouter();
  const sp = useSearchParams();

  const presetServiceId = Number(sp.get("service_id") || 0);
  const presetStaffParam = sp.get("staff_id");
  const presetStaffId = presetStaffParam ? Number(presetStaffParam) : 0;

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [services, setServices] = useState<Service[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [selService, setSelService] = useState<Service | null>(null);
  const [selStaff, setSelStaff] = useState<Staff | null | undefined>(undefined);
  const [selDate, setSelDate] = useState<string>("");
  const [buckets, setBuckets] = useState<Bucket[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selSlot, setSelSlot] = useState<Bucket | null>(null);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/catalog").then((r) => r.json()).then((d) => {
      setServices(d.services ?? []);
      setStaff(d.staff ?? []);

      const presetService = (d.services ?? []).find((s: Service) => s.id === presetServiceId) ?? null;
      const presetStaff = (d.staff ?? []).find((m: Staff) => m.id === presetStaffId);

      if (presetService) {
        setSelService(presetService);
        setStep(3);
      }
      if (presetStaff) {
        setSelStaff(presetStaff);
      } else if (presetStaffParam === "0" || presetStaffParam === "null") {
        setSelStaff(null);
      }
    });
  }, [presetServiceId, presetStaffId, presetStaffParam]);

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
      mode: "hourly",
      ...(selStaff?.id ? { staff_id: String(selStaff.id) } : {})
    });
    const r = await fetch(`/api/bookings/slots?${params}`);
    const d = await r.json();
    setBuckets(d.buckets ?? []);
    setLoadingSlots(false);
  }

  async function submit() {
    if (!profile || !selService || !selSlot || !selSlot.startIso) return;
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

  async function joinWaitlist() {
    if (!profile || !selService || !selDate) return;
    setSubmitting(true);
    setErr(null);
    const r = await fetch("/api/waitlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        lineUserId: profile.userId,
        serviceId: selService.id,
        staffId: selStaff?.id ?? null,
        desiredDate: selDate,
        note: note || undefined,
      })
    });
    const d = await r.json();
    setSubmitting(false);
    if (!r.ok) {
      if (d.error === "already_on_waitlist") {
        setErr(lang === "en" ? "You are already on the waitlist for this date." : "คุณอยู่ในรายการรออยู่แล้วสำหรับวันนี้");
      } else {
        setErr(d.error ?? "เกิดข้อผิดพลาด");
      }
      return;
    }
    router.replace(`/liff/my-bookings?waitlisted=1`);
  }

  // Group buckets by period (morning/afternoon/evening) for a cleaner day-focused view
  const grouped = useMemo(() => {
    const groups: { key: string; label: string; icon: any; items: Bucket[] }[] = [
      { key: "morning", label: "เช้า", icon: Sun, items: [] },
      { key: "afternoon", label: "บ่าย", icon: Sunset, items: [] },
      { key: "evening", label: "เย็น", icon: Moon, items: [] }
    ];
    for (const b of buckets) {
      if (b.hour < 12) groups[0].items.push(b);
      else if (b.hour < 17) groups[1].items.push(b);
      else groups[2].items.push(b);
    }
    return groups.filter((g) => g.items.length > 0);
  }, [buckets]);

  const hasAnyAvailable = buckets.some((b) => b.available);

  return (
    <div className="space-y-5 animate-fade-up">
      {/* Top bar: back + step progress */}
      <div className="flex items-center gap-3">
        {step > 1 ? (
          <button
            className="shrink-0 w-10 h-10 rounded-lg bg-white border border-ink-200 flex items-center justify-center text-ink-700 hover:border-ink-300 transition"
            onClick={() => setStep((s) => (s - 1) as any)}
            aria-label={t("common.back")}
          >
            <ChevronLeft size={18} />
          </button>
        ) : (
          <div className="w-10 h-10" />
        )}
        <Stepper step={step} />
      </div>

      {/* Step 1: Service */}
      {step === 1 && (
        <Section eyebrow="01 · เลือกบริการ" title={t("booking.pick_service")} subtitle="แตะบริการที่ต้องการ">
          <div className="grid gap-2.5">
            {services.map((s) => {
              const selected = selService?.id === s.id;
              return (
                <button
                  key={s.id}
                  onClick={() => { setSelService(s); setStep(2); }}
                  className={`card p-4 text-left flex items-center justify-between transition-all ${selected ? "!border-ink-900 ring-2 ring-ink-900/10" : "hover:border-ink-300"}`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-11 h-11 rounded-md flex items-center justify-center ${selected ? "bg-ink-900 text-white" : "bg-ink-50 text-ink-700 border border-ink-200"}`}>
                      <Sparkles size={18} />
                    </div>
                    <div>
                      <div className="font-semibold text-ink-900">{lang === "en" && s.name_en ? s.name_en : s.name}</div>
                      <div className="text-xs text-ink-500 flex items-center gap-1.5 mt-0.5">
                        <Clock size={12} /> {s.duration_min} {t("common.minutes")}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-ink-900">{baht(s.price)}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </Section>
      )}

      {/* Step 2: Staff */}
      {step === 2 && (
        <Section eyebrow="02 · เลือกช่าง" title={t("booking.pick_staff")} subtitle="ถ้าไม่ระบุ ระบบจะจัดให้">
          <div className="grid grid-cols-2 gap-2.5">
            <StaffCard
              selected={selStaff === null}
              onClick={() => { setSelStaff(null); setStep(3); }}
              icon={<Users size={20} className="text-ink-700" />}
              title={t("booking.any_staff")}
              subtitle="ระบบจะจัดให้"
            />
            {staff.map((m) => (
              <StaffCard
                key={m.id}
                selected={selStaff?.id === m.id}
                onClick={() => { setSelStaff(m); setStep(3); }}
                avatar={m.avatar_url}
                icon={<UserIcon size={20} className="text-ink-700" />}
                title={m.nickname ?? m.name}
                subtitle={m.nickname ? m.name : undefined}
              />
            ))}
          </div>
        </Section>
      )}

      {/* Step 3: Date + hour-bucket time */}
      {step === 3 && (
        <Section eyebrow="03 · เลือกวันและช่วงเวลา" title="วันไหนสะดวก?" subtitle="เลือกวัน แล้วเลือกช่วงเวลากลม ๆ">
          {/* Day strip */}
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 -mx-1 px-1">
            {days.map((d) => {
              const selected = selDate === d.ymd;
              return (
                <button
                  key={d.ymd}
                  onClick={() => { setSelDate(d.ymd); loadSlots(d.ymd); }}
                  className={`flex-shrink-0 w-16 h-20 rounded-xl flex flex-col items-center justify-center transition-all active:scale-95 ${selected ? "bg-ink-900 text-white" : "bg-white border border-ink-200 text-ink-700"}`}
                >
                  <div className={`text-[11px] font-semibold uppercase tracking-wider ${selected ? "text-white/60" : "text-ink-400"}`}>{d.dayLabel}</div>
                  <div className="text-2xl font-extrabold leading-none mt-1">{d.label}</div>
                </button>
              );
            })}
          </div>

          {/* Time buckets by period */}
          <div className="mt-5">
            {!selDate ? (
              <EmptyState icon={<CalendarDays size={24} />} text="เลือกวันที่ด้านบนก่อน" />
            ) : loadingSlots ? (
              <div className="grid grid-cols-3 gap-2">
                {Array.from({ length: 9 }).map((_, i) => (
                  <div key={i} className="skeleton h-14" />
                ))}
              </div>
            ) : !hasAnyAvailable ? (
              <div className="card p-6 text-center space-y-3">
                <div className="mx-auto w-12 h-12 rounded-md bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center">
                  <BellRing size={22} />
                </div>
                <div>
                  <div className="font-semibold text-ink-900">{t("booking.no_slots")}</div>
                  <div className="text-xs text-ink-500 mt-1">ลองเลือกวันอื่น หรือขอแจ้งเตือนเมื่อมีคิวว่าง</div>
                </div>
                <button onClick={() => joinWaitlist()} className="btn-secondary text-sm">
                  <BellRing size={14} /> {lang === "en" ? "Join Waitlist" : "แจ้งเตือนเมื่อมีคิวว่าง"}
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {grouped.map((g) => {
                  const Icon = g.icon;
                  return (
                    <div key={g.key}>
                      <div className="flex items-center gap-2 mb-2">
                        <Icon size={14} className="text-ink-400" />
                        <div className="section-title !text-ink-500">{g.label}</div>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        {g.items.map((b) => {
                          const selected = selSlot?.hour === b.hour;
                          return (
                            <button
                              key={b.hour}
                              disabled={!b.available}
                              onClick={() => { setSelSlot(b); setStep(4); }}
                              className={`relative py-3.5 rounded-xl text-[15px] font-semibold transition-all active:scale-95 ${
                                !b.available
                                  ? "bg-ink-100 text-ink-300 line-through cursor-not-allowed"
                                  : selected
                                    ? "bg-ink-900 text-white"
                                    : "bg-white border border-ink-200 text-ink-800 hover:border-ink-400"
                              }`}
                            >
                              {b.label}
                              {!b.available && (
                                <span className="absolute -top-1.5 -right-1.5 bg-ink-900 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">เต็ม</span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </Section>
      )}

      {/* Step 4: Summary */}
      {step === 4 && selService && selSlot && (
        <Section eyebrow="04 · ยืนยัน" title={t("booking.summary")} subtitle="ตรวจสอบแล้วกดยืนยัน">
          <div className="card-dark p-5">
            <div>
              <div className="eyebrow !text-white/50">นัดหมาย</div>
              <div className="text-2xl font-extrabold mt-1">
                {new Date(selDate).toLocaleDateString("th-TH", { weekday: "long", day: "numeric", month: "long" })}
              </div>
              <div className="text-3xl font-black text-white/80 mt-1">{selSlot.label}</div>
              <div className="mt-4 pt-4 border-t border-white/10 grid grid-cols-2 gap-3 text-sm">
                <SummaryCell k="บริการ" v={lang === "en" && selService.name_en ? selService.name_en : selService.name} />
                <SummaryCell k="ระยะเวลา" v={`${selService.duration_min} นาที`} />
                <SummaryCell k="ช่าง" v={selStaff ? (selStaff.nickname ?? selStaff.name) : t("booking.any_staff")} />
                <SummaryCell k="ราคา" v={baht(selService.price)} />
              </div>
            </div>
          </div>

          <textarea
            className="input mt-3"
            placeholder={t("booking.note_placeholder")}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
          />
          {err && <div className="text-red-600 text-sm mt-2 text-center">{err}</div>}
          <button disabled={submitting} onClick={submit} className="btn-primary w-full mt-4 text-base py-4">
            <Check size={20} /> {submitting ? t("common.loading") : t("common.confirm")}
          </button>
        </Section>
      )}
    </div>
  );
}

function Section({
  eyebrow,
  title,
  subtitle,
  children
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="animate-fade-up">
      {eyebrow && <div className="eyebrow mb-1">{eyebrow}</div>}
      <h2 className="h-display text-2xl mb-0.5">{title}</h2>
      {subtitle && <p className="text-sm text-ink-500 mb-4">{subtitle}</p>}
      {!subtitle && <div className="mb-4" />}
      {children}
    </div>
  );
}

function StaffCard({
  selected,
  onClick,
  title,
  subtitle,
  avatar,
  icon
}: {
  selected: boolean;
  onClick: () => void;
  title: string;
  subtitle?: string;
  avatar?: string | null;
  icon: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`card p-4 text-left transition-all ${selected ? "!border-ink-900 ring-2 ring-ink-900/10" : "hover:border-ink-300"}`}
    >
      <div className={`w-12 h-12 rounded-md flex items-center justify-center overflow-hidden ${selected ? "bg-ink-900" : "bg-ink-50 border border-ink-200"}`}>
        {avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatar} alt="" className="w-full h-full object-cover" />
        ) : (
          icon
        )}
      </div>
      <div className="mt-3 font-semibold text-ink-900">{title}</div>
      {subtitle && <div className="text-xs text-ink-500 mt-0.5">{subtitle}</div>}
    </button>
  );
}

function SummaryCell({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wider text-white/50 font-semibold">{k}</div>
      <div className="font-semibold text-white mt-0.5">{v}</div>
    </div>
  );
}

function EmptyState({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="card p-8 text-center flex flex-col items-center gap-3">
      <div className="w-12 h-12 rounded-md border border-ink-200 bg-ink-50 text-ink-400 flex items-center justify-center">{icon}</div>
      <div className="text-sm text-ink-500">{text}</div>
    </div>
  );
}

function Stepper({ step }: { step: number }) {
  return (
    <div className="flex gap-1.5 flex-1">
      {[1, 2, 3, 4].map((n) => (
        <div
          key={n}
          className={`h-1.5 flex-1 rounded-full transition-all ${
            n < step ? "bg-ink-900" : n === step ? "bg-ink-900 animate-pulse-soft" : "bg-ink-200"
          }`}
        />
      ))}
    </div>
  );
}
