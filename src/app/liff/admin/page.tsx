"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAdminLiff } from "./_ctx";
import {
  Activity,
  ArrowUpRight,
  CalendarCheck,
  Clock,
  Sparkles,
  Store,
  UserCircle2,
  Users,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";

type HealthCheck = {
  id: string;
  label: string;
  status: "ok" | "warn" | "fail";
  detail: string;
};
type HealthData = {
  allOk: boolean;
  okCount: number;
  total: number;
  checks: HealthCheck[];
  setupValues?: { liffUrl?: string };
};

type Booking = {
  id: number;
  starts_at: string;
  status: string;
  customer: { display_name: string | null; full_name: string | null } | null;
  service: { name: string } | null;
};

export default function LiffAdminHome() {
  const { authHeaders, identity } = useAdminLiff();

  const [health, setHealth] = useState<HealthData | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const today = new Date().toISOString().slice(0, 10);
      const [hRes, bRes] = await Promise.all([
        fetch("/api/admin/healthcheck", { headers: authHeaders(), cache: "no-store" }),
        fetch(`/api/bookings?date=${today}`, { headers: authHeaders(), cache: "no-store" }),
      ]);
      if (hRes.ok) setHealth(await hRes.json());
      if (bRes.ok) setBookings((await bRes.json()).bookings ?? []);
      setLoading(false);
    })();
  }, [authHeaders]);

  const counts = useMemo(() => {
    const acc = { total: bookings.length, pending: 0, confirmed: 0, done: 0 };
    for (const b of bookings) {
      if (b.status === "pending") acc.pending++;
      else if (b.status === "confirmed") acc.confirmed++;
      else if (b.status === "completed") acc.done++;
    }
    return acc;
  }, [bookings]);

  const setupPct = health ? Math.round((health.okCount / health.total) * 100) : 0;
  const issues = health?.checks.filter((c) => c.status !== "ok") ?? [];

  return (
    <div className="space-y-5">
      {/* Hero */}
      <div className="card-dark p-6">
        <div>
          <div className="eyebrow !text-white/50 flex items-center gap-2">
            <Sparkles size={14} /> แอดมิน · วันนี้
          </div>
          <div className="text-3xl font-extrabold mt-2">สวัสดี {identity?.displayName ?? "คุณแอดมิน"}</div>
          <div className="text-sm text-white/70 mt-1">
            {new Date().toLocaleDateString("th-TH", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </div>

          <div className="mt-5 grid grid-cols-3 gap-2">
            <HeroStat label="ทั้งหมด" value={counts.total} tone="neutral" />
            <HeroStat label="ยืนยัน" value={counts.confirmed} tone="neutral" />
            <HeroStat label="รอยืนยัน" value={counts.pending} tone="amber" />
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-3">
        <QuickAction
          href="/liff/admin/queue"
          icon={<CalendarCheck size={20} />}
          title="คิววันนี้"
          subtitle={loading ? "..." : `${counts.total} รายการ`}
        />
        <QuickAction
          href="/liff/admin/setup"
          icon={<Store size={20} />}
          title="ตั้งค่าร้าน"
          subtitle={loading ? "..." : `พร้อม ${setupPct}%`}
          highlight={setupPct < 100}
        />
      </div>

      {/* Setup progress summary */}
      <section>
        <SectionHeader title="ความพร้อมของร้าน" />
        <div className="card p-5 space-y-4">
          <div className="flex items-center gap-4">
            <div className="relative w-16 h-16 shrink-0">
              <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                <circle cx="18" cy="18" r="15.915" fill="none" stroke="#e2e8f0" strokeWidth="3" />
                <circle
                  cx="18"
                  cy="18"
                  r="15.915"
                  fill="none"
                  stroke="#06c755"
                  strokeWidth="3"
                  strokeDasharray={`${setupPct}, 100`}
                  strokeLinecap="round"
                  className="transition-all duration-700"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-sm font-extrabold text-ink-900">{setupPct}%</span>
              </div>
            </div>
            <div className="flex-1">
              <div className="font-semibold text-ink-900">
                {setupPct === 100 ? "ร้านพร้อมใช้งานครบถ้วน" : `${health?.okCount ?? 0}/${health?.total ?? 0} ขั้นตอนเสร็จแล้ว`}
              </div>
              <div className="text-xs text-ink-500 mt-0.5">
                {issues.length > 0
                  ? `ยังเหลือ ${issues.length} รายการที่ต้องตั้งค่า`
                  : "เยี่ยม! ไม่มีรายการค้าง"}
              </div>
            </div>
          </div>

          {issues.length > 0 && (
            <div className="space-y-1.5 pt-3 border-t border-ink-100">
              {issues.slice(0, 3).map((c) => (
                <IssueRow key={c.id} check={c} />
              ))}
              {issues.length > 3 && (
                <Link
                  href="/liff/admin/setup"
                  className="flex items-center justify-between text-xs text-ink-600 font-semibold pt-1"
                >
                  <span>ดูทั้งหมด {issues.length} รายการ</span>
                  <ArrowUpRight size={14} />
                </Link>
              )}
            </div>
          )}

          <Link href="/liff/admin/setup" className="btn-secondary w-full text-sm">
            <Activity size={16} /> เปิดหน้าตั้งค่า
          </Link>
        </div>
      </section>

      {/* Upcoming bookings preview */}
      <section>
        <SectionHeader title="คิวถัดไป" action={<Link href="/liff/admin/queue" className="text-xs font-semibold text-ink-600">ดูทั้งหมด</Link>} />
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => <div key={i} className="skeleton h-16" />)}
          </div>
        ) : bookings.length === 0 ? (
          <div className="card p-6 text-center text-sm text-ink-500">ยังไม่มีคิววันนี้</div>
        ) : (
          <div className="space-y-2">
            {bookings
              .filter((b) => b.status === "pending" || b.status === "confirmed")
              .slice(0, 4)
              .map((b) => {
                const t = new Date(b.starts_at);
                return (
                  <div key={b.id} className="card p-3 flex items-center gap-3">
                    <div className="w-12 h-12 rounded-md border border-ink-200 bg-ink-50 text-ink-700 flex flex-col items-center justify-center shrink-0">
                      <div className="text-[10px] uppercase tracking-wider font-bold opacity-60">
                        {t.toLocaleDateString("th-TH", { day: "numeric" })}
                      </div>
                      <div className="text-sm font-extrabold leading-none">
                        {t.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-ink-900 truncate">
                        {b.customer?.full_name ?? b.customer?.display_name ?? "ลูกค้า"}
                      </div>
                      <div className="text-xs text-ink-500 truncate">{b.service?.name ?? "-"}</div>
                    </div>
                    <span
                      className={`chip ${
                        b.status === "pending"
                          ? "bg-amber-100 text-amber-700"
                          : "bg-emerald-100 text-emerald-700"
                      }`}
                    >
                      {b.status === "pending" ? "รอยืนยัน" : "ยืนยันแล้ว"}
                    </span>
                  </div>
                );
              })}
          </div>
        )}
      </section>

      {/* Admin shortcuts */}
      <section>
        <SectionHeader title="จัดการร้าน" />
        <div className="grid grid-cols-2 gap-2">
          <ShortcutLink href="/admin/services" icon={<Sparkles size={16} />} label="บริการ" />
          <ShortcutLink href="/admin/staff" icon={<UserCircle2 size={16} />} label="พนักงาน" />
          <ShortcutLink href="/admin/working-hours" icon={<Clock size={16} />} label="เวลาทำการ" />
          <ShortcutLink href="/admin/customers" icon={<Users size={16} />} label="ลูกค้า" />
        </div>
      </section>
    </div>
  );
}

function HeroStat({ label, value, tone }: { label: string; value: number; tone: "neutral" | "amber" }) {
  const toneMap = {
    neutral: "bg-white/10 text-white",
    amber: "bg-amber-400/20 text-amber-300",
  };
  return (
    <div className={`rounded-xl px-3 py-2.5 ${toneMap[tone]}`}>
      <div className="text-[10px] uppercase tracking-wider font-semibold opacity-80">{label}</div>
      <div className="text-2xl font-extrabold leading-none mt-1">{value}</div>
    </div>
  );
}

function QuickAction({
  href,
  icon,
  title,
  subtitle,
  highlight,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  highlight?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`card p-4 flex items-start gap-3 transition-all active:scale-[0.98] ${
        highlight ? "ring-2 ring-amber-300/60 bg-amber-50/40" : "hover:border-ink-300"
      }`}
    >
      <div
        className={`w-10 h-10 rounded-md border flex items-center justify-center ${
          highlight ? "border-amber-200 bg-amber-50 text-amber-600" : "border-ink-200 bg-ink-50 text-ink-700"
        }`}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-ink-900">{title}</div>
        <div className="text-xs text-ink-500 mt-0.5 truncate">{subtitle}</div>
      </div>
      <ArrowUpRight size={14} className="text-ink-400 shrink-0" />
    </Link>
  );
}

function SectionHeader({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-end justify-between mb-2.5">
      <h3 className="section-title">{title}</h3>
      {action}
    </div>
  );
}

function IssueRow({ check }: { check: HealthCheck }) {
  const tone =
    check.status === "fail" ? "text-red-600" : check.status === "warn" ? "text-amber-500" : "text-emerald-600";
  const Icon = check.status === "ok" ? CheckCircle2 : AlertTriangle;
  return (
    <div className="flex items-start gap-2 text-xs">
      <Icon size={14} className={`${tone} mt-0.5 shrink-0`} />
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-ink-700 truncate">{check.label}</div>
        <div className="text-ink-500 truncate">{check.detail}</div>
      </div>
    </div>
  );
}

function ShortcutLink({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <Link href={href} className="card p-3 flex items-center gap-3 text-sm hover:border-ink-300 transition">
      <div className="w-8 h-8 rounded-md border border-ink-200 bg-ink-50 text-ink-700 flex items-center justify-center">{icon}</div>
      <span className="font-semibold text-ink-800">{label}</span>
      <ArrowUpRight size={12} className="ml-auto text-ink-400" />
    </Link>
  );
}
