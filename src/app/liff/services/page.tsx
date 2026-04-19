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
    <div className="space-y-4">
      <h1 className="text-xl font-bold">บริการ / ราคา</h1>
      <div className="grid gap-2">
        {list.map((s) => (
          <div key={s.id} className="card p-4 flex items-center justify-between">
            <div>
              <div className="font-semibold">{lang === "en" && s.name_en ? s.name_en : s.name}</div>
              <div className="text-xs text-neutral-500">{s.duration_min} {t("common.minutes")}</div>
            </div>
            <div className="font-semibold text-brand-600">{baht(s.price)}</div>
          </div>
        ))}
      </div>
      <Link href="/liff/booking" className="btn-primary w-full">{t("home.book_now")}</Link>
    </div>
  );
}
