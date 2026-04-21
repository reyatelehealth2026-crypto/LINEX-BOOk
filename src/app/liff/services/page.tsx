"use client";
import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";
import type { Service } from "@/types/db";
import { baht } from "@/lib/utils";
import Link from "next/link";

export default function ServicesPage() {
  const { t, lang } = useI18n();
  const [list, setList] = useState<Service[]>([]);
  useEffect(() => {
    fetch("/api/catalog").then((r) => r.json()).then((d) => setList(d.services ?? []));
  }, []);
  return (
    <div className="space-y-4 animate-fade-up">
      <div>
        <div className="eyebrow mb-0.5">บริการทั้งหมด</div>
        <h1 className="h-display text-2xl">บริการ / ราคา</h1>
      </div>
      <div className="grid gap-2.5">
        {list.length === 0 ? (
          <>
            <div className="skeleton h-16 rounded-2xl" />
            <div className="skeleton h-16 rounded-2xl" />
            <div className="skeleton h-16 rounded-2xl" />
          </>
        ) : list.map((s) => (
          <div key={s.id} className="card card-hover p-4 flex items-center justify-between">
            <div>
              <div className="font-semibold text-ink-900">{lang === "en" && s.name_en ? s.name_en : s.name}</div>
              <div className="text-xs text-ink-500 mt-0.5">{s.duration_min} {t("common.minutes")}</div>
            </div>
            <div className="font-bold text-linex-600">{baht(s.price)}</div>
          </div>
        ))}
      </div>
      <Link href="/liff/booking" className="glow-btn w-full justify-center">{t("home.book_now")}</Link>
    </div>
  );
}
