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
      {/* Hero */}
      <div className="card-dark p-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-brand-mesh opacity-50" />
        <div className="relative">
          <div className="eyebrow !text-brand-400">{greeting}</div>
          <div className="h-display text-3xl text-white mt-1">
            {profile?.displayName ?? "คุณลูกค้า"}
          </div>
          <div className="text-sm text-white/70 mt-2 max-w-[260px]">{t("home.subtitle")}</div>

          <Link
            href="/liff/booking"
            className="mt-5 inline-flex items-center gap-2 btn bg-brand-500 text-white shadow-glow hover:bg-brand-400"
          >
            <Calendar size={16} /> {t("home.book_now")}
          </Link>
        </div>
      </div>

      {/* Tiles */}
      <div className="grid grid-cols-2 gap-3">
        <Tile
          href="/liff/booking"
          icon={<Calendar size={20} />}
          title={t("home.book_now")}
          subtitle="เลือกบริการ + เวลา"
        />
        <Tile
          href="/liff/my-bookings"
          icon={<ListChecks size={20} />}
          title={t("home.my_bookings")}
          subtitle="ตรวจสอบสถานะ"
        />
        <Tile
          href="/liff/services"
          icon={<Sparkles size={20} />}
          title="บริการ / ราคา"
          subtitle="ดูรายการบริการ"
        />
        <Tile
          href="/liff/profile"
          icon={<UserCircle2 size={20} />}
          title={t("home.profile")}
          subtitle="ข้อมูลและแต้มสะสม"
        />
        <Tile
          href="/liff/loyalty"
          icon={<Gift size={20} />}
          title="แต้มสะสม"
          subtitle="ดูแต้ม / แลกส่วนลด"
        />
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
      className="card p-5 flex flex-col gap-3 active:scale-[0.98] transition-all hover:border-ink-300 hover:shadow-lift group"
    >
      <div className="flex items-start justify-between">
        <div className="w-11 h-11 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center group-hover:scale-110 transition-transform">
          {icon}
        </div>
        <ArrowUpRight size={14} className="text-ink-300 group-hover:text-ink-600 transition-colors" />
      </div>
      <div>
        <div className="font-semibold text-ink-900">{title}</div>
        <div className="text-xs text-ink-500 mt-0.5">{subtitle}</div>
      </div>
    </Link>
  );
}
