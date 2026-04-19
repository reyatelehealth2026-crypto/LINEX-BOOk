"use client";
import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import { useLiff } from "@/components/LiffProvider";
import { Calendar, ListChecks, UserCircle2, Sparkles } from "lucide-react";

export default function LiffHome() {
  const { t } = useI18n();
  const { profile } = useLiff();

  return (
    <div className="space-y-6">
      <div className="card p-6 bg-gradient-to-br from-brand-500 to-brand-700 text-white">
        <div className="text-sm opacity-80">สวัสดี</div>
        <div className="text-xl font-bold">{profile?.displayName ?? "คุณลูกค้า"}</div>
        <div className="text-sm opacity-80 mt-2">{t("home.subtitle")}</div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Link href="/liff/booking" className="card p-5 flex flex-col gap-2 active:scale-[0.98] transition">
          <Calendar className="text-brand-500" />
          <div className="font-semibold">{t("home.book_now")}</div>
          <div className="text-xs text-neutral-500">เลือกบริการ + เวลา</div>
        </Link>
        <Link href="/liff/my-bookings" className="card p-5 flex flex-col gap-2 active:scale-[0.98] transition">
          <ListChecks className="text-brand-500" />
          <div className="font-semibold">{t("home.my_bookings")}</div>
          <div className="text-xs text-neutral-500">ตรวจสอบสถานะ</div>
        </Link>
        <Link href="/liff/profile" className="card p-5 flex flex-col gap-2 active:scale-[0.98] transition">
          <UserCircle2 className="text-brand-500" />
          <div className="font-semibold">{t("home.profile")}</div>
          <div className="text-xs text-neutral-500">ข้อมูลและแต้มสะสม</div>
        </Link>
        <Link href="/liff/services" className="card p-5 flex flex-col gap-2 active:scale-[0.98] transition">
          <Sparkles className="text-brand-500" />
          <div className="font-semibold">บริการ / ราคา</div>
          <div className="text-xs text-neutral-500">ดูรายการบริการ</div>
        </Link>
      </div>
    </div>
  );
}
