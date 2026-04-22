"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useLiff } from "@/components/LiffProvider";
import { useI18n } from "@/lib/i18n";
import type { Customer } from "@/types/db";
import { Star, CalendarCheck2, Gift, ArrowRight } from "lucide-react";

export default function ProfilePage() {
  const { profile } = useLiff();
  const { t } = useI18n();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [birthday, setBirthday] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!profile) return;
    fetch(`/api/customers/register?line_user_id=${profile.userId}`)
      .then((r) => r.json())
      .then((d) => {
        setCustomer(d.customer);
        if (d.customer) {
          setFullName(d.customer.full_name ?? "");
          setPhone(d.customer.phone ?? "");
          setBirthday(d.customer.birthday ?? "");
        }
        setLoading(false);
      });
  }, [profile]);

  async function save() {
    if (!profile) return;
    setSaving(true);
    const r = await fetch("/api/customers/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lineUserId: profile.userId, fullName, phone, birthday })
    });
    const d = await r.json();
    setSaving(false);
    if (r.ok) setCustomer(d.customer);
  }

  if (loading) return (
    <div className="space-y-4 animate-fade-up">
      <div className="skeleton h-8 w-40" />
      <div className="grid grid-cols-2 gap-3">
        <div className="skeleton h-20" />
        <div className="skeleton h-20" />
      </div>
      <div className="skeleton h-48" />
    </div>
  );

  const isRegistered = !!customer?.registered_at;

  return (
    <div className="space-y-4 animate-fade-up">
      <h1 className="h-display text-2xl">{t("profile.title")}</h1>

      {isRegistered && customer && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div className="card card-hover p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-md border border-amber-200 bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                <Star size={18} />
              </div>
              <div>
                <div className="text-xs text-ink-500">{t("profile.points")}</div>
                <div className="text-xl font-bold text-ink-900">{customer.points}</div>
                {(customer as any).lifetime_points > customer.points && (
                  <div className="text-[10px] text-ink-400">สะสม {(customer as any).lifetime_points} แต้ม</div>
                )}
              </div>
            </div>
            <div className="card card-hover p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-md border border-ink-200 bg-ink-50 text-ink-700 flex items-center justify-center shrink-0">
                <CalendarCheck2 size={18} />
              </div>
              <div>
                <div className="text-xs text-ink-500">{t("profile.visit_count")}</div>
                <div className="text-xl font-bold text-ink-900">{customer.visit_count}</div>
              </div>
            </div>
          </div>

          {/* Loyalty shortcut */}
          <Link
            href="/liff/loyalty"
            className="card p-4 flex items-center justify-between hover:border-ink-300 transition group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-md border border-ink-200 bg-ink-50 text-ink-700 flex items-center justify-center">
                <Gift size={18} />
              </div>
              <div>
                <div className="font-semibold text-sm">แต้มสะสม &amp; ส่วนลด</div>
                <div className="text-xs text-ink-400">ดูระดับ / แลกแต้ม / โค้ดชวนเพื่อน</div>
              </div>
            </div>
            <ArrowRight size={16} className="text-ink-300 group-hover:text-ink-700 transition" />
          </Link>
        </>
      )}

      <div className="card p-4 space-y-3">
        <h2 className="font-semibold">{isRegistered ? t("profile.title") : t("profile.register_title")}</h2>
        <div>
          <label className="label">{t("profile.full_name")}</label>
          <input className="input" value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </div>
        <div>
          <label className="label">{t("profile.phone")}</label>
          <input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" />
        </div>
        <div>
          <label className="label">{t("profile.birthday")}</label>
          <input className="input" type="date" value={birthday ?? ""} onChange={(e) => setBirthday(e.target.value)} />
        </div>
        <button disabled={saving || !fullName || !phone} onClick={save} className="btn-primary w-full">
          {saving ? t("common.loading") : (isRegistered ? t("common.save") : t("profile.register_submit"))}
        </button>
        {!isRegistered && <p className="text-xs text-ink-500">ลงทะเบียนครั้งแรกรับฟรี 50 แต้ม</p>}
      </div>
    </div>
  );
}
