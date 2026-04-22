"use client";
import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";
import type { Service } from "@/types/db";
import { baht } from "@/lib/utils";
import Link from "next/link";
import { Star } from "lucide-react";

type ServiceRating = { service_id: number; avg: number; count: number };

export default function ServicesPage() {
  const { t, lang } = useI18n();
  const [list, setList] = useState<Service[]>([]);
  const [ratings, setRatings] = useState<Map<number, ServiceRating>>(new Map());

  useEffect(() => {
    fetch("/api/catalog").then((r) => r.json()).then((d) => setList(d.services ?? []));
    fetch("/api/reviews/summary")
      .then((r) => r.json())
      .then((d) => {
        const m = new Map<number, ServiceRating>();
        for (const row of d.by_service ?? []) m.set(row.service_id, row);
        setRatings(m);
      })
      .catch(() => {});
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
            <div className="skeleton h-16" />
            <div className="skeleton h-16" />
            <div className="skeleton h-16" />
          </>
        ) : list.map((s) => {
          const r = ratings.get(s.id);
          return (
            <div key={s.id} className="card card-hover p-4 flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-ink-900">{lang === "en" && s.name_en ? s.name_en : s.name}</div>
                <div className="text-xs text-ink-500 mt-0.5 flex items-center gap-2">
                  <span>{s.duration_min} {t("common.minutes")}</span>
                  {r && r.count > 0 ? (
                    <span className="inline-flex items-center gap-0.5 text-amber-500">
                      <Star size={11} fill="currentColor" />
                      <span className="font-medium tabular-nums">{r.avg.toFixed(1)}</span>
                      <span className="text-ink-400">({r.count})</span>
                    </span>
                  ) : null}
                </div>
              </div>
              <div className="font-bold text-ink-900 ml-3 shrink-0">{baht(s.price)}</div>
            </div>
          );
        })}
      </div>
      <Link href="/liff/booking" className="btn-primary w-full justify-center">{t("home.book_now")}</Link>
    </div>
  );
}
