"use client";
import Link from "next/link";
import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useI18n } from "@/lib/i18n";
import { useLiff } from "@/components/LiffProvider";
import { Calendar, ListChecks, UserCircle2, Sparkles, ArrowUpRight, Gift } from "lucide-react";

export default function LiffHome() {
  const { t } = useI18n();
  const { profile } = useLiff();
  const router = useRouter();
  const sp = useSearchParams();

  useEffect(() => {
    const state = sp.get("liff.state");
    if (state && state.startsWith("/") && state !== "/") {
      router.replace(`/liff${state}`);
    }
  }, [router, sp]);

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "สวัสดีตอนเช้า";
    if (h < 17) return "สวัสดีตอนบ่าย";
    return "สวัสดีตอนเย็น";
  })();

  return (
    <div className="space-y-6 animate-fade-up">
      <section className="card-dark p-6">
        <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/60">{greeting}</div>
        <div className="h-display text-2xl text-white mt-1">
          {profile?.displayName ?? "คุณลูกค้า"}
        </div>
        <div className="text-sm text-white/70 mt-2 max-w-[280px] leading-relaxed">{t("home.subtitle")}</div>
        <Link
          href="/liff/booking"
          className="mt-5 inline-flex items-center justify-center gap-2 rounded-lg bg-white text-ink-900 px-4 py-2.5 text-sm font-medium hover:bg-ink-100 transition-colors"
        >
          <Calendar size={16} /> {t("home.book_now")}
        </Link>
      </section>

      <div className="grid grid-cols-2 gap-3">
        <Tile href="/liff/booking" icon={<Calendar size={18} />} title={t("home.book_now")} subtitle="เลือกบริการ + เวลา" />
        <Tile href="/liff/my-bookings" icon={<ListChecks size={18} />} title={t("home.my_bookings")} subtitle="ตรวจสอบสถานะ" />
        <Tile href="/liff/services" icon={<Sparkles size={18} />} title="บริการ / ราคา" subtitle="ดูรายการบริการ" />
        <Tile href="/liff/profile" icon={<UserCircle2 size={18} />} title={t("home.profile")} subtitle="ข้อมูลและแต้มสะสม" />
        <Tile href="/liff/loyalty" icon={<Gift size={18} />} title="แต้มสะสม" subtitle="ดูแต้ม / แลกส่วนลด" />
      </div>
    </div>
  );
}

function Tile({
  href,
  icon,
  title,
  subtitle,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <Link
      href={href}
      className="card p-4 flex flex-col gap-3 hover:border-ink-300 transition-colors group"
    >
      <div className="flex items-start justify-between">
        <div className="w-9 h-9 rounded-md border border-ink-200 bg-ink-50 text-ink-700 flex items-center justify-center">
          {icon}
        </div>
        <ArrowUpRight size={14} className="text-ink-400 group-hover:text-ink-900 transition-colors" />
      </div>
      <div>
        <div className="font-semibold text-ink-900 text-[14px]">{title}</div>
        <div className="text-xs text-ink-500 mt-0.5">{subtitle}</div>
      </div>
    </Link>
  );
}
